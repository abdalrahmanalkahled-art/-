import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FloatingFormModal } from "@/components/floating-form-modal";
import { useColors } from "@/hooks/use-colors";
import { DAILY_REPORT_SECTION_KEYS, type DailyReportSettings } from "@/lib/daily-report-settings-model";

type Palette = ReturnType<typeof useColors>;
type Panel = "sections" | "stores" | null;
type SectionKey = (typeof DAILY_REPORT_SECTION_KEYS)[number];

const SECTION_OPTIONS: { key: SectionKey; title: string; description: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "includeExecutiveSummary", title: "الملخص التنفيذي", description: "نص موجز عن التغطية والزيارات والفعاليات", icon: "summarize" },
  { key: "includeMetrics", title: "مؤشرات الفترة", description: "المحلات والاستبيانات والمناطق والفعاليات", icon: "dashboard" },
  { key: "includeBrandPresenceSummary", title: "نسب الماركات", description: "ملخص تواجد كل ماركة في أعلى التقرير", icon: "bar-chart" },
  { key: "includeStoreDetails", title: "بطاقات المحلات", description: "تفاصيل كل زيارة ضمن بطاقة مستقلة", icon: "storefront" },
  { key: "includeEvents", title: "الفعاليات", description: "الفعاليات المنفذة خلال الفترة", icon: "event" },
];

const DETAIL_OPTIONS: { key: "includeSurveyMeta" | "includeProductTable" | "includeQuestionAnswers" | "includeNotes"; title: string; description: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "includeSurveyMeta", title: "بيانات الاستبيان", description: "اسم الاستبيان والدورة وعدد الرفوف", icon: "assignment" },
  { key: "includeProductTable", title: "جدول المنتجات", description: "الحالة والتواجد والسعر عند توفره", icon: "table-chart" },
  { key: "includeQuestionAnswers", title: "إجابات الأسئلة", description: "الأسئلة الإضافية المسجلة في الزيارة", icon: "format-list-bulleted" },
  { key: "includeNotes", title: "الملاحظات", description: "ملاحظات المندوب والتوصيات المسجلة", icon: "sticky-note-2" },
];

