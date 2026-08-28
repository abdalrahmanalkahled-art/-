import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { router } from "expo-router";

import { CardActionModal } from "@/components/card-action-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AppPageHeader } from "@/components/app-page-header";
import { ObservationEditorModal, type FieldStoreOption } from "@/components/field-intelligence/observation-editor-modal";
import { FieldEmptyState, FieldListHero, FieldRecordCard, formatFieldDate } from "@/components/field-intelligence/field-record-ui";
import { ScreenContainer } from "@/components/screen-container";
import { SuccessModal } from "@/components/success-modal";
import { useColors } from "@/hooks/use-colors";
import { closeTopOverlay, useOverlayBackHandler } from "@/lib/use-overlay-back-handler";
import { logAudit } from "@/lib/audit-log";
import { removeCompetitorObservationImages } from "@/lib/competitor-observation-media";
import { fieldObservationKindLabel, type CompetitorObservation } from "@/lib/field-marketing-model";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";

export default function FieldObservationsScreen() {
  const colors = useColors();
  const [observations, setObservations] = useState<CompetitorObservation[]>([]);
  const [stores, setStores] = useState<FieldStoreOption[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [selected, setSelected] = useState<CompetitorObservation | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const load = useCallback(async () => {
    const [storedObservations, storedStores, products] = await Promise.all([
      getItems<CompetitorObservation>(STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS),
      getItems<FieldStoreOption>(STORAGE_KEYS.STORES),
      getItems<{ type?: string; competitorName?: string }>(STORAGE_KEYS.PRODUCTS),
    ]);
    setObservations([...storedObservations].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    setStores(storedStores);
    setCompetitors([...new Set(products.filter((item) => item.type === "competitor" && item.competitorName).map((item) => item.competitorName!.trim()))].sort());
  }, []);

  useEffect(() => { void load(); }, [load]);

  const closeOverlays = useCallback(() => closeTopOverlay([
    () => { if (confirmDelete) { setConfirmDelete(false); return true; } return false; },
    () => { if (actionsOpen) { setActionsOpen(false); return true; } return false; },
    () => { if (editOpen) { setEditOpen(false); return true; } return false; },
  ]), [actionsOpen, confirmDelete, editOpen]);
  useOverlayBackHandler(closeOverlays);

  const saveEdited = async (item: CompetitorObservation) => {
    const current = await getItems<CompetitorObservation>(STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS);
    const exists = current.some((entry) => entry.id === item.id);
    const next = exists ? current.map((entry) => entry.id === item.id ? item : entry) : [item, ...current];
    await saveItems(STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS, next);
    setObservations([...next].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    setEditOpen(false);
    setSelected(item);
    setSuccessMessage("تم حفظ تعديل الرصد");
    void logAudit("UPDATE", "رصد المنافسين", `تعديل رصد ${item.competitorName} في ${item.storeName}`);
  };

  const deleteSelected = async () => {
    if (!selected || deleting) return;
    setDeleting(true);
    try {
      const current = await getItems<CompetitorObservation>(STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS);
      const target = current.find((entry) => entry.id === selected.id) || selected;
      await saveItems(STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS, current.filter((entry) => entry.id !== selected.id));
      await removeCompetitorObservationImages(target.photoUris || []);
      setObservations((items) => items.filter((entry) => entry.id !== selected.id));
      setConfirmDelete(false);
      setSelected(null);
      setSuccessMessage("تم حذف رصد المنافس والوسائط المرتبطة به");
      void logAudit("DELETE", "رصد المنافسين", `حذف رصد ${target.competitorName} في ${target.storeName}`);
    } finally {
      setDeleting(false);
    }
  };

  const listHeader = useMemo(() => <>
    <FieldListHero icon="radar" title="رصد المنافسين" subtitle="وثّق الظهور التسويقي في المحلات دون خلطه بالمبيعات." count={observations.length} accent={colors.warning} />
    <Text style={[styles.hint, { color: colors.muted }]}>اضغط على البطاقة لعرض التفاصيل، أو اضغط مطولاً للتعديل والحذف.</Text>
  </>, [colors.muted, colors.warning, observations.length]);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <AppPageHeader title="رصد المنافسين" subtitle="سجل مستقل للمتابعة الميدانية" onBack={() => router.back()} />
    <FlatList
      data={observations}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={listHeader}
      contentContainerStyle={observations.length ? styles.list : styles.emptyList}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => <FieldRecordCard icon="radar" title={item.competitorName} subtitle={`${item.storeName} · ${item.region || "منطقة غير محددة"}`} meta={`${fieldObservationKindLabel(item.kind)} · ${formatFieldDate(item.createdAt)}${item.photoUris?.length ? ` · ${item.photoUris.length} صورة` : ""}`} value={`${item.visibilityScore}/5`} valueColor={colors.warning} accent={colors.warning} accessibilityLabel={`تفاصيل رصد ${item.competitorName} في ${item.storeName}`} onPress={() => router.push({ pathname: "/field/observations/[id]", params: { id: item.id } })} onLongPress={() => { setSelected(item); setActionsOpen(true); }} />}
      ListEmptyComponent={<FieldEmptyState icon="radar" title="لا توجد أرصدة منافسين" subtitle="ابدأ من أدوات التنفيذ الميداني لإضافة أول رصد، ثم ستظهر السجلات هنا." />}
    />
    <CardActionModal visible={actionsOpen} title={selected ? `رصد ${selected.competitorName}` : "رصد منافس"} description="اختر الإجراء المطلوب لهذا السجل." onClose={() => setActionsOpen(false)} actions={[{ id: "edit", label: "تعديل الرصد", icon: "edit", tone: "primary", onPress: () => { setActionsOpen(false); setEditOpen(true); } }, { id: "delete", label: "حذف الرصد نهائياً", icon: "delete-outline", tone: "danger", onPress: () => { setActionsOpen(false); setConfirmDelete(true); } }]} />
    <ConfirmDialog visible={confirmDelete} title="حذف رصد المنافس؟" message={`سيُحذف سجل ${selected?.competitorName || "الرصد"} وصوره المحلية المرتبطة به نهائياً من هذا الجهاز.`} confirmText="حذف نهائي" isDangerous icon="warning" isSubmitting={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={() => void deleteSelected()} />
    <ObservationEditorModal visible={editOpen} initial={selected} competitors={competitors} stores={stores} onClose={() => setEditOpen(false)} onSave={saveEdited} />
    <SuccessModal visible={Boolean(successMessage)} message={successMessage} onClose={() => setSuccessMessage("")} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  list: { paddingBottom: 28, gap: 9 },
  emptyList: { flexGrow: 1, paddingBottom: 28 },
  hint: { marginHorizontal: 16, marginBottom: 4, fontSize: 11, textAlign: "right" },
});
