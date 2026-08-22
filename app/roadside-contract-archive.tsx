import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { CardActionModal } from "@/components/card-action-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ScreenContainer } from "@/components/screen-container";
import { SignageReportSettingsSheet } from "@/components/signage-report-settings-sheet";
import { SuccessModal } from "@/components/success-modal";
import { ReportFab } from "@/components/report-fab";
import { useColors } from "@/hooks/use-colors";
import { syncRoadsideContractPhoneReminders } from "@/lib/notification-center";
import { buildSignageReportData } from "@/lib/signage-report-data";
import { exportSignageReport } from "@/lib/signage-report-exporter";
import { roadsideContractsToReportBoards } from "@/lib/roadside-contract-report";
import { loadSignageReportSettings, saveSignageReportSettings } from "@/lib/signage-report-settings";
import { DEFAULT_SIGNAGE_REPORT_SETTINGS, type SignageReportSettings } from "@/lib/signage-report-settings-model";
import { restoreArchivedRoadsideContract, type RoadsideContract } from "@/lib/roadside-contracts";
import { persistSignageMediaUri } from "@/lib/signage-media-storage";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";

const ARCHIVE_TYPES = [{ id: "road", label: "طرقي", icon: "directions" as const }, { id: "wall", label: "جدارية", icon: "crop-landscape" as const }, { id: "island", label: "منصف", icon: "location-city" as const }];

