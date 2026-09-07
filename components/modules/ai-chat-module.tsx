import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, Easing, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useColors } from "@/hooks/use-colors";
import { STORAGE_KEYS } from "@/lib/storage";
import { AI_DATA_ALL_SCOPE_ID, buildSmartDataContext } from "@/lib/ai-data-map";
import { trpc } from "@/lib/trpc";
import { DEFAULT_AI_MODEL, loadAiModel, type AiModelId } from "@/lib/ai-model-settings";

type ChatAttachment = { name: string; mimeType: string; data: string };
type ChatMessage = { id: string; role: "user" | "model"; text: string; attachmentNames?: string[] };
type ChatArchiveItem = { id: string; title: string; updatedAt: string; messages: ChatMessage[]; scopeIds: string[] };

type ScopeOption = { id: string; title: string; subtitle: string; keys: string[]; icon: keyof typeof MaterialIcons.glyphMap };

const ARCHIVE_KEY = "madar_ai_chat_archive";
const SCOPE_KEY = "madar_ai_chat_scope";
const QUICK_PROMPTS = [
  "ما المناطق الأقل تغطية في الفعاليات؟",
  "لخّص أداء الماركات في الفعاليات الأخيرة.",
  "ما أهم فرص تحسين التنفيذ الميداني؟",
];
const SCOPE_OPTIONS: ScopeOption[] = [
  { id: AI_DATA_ALL_SCOPE_ID, title: "جميع بيانات التطبيق", subtitle: "كل الوحدات والتواريخ والعلاقات", icon: "apps", keys: Object.values(STORAGE_KEYS) },
  { id: "field", title: "الميدان", subtitle: "الفعاليات ورصد المنافسين والجودة", icon: "location-on", keys: [STORAGE_KEYS.EVENTS, STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS, STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS] },
  { id: "plan", title: "الخطة التسويقية", subtitle: "الأهداف والنتائج المرتبطة", icon: "flag", keys: [STORAGE_KEYS.MARKETING_GOALS] },
  { id: "surveys", title: "الاستبيانات", subtitle: "نتائج الزيارات والاستبيانات", icon: "poll", keys: [STORAGE_KEYS.SURVEY_RESULTS] },
  { id: "reference", title: "البيانات المرجعية", subtitle: "المحلات والماركات والمناطق", icon: "storage", keys: [STORAGE_KEYS.STORES, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS] },
];
const DEFAULT_SCOPE_IDS = [AI_DATA_ALL_SCOPE_ID];

const WELCOME: ChatMessage = { id: "welcome", role: "model", text: "مرحباً، أنا مساعدك للتسويق الميداني. اختر نطاق البيانات من اللوحة الجانبية، ثم اطرح سؤالك." };

function renderInlineMarkdown(line: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  return line.split(pattern).map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <Text key={`bold-${index}`} style={styles.markdownBold}>{part.slice(2, -2)}</Text>;
    }
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return <Text key={`italic-${index}`} style={styles.markdownItalic}>{part.slice(1, -1)}</Text>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <Text key={`code-${index}`} style={styles.markdownCode}>{part.slice(1, -1)}</Text>;
    }
    return part;
  });
}

function MarkdownMessage({ text }: { text: string }) {
  return <Text>{text.split("\n").map((line, index, lines) => {
    const bullet = /^\s*[-*]\s+/.test(line);
    const content = bullet ? line.replace(/^\s*[-*]\s+/, "") : line;
    return <Text key={`line-${index}`}>{bullet ? "• " : ""}{renderInlineMarkdown(content)}{index < lines.length - 1 ? "\n" : ""}</Text>;
  })}</Text>;
}

async function readAttachment(asset: DocumentPicker.DocumentPickerAsset): Promise<ChatAttachment> {
  const mimeType = asset.mimeType || "application/octet-stream";
  if (asset.size && asset.size > 6500000) throw new Error(`الملف «${asset.name}» أكبر من الحد المسموح (6 MB).`);
  let data = asset.base64;
  if (!data && Platform.OS === "web" && asset.uri) {
    const response = await fetch(asset.uri);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
    data = btoa(binary);
  }
  if (!data && asset.uri) data = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  if (!data) throw new Error(`تعذر قراءة الملف «${asset.name}».`);
  return { name: asset.name, mimeType, data };
}