export function DailyReportSettingsSheet({ visible, value, onClose, onSave }: { visible: boolean; value: DailyReportSettings; onClose: () => void; onSave: (value: DailyReportSettings) => void }) {
  const colors = useColors();
  const [draft, setDraft] = useState(value);
  const [activePanel, setActivePanel] = useState<Panel>(null);

  useEffect(() => { if (visible) { setDraft(value); setActivePanel(null); } }, [value, visible]);

  const enabledSections = useMemo(() => SECTION_OPTIONS.filter((option) => draft[option.key]).length, [draft]);
  const visibleDetails = useMemo(() => DETAIL_OPTIONS.filter((option) => draft[option.key]).length, [draft]);
  const toggleSection = (key: SectionKey) => setDraft((current) => {
    if (current[key] && DAILY_REPORT_SECTION_KEYS.filter((item) => current[item]).length === 1) return current;
    return { ...current, [key]: !current[key] };
  });
  const toggleDetail = (key: "includeSurveyMeta" | "includeProductTable" | "includeQuestionAnswers" | "includeNotes") => setDraft((current) => ({ ...current, [key]: !current[key] }));

  return <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.background}>
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} accessibilityLabel="إغلاق إعدادات التقرير اليومي"><MaterialIcons name="close" size={24} color={colors.foreground} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>إعدادات التقرير اليومي</Text>
        <View style={styles.headerGap} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, { color: colors.muted }]}>هذه الإعدادات تتحكم في محتوى وتخطيط PDF فقط. إعداد وسائط المحلات يبقى منفصلاً كما هو ولا يتغير هنا.</Text>
        <PanelCard icon="view-list" title="أقسام التقرير" summary={`${enabledSections} أقسام مفعلة`} colors={colors} onPress={() => setActivePanel("sections")} />
        <PanelCard icon="storefront" title="تفاصيل المحلات" summary={draft.includeStoreDetails ? `${visibleDetails} عناصر تفصيلية · ${draft.storeInfoPosition === "afterPhotos" ? "المعلومات بعد الصور" : "المعلومات قبل الصور"}` : "قسم المحلات غير مفعّل"} colors={colors} onPress={() => setActivePanel("stores")} />
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={[styles.footerButton, { backgroundColor: colors.muted + "18" }]}><Text style={[styles.cancelText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onSave(draft)} style={[styles.footerButton, { backgroundColor: colors.primary }]}><Text style={styles.saveText}>حفظ الإعدادات</Text></TouchableOpacity>
      </View>

      <PanelModal visible={activePanel === "sections"} title="أقسام التقرير" colors={colors} onClose={() => setActivePanel(null)}>
        <Text style={[styles.panelHint, { color: colors.muted }]}>فعّل الأقسام التي تريد ظهورها. يبقى قسم واحد على الأقل لحماية التقرير من أن يصبح فارغاً.</Text>
        {SECTION_OPTIONS.map((option) => <SettingToggle key={option.key} label={option.title} description={option.description} icon={option.icon} value={draft[option.key]} colors={colors} onPress={() => toggleSection(option.key)} />)}
      </PanelModal>

      <PanelModal visible={activePanel === "stores"} title="تفاصيل المحلات" colors={colors} onClose={() => setActivePanel(null)}>
        {!draft.includeStoreDetails ? <Text style={[styles.panelHint, { color: colors.warning }]}>فعّل بطاقات المحلات من أقسام التقرير أولاً حتى تظهر هذه الخيارات في PDF.</Text> : <>
          <Text style={[styles.settingTitle, { color: colors.foreground }]}>موضع معلومات المحل</Text>
          <ChoiceGrid options={[{ value: "beforePhotos", label: "قبل الصور", icon: "vertical-align-top" as const }, { value: "afterPhotos", label: "بعد بطاقة الصور", icon: "vertical-align-bottom" as const }]} active={draft.storeInfoPosition} colors={colors} onSelect={(value) => setDraft((current) => ({ ...current, storeInfoPosition: value as DailyReportSettings["storeInfoPosition"] }))} />
          <Text style={[styles.settingTitle, { color: colors.foreground }]}>المحتوى داخل بطاقة المحل</Text>
          {DETAIL_OPTIONS.map((option) => <SettingToggle key={option.key} label={option.title} description={option.description} icon={option.icon} value={draft[option.key]} colors={colors} onPress={() => toggleDetail(option.key)} />)}
        </>}
      </PanelModal>
    </SafeAreaView>
  </FloatingFormModal>;
}

