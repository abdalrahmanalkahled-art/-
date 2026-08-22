import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FloatingFormModal } from "@/components/floating-form-modal";
import { useColors } from "@/hooks/use-colors";
import { type WarehouseReportSettings } from "@/lib/warehouse-report-settings-model";

type Palette = ReturnType<typeof useColors>;
type Panel = "sections" | "columns" | "media" | null;
type ColumnSettingKey = "materialColumns" | "toolColumns" | "movementColumns";

const OPTIONS = [
  { key: "includeMaterials" as const, title: "المواد", subtitle: "الكميات والفئات والحالة والوصف", icon: "inventory-2" as const },
  { key: "includeTools" as const, title: "الأدوات", subtitle: "الكمية والماركات والحالة", icon: "handyman" as const },
  { key: "includeMovements" as const, title: "سجل الحركة", subtitle: "حركات الإدخال والإخراج والملاحظات", icon: "swap-horiz" as const },
];

const COLUMN_GROUPS = [
  { enabled: "includeMaterials" as const, key: "materialColumns" as const, title: "جدول المواد", description: "البيانات والكميات والحالة", columns: [{ key: "name", label: "المادة" }, { key: "category", label: "الفئة" }, { key: "currentQuantity", label: "الكمية المتوفرة" }, { key: "minimumQuantity", label: "الحد الأدنى" }, { key: "unit", label: "الوحدة" }, { key: "status", label: "الحالة" }, { key: "description", label: "الوصف" }] },
  { enabled: "includeTools" as const, key: "toolColumns" as const, title: "جدول الأدوات", description: "الكمية والماركات والحالة", columns: [{ key: "name", label: "الأداة" }, { key: "quantity", label: "الكمية" }, { key: "brands", label: "الماركات" }, { key: "condition", label: "الحالة" }] },
  { enabled: "includeMovements" as const, key: "movementColumns" as const, title: "سجل الحركة", description: "عمليات الإدخال والإخراج", columns: [{ key: "movementDate", label: "التاريخ" }, { key: "itemName", label: "المادة" }, { key: "movementType", label: "النوع" }, { key: "quantity", label: "الكمية" }, { key: "notes", label: "الملاحظات" }] },
] as const;