export default function AIChatModule() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [question, setQuestion] = useState("");
  const [, setContext] = useState("");
  const [contextLoading, setContextLoading] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [aiModel, setAiModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(DEFAULT_SCOPE_IDS);
  const [scopeHydrated, setScopeHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [archive, setArchive] = useState<ChatArchiveItem[]>([]);
  const [conversationId, setConversationId] = useState(() => `conversation-${Date.now()}`);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const drawerProgress = useRef(new Animated.Value(1)).current;
  const [deleteTarget, setDeleteTarget] = useState<ChatArchiveItem | null>(null);
  const [memoryAction, setMemoryAction] = useState<"context" | "archive" | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messageListRef = useRef<FlatList<ChatMessage>>(null);
  const aiChatMutation = trpc.ai.chat.useMutation();

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => setKeyboardHeight(event.endCoordinates.height));
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => { showSubscription.remove(); hideSubscription.remove(); };
  }, []);

  useEffect(() => {
    if (!drawerVisible) return;
    drawerProgress.setValue(1);
    Animated.timing(drawerProgress, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [drawerProgress, drawerVisible]);

  const refreshContext = useCallback(async (scopeIds: string[]) => {
    setContextLoading(true);
    try {
      const snapshot = await buildSmartDataContext("استعرض بيانات النطاق المحدد", scopeIds);
      setContext(snapshot.context);
    } catch {
      setContext("");
    } finally {
      setContextLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAiModel().then(setAiModel).catch(() => undefined);
  }, []);

  useEffect(() => {
    let mounted = true;
    void Promise.all([AsyncStorage.getItem(ARCHIVE_KEY), AsyncStorage.getItem(SCOPE_KEY)]).then(([archiveValue, scopeValue]) => {
      if (!mounted) return;
      if (archiveValue) {
        try { setArchive(JSON.parse(archiveValue) as ChatArchiveItem[]); } catch { setArchive([]); }
      }
      if (scopeValue) {
        try {
          const parsed = JSON.parse(scopeValue) as string[];
          if (Array.isArray(parsed) && parsed.length) {
            const valid = parsed.filter((id) => SCOPE_OPTIONS.some((option) => option.id === id));
            setSelectedScopes(valid.length ? valid : DEFAULT_SCOPE_IDS);
          }
        } catch { /* use defaults */ }
      }
      setScopeHydrated(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!scopeHydrated) return;
    void refreshContext(selectedScopes);
    void AsyncStorage.setItem(SCOPE_KEY, JSON.stringify(selectedScopes));
  }, [refreshContext, scopeHydrated, selectedScopes]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setTimeout(() => messageListRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages.length, isStreaming]);

  useEffect(() => {
    if (messages.length <= 1 || isStreaming) return;
    const item: ChatArchiveItem = { id: conversationId, title: messages.find((message) => message.role === "user")?.text.slice(0, 48) || "محادثة جديدة", updatedAt: new Date().toISOString(), messages, scopeIds: selectedScopes };
    setArchive((current) => {
      const next = [item, ...current.filter((entry) => entry.id !== conversationId)].slice(0, 30);
      void AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
      return next;
    });
  }, [conversationId, isStreaming, messages, selectedScopes]);

  const history = useMemo(() => messages.filter((message) => message.id !== "welcome").slice(-10).map(({ role, text }) => ({ role, text })), [messages]);

  const startNewConversation = useCallback(() => {
    setConversationId(`conversation-${Date.now()}`);
    setMessages([WELCOME]);
    setQuestion("");
    setDrawerVisible(false);
    setSettingsVisible(false);
  }, []);

  const openArchivedConversation = useCallback((item: ChatArchiveItem) => {
    setConversationId(item.id);
    setMessages(item.messages.length ? item.messages : [WELCOME]);
    setSelectedScopes(item.scopeIds.length ? item.scopeIds : DEFAULT_SCOPE_IDS);
    setDrawerVisible(false);
  }, []);

  const toggleScope = useCallback((scopeId: string) => {
    setSelectedScopes((current) => {
      if (scopeId === AI_DATA_ALL_SCOPE_ID) return current.includes(AI_DATA_ALL_SCOPE_ID) ? ["field"] : [AI_DATA_ALL_SCOPE_ID];
      const withoutAll = current.filter((id) => id !== AI_DATA_ALL_SCOPE_ID);
      if (withoutAll.includes(scopeId)) return withoutAll.length === 1 ? withoutAll : withoutAll.filter((id) => id !== scopeId);
      return [...withoutAll, scopeId];
    });
  }, []);

  const pickFiles = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, type: "*/*", copyToCacheDirectory: true });
    if (!result.canceled) setSelectedFiles((current) => [...current, ...result.assets].slice(0, 5));
  }, []);

  const sendMessage = useCallback(async (preset?: string) => {
    const text = (preset ?? question).trim();
    if (!text || isStreaming) return;
    let attachments: ChatAttachment[] = [];
    try {
      attachments = await Promise.all(selectedFiles.map(readAttachment));
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر قراءة المرفق";
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: "model", text: message }]);
      return;
    }
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", text, attachmentNames: attachments.map((file) => file.name) };
    const modelMessageId = `model-${Date.now()}`;
    setMessages((current) => [...current, userMessage, { id: modelMessageId, role: "model", text: "" }]);
    setQuestion("");
    setSelectedFiles([]);
    setIsStreaming(true);
    try {
      const freshSnapshot = await buildSmartDataContext(text, selectedScopes);
      const response = await aiChatMutation.mutateAsync({ question: text, context: freshSnapshot.context, history, attachments, model: aiModel });
      setMessages((current) => current.map((item) => item.id === modelMessageId ? { ...item, text: response.text } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر الحصول على إجابة حالياً";
      setMessages((current) => current.map((item) => item.id === modelMessageId ? { ...item, text: `تعذر إكمال الطلب: ${message}` } : item));
    } finally {
      setIsStreaming(false);
    }
  }, [aiChatMutation, aiModel, history, isStreaming, question, selectedFiles, selectedScopes]);

  const copyMessage = useCallback(async (messageId: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId((current) => current === messageId ? null : current), 1600);
  }, []);

  const shareMessage = useCallback(async (text: string) => {
    await Share.share({ message: text, title: "إجابة مساعد التسويق الميداني" });
  }, []);

  const deleteConversation = useCallback(async () => {
    if (!deleteTarget) return;
    const next = archive.filter((item) => item.id !== deleteTarget.id);
    setArchive(next);
    await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
    if (deleteTarget.id === conversationId) startNewConversation();
    setDeleteTarget(null);
  }, [archive, conversationId, deleteTarget, startNewConversation]);

  const clearAiMemory = useCallback(async () => {
    if (memoryAction === "context") {
      setContext("");
      setContextLoading(false);
    } else if (memoryAction === "archive") {
      setArchive([]);
      await AsyncStorage.removeItem(ARCHIVE_KEY);
      startNewConversation();
    }
    setMemoryAction(null);
  }, [memoryAction, startNewConversation]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom : 0}>
      <View style={[styles.toolbar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}> 
        <View style={[styles.toolbarBrand, { backgroundColor: colors.primary + "12" }]}><MaterialIcons name="auto-awesome" size={20} color={colors.primary} /></View><View style={styles.toolbarCopy}><Text style={[styles.toolbarTitle, { color: colors.foreground }]}>مساعد التسويق الميداني</Text><Text style={[styles.toolbarSubtitle, { color: colors.muted }]}>تحليل ذكي لبياناتك الميدانية</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="فتح إعدادات الذكاء الصناعي" style={[styles.menuButton, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "22" }]} onPress={() => { setDrawerVisible(false); setSettingsVisible(true); }} activeOpacity={0.75}>
          <MaterialIcons name="settings" size={23} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="فتح نطاق البيانات والأرشيف" style={[styles.menuButton, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "22" }]} onPress={() => { setSettingsVisible(false); setDrawerVisible(true); }} activeOpacity={0.75}>
          <MaterialIcons name="menu" size={25} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList ref={messageListRef} style={[styles.messages, { backgroundColor: colors.background }]} data={messages} keyExtractor={(item) => item.id} contentContainerStyle={[styles.messagesContent, { paddingBottom: Platform.OS === "android" && keyboardHeight > 0 ? keyboardHeight + 120 : 12 }]} keyboardShouldPersistTaps="always" keyboardDismissMode="none" nestedScrollEnabled removeClippedSubviews={false} onContentSizeChange={() => messageListRef.current?.scrollToEnd({ animated: true })} renderItem={({ item }) => (
        <View style={[styles.messageRow, item.role === "user" && styles.userRow]}>
          <View style={[styles.messageBubble, { backgroundColor: item.role === "user" ? colors.primary : colors.surface, borderColor: item.role === "user" ? colors.primary : colors.border }]}>
            {item.attachmentNames?.length ? <View style={styles.messageAttachments}>{item.attachmentNames.map((name) => <Text key={name} style={[styles.messageAttachment, { color: item.role === "user" ? "#fff" : colors.primary }]} numberOfLines={1}>📎 {name}</Text>)}</View> : null}
            <Text style={[styles.messageText, { color: item.role === "user" ? "#fff" : colors.foreground }]}>{item.role === "model" ? <MarkdownMessage text={item.text} /> : item.text}</Text>
            {item.role === "model" && item.id !== "welcome" && item.text.trim() ? <View style={styles.messageActions}><TouchableOpacity accessibilityRole="button" accessibilityLabel="نسخ الإجابة" style={[styles.messageAction, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => void copyMessage(item.id, item.text)} activeOpacity={0.75}><MaterialIcons name={copiedMessageId === item.id ? "check" : "content-copy"} size={15} color={copiedMessageId === item.id ? colors.success : colors.primary} /><Text style={[styles.messageActionText, { color: copiedMessageId === item.id ? colors.success : colors.foreground }]}>{copiedMessageId === item.id ? "تم النسخ" : "نسخ"}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="مشاركة الإجابة" style={[styles.messageAction, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => void shareMessage(item.text)} activeOpacity={0.75}><MaterialIcons name="share" size={15} color={colors.primary} /><Text style={[styles.messageActionText, { color: colors.foreground }]}>مشاركة</Text></TouchableOpacity></View> : null}
          </View>
        </View>
      )} ListFooterComponent={isStreaming ? <View style={styles.typing}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.typingText, { color: colors.muted }]}>يكتب الآن…</Text></View> : null} />

      {messages.length === 1 ? <View style={styles.quickPrompts}><Text style={[styles.quickTitle, { color: colors.muted }]}>أسئلة سريعة</Text><View style={styles.quickWrap}>{QUICK_PROMPTS.map((prompt) => <TouchableOpacity key={prompt} style={[styles.quickChip, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => void sendMessage(prompt)} disabled={contextLoading || isStreaming} activeOpacity={0.75}><Text style={[styles.quickText, { color: colors.foreground }]}>{prompt}</Text></TouchableOpacity>)}</View></View> : null}

      <Animated.View style={[styles.composerFloating, Platform.OS === "android" && keyboardHeight > 0 ? { transform: [{ translateY: -keyboardHeight }] } : null]}><View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.background }]}>
        {selectedFiles.length > 0 ? <View style={styles.fileStrip}>{selectedFiles.map((file) => <View key={`${file.uri}-${file.name}`} style={[styles.fileChip, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="insert-drive-file" size={16} color={colors.primary} /><Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text><TouchableOpacity onPress={() => setSelectedFiles((current) => current.filter((item) => item.uri !== file.uri))} activeOpacity={0.75}><MaterialIcons name="close" size={15} color={colors.muted} /></TouchableOpacity></View>)}</View> : null}
        <View style={styles.composerRow}>
          <TouchableOpacity style={[styles.attachButton, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => void pickFiles()} disabled={contextLoading || isStreaming} activeOpacity={0.75}><MaterialIcons name="attach-file" size={20} color={colors.primary} /></TouchableOpacity>
          <TextInput value={question} onChangeText={setQuestion} placeholder={contextLoading ? "يُجهّز نطاق البيانات…" : "اكتب سؤالك هنا"} placeholderTextColor={colors.muted} multiline maxLength={3000} editable={!contextLoading && !isStreaming} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} textAlign="right" onSubmitEditing={() => void sendMessage()} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="إرسال الرسالة" style={[styles.sendButton, { backgroundColor: colors.primary }, (isStreaming || !question.trim()) && styles.disabled]} onPress={() => void sendMessage()} disabled={contextLoading || isStreaming} activeOpacity={0.8}><MaterialIcons name="send" size={21} color="#fff" /></TouchableOpacity>
        </View>
      </View></Animated.View>

      <Modal visible={drawerVisible} transparent animationType="fade" statusBarTranslucent={false} navigationBarTranslucent={false} onRequestClose={() => setDrawerVisible(false)}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.drawerModalSafeArea}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={() => setDrawerVisible(false)} />
          <Animated.View style={[styles.drawer, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 10), transform: [{ translateX: drawerProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 420] }) }] }]}>
            <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}><View><Text style={[styles.drawerTitle, { color: colors.foreground }]}>النطاق والأرشيف</Text><Text style={[styles.drawerSubtitle, { color: colors.muted }]}>تحكم بما يُرسل واحفظ محادثاتك</Text></View><TouchableOpacity onPress={() => setDrawerVisible(false)} style={styles.closeButton} activeOpacity={0.75}><MaterialIcons name="close" size={22} color={colors.foreground} /></TouchableOpacity></View>
            <View style={styles.drawerListWrap}><FlatList<ChatMessage> data={[]} renderItem={() => null} keyExtractor={(item) => item.id} ListFooterComponent={<View style={styles.archiveSection}><View style={styles.archiveTitleRow}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>أرشيف المحادثات</Text><Text style={[styles.archiveCount, { color: colors.muted }]}>{archive.length}</Text></View>{archive.length === 0 ? <Text style={[styles.emptyArchive, { color: colors.muted }]}>لا توجد محادثات محفوظة بعد.</Text> : archive.map((item) => <View key={item.id} style={[styles.archiveCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><TouchableOpacity style={styles.archiveMain} onPress={() => openArchivedConversation(item)} activeOpacity={0.75}><MaterialIcons name="chat-bubble-outline" size={18} color={colors.primary} /><View style={styles.archiveCopy}><Text style={[styles.archiveItemTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text><Text style={[styles.archiveDate, { color: colors.muted }]}>{new Date(item.updatedAt).toLocaleDateString("ar-EG")}</Text></View></TouchableOpacity><TouchableOpacity style={styles.archiveDelete} onPress={() => setDeleteTarget(item)} activeOpacity={0.75}><MaterialIcons name="delete-outline" size={20} color={colors.error} /></TouchableOpacity></View>)}</View>} />
          </View><TouchableOpacity accessibilityRole="button" accessibilityLabel="بدء محادثة جديدة" style={[styles.newConversationCard, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={startNewConversation} activeOpacity={0.82}><MaterialIcons name="add" size={20} color="#fff" /><View style={styles.newConversationCopy}><Text style={styles.newConversationTitle}>محادثة جديدة</Text><Text style={styles.newConversationSubtitle}>ابدأ سؤالاً وسياقاً جديداً</Text></View></TouchableOpacity>
        </Animated.View>
        </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={settingsVisible} transparent animationType="fade" statusBarTranslucent={false} navigationBarTranslucent={false} onRequestClose={() => setSettingsVisible(false)}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.settingsModalSafeArea}>
          <View style={styles.settingsBackdrop}>
            <TouchableOpacity style={styles.settingsBackdropTouchable} activeOpacity={1} onPress={() => setSettingsVisible(false)} />
            <View style={[styles.settingsModal, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.settingsHeader, { borderBottomColor: colors.border }]}><View style={styles.settingsHeaderCopy}><Text style={[styles.drawerTitle, { color: colors.foreground }]}>إعدادات الذكاء الصناعي</Text><Text style={[styles.drawerSubtitle, { color: colors.muted }]}>تحكم بالسياق والذاكرة دون حذف بيانات التطبيق</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق إعدادات الذكاء الصناعي" onPress={() => setSettingsVisible(false)} style={styles.closeButton} activeOpacity={0.75}><MaterialIcons name="close" size={22} color={colors.foreground} /></TouchableOpacity></View>
              <FlatList data={SCOPE_OPTIONS} keyExtractor={(item) => item.id} contentContainerStyle={styles.settingsContent} ListHeaderComponent={<View style={styles.settingsSection}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>نطاق البيانات</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>الخريطة الذكية تختار البيانات المرتبطة بالسؤال داخل النطاقات المفعلة.</Text></View>} renderItem={({ item }) => { const selected = selectedScopes.includes(item.id); return <TouchableOpacity style={[styles.scopeCard, { backgroundColor: selected ? colors.primary + "12" : colors.surface, borderColor: selected ? colors.primary : colors.border }]} onPress={() => toggleScope(item.id)} activeOpacity={0.78}><View style={[styles.scopeIcon, { backgroundColor: selected ? colors.primary : colors.primary + "14" }]}><MaterialIcons name={item.icon} size={19} color={selected ? "#fff" : colors.primary} /></View><View style={styles.scopeCopy}><Text style={[styles.scopeTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.scopeSubtitle, { color: colors.muted }]}>{item.subtitle}</Text></View><MaterialIcons name={selected ? "check-circle" : "radio-button-unchecked"} size={21} color={selected ? colors.primary : colors.muted} /></TouchableOpacity>; }} ListFooterComponent={<View style={styles.settingsSection}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>الذاكرة</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>التنظيف لا يحذف بيانات الوحدات الأصلية.</Text><View style={styles.memoryActions}><TouchableOpacity style={[styles.memoryButton, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => setMemoryAction("context")} activeOpacity={0.78}><MaterialIcons name="cleaning-services" size={17} color={colors.primary} /><Text style={[styles.memoryButtonText, { color: colors.foreground }]}>تنظيف السياق</Text></TouchableOpacity><TouchableOpacity style={[styles.memoryButton, { borderColor: colors.error + "55", backgroundColor: colors.error + "0D" }]} onPress={() => setMemoryAction("archive")} activeOpacity={0.78}><MaterialIcons name="delete-sweep" size={17} color={colors.error} /><Text style={[styles.memoryButtonText, { color: colors.error }]}>تنظيف الأرشيف</Text></TouchableOpacity></View></View>} />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <ConfirmDialog visible={deleteTarget !== null} title="حذف المحادثة" message="سيتم حذف هذه المحادثة من أرشيف الجهاز نهائياً. هل تريد المتابعة؟" confirmText="حذف المحادثة" isDangerous icon="delete-outline" onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteConversation()} />
      <ConfirmDialog visible={memoryAction !== null} title={memoryAction === "archive" ? "تنظيف ذاكرة المحادثات" : "تنظيف سياق البيانات"} message={memoryAction === "archive" ? "سيُحذف أرشيف المحادثات من الجهاز وتبدأ محادثة جديدة. لن تُحذف أي بيانات من وحدات التطبيق. هل تريد المتابعة؟" : "سيُحذف السياق المؤقت فقط، وستُقرأ أحدث البيانات تلقائياً عند السؤال التالي. هل تريد المتابعة؟"} confirmText="تنظيف" isDangerous={memoryAction === "archive"} icon="cleaning-services" onCancel={() => setMemoryAction(null)} onConfirm={() => void clearAiMemory()} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, composerFloating: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 8 }, menuButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, newConversationCard: { minHeight: 64, marginHorizontal: 12, marginTop: 10, marginBottom: 8, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, elevation: 4, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, newConversationCopy: { flex: 1, alignItems: "flex-end" }, newConversationTitle: { color: "#fff", textAlign: "right", fontSize: 14, fontWeight: "800" as any }, newConversationSubtitle: { color: "rgba(255,255,255,0.78)", textAlign: "right", fontSize: 10, marginTop: 3 }, markdownBold: { fontWeight: "800" as any }, markdownItalic: { fontStyle: "italic" }, markdownCode: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 13 }, messageActions: { flexDirection: "row", justifyContent: "flex-start", gap: 7, marginTop: 9, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(107,114,128,0.22)" }, messageAction: { minHeight: 32, borderRadius: 10, borderWidth: 1, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 5 }, messageActionText: { fontSize: 11, fontWeight: "700" as any }, toolbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 }, toolbarBrand: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, toolbarCopy: { flex: 1, alignItems: "flex-end", paddingHorizontal: 4 }, toolbarTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" as any, textAlign: "right" }, toolbarSubtitle: { fontSize: 10, lineHeight: 15, marginTop: 1, textAlign: "right" }, toolbarButton: { minHeight: 42, borderRadius: 13, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7 }, toolbarButtonText: { fontSize: 12, fontWeight: "700" as any }, newButton: { minHeight: 42, borderRadius: 13, paddingHorizontal: 11, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 5 }, newButtonText: { fontSize: 12, fontWeight: "600" as any }, activeScope: { flexDirection: "row", alignItems: "center", gap: 7, marginHorizontal: 16, marginTop: 10, paddingHorizontal: 10, minHeight: 34, borderRadius: 10, borderWidth: 1 }, activeScopeText: { flex: 1, textAlign: "right", fontSize: 11 }, privacyNote: { flexDirection: "row", alignItems: "center", gap: 7, marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 12, borderWidth: 1 }, privacyText: { flex: 1, textAlign: "right", fontSize: 11, lineHeight: 18 }, messages: { flex: 1 }, messagesContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, gap: 12 }, messageRow: { alignItems: "flex-start" }, userRow: { alignItems: "flex-end" }, messageBubble: { maxWidth: "88%", borderRadius: 20, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 12, shadowColor: "#0F172A", shadowOpacity: 0.035, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 1 },   messageText: { flexShrink: 1, textAlign: "right", fontSize: 14, lineHeight: 22, includeFontPadding: true }, messageAttachments: { gap: 4, marginBottom: 6 }, messageAttachment: { textAlign: "right", fontSize: 10 }, typing: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 10 }, typingText: { fontSize: 12 }, quickPrompts: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 }, quickTitle: { textAlign: "right", fontSize: 12, marginBottom: 8, fontWeight: "700" as any }, quickWrap: { gap: 8 }, quickChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 11, minHeight: 42, justifyContent: "center" }, quickText: { textAlign: "right", fontSize: 12, lineHeight: 17 },   composer: { marginHorizontal: 12, marginBottom: 10, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderRadius: 22, shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }, composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 }, fileStrip: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }, fileChip: { maxWidth: "100%", minHeight: 32, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 5 }, fileName: { maxWidth: 150, fontSize: 10 }, attachButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, input: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 10, fontSize: 14, lineHeight: 20 }, sendButton: { minWidth: 46, height: 46, borderRadius: 16, paddingHorizontal: 11, flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center" }, stopText: { color: "#fff", fontSize: 11, fontWeight: "700" as any }, disabled: { opacity: 0.45 }, drawerModalSafeArea: { flex: 1, backgroundColor: "transparent" }, settingsModalSafeArea: { flex: 1, backgroundColor: "transparent" }, settingsBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 18, backgroundColor: "rgba(15,23,42,0.42)" }, settingsBackdropTouchable: { ...StyleSheet.absoluteFillObject }, settingsModal: { width: "100%", maxWidth: 500, maxHeight: "82%", alignSelf: "center", borderRadius: 22, borderWidth: 1, overflow: "hidden", elevation: 14, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }, settingsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 13, borderBottomWidth: StyleSheet.hairlineWidth }, settingsHeaderCopy: { flex: 1, alignItems: "flex-end", paddingTop: 14 }, settingsContent: { paddingVertical: 14 }, settingsSection: { paddingHorizontal: 16, paddingVertical: 10 }, drawerOverlay: { flex: 1, flexDirection: "row", backgroundColor: "rgba(15,23,42,0.28)" }, drawerBackdrop: { flex: 1 }, drawer: { width: "75%", maxWidth: 420, alignSelf: "stretch", paddingTop: 10, elevation: 12, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: -4, height: 0 } }, drawerListWrap: { flex: 1 }, drawerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 13, borderBottomWidth: StyleSheet.hairlineWidth }, drawerTitle: { textAlign: "right", fontSize: 18, fontWeight: "800" as any }, drawerSubtitle: { textAlign: "right", fontSize: 11, marginTop: 4 }, closeButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, scopeSection: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 9 }, sectionTitle: { textAlign: "right", fontSize: 15, fontWeight: "800" as any }, sectionHint: { textAlign: "right", fontSize: 11, lineHeight: 18, marginTop: 4 }, scopeCard: { marginHorizontal: 16, marginBottom: 8, minHeight: 66, borderRadius: 15, borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "center", gap: 9 }, scopeIcon: { width: 37, height: 37, borderRadius: 11, alignItems: "center", justifyContent: "center" }, scopeCopy: { flex: 1, alignItems: "flex-end" }, scopeTitle: { textAlign: "right", fontSize: 13, fontWeight: "700" as any }, scopeSubtitle: { textAlign: "right", fontSize: 10, marginTop: 3 }, archiveSection: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 30 }, memorySection: { marginHorizontal: 16, marginTop: 12, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth }, memoryActions: { flexDirection: "row", gap: 7, marginTop: 8 }, memoryButton: { flex: 1, minHeight: 40, borderRadius: 11, borderWidth: 1, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, memoryButtonText: { fontSize: 11, fontWeight: "700" as any }, archiveTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, archiveCount: { fontSize: 12 }, emptyArchive: { textAlign: "right", fontSize: 12, paddingVertical: 12 }, archiveCard: { minHeight: 62, borderWidth: 1, borderRadius: 14, marginBottom: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" }, archiveMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9 }, archiveCopy: { flex: 1, alignItems: "flex-end" }, archiveItemTitle: { textAlign: "right", fontSize: 12, fontWeight: "700" as any }, archiveDate: { textAlign: "right", fontSize: 10, marginTop: 3 }, archiveDelete: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
