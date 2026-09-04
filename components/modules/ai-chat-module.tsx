import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";
import { getItemsForKeys, STORAGE_KEYS } from "@/lib/storage";
import { trpc } from "@/lib/trpc";

type ChatMessage = { id: string; role: "user" | "model"; text: string };

const QUICK_PROMPTS = [
  "ما المناطق الأقل تغطية في الفعاليات؟",
  "لخّص أداء الماركات في الفعاليات الأخيرة.",
  "ما أهم فرص تحسين التنفيذ الميداني؟",
];

const CONTEXT_KEYS = [
  STORAGE_KEYS.STORES,
  STORAGE_KEYS.EVENTS,
  STORAGE_KEYS.MARKETING_GOALS,
  STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS,
  STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS,
  STORAGE_KEYS.SURVEY_RESULTS,
  STORAGE_KEYS.BRANDS,
  STORAGE_KEYS.REGIONS,
];

const pickSummary = (items: unknown[], fields: string[]) => items.slice(-12).map((item) => {
  if (!item || typeof item !== "object") return item;
  return Object.fromEntries(fields.map((field) => [field, (item as Record<string, unknown>)[field]]).filter(([, value]) => value !== undefined && value !== null && value !== ""));
});

async function buildLocalContext(): Promise<string> {
  const data = await getItemsForKeys<unknown>(CONTEXT_KEYS);
  const list = (key: string) => data[key] || [];
  const context = {
    counts: Object.fromEntries(CONTEXT_KEYS.map((key) => [key, list(key).length])),
    events: pickSummary(list(STORAGE_KEYS.EVENTS), ["title", "eventDate", "region", "brandName", "status", "attendeesCount", "giftsDistributed", "goalId"]),
    goals: pickSummary(list(STORAGE_KEYS.MARKETING_GOALS), ["title", "brandName", "startDate", "endDate", "currentValue", "targetValue", "completionPercentage", "status"]),
    competitorObservations: pickSummary(list(STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS), ["competitorName", "storeName", "region", "kind", "message", "createdAt"]),
    executionAssessments: pickSummary(list(STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS), ["subjectType", "subjectName", "region", "score", "createdAt"]),
    brands: pickSummary(list(STORAGE_KEYS.BRANDS), ["name", "isActive"]),
    regions: pickSummary(list(STORAGE_KEYS.REGIONS), ["name", "isActive"]),
  };
  return JSON.stringify(context, null, 2).slice(0, 30000);
}

export default function AIChatModule() {
  const colors = useColors();
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [contextLoading, setContextLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "model", text: "مرحباً، أنا مساعدك للتسويق الميداني. اطرح سؤالك وسأحلل البيانات المحلية المتاحة داخل التطبيق." },
  ]);
  const chatMutation = trpc.ai.chat.useMutation();

  useEffect(() => {
    let mounted = true;
    void buildLocalContext().then((value) => {
      if (mounted) {
        setContext(value);
        setContextLoading(false);
      }
    }).catch(() => {
      if (mounted) setContextLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const history = useMemo(() => messages.filter((message) => message.id !== "welcome").slice(-10).map(({ role, text }) => ({ role, text })), [messages]);

  const sendMessage = useCallback(async (preset?: string) => {
    const text = (preset ?? question).trim();
    if (!text || chatMutation.isPending) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", text };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    try {
      const result = await chatMutation.mutateAsync({ question: text, context, history });
      setMessages((current) => [...current, { id: `model-${Date.now()}`, role: "model", text: result.text }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر الحصول على إجابة حالياً";
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: "model", text: `تعذر إكمال الطلب: ${message}` }]);
    }
  }, [chatMutation, context, history, question]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.privacyNote, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "2A" }]}>
        <MaterialIcons name="lock-outline" size={17} color={colors.primary} />
        <Text style={[styles.privacyText, { color: colors.muted }]}>تُرسل ملخصات البيانات المطلوبة عند طرح السؤال فقط، ولا تُرسل الصور تلقائياً.</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.role === "user" && styles.userRow]}>
            <View style={[styles.messageBubble, { backgroundColor: item.role === "user" ? colors.primary : colors.surface, borderColor: item.role === "user" ? colors.primary : colors.border }]}>
              <Text style={[styles.messageText, { color: item.role === "user" ? "#fff" : colors.foreground }]}>{item.text}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={chatMutation.isPending ? <View style={styles.typing}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.typingText, { color: colors.muted }]}>يحلل البيانات…</Text></View> : null}
      />

      {messages.length === 1 ? (
        <View style={styles.quickPrompts}>
          <Text style={[styles.quickTitle, { color: colors.muted }]}>أسئلة سريعة</Text>
          <View style={styles.quickWrap}>
            {QUICK_PROMPTS.map((prompt) => (
              <TouchableOpacity key={prompt} style={[styles.quickChip, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => void sendMessage(prompt)} disabled={contextLoading || chatMutation.isPending} activeOpacity={0.75}>
                <Text style={[styles.quickText, { color: colors.foreground }]}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput value={question} onChangeText={setQuestion} placeholder={contextLoading ? "يُجهّز سياق التطبيق…" : "اكتب سؤالك هنا"} placeholderTextColor={colors.muted} multiline maxLength={3000} editable={!contextLoading && !chatMutation.isPending} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} textAlign="right" onSubmitEditing={() => void sendMessage()} />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }, (!question.trim() || contextLoading || chatMutation.isPending) && styles.disabled]} onPress={() => void sendMessage()} disabled={!question.trim() || contextLoading || chatMutation.isPending} activeOpacity={0.8}>
          <MaterialIcons name="send" size={21} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  privacyNote: { flexDirection: "row", alignItems: "center", gap: 7, marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 12, borderWidth: 1 },
  privacyText: { flex: 1, textAlign: "right", fontSize: 11, lineHeight: 18 },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  messageRow: { alignItems: "flex-start" },
  userRow: { alignItems: "flex-end" },
  messageBubble: { maxWidth: "86%", borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  messageText: { textAlign: "right", fontSize: 14, lineHeight: 22 },
  typing: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  typingText: { fontSize: 12 },
  quickPrompts: { paddingHorizontal: 16, paddingBottom: 9 },
  quickTitle: { textAlign: "right", fontSize: 12, marginBottom: 7 },
  quickWrap: { gap: 7 },
  quickChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 },
  quickText: { textAlign: "right", fontSize: 12 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  input: { flex: 1, minHeight: 44, maxHeight: 110, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 9, fontSize: 14 },
  sendButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
});
