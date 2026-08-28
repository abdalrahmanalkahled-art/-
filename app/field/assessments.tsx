import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { router } from "expo-router";

import { CardActionModal } from "@/components/card-action-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AppPageHeader } from "@/components/app-page-header";
import { AssessmentEditorModal } from "@/components/field-intelligence/assessment-editor-modal";
import { FieldEmptyState, FieldListHero, FieldRecordCard, formatFieldDate } from "@/components/field-intelligence/field-record-ui";
import { ScreenContainer } from "@/components/screen-container";
import { SuccessModal } from "@/components/success-modal";
import { useColors } from "@/hooks/use-colors";
import { closeTopOverlay, useOverlayBackHandler } from "@/lib/use-overlay-back-handler";
import { logAudit } from "@/lib/audit-log";
import { type ExecutionAssessment } from "@/lib/field-marketing-model";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";

const subjectLabel: Record<ExecutionAssessment["subjectType"], string> = { store: "محل", event: "فعالية", signage: "لوحة أو ستاند" };

export default function FieldAssessmentsScreen() {
  const colors = useColors();
  const [assessments, setAssessments] = useState<ExecutionAssessment[]>([]);
  const [selected, setSelected] = useState<ExecutionAssessment | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const load = useCallback(async () => {
    const items = await getItems<ExecutionAssessment>(STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS);
    setAssessments([...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const closeOverlays = useCallback(() => closeTopOverlay([
    () => { if (confirmDelete) { setConfirmDelete(false); return true; } return false; },
    () => { if (actionsOpen) { setActionsOpen(false); return true; } return false; },
    () => { if (editOpen) { setEditOpen(false); return true; } return false; },
  ]), [actionsOpen, confirmDelete, editOpen]);
  useOverlayBackHandler(closeOverlays);

  const saveEdited = async (item: ExecutionAssessment) => {
    const current = await getItems<ExecutionAssessment>(STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS);
    const exists = current.some((entry) => entry.id === item.id);
    const next = exists ? current.map((entry) => entry.id === item.id ? item : entry) : [item, ...current];
    await saveItems(STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS, next);
    setAssessments([...next].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    setEditOpen(false);
    setSelected(item);
    setSuccessMessage("تم حفظ تعديل تقييم الجودة");
    void logAudit("UPDATE", "جودة التنفيذ", `تعديل تقييم ${item.subjectName}: ${item.score}/5`);
  };

  const deleteSelected = async () => {
    if (!selected || deleting) return;
    setDeleting(true);
    try {
      const current = await getItems<ExecutionAssessment>(STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS);
      await saveItems(STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS, current.filter((entry) => entry.id !== selected.id));
      setAssessments((items) => items.filter((entry) => entry.id !== selected.id));
      setConfirmDelete(false);
      setSelected(null);
      setSuccessMessage("تم حذف تقييم الجودة");
      void logAudit("DELETE", "جودة التنفيذ", `حذف تقييم ${selected.subjectName}`);
    } finally { setDeleting(false); }
  };

  const listHeader = useMemo(() => <>
    <FieldListHero icon="fact-check" title="جودة التنفيذ" subtitle="قِس جودة الظهور والهوية وحالة المواد في كل موقع." count={assessments.length} accent={colors.primary} />
    <Text style={[styles.hint, { color: colors.muted }]}>اضغط على البطاقة لعرض التفاصيل، أو اضغط مطولاً للتعديل والحذف.</Text>
  </>, [assessments.length, colors.muted, colors.primary]);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <AppPageHeader title="جودة التنفيذ" subtitle="سجل مستقل للتقييمات الميدانية" onBack={() => router.back()} />
    <FlatList data={assessments} keyExtractor={(item) => item.id} ListHeaderComponent={listHeader} contentContainerStyle={assessments.length ? styles.list : styles.emptyList} showsVerticalScrollIndicator={false} renderItem={({ item }) => <FieldRecordCard icon="fact-check" title={item.subjectName} subtitle={`${subjectLabel[item.subjectType]}${item.region ? ` · ${item.region}` : ""}`} meta={`${formatFieldDate(item.createdAt)} · وضوح ${item.visibility}/5 · هوية ${item.brandAlignment}/5`} value={`${item.score}/5`} accent={colors.primary} accessibilityLabel={`تفاصيل تقييم ${item.subjectName}`} onPress={() => router.push({ pathname: "/field/assessments/[id]", params: { id: item.id } })} onLongPress={() => { setSelected(item); setActionsOpen(true); }} />} ListEmptyComponent={<FieldEmptyState icon="fact-check" title="لا توجد تقييمات جودة" subtitle="أضف تقييماً من أدوات التنفيذ الميداني لتظهر السجلات هنا." />} />
    <CardActionModal visible={actionsOpen} title={selected ? `تقييم ${selected.subjectName}` : "تقييم جودة"} description="اختر الإجراء المطلوب لهذا السجل." onClose={() => setActionsOpen(false)} actions={[{ id: "edit", label: "تعديل التقييم", icon: "edit", tone: "primary", onPress: () => { setActionsOpen(false); setEditOpen(true); } }, { id: "delete", label: "حذف التقييم نهائياً", icon: "delete-outline", tone: "danger", onPress: () => { setActionsOpen(false); setConfirmDelete(true); } }]} />
    <ConfirmDialog visible={confirmDelete} title="حذف تقييم الجودة؟" message={`سيُحذف تقييم ${selected?.subjectName || "الموقع"} نهائياً من هذا الجهاز.`} confirmText="حذف نهائي" isDangerous icon="warning" isSubmitting={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={() => void deleteSelected()} />
    <AssessmentEditorModal visible={editOpen} initial={selected} onClose={() => setEditOpen(false)} onSave={saveEdited} />
    <SuccessModal visible={Boolean(successMessage)} message={successMessage} onClose={() => setSuccessMessage("")} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({ list: { paddingBottom: 28, gap: 9 }, emptyList: { flexGrow: 1, paddingBottom: 28 }, hint: { marginHorizontal: 16, marginBottom: 4, fontSize: 11, textAlign: "right" } });
