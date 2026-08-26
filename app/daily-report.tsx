import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import { DailyReportSettingsSheet } from "@/components/daily-report-settings-sheet";
import { useColors } from "@/hooks/use-colors";
import { toDateOnly, type DailyReportDateRange } from "@/lib/daily-report-model";
import { exportDailyReportPdf, loadDailyReport, type DailyReportData } from "@/lib/daily-report-exporter";
import { loadDailyReportSettings, saveDailyReportSettings } from "@/lib/daily-report-settings";
import { DEFAULT_DAILY_REPORT_SETTINGS, type DailyReportSettings } from "@/lib/daily-report-settings-model";

function initialRange(): DailyReportDateRange {
  const today = toDateOnly(new Date());
  return { startDate: today, endDate: today };
}

export default function DailyReportScreen() {
  const colors = useColors();
  const [range, setRange] = useState<DailyReportDateRange>(initialRange);
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [reportSettings, setReportSettings] = useState<DailyReportSettings>(DEFAULT_DAILY_REPORT_SETTINGS);
  const [rangeNoticeVisible, setRangeNoticeVisible] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showReportSettings, setShowReportSettings] = useState(false);

  const load = useCallback(async (nextRange = range) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextRange.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(nextRange.endDate)) return;
    if (nextRange.startDate > nextRange.endDate) { setRangeNoticeVisible(true); return; }
    setIsLoading(true);
    try { setReport(await loadDailyReport(nextRange)); }
    finally { setIsLoading(false); }
  }, [range]);
  useEffect(() => { void load(range); }, []);
  useEffect(() => { void loadDailyReportSettings().then(setReportSettings); }, []);
  useFocusEffect(useCallback(() => { void load(range); }, [load, range]));

  const applyRange = (next: DailyReportDateRange) => { setRange(next); void load(next); };
  const setPreset = (days: number) => {
    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - days + 1);
    applyRange({ startDate: toDateOnly(start), endDate: toDateOnly(end) });
  };
  const exportReport = async () => {
    if (!report) return;
    setIsExporting(true);
    try { await exportDailyReportPdf(report, { includeMedia, settings: reportSettings }); }
    finally { setIsExporting(false); }
  };
  const saveContentSettings = async (next: DailyReportSettings) => {
    const saved = await saveDailyReportSettings(next);
    setReportSettings(saved);
    setShowReportSettings(false);
  };
  const summary = report?.summary;
  const enabledContent = [
    reportSettings.includeExecutiveSummary && "الملخص التنفيذي",
    reportSettings.includeMetrics && "مؤشرات الفترة",
    reportSettings.includeBrandPresenceSummary && "نسب الماركات",
    reportSettings.includeStoreDetails && "بطاقات المحلات",
    reportSettings.includeEvents && "الفعاليات",
  ].filter(Boolean).join("، ");

  return <ScreenContainer containerClassName="bg-background">
    <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={() => router.back()} style={[styles.roundButton, { backgroundColor: colors.surface }]}><MaterialIcons name="arrow-forward" size={22} color={colors.foreground} /></TouchableOpacity><View style={styles.headerText}><Text style={[styles.headerTitle, { color: colors.foreground }]}>التقرير اليومي</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>الزيارات والاستبيانات والصور والفعاليات</Text></View><View style={[styles.roundButton, { backgroundColor: colors.primary + "14" }]}><MaterialIcons name="today" size={21} color={colors.primary} /></View></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "24" }]}><MaterialIcons name="summarize" size={28} color={colors.primary} /><View style={styles.heroText}><Text style={[styles.heroTitle, { color: colors.foreground }]}>وثّق يومك الميداني في تقرير واحد</Text><Text style={[styles.heroSubtitle, { color: colors.muted }]}>يُضمّن التقرير معلومات المحلات، صور الاستبيان، توفر المنتجات، الملاحظات والفعاليات ضمن الفترة المحددة.</Text></View></View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>حدد الفترة</Text>
      <View style={styles.presets}>{[[1, "اليوم"], [7, "آخر 7 أيام"], [30, "آخر 30 يوماً"]].map(([days, label]) => <TouchableOpacity key={days} onPress={() => setPreset(Number(days))} style={[styles.preset, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.presetText, { color: colors.primary }]}>{label}</Text></TouchableOpacity>)}</View>
      <TouchableOpacity onPress={() => setShowDateRangePicker(true)} style={[styles.rangeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.dateField}><Text style={[styles.dateLabel, { color: colors.muted }]}>من</Text><Text style={[styles.dateValue, { color: colors.foreground }]}>{range.startDate}</Text></View><MaterialIcons name="arrow-back" size={18} color={colors.muted} /><View style={styles.dateField}><Text style={[styles.dateLabel, { color: colors.muted }]}>إلى</Text><Text style={[styles.dateValue, { color: colors.foreground }]}>{range.endDate}</Text></View><MaterialIcons name="date-range" size={19} color={colors.primary} /></TouchableOpacity>
      <TouchableOpacity onPress={() => void load()} style={[styles.updateButton, { borderColor: colors.primary, backgroundColor: colors.primary + "0D" }]}><MaterialIcons name="refresh" size={18} color={colors.primary} /><Text style={[styles.updateText, { color: colors.primary }]}>تحديث المعاينة</Text></TouchableOpacity>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ملخص الفترة</Text>
      {isLoading || !summary ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View> : <View style={styles.metrics}>{[
        { value: summary.storesVisited, label: "محلات مزارة", icon: "store" as const, color: "#2563EB" }, { value: summary.surveyResults, label: "استبيانات", icon: "assignment" as const, color: "#0E9F6E" },
        { value: summary.regionsVisited.length, label: "مناطق", icon: "map" as const, color: "#7C3AED" }, { value: summary.eventsCount, label: "فعاليات", icon: "event" as const, color: "#D97706" },
        { value: summary.photosCount, label: "صور محلات", icon: "photo-camera" as const, color: "#DB2777" },
      ].map((metric) => <View key={metric.label} style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.metricIcon, { backgroundColor: metric.color + "16" }]}><MaterialIcons name={metric.icon} size={17} color={metric.color} /></View><Text style={[styles.metricValue, { color: colors.foreground }]}>{metric.value}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>{metric.label}</Text></View>)}</View>}
      {summary?.regionsVisited.length ? <View style={[styles.regionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.regionsTitle, { color: colors.foreground }]}>المناطق التي زرتها</Text><Text style={[styles.regionsText, { color: colors.muted }]}>{summary.regionsVisited.join("، ")}</Text></View> : null}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>إعدادات التقرير</Text>
      <TouchableOpacity onPress={() => setShowReportSettings(true)} style={[styles.contentSetting, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="tune" size={21} color={colors.primary} /><View style={styles.contentSettingCopy}><Text style={[styles.contentSettingTitle, { color: colors.foreground }]}>المحتوى وطريقة العرض</Text><Text numberOfLines={2} style={[styles.contentSettingSubtitle, { color: colors.muted }]}>{enabledContent || "اختر أقسام التقرير التي تريد ظهورها"}</Text></View><MaterialIcons name="chevron-left" size={21} color={colors.muted} /></TouchableOpacity>
      <View style={[styles.mediaSetting, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.mediaSettingCopy}><Text style={[styles.mediaSettingTitle, { color: colors.foreground }]}>وسائط المحلات</Text><Text style={[styles.mediaSettingSubtitle, { color: colors.muted }]}>{includeMedia ? "إدراج صور الاستبيانات داخل التقرير" : "إصدار التقرير من دون صور الاستبيانات"}</Text></View><View style={[styles.mediaOptions, { backgroundColor: colors.background }]}><TouchableOpacity onPress={() => setIncludeMedia(false)} style={[styles.mediaOption, !includeMedia && { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.mediaOptionText, { color: !includeMedia ? colors.primary : colors.muted }]}>بلا وسائط</Text></TouchableOpacity><TouchableOpacity onPress={() => setIncludeMedia(true)} style={[styles.mediaOption, includeMedia && { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={[styles.mediaOptionText, { color: includeMedia ? "#fff" : colors.muted }]}>يتضمن الوسائط</Text></TouchableOpacity></View></View>
      <View style={[styles.reportOutline, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.outlineTitle, { color: colors.foreground }]}>ما الذي سيظهر في التقرير؟</Text><Text style={[styles.outlineText, { color: colors.muted }]}>{`${enabledContent || "الأقسام المحددة"}.${reportSettings.includeStoreDetails ? includeMedia ? " ستُدرج صور المحلات بالطريقة الحالية." : " ستُستبعد صور المحلات فقط." : ""}`}</Text></View>
      <TouchableOpacity disabled={isExporting || !report || (!report.surveyResults.length && !report.events.length)} onPress={() => void exportReport()} style={[styles.exportButton, { backgroundColor: colors.primary, opacity: isExporting || !report || (!report.surveyResults.length && !report.events.length) ? 0.55 : 1 }]}>{isExporting ? <ActivityIndicator color="#fff" /> : <><MaterialIcons name="picture-as-pdf" size={21} color="#fff" /><Text style={styles.exportText}>إنشاء ومشاركة PDF</Text></>}</TouchableOpacity>
    </ScrollView>
    <DateRangePickerModal visible={showDateRangePicker} startDate={new Date(`${range.startDate}T12:00:00`)} endDate={new Date(`${range.endDate}T12:00:00`)} title="فترة التقرير اليومي" onCancel={() => setShowDateRangePicker(false)} onConfirm={(startDate, endDate) => { setShowDateRangePicker(false); applyRange({ startDate: toDateOnly(startDate), endDate: toDateOnly(endDate) }); }} />
    <DailyReportSettingsSheet visible={showReportSettings} value={reportSettings} onClose={() => setShowReportSettings(false)} onSave={(next) => void saveContentSettings(next)} />
    <ConfirmDialog visible={rangeNoticeVisible} title="نطاق غير صحيح" message="يجب أن يكون تاريخ البداية قبل تاريخ النهاية." confirmText="حسنًا" cancelText="إغلاق" icon="date-range" onCancel={() => setRangeNoticeVisible(false)} onConfirm={() => setRangeNoticeVisible(false)} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  header: { height: 76, flexDirection: "row", gap: 12, alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 1 }, roundButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerText: { flex: 1, alignItems: "flex-end" }, headerTitle: { fontSize: 18, fontWeight: "800" as any }, headerSubtitle: { fontSize: 11, marginTop: 2 }, content: { padding: 16, paddingBottom: 38 }, hero: { borderWidth: 1, borderRadius: 16, padding: 15, flexDirection: "row", gap: 12, alignItems: "flex-start" }, heroText: { flex: 1, alignItems: "flex-end" }, heroTitle: { fontSize: 14, fontWeight: "800" as any, textAlign: "right" }, heroSubtitle: { fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 4 }, sectionTitle: { fontSize: 15, fontWeight: "800" as any, textAlign: "right", marginTop: 20, marginBottom: 10 }, presets: { flexDirection: "row", gap: 8, justifyContent: "flex-end" }, preset: { flex: 1, minHeight: 38, borderWidth: 1, borderRadius: 11, alignItems: "center", justifyContent: "center" }, presetText: { fontSize: 12, fontWeight: "700" as any }, rangeCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }, dateField: { flex: 1, alignItems: "flex-end" }, dateLabel: { fontSize: 11, marginBottom: 4 }, dateValue: { fontSize: 13, fontWeight: "800" as any }, updateButton: { alignSelf: "center", flexDirection: "row", borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, gap: 6, marginTop: 10 }, updateText: { fontSize: 12, fontWeight: "700" as any }, loading: { height: 100, alignItems: "center", justifyContent: "center" }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metric: { width: "31%", borderWidth: 1, borderRadius: 14, padding: 10, alignItems: "center" }, metricIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" }, metricValue: { fontSize: 18, fontWeight: "800" as any, marginTop: 5 }, metricLabel: { fontSize: 10, textAlign: "center", marginTop: 2 }, regionsCard: { marginTop: 10, borderWidth: 1, borderRadius: 14, padding: 13, alignItems: "flex-end" }, regionsTitle: { fontSize: 13, fontWeight: "800" as any }, regionsText: { fontSize: 12, textAlign: "right", marginTop: 5 }, contentSetting: { borderWidth: 1, borderRadius: 14, minHeight: 72, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }, contentSettingCopy: { flex: 1, alignItems: "flex-end" }, contentSettingTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right" }, contentSettingSubtitle: { fontSize: 10, lineHeight: 16, textAlign: "right", marginTop: 4 }, mediaSetting: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }, mediaSettingCopy: { flex: 1, alignItems: "flex-end" }, mediaSettingTitle: { fontSize: 13, fontWeight: "800" as any }, mediaSettingSubtitle: { fontSize: 10, textAlign: "right", marginTop: 4 }, mediaOptions: { height: 38, borderRadius: 11, padding: 3, flexDirection: "row" }, mediaOption: { minWidth: 74, borderRadius: 8, borderWidth: 1, borderColor: "transparent", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }, mediaOptionText: { fontSize: 9, fontWeight: "800" as any }, reportOutline: { marginTop: 16, borderWidth: 1, borderRadius: 14, padding: 13, alignItems: "flex-end" }, outlineTitle: { fontSize: 13, fontWeight: "800" as any }, outlineText: { fontSize: 11, lineHeight: 19, textAlign: "right", marginTop: 5 }, exportButton: { minHeight: 54, marginTop: 20, borderRadius: 15, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8 }, exportText: { color: "#fff", fontSize: 15, fontWeight: "800" as any },
});
