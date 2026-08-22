import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { useColors } from "@/hooks/use-colors";
import { SuccessModal } from "@/components/success-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getReportHistory, removeReportRecords, type ReportRecord } from "@/lib/report-history";

export function ReportsCenterModule() {
  const colors = useColors();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const loadReports = useCallback(async () => {
    try {
      setReports(await getReportHistory());
    } catch (error) {
      console.error("Failed to load reports history", error);
      Alert.alert("خطأ", "تعذر تحميل سجل التقارير");
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const shareReport = async (report: ReportRecord) => {
    try {
      if (Platform.OS === "web") {
        Alert.alert("التقارير على الويب", "يتم تنزيل التقرير مباشرة من قسمه الأصلي.");
        return;
      }
      const fileInfo = await FileSystem.getInfoAsync(report.uri);
      if (!fileInfo.exists) {
        Alert.alert("الملف غير متاح", "تم حذف الملف من الجهاز أو نقل مساره.");
        return;
      }
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("المشاركة غير متاحة", "لا تتوفر نافذة مشاركة على هذا الجهاز.");
        return;
      }
      await Sharing.shareAsync(report.uri, { dialogTitle: `مشاركة ${report.title}` });
    } catch (error) {
      console.error("Failed to share report", error);
      Alert.alert("خطأ", "تعذر مشاركة التقرير");
    }
  };

  const deleteRecord = (id: string) => setPendingDeleteIds([id]);

  const toggleSelection = (id: string) => {
    setSelectionMode(true);
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };
  const exitSelection = () => { setSelectionMode(false); setSelectedIds([]); };
  const selectAll = () => setSelectedIds((current) => current.length === reports.length ? [] : reports.map((report) => report.id));
  const deleteSelected = () => {
    if (!selectedIds.length) return;
    setPendingDeleteIds(selectedIds);
  };
  const confirmDelete = async () => {
    if (!pendingDeleteIds.length) return;
    await removeReportRecords(pendingDeleteIds);
    setPendingDeleteIds([]);
    exitSelection();
    await loadReports();
    setSuccessVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {selectionMode ? <>
          <TouchableOpacity onPress={exitSelection} style={styles.headerAction}><Text style={[styles.headerActionText, { color: colors.muted }]}>إلغاء</Text></TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>{selectedIds.length} محدد</Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity onPress={selectAll} style={styles.headerIcon} accessibilityLabel="تحديد الكل"><MaterialIcons name={selectedIds.length === reports.length && reports.length ? "check-box" : "select-all"} size={22} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity disabled={!selectedIds.length} onPress={deleteSelected} style={[styles.headerIcon, !selectedIds.length && styles.disabled]} accessibilityLabel="حذف المحدد"><MaterialIcons name="delete-outline" size={22} color={colors.error} /></TouchableOpacity>
          </View>
        </> : <>
          <Text style={[styles.title, { color: colors.foreground }]}>مركز التقارير ({reports.length})</Text>
          <TouchableOpacity onPress={() => void loadReports()} accessibilityLabel="تحديث التقارير" style={styles.refreshButton}><MaterialIcons name="refresh" size={22} color={colors.primary} /></TouchableOpacity>
        </>}
      </View>
      <Text style={[styles.description, { color: colors.muted }]}>{selectionMode ? "اضغط على التقارير لتحديدها أو إلغاء تحديدها، ثم احذف المحدد بعد التأكيد." : "تظهر هنا التقارير التي تم إنشاؤها بنجاح من المحلات والفعاليات والاستبيانات. اضغط مطولاً على أي تقرير لبدء التحديد."}</Text>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={reports.length ? styles.list : styles.emptyList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="assessment" size={52} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد تقارير محفوظة</Text>
            <Text style={[styles.emptyDescription, { color: colors.muted }]}>أنشئ تقرير PDF أو Excel أو CSV من أي قسم وسيظهر هنا تلقائياً.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          return <TouchableOpacity onLongPress={() => toggleSelection(item.id)} onPress={() => selectionMode ? toggleSelection(item.id) : undefined} activeOpacity={selectionMode ? 0.76 : 1} style={[styles.card, { backgroundColor: selected ? colors.primary + "10" : colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
            <View style={styles.cardTop}>
              {selectionMode ? <MaterialIcons name={selected ? "check-circle" : "radio-button-unchecked"} size={23} color={selected ? colors.primary : colors.muted} /> : null}
              <View style={[styles.typeBadge, { backgroundColor: colors.primary + "20" }]}> 
                <Text style={[styles.typeText, { color: colors.primary }]}>{item.type}</Text>
              </View>
              <Text numberOfLines={2} style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
            </View>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>{item.date}{item.size ? ` • ${Math.max(1, Math.round(item.size / 1024))} ك.ب` : ""}</Text>
            {!selectionMode && <View style={styles.actions}>
              <TouchableOpacity onPress={() => void shareReport(item)} style={[styles.shareButton, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="share" size={16} color="#fff" />
                <Text style={styles.shareText}>مشاركة</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void deleteRecord(item.id)} style={[styles.deleteButton, { borderColor: colors.error }]}> 
                <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                <Text style={[styles.deleteText, { color: colors.error }]}>حذف نهائي</Text>
              </TouchableOpacity>
            </View>}
          </TouchableOpacity>;
        }}
      />
      <SuccessModal visible={successVisible} message="تم حذف التقارير المحددة بنجاح" onClose={() => setSuccessVisible(false)} duration={2200} />
      <ConfirmDialog
        visible={Boolean(pendingDeleteIds.length)}
        title="حذف التقارير"
        message={`سيتم حذف ${pendingDeleteIds.length} ${pendingDeleteIds.length === 1 ? "تقرير" : "تقارير"} وملفاتها المحفوظة نهائياً من الهاتف. لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        isDangerous
        icon="warning"
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={() => void confirmDelete()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  refreshButton: { padding: 6 },
  headerAction: { minWidth: 48, padding: 6 },
  headerActionText: { fontSize: 13, fontWeight: "700", textAlign: "left" },
  selectionActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerIcon: { padding: 6 },
  disabled: { opacity: 0.4 },
  description: { fontSize: 13, lineHeight: 20, paddingVertical: 12, textAlign: "left" },
  list: { gap: 12, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  emptyState: { alignItems: "center", gap: 8, justifyContent: "center", padding: 36 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDescription: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  card: { borderRadius: 14, borderWidth: 1, gap: 8, padding: 14 },
  cardTop: { alignItems: "center", flexDirection: "row", gap: 10 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: "700" },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "left" },
  cardMeta: { fontSize: 12, textAlign: "left" },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  shareButton: { alignItems: "center", borderRadius: 8, flexDirection: "row", gap: 5, paddingHorizontal: 12, paddingVertical: 8 },
  shareText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  deleteButton: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { fontSize: 13, fontWeight: "600" },
});
