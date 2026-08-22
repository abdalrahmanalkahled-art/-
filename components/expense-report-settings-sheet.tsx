import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";

import { useColors } from "@/hooks/use-colors";
import type { ManagedCategory } from "@/lib/category-management";
import type { ExpenseReportSettings } from "@/lib/expense-report-settings-model";
import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import { FloatingFormModal } from "@/components/floating-form-modal";

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value?: string): Date | null {
  return value ? new Date(`${value}T12:00:00`) : null;
}

export function ExpenseReportSettingsSheet({
  visible,
  categories,
  settings,
  onSave,
  onClose,
}: {
  visible: boolean;
  categories: ManagedCategory[];
  settings: ExpenseReportSettings;
  onSave: (settings: ExpenseReportSettings) => Promise<void>;
  onClose: () => void;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState<ExpenseReportSettings>(settings);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(settings);
    setQuery("");
  }, [settings, visible]);

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ar");
    return normalized ? categories.filter((category: ManagedCategory) => category.label.toLocaleLowerCase("ar").includes(normalized)) : categories;
  }, [categories, query]);
  const selectedIds = useMemo(() => new Set(draft.selectedCategoryIds), [draft.selectedCategoryIds]);
  const selectedVisibleCount = filteredCategories.filter((category: ManagedCategory) => selectedIds.has(category.id)).length;
  const hasValidDateRange = draft.dateRangeMode === "all" || Boolean(draft.startDate && draft.endDate && draft.startDate <= draft.endDate);
  const canSave = (draft.categoryMode === "all" || draft.selectedCategoryIds.length > 0) && hasValidDateRange;

  const toggleCategory = (id: string) => {
    setDraft((current: ExpenseReportSettings) => ({
      ...current,
      categoryMode: "selected",
      selectedCategoryIds: current.selectedCategoryIds.includes(id)
        ? current.selectedCategoryIds.filter((item) => item !== id)
        : [...current.selectedCategoryIds, id],
    }));
  };

  const toggleVisible = () => {
    setDraft((current: ExpenseReportSettings) => {
      const visibleIds = filteredCategories.map((category: ManagedCategory) => category.id);
      const shouldSelect = visibleIds.some((id: string) => !current.selectedCategoryIds.includes(id));
      const selectedCategoryIds = shouldSelect
        ? [...new Set([...current.selectedCategoryIds, ...visibleIds])]
        : current.selectedCategoryIds.filter((id: string) => !visibleIds.includes(id));
      return { ...current, categoryMode: "selected", selectedCategoryIds };
    });
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.background}>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}> 
        <View style={[styles.header, { borderColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="إغلاق إعدادات تقارير الصرفيات">
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>إعدادات تقرير الصرفيات</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>اختر التصنيفات ومحتوى التقرير التالي</Text>
          </View>
          <View style={styles.headerGap} />
        </View>

        <FlatList
          data={draft.categoryMode === "selected" ? filteredCategories : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          ListHeaderComponent={
            <>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                <Text style={[styles.title, { color: colors.foreground }]}>الفترة الزمنية</Text>
                <Text style={[styles.hint, { color: colors.muted }]}>اختر كل الصرفيات أو حدّد فترة زمنية من التقويم للتقرير التالي.</Text>
                <View style={styles.modeRow}>
                  <ModeOption label="كل التواريخ" icon="date-range" selected={draft.dateRangeMode === "all"} colors={colors} onPress={() => setDraft((current) => ({ ...current, dateRangeMode: "all", startDate: undefined, endDate: undefined }))} />
                  <ModeOption label="فترة محددة" icon="event" selected={draft.dateRangeMode === "selected"} colors={colors} onPress={() => setShowDateRangePicker(true)} />
                </View>
                {draft.dateRangeMode === "selected" ? <TouchableOpacity onPress={() => setShowDateRangePicker(true)} style={[styles.dateRangeButton, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                  <MaterialIcons name="date-range" size={19} color={colors.primary} />
                  <Text style={[styles.dateRangeText, { color: colors.primary }]}>{draft.startDate === draft.endDate ? `التاريخ: ${draft.startDate}` : `من ${draft.startDate} إلى ${draft.endDate}`}</Text>
                </TouchableOpacity> : null}
              </View>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                <Text style={[styles.title, { color: colors.foreground }]}>نطاق التصنيفات</Text>
                <Text style={[styles.hint, { color: colors.muted }]}>اختر كل التصنيفات أو حدّد تصنيفاً واحداً أو عدة تصنيفات في التقرير نفسه.</Text>
                <View style={styles.modeRow}>
                  <ModeOption label="كل التصنيفات" icon="apps" selected={draft.categoryMode === "all"} colors={colors} onPress={() => setDraft((current: ExpenseReportSettings) => ({ ...current, categoryMode: "all" }))} />
                  <ModeOption label="تصنيفات محددة" icon="checklist" selected={draft.categoryMode === "selected"} colors={colors} onPress={() => setDraft((current: ExpenseReportSettings) => ({ ...current, categoryMode: "selected" }))} />
                </View>
                {draft.categoryMode === "selected" ? (
                  <>
                    <View style={[styles.search, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <MaterialIcons name="search" size={19} color={colors.muted} />
                      <TextInput value={query} onChangeText={setQuery} placeholder="ابحث في التصنيفات..." placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} textAlign="right" returnKeyType="done" />
                    </View>
                    <View style={styles.selectionMeta}>
                      <TouchableOpacity onPress={toggleVisible} style={[styles.selectVisible, { backgroundColor: colors.primary + "14" }]}>
                        <MaterialIcons name={selectedVisibleCount === filteredCategories.length && filteredCategories.length > 0 ? "remove-done" : "done-all"} size={18} color={colors.primary} />
                        <Text style={[styles.selectVisibleText, { color: colors.primary }]}>{selectedVisibleCount === filteredCategories.length && filteredCategories.length > 0 ? "إلغاء الظاهر" : "تحديد الظاهر"}</Text>
                      </TouchableOpacity>
                      <Text style={[styles.selectionCount, { color: colors.muted }]}>{draft.selectedCategoryIds.length} محدد من {categories.length}</Text>
                    </View>
                    {filteredCategories.length === 0 ? <View style={[styles.emptySearch, { backgroundColor: colors.background, borderColor: colors.border }]}><MaterialIcons name="search-off" size={24} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد تصنيفات مطابقة للبحث</Text></View> : null}
                  </>
                ) : null}
              </View>

              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.foreground }]}>محتوى التقرير</Text>
                <SettingOption label="بطاقة الملخص" description="إجمالي الصرفيات وعددها وعدد التصنيفات." selected={draft.includeSummary} colors={colors} onPress={() => setDraft((current: ExpenseReportSettings) => ({ ...current, includeSummary: !current.includeSummary }))} />
                <SettingOption label="تفصيل حسب التصنيف" description="إجمالي وعدد الصرفيات لكل تصنيف مختار." selected={draft.includeCategoryBreakdown} colors={colors} onPress={() => setDraft((current: ExpenseReportSettings) => ({ ...current, includeCategoryBreakdown: !current.includeCategoryBreakdown }))} />
                <SettingOption label="إظهار الملاحظات" description="تُضاف الملاحظات في جدول تفاصيل الصرفيات عند وجودها." selected={draft.includeNotes} colors={colors} onPress={() => setDraft((current: ExpenseReportSettings) => ({ ...current, includeNotes: !current.includeNotes }))} />
              </View>

              {draft.categoryMode === "selected" && filteredCategories.length > 0 ? <Text style={[styles.listLabel, { color: colors.muted }]}>التصنيفات المطابقة</Text> : null}
            </>
          }
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id);
            return <TouchableOpacity onPress={() => toggleCategory(item.id)} style={[styles.categoryRow, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
              <View style={[styles.check, { backgroundColor: selected ? colors.primary : "transparent", borderColor: selected ? colors.primary : colors.muted }]}>{selected ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View>
              <View style={[styles.categoryIcon, { backgroundColor: item.color + "18" }]}><MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={19} color={item.color} /></View>
              <Text style={[styles.categoryLabel, { color: colors.foreground }]}>{item.label}</Text>
            </TouchableOpacity>;
          }}
          ListFooterComponent={<View style={styles.bottomSpace} />}
        />

        <View style={[styles.footer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TouchableOpacity disabled={saving} onPress={onClose} style={[styles.footerButton, { backgroundColor: colors.muted + "18" }]}><Text style={[styles.cancelText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity>
          <TouchableOpacity disabled={!canSave || saving} onPress={() => void save()} style={[styles.footerButton, { backgroundColor: colors.primary }, (!canSave || saving) && styles.disabled]}><Text style={styles.saveText}>{saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    </FloatingFormModal>
    <DateRangePickerModal
      visible={showDateRangePicker}
      startDate={parseIsoDate(draft.startDate)}
      endDate={parseIsoDate(draft.endDate)}
      onCancel={() => setShowDateRangePicker(false)}
      onConfirm={(startDate, endDate) => {
        setDraft((current) => ({ ...current, dateRangeMode: "selected", startDate: formatIsoDate(startDate), endDate: formatIsoDate(endDate) }));
        setShowDateRangePicker(false);
      }}
    />
    </>
  );
}

function ModeOption({ label, icon, selected, colors, onPress }: { label: string; icon: keyof typeof MaterialIcons.glyphMap; selected: boolean; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.modeOption, { backgroundColor: selected ? colors.primary + "14" : colors.background, borderColor: selected ? colors.primary : colors.border }]}><MaterialIcons name={icon} size={19} color={selected ? colors.primary : colors.muted} /><Text style={[styles.modeText, { color: selected ? colors.primary : colors.foreground }]}>{label}</Text></TouchableOpacity>;
}

function SettingOption({ label, description, selected, colors, onPress }: { label: string; description: string; selected: boolean; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.setting, { backgroundColor: colors.background, borderColor: selected ? colors.primary : colors.border }]}><View style={[styles.check, { backgroundColor: selected ? colors.primary : "transparent", borderColor: selected ? colors.primary : colors.muted }]}>{selected ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{label}</Text><Text style={[styles.settingDescription, { color: colors.muted }]}>{description}</Text></View></TouchableOpacity>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { minHeight: 66, borderBottomWidth: 1, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 12 }, headerCopy: { flex: 1, alignItems: "flex-start" }, headerTitle: { fontSize: 17, fontWeight: "800" }, headerSubtitle: { fontSize: 10, marginTop: 3, textAlign: "left" }, headerGap: { width: 24 }, content: { padding: 16, gap: 12, paddingBottom: 114 }, card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 }, title: { fontSize: 15, fontWeight: "800", textAlign: "left" }, hint: { fontSize: 11, lineHeight: 17, textAlign: "left" }, modeRow: { flexDirection: "row", gap: 9 }, modeOption: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 }, modeText: { fontSize: 12, fontWeight: "800", textAlign: "center" }, dateRangeButton: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, dateRangeText: { fontSize: 12, fontWeight: "800" }, search: { minHeight: 46, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11 }, searchInput: { flex: 1, fontSize: 13, paddingVertical: 8 }, selectionMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, selectVisible: { minHeight: 34, paddingHorizontal: 10, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 5 }, selectVisibleText: { fontSize: 11, fontWeight: "800" }, selectionCount: { fontSize: 11, textAlign: "left" }, emptySearch: { minHeight: 82, borderWidth: 1, borderStyle: "dashed", borderRadius: 12, justifyContent: "center", alignItems: "center", gap: 5 }, emptyText: { fontSize: 11 }, setting: { minHeight: 66, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", padding: 10, gap: 9 }, check: { width: 23, height: 23, borderWidth: 1.5, borderRadius: 7, alignItems: "center", justifyContent: "center" }, settingCopy: { flex: 1, alignItems: "flex-start", gap: 3 }, settingTitle: { fontSize: 12, fontWeight: "800", textAlign: "left" }, settingDescription: { fontSize: 10, lineHeight: 15, textAlign: "left" }, listLabel: { fontSize: 11, fontWeight: "800", textAlign: "left", marginTop: 2 }, categoryRow: { minHeight: 58, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 }, categoryIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" }, categoryLabel: { flex: 1, fontSize: 13, fontWeight: "800", textAlign: "left" }, bottomSpace: { height: 12 }, footer: { flexDirection: "row", gap: 10, padding: 15, borderTopWidth: 1 }, footerButton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" }, cancelText: { fontSize: 14, fontWeight: "800" }, saveText: { color: "#fff", fontSize: 14, fontWeight: "800" }, disabled: { opacity: 0.55 },
});