function PanelCard({ icon, title, summary, colors, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; summary: string; colors: Palette; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="chevron-left" size={22} color={colors.muted} /><View style={styles.panelCopy}><Text style={[styles.panelTitle, { color: colors.foreground }]}>{title}</Text><Text numberOfLines={1} style={[styles.panelSummary, { color: colors.muted }]}>{summary}</Text></View><View style={[styles.panelIcon, { backgroundColor: colors.primary + "12" }]}><MaterialIcons name={icon} size={20} color={colors.primary} /></View></TouchableOpacity>; }
function PanelModal({ visible, title, colors, onClose, children }: { visible: boolean; title: string; colors: Palette; onClose: () => void; children: ReactNode }) { return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}><View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={[styles.panelModal, { backgroundColor: colors.background, borderColor: colors.border }]}><View style={[styles.panelHeader, { borderColor: colors.border }]}><TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}><MaterialIcons name="close" size={20} color={colors.muted} /></TouchableOpacity><Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text><View style={styles.headerGap} /></View><ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">{children}</ScrollView><View style={[styles.panelFooter, { borderColor: colors.border, backgroundColor: colors.background }]}><TouchableOpacity onPress={onClose} style={[styles.doneButton, { backgroundColor: colors.primary }]}><Text style={styles.saveText}>تم</Text></TouchableOpacity></View></View></View></Modal>; }
function ChoiceGrid({ options, active, colors, onSelect }: { options: { value: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }[]; active: string; colors: Palette; onSelect: (value: string) => void }) { return <View style={styles.choiceGrid}>{options.map((option) => <TouchableOpacity key={option.value} onPress={() => onSelect(option.value)} style={[styles.choice, { backgroundColor: active === option.value ? colors.primary + "12" : colors.surface, borderColor: active === option.value ? colors.primary : colors.border }]}><MaterialIcons name={option.icon} size={17} color={active === option.value ? colors.primary : colors.muted} /><Text style={[styles.choiceText, { color: active === option.value ? colors.primary : colors.foreground }]}>{option.label}</Text></TouchableOpacity>)}</View>; }
function SettingToggle({ label, description, icon, value, colors, onPress }: { label: string; description: string; icon: keyof typeof MaterialIcons.glyphMap; value: boolean; colors: Palette; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: value ? colors.primary : colors.border }]}><View style={[styles.toggleMark, { backgroundColor: value ? colors.primary : "transparent", borderColor: value ? colors.primary : colors.muted }]}>{value ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View><View style={styles.toggleCopy}><Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text><Text style={[styles.toggleDescription, { color: colors.muted }]}>{description}</Text></View><View style={[styles.toggleIcon, { backgroundColor: colors.primary + "10" }]}><MaterialIcons name={icon} size={19} color={colors.primary} /></View></TouchableOpacity>; }

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { minHeight: 60, borderBottomWidth: 1, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerTitle: { fontSize: 17, fontWeight: "800" as any, textAlign: "center", flex: 1 }, headerGap: { width: 24 }, content: { padding: 16, gap: 11, paddingBottom: 112 }, intro: { fontSize: 11, lineHeight: 18, textAlign: "right", paddingHorizontal: 2, marginBottom: 2 }, panelCard: { minHeight: 76, borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 11 }, panelIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, panelCopy: { flex: 1, gap: 4, alignItems: "flex-end" }, panelTitle: { fontSize: 14, fontWeight: "800" as any, textAlign: "right" }, panelSummary: { fontSize: 10, textAlign: "right" }, footer: { flexDirection: "row", gap: 10, padding: 15, borderTopWidth: 1 }, footerButton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" }, cancelText: { fontSize: 14, fontWeight: "800" as any }, saveText: { color: "#fff", fontSize: 14, fontWeight: "800" as any }, modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: 16 }, panelModal: { borderWidth: 1, borderRadius: 21, maxHeight: "88%", overflow: "hidden" }, panelHeader: { minHeight: 58, paddingHorizontal: 15, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }, panelContent: { padding: 15, gap: 11, paddingBottom: 20 }, panelFooter: { borderTopWidth: 1, padding: 13 }, doneButton: { minHeight: 45, borderRadius: 12, alignItems: "center", justifyContent: "center" }, settingTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right", marginTop: 3 }, choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { minHeight: 46, flexGrow: 1, flexBasis: "42%", borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, choiceText: { fontSize: 11, fontWeight: "800" as any, textAlign: "center" }, panelHint: { fontSize: 11, lineHeight: 17, textAlign: "right" }, toggleRow: { minHeight: 67, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 9 }, toggleIcon: { width: 35, height: 35, borderRadius: 11, alignItems: "center", justifyContent: "center" }, toggleMark: { width: 23, height: 23, borderWidth: 1.5, borderRadius: 7, alignItems: "center", justifyContent: "center" }, toggleCopy: { flex: 1, gap: 2, alignItems: "flex-end" }, toggleLabel: { fontSize: 12, fontWeight: "800" as any, textAlign: "right" }, toggleDescription: { fontSize: 10, lineHeight: 15, textAlign: "right" },
});
