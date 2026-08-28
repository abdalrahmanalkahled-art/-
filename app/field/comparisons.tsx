import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { router } from "expo-router";

import { AppPageHeader } from "@/components/app-page-header";
import { FieldEmptyState, FieldListHero, FieldRecordCard } from "@/components/field-intelligence/field-record-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { newestComparison } from "@/lib/field-marketing-model";
import { getItems, STORAGE_KEYS } from "@/lib/storage";

type SurveyResult = { storeName: string; storeRegion: string; surveyDate: string; data?: { present?: boolean }[] };
export const comparisonRouteId = (storeName: string, afterDate: string) => encodeURIComponent(`${storeName}::${afterDate}`);

export default function FieldComparisonsScreen() {
  const colors = useColors();
  const [surveys, setSurveys] = useState<SurveyResult[]>([]);
  const load = useCallback(async () => setSurveys(await getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS)), []);
  useEffect(() => { void load(); }, [load]);
  const comparisons = useMemo(() => newestComparison(surveys), [surveys]);

  const listHeader = useMemo(() => <>
    <FieldListHero icon="compare-arrows" title="مقارنة قبل وبعد" subtitle="تابع تغير نسبة الظهور بين أحدث زيارتين لكل محل." count={comparisons.length} accent={colors.accent || colors.primary} />
    <Text style={[styles.hint, { color: colors.muted }]}>هذه المقارنات مشتقة من نتائج الاستبيانات، لذلك لا تتضمن تعديلًا أو حذفًا مستقلاً.</Text>
  </>, [colors.accent, colors.muted, colors.primary, comparisons.length]);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <AppPageHeader title="مقارنة قبل وبعد" subtitle="قراءة تطور الظهور التسويقي" onBack={() => router.back()} />
    <FlatList data={comparisons} keyExtractor={(item) => comparisonRouteId(item.storeName, item.afterDate)} ListHeaderComponent={listHeader} contentContainerStyle={comparisons.length ? styles.list : styles.emptyList} showsVerticalScrollIndicator={false} renderItem={({ item }) => <FieldRecordCard icon="compare-arrows" title={item.storeName} subtitle={`${item.region || "منطقة غير محددة"} · ${item.beforeDate} ← ${item.afterDate}`} meta="مقارنة مشتقة من زيارتين موثقتين" value={`${item.difference >= 0 ? "+" : ""}${item.difference}%`} valueColor={item.difference >= 0 ? colors.success : colors.error} accent={colors.accent || colors.primary} accessibilityLabel={`تفاصيل مقارنة ${item.storeName}`} onPress={() => router.push({ pathname: "/field/comparisons/[id]", params: { id: comparisonRouteId(item.storeName, item.afterDate) } })} />} ListEmptyComponent={<FieldEmptyState icon="compare-arrows" title="لا توجد مقارنات بعد" subtitle="ستظهر المقارنة تلقائياً بعد تسجيل نتيجتي استبيان للمحل نفسه." />} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({ list: { paddingBottom: 28, gap: 9 }, emptyList: { flexGrow: 1, paddingBottom: 28 }, hint: { marginHorizontal: 16, marginBottom: 4, fontSize: 11, lineHeight: 18, textAlign: "right" } });
