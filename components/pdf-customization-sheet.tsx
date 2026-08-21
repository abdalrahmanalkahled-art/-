import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";
import { DEFAULT_PDF_CUSTOMIZATION, type PdfChartAppearance, type PdfColorPreset, type PdfCustomization, type PdfTableStyle } from "@/lib/app-settings-model";

interface PdfCustomizationSheetProps {
  visible: boolean;
  value: PdfCustomization;
  onClose: () => void;
  onSave: (value: PdfCustomization) => void;
}

const TABLE_STYLES: Array<{ id: PdfTableStyle; label: string; hint: string }> = [
  { id: "default", label: "الأساسي", hint: "نفس شكل الجدول الحالي" },
  { id: "zebra", label: "صفوف متناوبة", hint: "تباين هادئ بين الصفوف" },
  { id: "outlined", label: "حدود كاملة", hint: "إطار واضح لكل خلية" },
];
const COLOR_PRESETS: Array<{ id: PdfColorPreset; label: string; color: string }> = [
  { id: "default", label: "الافتراضي", color: "#1455B8" },
  { id: "blue", label: "أزرق", color: "#1F5EB8" },
  { id: "teal", label: "فيروزي", color: "#0F766E" },
  { id: "violet", label: "بنفسجي", color: "#7C3AED" },
  { id: "amber", label: "كهرماني", color: "#B45309" },
  { id: "slate", label: "رمادي", color: "#475569" },
];
const CHART_APPEARANCES: Array<{ id: PdfChartAppearance; label: string; hint: string }> = [
  { id: "default", label: "الأساسي", hint: "المخطط الحالي دون تغيير" },
  { id: "soft", label: "بطاقة هادئة", hint: "خلفية خفيفة وحواف ناعمة" },
  { id: "minimal", label: "بسيط", hint: "حدود ومسافات أقل" },
];

export function PdfCustomizationSheet({ visible, value, onClose, onSave }: PdfCustomizationSheetProps) {
  const colors = useColors();
  const [draft, setDraft] = useState<PdfCustomization>(value);

  useEffect(() => { if (visible) setDraft(value); }, [value, visible]);
  const update = <Key extends keyof PdfCustomization>(key: Key, next: PdfCustomization[Key]) => setDraft((current) => ({ ...current, [key]: next }));

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={onClose} style={[styles.headerButton, { backgroundColor: colors.surface }]}><MaterialIcons name="close" size={21} color={colors.muted} /></TouchableOpacity><View style={styles.headerCopy}><Text style={[styles.title, { color: colors.foreground }]}>تخصيص قالب PDF</Text><Text style={[styles.subtitle, { color: colors.muted }]}>القالب التنفيذي يبقى كما هو حتى تختار تخصيصاً</Text></View><View style={[styles.headerIcon, { backgroundColor: colors.primary + "18" }]}><MaterialIcons name="palette" size={21} color={colors.primary} /></View></View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Notice colors={colors} />
          <PdfLivePreview value={draft} colors={colors} />
          <ChoiceGroup title="شكل الجدول" options={TABLE_STYLES} value={draft.tableStyle} colors={colors} onSelect={(id) => update("tableStyle", id)} />
          <ColorGroup title="لون رأس الجدول" value={draft.tableColor} colors={colors} onSelect={(id) => update("tableColor", id)} />
          <ChoiceGroup title="طريقة عرض المخطط" options={CHART_APPEARANCES} value={draft.chartAppearance} colors={colors} onSelect={(id) => update("chartAppearance", id)} />
          <ColorGroup title="لون إبراز المخطط" value={draft.chartAccent} colors={colors} onSelect={(id) => update("chartAccent", id)} />
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}><TouchableOpacity onPress={() => setDraft({ ...DEFAULT_PDF_CUSTOMIZATION })} style={[styles.resetButton, { borderColor: colors.border }]}><Text style={[styles.resetText, { color: colors.foreground }]}>استعادة الأساسي</Text></TouchableOpacity><TouchableOpacity onPress={() => onSave(draft)} style={[styles.saveButton, { backgroundColor: colors.primary }]}><Text style={styles.saveText}>حفظ التخصيص</Text></TouchableOpacity></View>
      </View>
    </View>
  </Modal>;
}