export default function RoadsideContractArchiveScreen() {
  const colors = useColors();
  const [activeType, setActiveType] = useState("road");
  const [contracts, setContracts] = useState<RoadsideContract[]>([]);
  const [selected, setSelected] = useState<RoadsideContract | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ visible: false, message: "" });
  const [reportSettingsOpen, setReportSettingsOpen] = useState(false);
  const [reportSettings, setReportSettings] = useState<SignageReportSettings>({ ...DEFAULT_SIGNAGE_REPORT_SETTINGS, reportScope: "archive" });
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const loadContracts = useCallback(async () => {
    const stored = await getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS);
    const managed = await Promise.all(stored.map(async (contract) => {
      const boards = await Promise.all(contract.boards.map(async (board) => {
        const front = await persistSignageMediaUri(board.frontImageUri || board.imageUri, "board");
        const back = await persistSignageMediaUri(board.backImageUri, "board-back");
        if (front === (board.frontImageUri || board.imageUri) && back === board.backImageUri) return board;
        return { ...board, imageUri: front || board.imageUri, frontImageUri: front || board.frontImageUri, backImageUri: back || board.backImageUri };
      }));
      return boards.every((board, index) => board === contract.boards[index]) ? contract : { ...contract, boards };
    }));
    if (managed.some((contract, index) => contract !== stored[index])) await saveItems(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, managed);
    setContracts(managed.filter((contract) => contract.status !== "active"));
  }, []);
  useEffect(() => { void loadContracts(); }, [loadContracts]);
  useEffect(() => { void loadSignageReportSettings("archive").then(setReportSettings); }, []);
  const visibleContracts = contracts.filter((contract) => contract.type === activeType);
  const reportRegions = useMemo(() => [...new Set(contracts.flatMap((contract) => contract.boards.flatMap((board) => board.linkedRegions?.length ? board.linkedRegions : [board.region])).filter(Boolean))].sort((first, second) => first.localeCompare(second, "ar")), [contracts]);
  const reportBrands = useMemo(() => [...new Set(contracts.flatMap((contract) => contract.boards.flatMap((board) => [board.frontBrand || board.brand, board.backBrand])).filter((brand): brand is string => Boolean(brand?.trim())))].sort((first, second) => first.localeCompare(second, "ar")), [contracts]);
  const deleteSelected = async () => {
    if (!selected) return;
    const allContracts = await getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS);
    await saveItems(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, allContracts.filter((contract) => contract.id !== selected.id));
    setConfirmDelete(false);
    setActionsOpen(false);
    setSelected(null);
    await loadContracts();
  };
  const restoreSelected = async () => {
    if (!selected) return;
    const allContracts = await getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS);
    const updatedContracts = allContracts.map((contract) => contract.id === selected.id ? restoreArchivedRoadsideContract(contract) : contract);
    await saveItems(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, updatedContracts);
    setContracts((current) => current.filter((contract) => contract.id !== selected.id));
    void syncRoadsideContractPhoneReminders(updatedContracts).catch(() => undefined);
    setActionsOpen(false);
    setSelected(null);
    setSuccessMessage({ visible: true, message: "تم إلغاء أرشفة العقد وإعادته إلى العقود النشطة" });
  };
  const exportArchiveReport = async (format: "pdf" | "excel") => {
    if (exporting) return;
    setExporting(format);
    try {
      const settings = { ...reportSettings, reportScope: "archive" as const };
      const data = buildSignageReportData(roadsideContractsToReportBoards(contracts), [], settings);
      await exportSignageReport(format, { ...data, reportTitle: "تقرير أرشيف عقود اللوحات", reportSubtitle: "عرض تفصيلي للعقود الملغاة والمجددة ولوحاتها ضمن الأرشيف." }, settings);
    } finally {
      setExporting(null);
    }
  };
  const saveArchiveReportSettings = async (settings: SignageReportSettings) => {
    const saved = await saveSignageReportSettings({ ...settings, reportScope: "archive" });
    setReportSettings(saved);
    setReportSettingsOpen(false);
  };

  return <ScreenContainer containerClassName="bg-background">
    <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}><MaterialIcons name="arrow-forward" size={21} color={colors.foreground} /></TouchableOpacity><View style={styles.headerCopy}><Text style={[styles.title, { color: colors.foreground }]}>أرشيف عقود اللوحات</Text><Text style={[styles.subtitle, { color: colors.muted }]}>العقود الملغاة والمجددة محفوظة للمراجعة</Text></View></View>
    <View style={styles.typeTabs}>{ARCHIVE_TYPES.map((type) => <TouchableOpacity key={type.id} onPress={() => setActiveType(type.id)} style={[styles.typeTab, { backgroundColor: activeType === type.id ? colors.primary : colors.surface, borderColor: activeType === type.id ? colors.primary : colors.border }]}><MaterialIcons name={type.icon} size={16} color={activeType === type.id ? "#fff" : colors.muted} /><Text style={[styles.typeText, { color: activeType === type.id ? "#fff" : colors.foreground }]}>{type.label}</Text></TouchableOpacity>)}</View>
    <FlatList data={visibleContracts} keyExtractor={(item) => item.id} contentContainerStyle={visibleContracts.length ? styles.list : styles.emptyList} renderItem={({ item }) => { const cancelled = item.archiveReason === "cancelled"; const tone = cancelled ? colors.error : colors.success; const isWall = item.type === "wall"; const isIsland = item.type === "island"; return <TouchableOpacity onPress={() => router.push({ pathname: "/roadside-contract-details", params: { id: item.id } } as any)} onLongPress={() => { setSelected(item); setActionsOpen(true); }} delayLongPress={350} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.icon, { backgroundColor: tone + "16" }]}><MaterialIcons name={cancelled ? "cancel" : "autorenew"} size={24} color={tone} /></View><View style={styles.copy}><View style={styles.cardTitleRow}><View style={[styles.status, { backgroundColor: tone + "16" }]}><Text style={[styles.statusText, { color: tone }]}>{cancelled ? "ملغى" : "مجدَّد"}</Text></View><Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text></View><Text style={[styles.cardMeta, { color: colors.muted }]}>{isWall ? `لوحة جدارية · ${item.ownerCompany}${item.responsiblePhone ? ` · ${item.responsiblePhone}` : ""}` : isIsland ? `${item.totalBoards} منصف · ${item.boards[0]?.linkedRegions?.join(" ← ") || item.boards[0]?.region || "—"}` : `${item.totalBoards} لوحة`} · {item.startDate} ← {item.endDate}</Text><Text style={[styles.cardHint, { color: colors.muted }]}>أُرشف في {item.archivedAt?.slice(0, 10) || "—"} · اضغط للعرض أو مطولاً للإجراءات</Text></View></TouchableOpacity>; }} ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="inventory-2" size={48} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد عقود مؤرشفة</Text><Text style={[styles.emptyText, { color: colors.muted }]}>ستظهر هنا العقود الملغاة أو المجددة لهذا النوع، باستثناء لوحات المحلات.</Text></View>} />
    <CardActionModal visible={actionsOpen} title={selected?.name || "عقد مؤرشف"} description="اضغط على البطاقة لعرض كل التفاصيل. يمكن إعادة العقد للنشطة دون فقدان أي لوحة أو بيانات." onClose={() => setActionsOpen(false)} actions={[{ id: "restore", label: "إلغاء الأرشفة وإعادة العقد للنشطة", icon: "unarchive", tone: "success", onPress: () => void restoreSelected() }, { id: "delete", label: "حذف العقد نهائياً", icon: "delete-outline", tone: "danger", onPress: () => { setActionsOpen(false); setConfirmDelete(true); } }]} />
    <ConfirmDialog visible={confirmDelete} title="حذف عقد مؤرشف" message="سيُحذف العقد المؤرشف بجميع تفاصيله ولوحاته نهائياً. هل تريد المتابعة؟" confirmText="حذف نهائي" isDangerous icon="warning" onCancel={() => setConfirmDelete(false)} onConfirm={() => void deleteSelected()} />
    <SignageReportSettingsSheet visible={reportSettingsOpen} value={reportSettings} regions={reportRegions} brands={reportBrands} contracts={contracts.map((contract) => ({ id: contract.id, name: contract.name }))} onClose={() => setReportSettingsOpen(false)} onSave={(settings) => void saveArchiveReportSettings(settings)} />
    <SuccessModal visible={successMessage.visible} message={successMessage.message} onClose={() => setSuccessMessage({ visible: false, message: "" })} />
    <ReportFab module="signage" onSettings={() => setReportSettingsOpen(true)} onExport={(format) => void exportArchiveReport(format)} exporting={exporting} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  header: { minHeight: 73, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: StyleSheet.hairlineWidth }, back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "flex-end" }, title: { fontSize: 17, fontWeight: "800" as any }, subtitle: { fontSize: 10, marginTop: 3 }, typeTabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 9 }, typeTab: { flex: 1, minHeight: 39, borderRadius: 11, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, typeText: { fontSize: 11, fontWeight: "800" as any }, list: { padding: 16, gap: 9, paddingBottom: 28 }, emptyList: { flexGrow: 1, justifyContent: "center", padding: 24 }, card: { minHeight: 96, borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", gap: 10, alignItems: "center" }, icon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" }, copy: { flex: 1, alignItems: "flex-end" }, cardTitleRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, cardTitle: { flex: 1, fontSize: 13, fontWeight: "800" as any, textAlign: "right" }, status: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }, statusText: { fontSize: 9, fontWeight: "800" as any }, cardMeta: { marginTop: 5, fontSize: 10, textAlign: "right" }, cardHint: { marginTop: 4, fontSize: 9, textAlign: "right" }, empty: { alignItems: "center", gap: 8 }, emptyTitle: { fontSize: 15, fontWeight: "800" as any }, emptyText: { maxWidth: 260, textAlign: "center", fontSize: 11, lineHeight: 18 },
});
