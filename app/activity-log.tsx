import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { clearAuditLogs, getAuditLogs, type AuditLogItem } from "@/lib/audit-log";

const ACTION_PRESENTATION: Record<AuditLogItem["action"], { label: string; icon: keyof typeof MaterialIcons.glyphMap; colorKey: "primary" | "success" | "warning" | "error" }> = {
  CREATE: { label: "إضافة", icon: "add-circle-outline", colorKey: "success" },
  UPDATE: { label: "تعديل", icon: "edit-note", colorKey: "primary" },
  DELETE: { label: "حذف", icon: "delete-outline", colorKey: "error" },
  BACKUP: { label: "نسخة احتياطية", icon: "backup", colorKey: "primary" },
  RESTORE: { label: "استعادة", icon: "restore", colorKey: "warning" },
  EXPORT: { label: "تصدير", icon: "file-download", colorKey: "success" },
  CLEANUP: { label: "تنظيف", icon: "delete-sweep", colorKey: "warning" },
};

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-US");
}

export default function ActivityLogScreen() {
  const colors = useColors();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try { setLogs(await getAuditLogs()); } finally { setIsLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void loadLogs(); }, [loadLogs]));

  const summary = useMemo(() => ({ total: logs.length, latest: logs[0]?.timestamp }), [logs]);
  const clearLog = async () => {
    setIsClearing(true);
    try { await clearAuditLogs(); setLogs([]); setShowClearConfirm(false); } finally { setIsClearing(false); }
  };

  return <ScreenContainer containerClassName="bg-background">
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]} accessibilityLabel="رجوع"><MaterialIcons name="arrow-forward" size={22} color={colors.foreground} /></TouchableOpacity>
      <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>سجل النشاط</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>العمليات المحفوظة على هذا الهاتف</Text></View>
    </View>
    <FlatList
      data={logs}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshing={isLoading}
      onRefresh={() => void loadLogs()}
      ListHeaderComponent={<><View style={[styles.summary, { backgroundColor: colors.primary, shadowColor: colors.primary }]}><View><Text style={styles.summaryValue}>{summary.total}</Text><Text style={styles.summaryLabel}>عملية محفوظة</Text></View><View style={styles.summaryCopy}><Text style={styles.summaryTitle}>سجل النشاط المحلي</Text><Text style={styles.summarySubtitle}>{summary.latest ? `آخر نشاط: ${formatTimestamp(summary.latest)}` : "سيظهر هنا ما تنفذه داخل التطبيق"}</Text></View><View style={styles.summaryIcon}><MaterialIcons name="history" size={24} color="#fff" /></View></View>{logs.length ? <TouchableOpacity onPress={() => setShowClearConfirm(true)} style={[styles.clearButton, { borderColor: colors.border }]}><MaterialIcons name="delete-sweep" size={18} color={colors.error} /><Text style={[styles.clearText, { color: colors.error }]}>مسح سجل النشاط</Text></TouchableOpacity> : null}</>}
      renderItem={({ item }) => {
        const presentation = ACTION_PRESENTATION[item.action] || ACTION_PRESENTATION.UPDATE;
        const color = colors[presentation.colorKey];
        return <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.rowCopy}><View style={styles.rowTitleLine}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{presentation.label}</Text><Text style={[styles.rowModule, { color }]}>{item.module}</Text></View><Text style={[styles.description, { color: colors.muted }]}>{item.description}</Text><Text style={[styles.time, { color: colors.muted }]}>{formatTimestamp(item.timestamp)}</Text></View><View style={[styles.iconBox, { backgroundColor: color + "16" }]}><MaterialIcons name={presentation.icon} size={21} color={color} /></View></View>;
      }}
      ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.primary + "14" }]}><MaterialIcons name="history-toggle-off" size={28} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا يوجد نشاط مسجل بعد</Text><Text style={[styles.emptySubtitle, { color: colors.muted }]}>ستظهر هنا العمليات الجديدة مثل الإضافة والتعديل والتصدير والنسخ الاحتياطي.</Text></View>}
    />
    <ConfirmDialog visible={showClearConfirm} title="مسح سجل النشاط؟" message="سيُحذف سجل النشاط من هذا الهاتف فقط. لا يؤثر ذلك على بيانات المحلات أو الاستبيانات أو التقارير." confirmText="مسح السجل" isDangerous isSubmitting={isClearing} icon="delete-sweep" onCancel={() => !isClearing && setShowClearConfirm(false)} onConfirm={() => void clearLog()} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  header: { height: 76, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "flex-end" }, headerTitle: { fontSize: 18, fontWeight: "800" as const, textAlign: "right" }, headerSubtitle: { fontSize: 11, marginTop: 2, textAlign: "right" },
  content: { padding: 14, paddingBottom: 36, gap: 9, flexGrow: 1 },
  summary: { minHeight: 120, borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  summaryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" }, summaryCopy: { flex: 1, alignItems: "flex-end" }, summaryTitle: { color: "#fff", fontSize: 16, fontWeight: "900" as const }, summarySubtitle: { color: "rgba(255,255,255,0.82)", fontSize: 10, marginTop: 5, textAlign: "right" }, summaryValue: { color: "#fff", fontSize: 25, fontWeight: "900" as const, textAlign: "left" }, summaryLabel: { color: "rgba(255,255,255,0.78)", fontSize: 10, marginTop: 2 },
  clearButton: { minHeight: 42, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, alignSelf: "flex-start" }, clearText: { fontSize: 12, fontWeight: "800" as const },
  row: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 11 }, iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, rowCopy: { flex: 1, alignItems: "flex-end" }, rowTitleLine: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, rowTitle: { fontSize: 14, fontWeight: "800" as const, textAlign: "right" }, rowModule: { fontSize: 11, fontWeight: "700" as const, textAlign: "left" }, description: { fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 5, width: "100%" }, time: { fontSize: 10, textAlign: "right", marginTop: 6, width: "100%" },
  empty: { borderWidth: 1, borderRadius: 18, padding: 24, alignItems: "center", marginTop: 20 }, emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" }, emptyTitle: { fontSize: 15, fontWeight: "800" as const, marginTop: 13 }, emptySubtitle: { fontSize: 11, textAlign: "center", lineHeight: 18, marginTop: 6, maxWidth: 270 }, loader: { marginTop: 32 },
});
