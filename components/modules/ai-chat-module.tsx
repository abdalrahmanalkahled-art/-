import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useColors } from "@/hooks/use-colors";
import { getItemsForKeys, STORAGE_KEYS } from "@/lib/storage";
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
  { id: "field", title: "الميدان", subtitle: "الفعاليات ورصد المنافسين والجودة", icon: "location-on", keys: [STORAGE_KEYS.EVENTS, STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS, STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS] },
  { id: "plan", title: "الخطة التسويقية", subtitle: "الأهداف والنتائج المرتبطة", icon: "flag", keys: [STORAGE_KEYS.MARKETING_GOALS] },
  { id: "surveys", title: "الاستبيانات", subtitle: "نتائج الزيارات والاستبيانات", icon: "poll", keys: [STORAGE_KEYS.SURVEY_RESULTS] },
  { id: "reference", title: "البيانات المرجعية", subtitle: "المحلات والماركات والمناطق", icon: "storage", keys: [STORAGE_KEYS.STORES, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS] },
];
const DEFAULT_SCOPE_IDS = SCOPE_OPTIONS.map((option) => option.id);

const pickSummary = (items: unknown[], fields: string[]) => items.slice(-12).map((item) => {
  if (!item || typeof item !== "object") return item;
  return Object.fromEntries(fields.map((field) => [field, (item as Record<string, unknown>)[field]]).filter(([, value]) => value !== undefined && value !== null && value !== ""));
});

async function buildLocalContext(scopeIds: string[]): Promise<string> {
  const selectedOptions = SCOPE_OPTIONS.filter((option) => scopeIds.includes(option.id));
  const keys = [...new Set(selectedOptions.flatMap((option) => option.keys))];
  const data = await getItemsForKeys<unknown>(keys);
  const list = (key: string) => data[key] || [];
  const context: Record<string, unknown> = { selectedScopes: selectedOptions.map((option) => option.title), counts: Object.fromEntries(keys.map((key) => [key, list(key).length])) };
  if (keys.includes(STORAGE_KEYS.EVENTS)) context.events = pickSummary(list(STORAGE_KEYS.EVENTS), ["title", "eventDate", "region", "brandName", "status", "attendeesCount", "giftsDistributed", "goalId"]);
  if (keys.includes(STORAGE_KEYS.MARKETING_GOALS)) context.goals = pickSummary(list(STORAGE_KEYS.MARKETING_GOALS), ["title", "brandName", "startDate", "endDate", "currentValue", "targetValue", "completionPercentage", "status"]);
  if (keys.includes(STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS)) context.competitorObservations = pickSummary(list(STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS), ["competitorName", "storeName", "region", "kind", "message", "createdAt"]);
  if (keys.includes(STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS)) context.executionAssessments = pickSummary(list(STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS), ["subjectType", "subjectName", "region", "score", "createdAt"]);
  if (keys.includes(STORAGE_KEYS.SURVEY_RESULTS)) context.surveyResults = pickSummary(list(STORAGE_KEYS.SURVEY_RESULTS), ["storeName", "region", "brandName", "surveyDate", "createdAt"]);
  if (keys.includes(STORAGE_KEYS.STORES)) context.stores = pickSummary(list(STORAGE_KEYS.STORES), ["name", "region", "category"]);
  if (keys.includes(STORAGE_KEYS.BRANDS)) context.brands = pickSummary(list(STORAGE_KEYS.BRANDS), ["name", "isActive"]);
  if (keys.includes(STORAGE_KEYS.REGIONS)) context.regions = pickSummary(list(STORAGE_KEYS.REGIONS), ["name", "isActive"]);
  return JSON.stringify(context, null, 2).slice(0, 30000);
}