export function WarehouseReportSettingsSheet({ visible, value, onClose, onSave }: { visible: boolean; value: WarehouseReportSettings; onClose: () => void; onSave: (value: WarehouseReportSettings) => void }) {
  const colors = useColors();
  const [draft, setDraft] = useState(value);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [activeColumnGroup, setActiveColumnGroup] = useState<ColumnSettingKey | null>(null);

  useEffect(() => { if (visible) { setDraft(value); setActivePanel(null); setActiveColumnGroup(null); } }, [value, visible]);

  const toggleSection = (key: "includeMaterials" | "includeTools" | "includeMovements" | "includeImages") => setDraft((current) => {
    if (key !== "includeImages" && current[key] && !OPTIONS.some((option) => option.key !== key && current[option.key])) return current;
    return { ...current, [key]: !current[key] };
  });
  const toggleColumn = (key: ColumnSettingKey, column: string) => setDraft((current) => {
    const selected = current[key] as string[];
    if (selected.includes(column)) return selected.length === 1 ? current : { ...current, [key]: selected.filter((item) => item !== column) } as WarehouseReportSettings;
    return { ...current, [key]: [...selected, column] } as WarehouseReportSettings;
  });

  const enabledSections = useMemo(() => OPTIONS.filter((option) => draft[option.key]).length, [draft]);
  const enabledTables = COLUMN_GROUPS.filter((group) => draft[group.enabled]);
  const selectedColumnCount = enabledTables.reduce((count, group) => count + (draft[group.key] as string[]).length, 0);
  const sectionSummary = `${enabledSections} أقسام مفعلة`;
  const columnsSummary = `${enabledTables.length} جداول · ${selectedColumnCount} أعمدة محددة`;
  const mediaSummary = !draft.includeTools ? "فعّل قسم الأدوات أولاً" : !draft.includeImages ? "بدون صور" : `${draft.imageMaxWidth === 600 ? "صورة صغيرة" : draft.imageMaxWidth === 1200 ? "صورة كبيرة" : "صورة متوسطة"} · ${draft.imageQuality === 0.55 ? "ضغط أعلى" : draft.imageQuality === 0.9 ? "جودة أعلى" : "ضغط متوازن"}`;
  const activeGroup = activeColumnGroup ? COLUMN_GROUPS.find((group) => group.key === activeColumnGroup) : null;

  return <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.background}>
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} accessibilityLabel="إغلاق إعدادات التقرير"><MaterialIcons name="close" size={24} color={colors.foreground} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>إعدادات تقرير المستودع</Text>
        <View style={styles.headerGap} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.muted }]}>اختر أي بطاقة لتعديل إعداداتها. لا تُطبّق التغييرات على التقرير التالي إلا بعد حفظها من الزر السفلي.</Text>
        <PanelCard icon="view-list" title="أقسام التقرير" summary={sectionSummary} colors={colors} onPress={() => setActivePanel("sections")} />
        <PanelCard icon="table-chart" title="الجداول والأعمدة" summary={columnsSummary} colors={colors} onPress={() => setActivePanel("columns")} />
        <PanelCard icon="photo-library" title="الصور والوسائط" summary={mediaSummary} colors={colors} onPress={() => setActivePanel("media")} />
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={[styles.footerButton, { backgroundColor: colors.muted + "18" }]}><Text style={[styles.cancelText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onSave(draft)} style={[styles.footerButton, { backgroundColor: colors.primary }]}><Text style={styles.saveText}>حفظ الإعدادات</Text></TouchableOpacity>
      </View>

      <PanelModal visible={activePanel === "sections"} title="أقسام التقرير" colors={colors} onClose={() => setActivePanel(null)}>
        <Text style={[styles.panelHint, { color: colors.muted }]}>فعّل الأقسام التي تريد ظهورها في التقرير. يبقى قسم واحد مفعّلاً على الأقل.</Text>
        {OPTIONS.map((option) => <SettingToggle key={option.key} label={option.title} description={option.subtitle} icon={option.icon} value={draft[option.key]} colors={colors} onPress={() => toggleSection(option.key)} />)}
      </PanelModal>

      <PanelModal visible={activePanel === "columns"} title="الجداول والأعمدة" colors={colors} onClose={() => setActivePanel(null)}>
        <Text style={[styles.panelHint, { color: colors.muted }]}>افتح الجدول لتحديد الأعمدة التي ستظهر فيه. يبقى عمود واحد على الأقل لكل جدول.</Text>
        {enabledTables.map((group) => <TableCard key={group.key} title={group.title} description={group.description} selectedCount={(draft[group.key] as string[]).length} colors={colors} onPress={() => { setActivePanel(null); setActiveColumnGroup(group.key); }} />)}
      </PanelModal>

      <PanelModal visible={activePanel === "media"} title="الصور والوسائط" colors={colors} onClose={() => setActivePanel(null)}>
        {!draft.includeTools ? <Text style={[styles.panelHint, { color: colors.warning }]}>فعّل قسم الأدوات ضمن أقسام التقرير أولاً حتى تتمكن من تضمين صورها.</Text> : <>
          <SettingToggle label="تضمين صور الأدوات" description="تُضمّن الصور الفعلية داخل PDF، ويظهر مؤشر توفرها في Excel." icon="image" value={draft.includeImages} colors={colors} onPress={() => toggleSection("includeImages")} />
          {draft.includeImages ? <>
            <SettingTitle label="المساحة المخصصة للصورة داخل التقرير" colors={colors} />
            <ChoiceGrid options={[{ value: "600", label: "صغيرة", icon: "photo-size-select-small" as const }, { value: "900", label: "متوسطة", icon: "photo-size-select-actual" as const }, { value: "1200", label: "كبيرة", icon: "photo-size-select-large" as const }]} active={String(draft.imageMaxWidth)} colors={colors} onSelect={(value) => setDraft((current) => ({ ...current, imageMaxWidth: Number(value) }))} />
            <SettingTitle label="جودة وحجم ملف PDF" colors={colors} />
            <ChoiceGrid options={[{ value: "0.55", label: "ضغط أعلى", icon: "archive" as const }, { value: "0.72", label: "ضغط متوازن", icon: "compress" as const }, { value: "0.9", label: "جودة أعلى", icon: "high-quality" as const }]} active={String(draft.imageQuality)} colors={colors} onSelect={(value) => setDraft((current) => ({ ...current, imageQuality: Number(value) }))} />
          </> : null}
        </>}
      </PanelModal>

      <PanelModal visible={activeColumnGroup !== null} title={activeGroup?.title ?? "أعمدة الجدول"} colors={colors} onClose={() => setActiveColumnGroup(null)}>
        <Text style={[styles.panelHint, { color: colors.muted }]}>اختر الأعمدة التي تريد ظهورها داخل هذا الجدول.</Text>
        {activeGroup?.columns.map((column) => {
          const active = (draft[activeGroup.key] as string[]).includes(column.key);
          return <SettingToggle key={column.key} label={column.label} description={active ? "سيظهر في التقرير" : "لن يظهر في التقرير"} icon="view-column" value={active} colors={colors} onPress={() => toggleColumn(activeGroup.key, column.key)} />;
        })}
      </PanelModal>
    </SafeAreaView>
  </FloatingFormModal>;
}