function Notice({ colors }: { colors: ReturnType<typeof useColors> }) { return <View style={[styles.notice, { backgroundColor: colors.primary + "0E", borderColor: colors.primary + "26" }]}><MaterialIcons name="verified" size={18} color={colors.primary} /><Text style={[styles.noticeText, { color: colors.muted }]}>الإعدادات الافتراضية لا تضيف أي تغيير إلى شكل التقرير الحالي.</Text></View>; }
function PdfLivePreview({ value, colors }: { value: PdfCustomization; colors: ReturnType<typeof useColors> }) {
  const tableColor = previewColor(value.tableColor, "#1455B8");
  const chartColor = previewColor(value.chartAccent, "#2563EB");
  const tableBorder = value.tableStyle === "outlined" ? tableColor + "66" : colors.border;
  const chartStyle = value.chartAppearance === "soft" ? { backgroundColor: chartColor + "0D", borderColor: chartColor + "48", borderRadius: 15, padding: 11 } : value.chartAppearance === "minimal" ? { backgroundColor: "transparent", borderColor: "transparent", borderRadius: 0, padding: 4 } : { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 12, padding: 9 };
  const rows = [["منتج أ", "72%"], ["منتج ب", "48%"]];
  return <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.previewHeader}><View style={[styles.previewIcon, { backgroundColor: chartColor + "18" }]}><MaterialIcons name="visibility" size={18} color={chartColor} /></View><View style={styles.previewCopy}><Text style={[styles.previewTitle, { color: colors.foreground }]}>معاينة مباشرة</Text><Text style={[styles.previewHint, { color: colors.muted }]}>تتغير فوراً ولا تُحفظ قبل الضغط على «حفظ التخصيص»</Text></View></View>
    <Text style={[styles.previewLabel, { color: colors.muted }]}>شكل الجدول</Text>
    <View style={[styles.miniTable, { borderColor: tableBorder }]}><View style={[styles.miniTableHeader, { backgroundColor: tableColor }]}><Text style={styles.miniTableHeaderText}>المنتج</Text><Text style={styles.miniTableHeaderText}>التواجد</Text></View>{rows.map((row, index) => <View key={row[0]} style={[styles.miniTableRow, { borderTopColor: tableBorder, backgroundColor: value.tableStyle === "zebra" && index % 2 === 1 ? colors.background : "transparent" }]}><Text style={[styles.miniTableText, { color: colors.foreground }]}>{row[0]}</Text><Text style={[styles.miniTableText, { color: colors.foreground }]}>{row[1]}</Text></View>)}</View>
    <Text style={[styles.previewLabel, { color: colors.muted }]}>شكل المخطط</Text>
    <View style={[styles.miniChart, chartStyle]}><View style={styles.chartBars}>{[0.66, 0.42, 0.82, 0.55, 0.74].map((height, index) => <View key={index} style={[styles.chartBar, { height: `${height * 100}%`, backgroundColor: index === 2 ? chartColor : chartColor + "8C" }]} />)}</View><View style={[styles.chartBaseline, { backgroundColor: chartColor + "40" }]} /></View>
  </View>;
}
function previewColor(preset: PdfColorPreset, fallback: string) { return COLOR_PRESETS.find((item) => item.id === preset)?.color || fallback; }
function ChoiceGroup<T extends string>({ title, options, value, colors, onSelect }: { title: string; options: Array<{ id: T; label: string; hint: string }>; value: T; colors: ReturnType<typeof useColors>; onSelect: (id: T) => void }) { return <View style={styles.group}><Text style={[styles.groupTitle, { color: colors.foreground }]}>{title}</Text>{options.map((option) => <TouchableOpacity key={option.id} onPress={() => onSelect(option.id)} style={[styles.choice, { borderColor: value === option.id ? colors.primary : colors.border, backgroundColor: value === option.id ? colors.primary + "0B" : colors.surface }]}><MaterialIcons name={value === option.id ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={value === option.id ? colors.primary : colors.muted} /><View style={styles.choiceCopy}><Text style={[styles.choiceTitle, { color: colors.foreground }]}>{option.label}</Text><Text style={[styles.choiceHint, { color: colors.muted }]}>{option.hint}</Text></View></TouchableOpacity>)}</View>; }
function ColorGroup({ title, value, colors, onSelect }: { title: string; value: PdfColorPreset; colors: ReturnType<typeof useColors>; onSelect: (id: PdfColorPreset) => void }) { return <View style={styles.group}><Text style={[styles.groupTitle, { color: colors.foreground }]}>{title}</Text><View style={styles.colorGrid}>{COLOR_PRESETS.map((option) => <TouchableOpacity key={option.id} onPress={() => onSelect(option.id)} style={[styles.colorOption, { borderColor: value === option.id ? colors.primary : colors.border, backgroundColor: colors.surface }]}><View style={[styles.colorSwatch, { backgroundColor: option.color }]}>{value === option.id ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View><Text style={[styles.colorLabel, { color: colors.foreground }]}>{option.label}</Text></TouchableOpacity>)}</View></View>; }

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.42)" }, sheet: { maxHeight: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, overflow: "hidden" }, header: { minHeight: 76, paddingHorizontal: 16, flexDirection: "row-reverse", alignItems: "center", gap: 10, borderBottomWidth: 1 }, headerButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }, headerIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "flex-end" }, title: { fontSize: 17, fontWeight: "800" as const, textAlign: "right" }, subtitle: { fontSize: 10, textAlign: "right", marginTop: 3 }, content: { padding: 16, paddingBottom: 22, gap: 18 }, notice: { flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 13, padding: 11 }, noticeText: { flex: 1, fontSize: 11, lineHeight: 18, textAlign: "right" }, previewCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8 }, previewHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 9 }, previewIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" }, previewCopy: { flex: 1, alignItems: "flex-end" }, previewTitle: { fontSize: 13, fontWeight: "800" as const, textAlign: "right" }, previewHint: { fontSize: 9, textAlign: "right", marginTop: 2 }, previewLabel: { fontSize: 10, fontWeight: "700" as const, textAlign: "right", marginTop: 4 }, miniTable: { overflow: "hidden", borderWidth: 1, borderRadius: 10 }, miniTableHeader: { minHeight: 28, paddingHorizontal: 9, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, miniTableHeaderText: { color: "#fff", fontSize: 10, fontWeight: "800" as const }, miniTableRow: { minHeight: 26, paddingHorizontal: 9, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth }, miniTableText: { fontSize: 10, fontWeight: "600" as const }, miniChart: { minHeight: 74, justifyContent: "flex-end", borderWidth: 1 }, chartBars: { height: 48, flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "space-evenly", gap: 8 }, chartBar: { width: 14, minHeight: 5, borderTopLeftRadius: 4, borderTopRightRadius: 4 }, chartBaseline: { height: 1, width: "100%", marginTop: 3 }, group: { gap: 8 }, groupTitle: { fontSize: 14, fontWeight: "800" as const, textAlign: "right" }, choice: { minHeight: 58, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, choiceCopy: { flex: 1, alignItems: "flex-end" }, choiceTitle: { fontSize: 13, fontWeight: "700" as const, textAlign: "right" }, choiceHint: { fontSize: 10, textAlign: "right", marginTop: 2 }, colorGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }, colorOption: { width: "31%", minHeight: 69, borderWidth: 1, borderRadius: 13, justifyContent: "center", alignItems: "center", gap: 5 }, colorSwatch: { width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center" }, colorLabel: { fontSize: 10, fontWeight: "700" as const }, footer: { flexDirection: "row-reverse", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1 }, resetButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" }, resetText: { fontSize: 13, fontWeight: "700" as const }, saveButton: { flex: 1.3, minHeight: 48, borderRadius: 13, alignItems: "center", justifyContent: "center" }, saveText: { color: "#fff", fontSize: 13, fontWeight: "800" as const },
});
