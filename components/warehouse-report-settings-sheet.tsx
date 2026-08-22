import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { FloatingFormModal } from "@/components/floating-form-modal";
import { useColors } from "@/hooks/use-colors";
import { type WarehouseReportSettings } from "@/lib/warehouse-report-settings-model";

const OPTIONS = [
  { key: "includeMaterials" as const, title: "المواد", subtitle: "الكميات والفئات والحالة والوصف", icon: "inventory-2" as const },
  { key: "includeTools" as const, title: "الأدوات", subtitle: "الكمية والماركات والحالة", icon: "handyman" as const },
  { key: "includeMovements" as const, title: "سجل الحركة", subtitle: "حركات الإدخال والإخراج والملاحظات", icon: "swap-horiz" as const },
];
const COLUMN_GROUPS = [
  { enabled: "includeMaterials" as const, key: "materialColumns" as const, title: "أعمدة جدول المواد", columns: [{ key: "name", label: "المادة" }, { key: "category", label: "الفئة" }, { key: "currentQuantity", label: "الكمية المتوفرة" }, { key: "minimumQuantity", label: "الحد الأدنى" }, { key: "unit", label: "الوحدة" }, { key: "status", label: "الحالة" }, { key: "description", label: "الوصف" }] },
  { enabled: "includeTools" as const, key: "toolColumns" as const, title: "أعمدة جدول الأدوات", columns: [{ key: "name", label: "الأداة" }, { key: "quantity", label: "الكمية" }, { key: "brands", label: "الماركات" }, { key: "condition", label: "الحالة" }] },
  { enabled: "includeMovements" as const, key: "movementColumns" as const, title: "أعمدة سجل الحركة", columns: [{ key: "movementDate", label: "التاريخ" }, { key: "itemName", label: "المادة" }, { key: "movementType", label: "النوع" }, { key: "quantity", label: "الكمية" }, { key: "notes", label: "الملاحظات" }] },
] as const;

type ColumnSettingKey = "materialColumns" | "toolColumns" | "movementColumns";

