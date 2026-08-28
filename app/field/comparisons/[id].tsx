import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { AppPageHeader } from "@/components/app-page-header";
import { FieldDetailSection, FieldInfoRow, FieldLoadingState, formatFieldDate } from "@/components/field-intelligence/field-record-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getItems, STORAGE_KEYS } from "@/lib/storage";

type SurveyResult = { storeName: string; storeRegion: string; surveyDate: string; data?: { present?: boolean }[] };
type ComparisonDetails = { storeName: string; region: string; beforeDate: string; afterDate: string; beforeRatio: number; afterRatio: number; difference: number };
const ratio = (survey: SurveyResult) => survey.data?.length ? Math.round(survey.data.filter((entry) => entry.present).length / survey.data.length * 1000) / 10 : 0;

function decodeKey(value: string): { storeName: string; afterDate: string } {
  try { value = decodeURIComponent(value); } catch { /* route values are still usable when already decoded */ }
  const separator = value.lastIndexOf("::");
  return separator === -1 ? { storeName: value, afterDate: "" } : { storeName: value.slice(0, separator), afterDate: value.slice(separator + 2) };
}

export default function FieldComparisonDetailsScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const [comparison, setComparison] = useState<ComparisonDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const key = decodeKey(typeof params.id === "string" ? params.id : "");
    const surveys = await getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS);
    const visits = surveys.filter((survey) => survey.storeName === key.storeName).sort((left, right) => String(right.surveyDate).localeCompare(String(left.surveyDate)));
    const after = visits.find((survey) => survey.surveyDate === key.afterDate) || visits[0];
    const before = visits.find((survey) => survey.surveyDate !== after?.surveyDate);
    if (after && before) setComparison({ storeName: after.storeName, region: after.storeRegion, beforeDate: before.surveyDate, afterDate: after.surveyDate, beforeRatio: ratio(before), afterRatio: ratio(after), difference: Math.round((ratio(after) - ratio(before)) * 10) / 10 });
    else setComparison(null);
    setLoading(false);
  }, [params.id]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><AppPageHeader title="تفاصيل المقارنة" onBack={() => router.back()} /><FieldLoadingState /></ScreenContainer>;
  if (!comparison) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><AppPageHeader title="تفاصيل المقارنة" onBack={() => router.back()} /><View style={styles.notFound}><MaterialIcons name="compare-arrows" size={48} color={colors.muted} /><Text style={[styles.notFoundTitle, { color: colors.foreground }]}>المقارنة غير متاحة</Text><Text style={[styles.notFoundText, { color: colors.muted }]}>تحتاج المقارنة إلى زيارتين محفوظتين للمحل نفسه.</Text><TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.primary }]}><Text style={styles.backButtonText}>العودة إلى المقارنات</Text></TouchableOpacity></View></ScreenContainer>;

  const positive = comparison.difference >= 0;
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <AppPageHeader title="تفاصيل المقارنة" subtitle="قراءة مشتقة من نتائج الاستبيانات" onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { backgroundColor: colors.accent }]}><View style={styles.heroIcon}><MaterialIcons name="compare-arrows" size={26} color="#fff" /></View><Text style={styles.heroTitle}>{comparison.storeName}</Text><Text style={styles.heroSubtitle}>{comparison.region || "منطقة غير محددة"}</Text><View style={[styles.changeBadge, { backgroundColor: "rgba(255,255,255,0.17)" }]}><Text style={styles.changeValue}>{positive ? "+" : ""}{comparison.difference}%</Text><Text style={styles.changeLabel}>التغير في الظهور</Text></View></View>
      <FieldDetailSection title="نطاق المقارنة" icon="date-range"><FieldInfoRow label="المحل" value={comparison.storeName} icon="store" /><FieldInfoRow label="المنطقة" value={comparison.region} icon="location-on" /><FieldInfoRow label="الزيارة السابقة" value={formatFieldDate(comparison.beforeDate)} icon="history" /><FieldInfoRow label="الزيارة الأحدث" value={formatFieldDate(comparison.afterDate)} icon="update" /></FieldDetailSection>
      <FieldDetailSection title="نسبة الظهور" icon="analytics"><View style={styles.ratioRow}><RatioCard label="قبل" value={comparison.beforeRatio} color={colors.muted} /><View style={[styles.arrow, { backgroundColor: positive ? colors.success + "16" : colors.error + "16" }]}><MaterialIcons name="arrow-back" size={22} color={positive ? colors.success : colors.error} /></View><RatioCard label="بعد" value={comparison.afterRatio} color={positive ? colors.success : colors.error} /></View><Text style={[styles.explanation, { color: colors.muted }]}>تُحسب النسبة من إجابات الظهور في الاستبيانين، ولا تُنشئ هذه الشاشة سجلاً مستقلاً قابلاً للتعديل.</Text></FieldDetailSection>
      <Text style={[styles.footerHint, { color: colors.muted }]}>تتحدث هذه المقارنة تلقائياً عند إضافة أو تعديل نتائج الاستبيانات.</Text>
    </ScrollView>
  </ScreenContainer>;
}

function RatioCard({ label, value, color }: { label: string; value: number; color: string }) { return <View style={[styles.ratioCard, { backgroundColor: color + "12", borderColor: color + "30" }]}><Text style={[styles.ratioValue, { color }]}>{value}%</Text><Text style={[styles.ratioLabel, { color }]}>{label}</Text></View>; }

const styles = StyleSheet.create({ content: { padding: 14, gap: 12, paddingBottom: 32 }, hero: { borderRadius: 22, padding: 18, minHeight: 172, alignItems: "flex-end", gap: 7 }, heroIcon: { alignSelf: "flex-start", width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }, heroTitle: { color: "#fff", fontSize: 22, fontWeight: "900" as const, textAlign: "right" }, heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "right" }, changeBadge: { marginTop: 4, minWidth: 113, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 7, alignItems: "center" }, changeValue: { color: "#fff", fontSize: 19, fontWeight: "900" as const }, changeLabel: { color: "rgba(255,255,255,0.82)", fontSize: 10 }, ratioRow: { flexDirection: "row", alignItems: "center", gap: 8 }, ratioCard: { flex: 1, minHeight: 92, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 5 }, ratioValue: { fontSize: 24, fontWeight: "900" as const }, ratioLabel: { fontSize: 11, fontWeight: "800" as const }, arrow: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }, explanation: { fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 3 }, footerHint: { fontSize: 11, lineHeight: 18, textAlign: "center" }, notFound: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }, notFoundTitle: { fontSize: 18, fontWeight: "800" as const }, notFoundText: { textAlign: "center", fontSize: 13 }, backButton: { marginTop: 10, minHeight: 46, paddingHorizontal: 20, borderRadius: 13, justifyContent: "center" }, backButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" as const } });