function PanelCard({ icon, title, summary, colors, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; summary: string; colors: Palette; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="chevron-left" size={22} color={colors.muted} /><View style={styles.panelCopy}><Text style={[styles.panelTitle, { color: colors.foreground }]}>{title}</Text><Text numberOfLines={1} style={[styles.panelSummary, { color: colors.muted }]}>{summary}</Text></View><View style={[styles.panelIcon, { backgroundColor: colors.primary + "12" }]}><MaterialIcons name={icon} size={20} color={colors.primary} /></View></TouchableOpacity>; }
function TableCard({ title, description, selectedCount, colors, onPress }: { title: string; description: string; selectedCount: number; colors: Palette; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="chevron-left" size={21} color={colors.muted} /><View style={styles.panelCopy}><Text style={[styles.panelTitle, { color: colors.foreground }]}>{title}</Text><Text numberOfLines={1} style={[styles.panelSummary, { color: colors.muted }]}>{selectedCount} أعمدة محددة · {description}</Text></View><View style={[styles.panelIcon, { backgroundColor: colors.primary + "12" }]}><MaterialIcons name="table-chart" size={19} color={colors.primary} /></View></TouchableOpacity>; }
function PanelModal({ visible, title, colors, onClose, children }: { visible: boolean; title: string; colors: Palette; onClose: () => void; children: ReactNode }) { return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}><View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={[styles.panelModal, { backgroundColor: colors.background, borderColor: colors.border }]}><View style={[styles.panelHeader, { borderColor: colors.border }]}><TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}><MaterialIcons name="close" size={20} color={colors.muted} /></TouchableOpacity><Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text><View style={styles.headerGap} /></View><ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">{children}</ScrollView><View style={[styles.panelFooter, { borderColor: colors.border, backgroundColor: colors.background }]}><TouchableOpacity onPress={onClose} style={[styles.doneButton, { backgroundColor: colors.primary }]}><Text style={styles.saveText}>تم</Text></TouchableOpacity></View></View></View></Modal>; }
function SettingTitle({ label, colors }: { label: string; colors: Palette }) { return <Text style={[styles.settingTitle, { color: colors.foreground }]}>{label}</Text>; }
function ChoiceGrid({ options, active, colors, onSelect }: { options: Array<{ value: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }>; active: string; colors: Palette; onSelect: (value: string) => void }) { return <View style={styles.choiceGrid}>{options.map((option) => <TouchableOpacity key={option.value} onPress={() => onSelect(option.value)} style={[styles.choice, { backgroundColor: active === option.value ? colors.primary + "12" : colors.surface, borderColor: active === option.value ? colors.primary : colors.border }]}><MaterialIcons name={option.icon} size={17} color={active === option.value ? colors.primary : colors.muted} /><Text style={[styles.choiceText, { color: active === option.value ? colors.primary : colors.foreground }]}>{option.label}</Text></TouchableOpacity>)}</View>; }
function SettingToggle({ label, description, icon, value, colors, onPress }: { label: string; description: string; icon: keyof typeof MaterialIcons.glyphMap; value: boolean; colors: Palette; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: value ? colors.primary : colors.border }]}><View style={[styles.toggleMark, { backgroundColor: value ? colors.primary : "transparent", borderColor: value ? colors.primary : colors.muted }]}>{value ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View><View style={styles.toggleCopy}><Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text><Text style={[styles.toggleDescription, { color: colors.muted }]}>{description}</Text></View><View style={[styles.toggleIcon, { backgroundColor: colors.primary + "10" }]}><MaterialIcons name={icon} size={19} color={colors.primary} /></View></TouchableOpacity>; }

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { minHeight: 60, borderBottomWidth: 1, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerTitle: { fontSize: 17, fontWeight: "800" as any, textAlign: "center", flex: 1 }, headerGap: { width: 24 }, content: { padding: 16, gap: 11, paddingBottom: 112 }, intro: { fontSize: 11, lineHeight: 18, textAlign: "right", paddingHorizontal: 2, marginBottom: 2 }, panelCard: { minHeight: 76, borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 11 }, tableCard: { minHeight: 70, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 9 }, panelIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, panelCopy: { flex: 1, gap: 4, alignItems: "flex-end" }, panelTitle: { fontSize: 14, fontWeight: "800" as any, textAlign: "right" }, panelSummary: { fontSize: 10, textAlign: "right" }, footer: { flexDirection: "row", gap: 10, padding: 15, borderTopWidth: 1 }, footerButton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" }, cancelText: { fontSize: 14, fontWeight: "800" as any }, saveText: { color: "#fff", fontSize: 14, fontWeight: "800" as any }, modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: 16 }, panelModal: { borderWidth: 1, borderRadius: 21, maxHeight: "88%", overflow: "hidden" }, panelHeader: { minHeight: 58, paddingHorizontal: 15, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }, panelContent: { padding: 15, gap: 11, paddingBottom: 20 }, panelFooter: { borderTopWidth: 1, padding: 13 }, doneButton: { minHeight: 45, borderRadius: 12, alignItems: "center", justifyContent: "center" }, settingTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right", marginTop: 3 }, choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { minHeight: 42, flexGrow: 1, flexBasis: "42%", borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, choiceText: { fontSize: 11, fontWeight: "800" as any, textAlign: "center" }, panelHint: { fontSize: 11, lineHeight: 17, textAlign: "right" }, toggleRow: { minHeight: 67, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 9 }, toggleIcon: { width: 35, height: 35, borderRadius: 11, alignItems: "center", justifyContent: "center" }, toggleMark: { width: 23, height: 23, borderWidth: 1.5, borderRadius: 7, alignItems: "center", justifyContent: "center" }, toggleCopy: { flex: 1, gap: 2, alignItems: "flex-end" }, toggleLabel: { fontSize: 12, fontWeight: "800" as any, textAlign: "right" }, toggleDescription: { fontSize: 10, lineHeight: 15, textAlign: "right" },
});