export function WarehouseReportSettingsSheet({ visible, value, onClose, onSave }: { visible: boolean; value: WarehouseReportSettings; onClose: () => void; onSave: (value: WarehouseReportSettings) => void }) {
  const colors = useColors();
  const [draft, setDraft] = useState(value);
  const [activeColumnGroup, setActiveColumnGroup] = useState<ColumnSettingKey | null>(null);
  useEffect(() => { if (visible) { setDraft(value); setActiveColumnGroup(null); } }, [value, visible]);

  const toggleSection = (key: "includeMaterials" | "includeTools" | "includeMovements" | "includeImages") => setDraft((current) => {
    if (key !== "includeImages" && current[key] && !OPTIONS.some((option) => option.key !== key && current[option.key])) return current;
    return { ...current, [key]: !current[key] };
  });
  const toggleColumn = (key: ColumnSettingKey, column: string) => setDraft((current) => {
    const selected = current[key] as string[];
    if (selected.includes(column)) {
      if (selected.length === 1) return current;
      return { ...current, [key]: selected.filter((item) => item !== column) } as WarehouseReportSettings;
    }
    return { ...current, [key]: [...selected, column] } as WarehouseReportSettings;
  });

  return <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.background}>
    <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.sheet, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={[styles.close, { backgroundColor: colors.surface }]}><MaterialIcons name="close" size={21} color={colors.foreground} /></TouchableOpacity>
        <View style={styles.headerText}><Text style={[styles.title, { color: colors.foreground }]}>إعداد تقرير المستودع</Text><Text style={[styles.subtitle, { color: colors.muted }]}>اختر الأقسام والأعمدة الظاهرة في التقرير</Text></View>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + "16" }]}><MaterialIcons name="inventory" size={21} color={colors.primary} /></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardDismissMode="none" keyboardShouldPersistTaps="always">
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>أقسام التقرير</Text>
        <View style={[styles.sectionBox, { borderColor: colors.border }]}>{OPTIONS.map((option, index) => <View key={option.key} style={[styles.row, index < OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
          <Switch value={draft[option.key]} onValueChange={() => toggleSection(option.key)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />
          <View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{option.title}</Text><Text style={[styles.rowSubtitle, { color: colors.muted }]}>{option.subtitle}</Text></View><MaterialIcons name={option.icon} size={21} color={colors.primary} />
        </View>)}</View>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>الجداول والأعمدة</Text>
        <View style={styles.tableCards}>{COLUMN_GROUPS.filter((group) => draft[group.enabled]).map((group) => {
          const selectedCount = (draft[group.key] as string[]).length;
          return <TouchableOpacity key={group.key} onPress={() => setActiveColumnGroup(group.key)} activeOpacity={0.82} style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.tableIcon, { backgroundColor: colors.primary + "14" }]}><MaterialIcons name="table-chart" size={21} color={colors.primary} /></View>
            <View style={styles.tableCopy}><Text style={[styles.tableTitle, { color: colors.foreground }]}>{group.title.replace("أعمدة جدول ", "جدول ")}</Text><Text style={[styles.tableHint, { color: colors.muted }]}>{selectedCount} أعمدة محددة · اضغط للعرض والتعديل</Text></View>
            <MaterialIcons name="chevron-left" size={22} color={colors.muted} />
          </TouchableOpacity>;
        })}</View>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>الصور</Text>
        {draft.includeTools && <>
          <View style={[styles.imageRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><Switch value={draft.includeImages} onValueChange={() => toggleSection("includeImages")} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} /><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.foreground }]}>إدراج صور الأدوات</Text><Text style={[styles.rowSubtitle, { color: colors.muted }]}>تظهر الصور فعلياً في PDF، ويظهر مؤشر وجودها في Excel</Text></View><MaterialIcons name="image" size={21} color={colors.primary} /></View>
          {draft.includeImages && <View style={[styles.imageOptions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.imageOptionsTitle, { color: colors.foreground }]}>حجم وجودة الصور</Text>
            <Text style={[styles.imageOptionsHint, { color: colors.muted }]}>القيم الأقل تقلل حجم ملف PDF</Text>
            <View style={styles.choiceRow}>{[{ value: 600, label: "صغير" }, { value: 900, label: "متوسط" }, { value: 1200, label: "كبير" }].map((option) => <TouchableOpacity key={option.value} onPress={() => setDraft((current) => ({ ...current, imageMaxWidth: option.value }))} style={[styles.choice, { borderColor: draft.imageMaxWidth === option.value ? colors.primary : colors.border, backgroundColor: draft.imageMaxWidth === option.value ? colors.primary + "12" : colors.background }]}><Text style={[styles.choiceText, { color: draft.imageMaxWidth === option.value ? colors.primary : colors.foreground }]}>{option.label}</Text></TouchableOpacity>)}</View>
            <View style={styles.choiceRow}>{[{ value: 0.55, label: "ضغط أعلى" }, { value: 0.72, label: "متوازن" }, { value: 0.9, label: "جودة أعلى" }].map((option) => <TouchableOpacity key={option.value} onPress={() => setDraft((current) => ({ ...current, imageQuality: option.value }))} style={[styles.choice, { borderColor: draft.imageQuality === option.value ? colors.primary : colors.border, backgroundColor: draft.imageQuality === option.value ? colors.primary + "12" : colors.background }]}><Text style={[styles.choiceText, { color: draft.imageQuality === option.value ? colors.primary : colors.foreground }]}>{option.label}</Text></TouchableOpacity>)}</View>
          </View>}
        </>}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: colors.border }]}><TouchableOpacity style={[styles.cancel, { borderColor: colors.border }]} onPress={onClose}><Text style={[styles.cancelText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity><TouchableOpacity style={[styles.save, { backgroundColor: colors.primary }]} onPress={() => onSave(draft)}><MaterialIcons name="check" size={18} color="#fff" /><Text style={styles.saveText}>حفظ الإعدادات</Text></TouchableOpacity>      </View>
    </SafeAreaView>
    <Modal transparent visible={activeColumnGroup !== null} animationType="fade" onRequestClose={() => setActiveColumnGroup(null)}>
      <View style={styles.columnsModalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveColumnGroup(null)} />
        {activeColumnGroup ? <View style={[styles.columnsModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.columnsModalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setActiveColumnGroup(null)} style={[styles.close, { backgroundColor: colors.background }]}><MaterialIcons name="close" size={20} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.columnTitle, { color: colors.foreground }]}>{COLUMN_GROUPS.find((group) => group.key === activeColumnGroup)?.title}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.columnsModalContent} showsVerticalScrollIndicator={false}>
            {COLUMN_GROUPS.find((group) => group.key === activeColumnGroup)?.columns.map((column) => {
              const group = COLUMN_GROUPS.find((item) => item.key === activeColumnGroup)!;
              const active = (draft[group.key] as string[]).includes(column.key);
              return <TouchableOpacity key={column.key} onPress={() => toggleColumn(group.key, column.key)} activeOpacity={0.78} style={[styles.columnOption, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "10" : colors.surface }]}>
                <View style={[styles.check, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : "transparent" }]}>{active && <MaterialIcons name="check" size={15} color="#fff" />}</View>
                <Text style={[styles.columnText, { color: colors.foreground }]}>{column.label}</Text>
              </TouchableOpacity>;
            })}
          </ScrollView>
        </View> : null}
      </View>
    </Modal>
  </FloatingFormModal>;

}