const WELCOME: ChatMessage = { id: "welcome", role: "model", text: "مرحباً، أنا مساعدك للتسويق الميداني. اختر نطاق البيانات من اللوحة الجانبية، ثم اطرح سؤالك." };

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
  const [context, setContext] = useState("");
  const [contextLoading, setContextLoading] = useState(true);
  const [aiModel, setAiModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(DEFAULT_SCOPE_IDS);
  const [scopeHydrated, setScopeHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [archive, setArchive] = useState<ChatArchiveItem[]>([]);
  const [conversationId, setConversationId] = useState(() => `conversation-${Date.now()}`);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatArchiveItem | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messageListRef = useRef<FlatList<ChatMessage>>(null);
  const aiChatMutation = trpc.ai.chat.useMutation();

  const refreshContext = useCallback(async (scopeIds: string[]) => {
    setContextLoading(true);
    try { setContext(await buildLocalContext(scopeIds)); } catch { setContext(""); } finally { setContextLoading(false); }
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
          if (Array.isArray(parsed) && parsed.length) setSelectedScopes(parsed.filter((id) => DEFAULT_SCOPE_IDS.includes(id)));
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
  }, []);

  const openArchivedConversation = useCallback((item: ChatArchiveItem) => {
    setConversationId(item.id);
    setMessages(item.messages.length ? item.messages : [WELCOME]);
    setSelectedScopes(item.scopeIds.length ? item.scopeIds : DEFAULT_SCOPE_IDS);
    setDrawerVisible(false);
  }, []);

  const toggleScope = useCallback((scopeId: string) => {
    setSelectedScopes((current) => current.includes(scopeId) ? (current.length === 1 ? current : current.filter((id) => id !== scopeId)) : [...current, scopeId]);
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
      const response = await aiChatMutation.mutateAsync({ question: text, context, history, attachments });
      setMessages((current) => current.map((item) => item.id === modelMessageId ? { ...item, text: response.text } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر الحصول على إجابة حالياً";
      setMessages((current) => current.map((item) => item.id === modelMessageId ? { ...item, text: `تعذر إكمال الطلب: ${message}` } : item));
    } finally {
      setIsStreaming(false);
    }
  }, [aiChatMutation, aiModel, context, history, isStreaming, question, selectedFiles]);

  const deleteConversation = useCallback(async () => {
    if (!deleteTarget) return;
    const next = archive.filter((item) => item.id !== deleteTarget.id);
    setArchive(next);
    await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
    if (deleteTarget.id === conversationId) startNewConversation();
    setDeleteTarget(null);
  }, [archive, conversationId, deleteTarget, startNewConversation]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.toolbarButton, { backgroundColor: colors.primary + "12" }]} onPress={() => setDrawerVisible(true)} activeOpacity={0.75}>
          <MaterialIcons name="tune" size={20} color={colors.primary} />
          <Text style={[styles.toolbarButtonText, { color: colors.primary }]}>النطاق والأرشيف</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.newButton, { borderColor: colors.border }]} onPress={startNewConversation} activeOpacity={0.75}>
          <MaterialIcons name="add" size={19} color={colors.foreground} />
          <Text style={[styles.newButtonText, { color: colors.foreground }]}>محادثة جديدة</Text>
        </TouchableOpacity>
            </View>

      <FlatList ref={messageListRef} data={messages} keyExtractor={(item) => item.id} style={styles.messages} contentContainerStyle={styles.messagesContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled removeClippedSubviews={false} onContentSizeChange={() => messageListRef.current?.scrollToEnd({ animated: true })} renderItem={({ item }) => (
        <View style={[styles.messageRow, item.role === "user" && styles.userRow]}>
          <View style={[styles.messageBubble, { backgroundColor: item.role === "user" ? colors.primary : colors.surface, borderColor: item.role === "user" ? colors.primary : colors.border }]}>
            {item.attachmentNames?.length ? <View style={styles.messageAttachments}>{item.attachmentNames.map((name) => <Text key={name} style={[styles.messageAttachment, { color: item.role === "user" ? "#fff" : colors.primary }]} numberOfLines={1}>📎 {name}</Text>)}</View> : null}
            <Text style={[styles.messageText, { color: item.role === "user" ? "#fff" : colors.foreground }]}>{item.text}</Text>
          </View>
        </View>
      )} ListFooterComponent={isStreaming ? <View style={styles.typing}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.typingText, { color: colors.muted }]}>يكتب الآن…</Text></View> : null} />

      {messages.length === 1 ? <View style={styles.quickPrompts}><Text style={[styles.quickTitle, { color: colors.muted }]}>أسئلة سريعة</Text><View style={styles.quickWrap}>{QUICK_PROMPTS.map((prompt) => <TouchableOpacity key={prompt} style={[styles.quickChip, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => void sendMessage(prompt)} disabled={contextLoading || isStreaming} activeOpacity={0.75}><Text style={[styles.quickText, { color: colors.foreground }]}>{prompt}</Text></TouchableOpacity>)}</View></View> : null}

      <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.background }]}>
        {selectedFiles.length > 0 ? <View style={styles.fileStrip}>{selectedFiles.map((file) => <View key={`${file.uri}-${file.name}`} style={[styles.fileChip, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="insert-drive-file" size={16} color={colors.primary} /><Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text><TouchableOpacity onPress={() => setSelectedFiles((current) => current.filter((item) => item.uri !== file.uri))} activeOpacity={0.75}><MaterialIcons name="close" size={15} color={colors.muted} /></TouchableOpacity></View>)}</View> : null}
        <View style={styles.composerRow}>
          <TouchableOpacity style={[styles.attachButton, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => void pickFiles()} disabled={contextLoading || isStreaming} activeOpacity={0.75}><MaterialIcons name="attach-file" size={20} color={colors.primary} /></TouchableOpacity>
          <TextInput value={question} onChangeText={setQuestion} placeholder={contextLoading ? "يُجهّز نطاق البيانات…" : "اكتب سؤالك هنا"} placeholderTextColor={colors.muted} multiline maxLength={3000} editable={!contextLoading && !isStreaming} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} textAlign="right" onSubmitEditing={() => void sendMessage()} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="إرسال الرسالة" style={[styles.sendButton, { backgroundColor: colors.primary }, (isStreaming || !question.trim()) && styles.disabled]} onPress={() => void sendMessage()} disabled={contextLoading || isStreaming} activeOpacity={0.8}><MaterialIcons name="send" size={21} color="#fff" /></TouchableOpacity>
        </View>
      </View>

      <Modal visible={drawerVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setDrawerVisible(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={() => setDrawerVisible(false)} />
          <View style={[styles.drawer, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 10) }]}>
            <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}><View><Text style={[styles.drawerTitle, { color: colors.foreground }]}>النطاق والأرشيف</Text><Text style={[styles.drawerSubtitle, { color: colors.muted }]}>تحكم بما يُرسل واحفظ محادثاتك</Text></View><TouchableOpacity onPress={() => setDrawerVisible(false)} style={styles.closeButton} activeOpacity={0.75}><MaterialIcons name="close" size={22} color={colors.foreground} /></TouchableOpacity></View>
            <FlatList data={SCOPE_OPTIONS} keyExtractor={(item) => item.id} ListHeaderComponent={<View style={styles.scopeSection}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>نطاق البيانات</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>اختر مجموعة واحدة على الأقل للسياق المرسل مع السؤال.</Text></View>} renderItem={({ item }) => { const selected = selectedScopes.includes(item.id); return <TouchableOpacity style={[styles.scopeCard, { backgroundColor: selected ? colors.primary + "12" : colors.surface, borderColor: selected ? colors.primary : colors.border }]} onPress={() => toggleScope(item.id)} activeOpacity={0.78}><View style={[styles.scopeIcon, { backgroundColor: selected ? colors.primary : colors.primary + "14" }]}><MaterialIcons name={item.icon} size={19} color={selected ? "#fff" : colors.primary} /></View><View style={styles.scopeCopy}><Text style={[styles.scopeTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.scopeSubtitle, { color: colors.muted }]}>{item.subtitle}</Text></View><MaterialIcons name={selected ? "check-circle" : "radio-button-unchecked"} size={21} color={selected ? colors.primary : colors.muted} /></TouchableOpacity>; }} ListFooterComponent={<View style={styles.archiveSection}><View style={styles.archiveTitleRow}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>أرشيف المحادثات</Text><Text style={[styles.archiveCount, { color: colors.muted }]}>{archive.length}</Text></View>{archive.length === 0 ? <Text style={[styles.emptyArchive, { color: colors.muted }]}>لا توجد محادثات محفوظة بعد.</Text> : archive.map((item) => <View key={item.id} style={[styles.archiveCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><TouchableOpacity style={styles.archiveMain} onPress={() => openArchivedConversation(item)} activeOpacity={0.75}><MaterialIcons name="chat-bubble-outline" size={18} color={colors.primary} /><View style={styles.archiveCopy}><Text style={[styles.archiveItemTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text><Text style={[styles.archiveDate, { color: colors.muted }]}>{new Date(item.updatedAt).toLocaleDateString("ar-EG")}</Text></View></TouchableOpacity><TouchableOpacity style={styles.archiveDelete} onPress={() => setDeleteTarget(item)} activeOpacity={0.75}><MaterialIcons name="delete-outline" size={20} color={colors.error} /></TouchableOpacity></View>)}</View>} />
          </View>
        </View>
      </Modal>

      <ConfirmDialog visible={deleteTarget !== null} title="حذف المحادثة" message="سيتم حذف هذه المحادثة من أرشيف الجهاز نهائياً. هل تريد المتابعة؟" confirmText="حذف المحادثة" isDangerous icon="delete-outline" onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteConversation()} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth }, toolbarButton: { minHeight: 42, borderRadius: 13, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7 }, toolbarButtonText: { fontSize: 12, fontWeight: "700" as any }, newButton: { minHeight: 42, borderRadius: 13, paddingHorizontal: 11, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 5 }, newButtonText: { fontSize: 12, fontWeight: "600" as any }, activeScope: { flexDirection: "row", alignItems: "center", gap: 7, marginHorizontal: 16, marginTop: 10, paddingHorizontal: 10, minHeight: 34, borderRadius: 10, borderWidth: 1 }, activeScopeText: { flex: 1, textAlign: "right", fontSize: 11 }, privacyNote: { flexDirection: "row", alignItems: "center", gap: 7, marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 12, borderWidth: 1 }, privacyText: { flex: 1, textAlign: "right", fontSize: 11, lineHeight: 18 }, messages: { flex: 1 }, messagesContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 10 }, messageRow: { alignItems: "flex-start" }, userRow: { alignItems: "flex-end" }, messageBubble: { maxWidth: "86%", borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },   messageText: { flexShrink: 1, textAlign: "right", fontSize: 14, lineHeight: 22, includeFontPadding: true }, messageAttachments: { gap: 4, marginBottom: 6 }, messageAttachment: { textAlign: "right", fontSize: 10 }, typing: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 10 }, typingText: { fontSize: 12 }, quickPrompts: { paddingHorizontal: 16, paddingBottom: 9 }, quickTitle: { textAlign: "right", fontSize: 12, marginBottom: 7 }, quickWrap: { gap: 7 }, quickChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 }, quickText: { textAlign: "right", fontSize: 12 },   composer: { marginHorizontal: 12, marginBottom: 10, paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 }, fileStrip: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }, fileChip: { maxWidth: "100%", minHeight: 32, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 5 }, fileName: { maxWidth: 150, fontSize: 10 }, attachButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, input: { flex: 1, minHeight: 44, maxHeight: 110, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 9, fontSize: 14 }, sendButton: { minWidth: 44, height: 44, borderRadius: 14, paddingHorizontal: 10, flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center" }, stopText: { color: "#fff", fontSize: 11, fontWeight: "700" as any }, disabled: { opacity: 0.45 }, drawerOverlay: { flex: 1, flexDirection: "row", backgroundColor: "rgba(15,23,42,0.28)" }, drawerBackdrop: { flex: 1 }, drawer: { width: "87%", maxWidth: 390, paddingTop: 10, elevation: 12, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: -4, height: 0 } }, drawerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 13, borderBottomWidth: StyleSheet.hairlineWidth }, drawerTitle: { textAlign: "right", fontSize: 18, fontWeight: "800" as any }, drawerSubtitle: { textAlign: "right", fontSize: 11, marginTop: 4 }, closeButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, scopeSection: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 9 }, sectionTitle: { textAlign: "right", fontSize: 15, fontWeight: "800" as any }, sectionHint: { textAlign: "right", fontSize: 11, lineHeight: 18, marginTop: 4 }, scopeCard: { marginHorizontal: 16, marginBottom: 8, minHeight: 66, borderRadius: 15, borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "center", gap: 9 }, scopeIcon: { width: 37, height: 37, borderRadius: 11, alignItems: "center", justifyContent: "center" }, scopeCopy: { flex: 1, alignItems: "flex-end" }, scopeTitle: { textAlign: "right", fontSize: 13, fontWeight: "700" as any }, scopeSubtitle: { textAlign: "right", fontSize: 10, marginTop: 3 }, archiveSection: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 30 }, archiveTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, archiveCount: { fontSize: 12 }, emptyArchive: { textAlign: "right", fontSize: 12, paddingVertical: 12 }, archiveCard: { minHeight: 62, borderWidth: 1, borderRadius: 14, marginBottom: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" }, archiveMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9 }, archiveCopy: { flex: 1, alignItems: "flex-end" }, archiveItemTitle: { textAlign: "right", fontSize: 12, fontWeight: "700" as any }, archiveDate: { textAlign: "right", fontSize: 10, marginTop: 3 }, archiveDelete: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