const styles = StyleSheet.create({
  sheet: { flex: 1 }, tableCards: { gap: 9, marginBottom: 18 }, tableCard: { minHeight: 70, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }, tableIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" }, tableCopy: { flex: 1, alignItems: "flex-end", gap: 3 }, tableTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right" }, tableHint: { fontSize: 10, textAlign: "right" }, columnsModalBackdrop: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(0,0,0,0.46)" }, columnsModal: { width: "100%", maxWidth: 520, maxHeight: "76%", alignSelf: "center", borderRadius: 20, borderWidth: 1, overflow: "hidden" }, columnsModalHeader: { minHeight: 58, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth }, columnsModalContent: { padding: 16, gap: 9 }, header: { minHeight: 76, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 11 }, close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerText: { flex: 1, alignItems: "flex-end" }, title: { fontSize: 16, fontWeight: "800" as any }, subtitle: { fontSize: 11, marginTop: 3 }, headerIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, content: { padding: 16, paddingBottom: 22 }, sectionLabel: { fontSize: 11, fontWeight: "800" as any, textAlign: "right", marginBottom: 7 }, sectionBox: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12 }, row: { minHeight: 69, flexDirection: "row", alignItems: "center", gap: 11 }, copy: { flex: 1, alignItems: "flex-end" }, rowTitle: { fontSize: 14, fontWeight: "800" as any, textAlign: "right" }, rowSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 3, textAlign: "right" }, columnGroup: { marginTop: 19 }, columnHeader: { alignItems: "flex-end", marginBottom: 8 }, columnTitle: { fontSize: 14, fontWeight: "800" as any, textAlign: "right" }, columnHint: { fontSize: 10, marginTop: 2, textAlign: "right" }, columnList: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, columnOption: { minHeight: 39, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6 }, check: { width: 19, height: 19, borderWidth: 1, borderRadius: 6, alignItems: "center", justifyContent: "center" }, columnText: { fontSize: 12, fontWeight: "700" as any },   imageRow: { marginTop: 18, minHeight: 78, paddingHorizontal: 12, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 11 }, imageOptions: { marginTop: 9, padding: 12, borderWidth: 1, borderRadius: 15, gap: 7 }, imageOptionsTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right" }, imageOptionsHint: { fontSize: 10, textAlign: "right" }, choiceRow: { flexDirection: "row", gap: 7 }, choice: { flex: 1, minHeight: 38, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" }, choiceText: { fontSize: 11, fontWeight: "700" as any }, footer: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10 }, cancel: { flex: .8, minHeight: 48, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" }, cancelText: { fontSize: 14, fontWeight: "700" as any }, save: { flex: 1.35, minHeight: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, saveText: { color: "#fff", fontSize: 14, fontWeight: "800" as any },
});
