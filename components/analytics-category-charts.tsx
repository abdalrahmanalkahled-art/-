import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";

import { AnalyticsTrackingChart } from "@/components/analytics-tracking-chart";
import { useColors } from "@/hooks/use-colors";
import type { ChartLabelSize, ChartOrientation, ChartType } from "@/lib/analytics-settings";
import type { CategoryAggregation } from "@/lib/analytics-settings-model";
import { groupAnalyticsByCategory } from "@/lib/analytics-category-groups";
import { toWesternDigits } from "@/lib/analytics-number-format";
import type { AdvancedSurveyAnalytics } from "@/lib/advanced-analytics";

export function AnalyticsCategoryCharts({
  analytics,
  scopeLabel,
  chartType,
  chartOrientation,
  selectedSingleCycle,
  showValues,
  showProductNames,
  labelSize,
  rotateProductNames,
  aggregation,
  categoryOrder = [],
}: {
  analytics: AdvancedSurveyAnalytics;
  scopeLabel: string;
  chartType: ChartType;
  chartOrientation: ChartOrientation;
  selectedSingleCycle: boolean;
  showValues: boolean;
  showProductNames: boolean;
  labelSize: ChartLabelSize;
  rotateProductNames: boolean;
  aggregation: CategoryAggregation;
  categoryOrder?: string[];
}) {
  const colors = useColors();
  const [showWeightedHelp, setShowWeightedHelp] = useState(false);
  const groups = groupAnalyticsByCategory(analytics, aggregation, categoryOrder);
  if (!groups.length) return <AnalyticsTrackingChart analytics={analytics} scopeLabel={scopeLabel} chartType={chartType} chartOrientation={chartOrientation} selectedSingleCycle={selectedSingleCycle} showValues={showValues} showProductNames={showProductNames} labelSize={labelSize} rotateProductNames={rotateProductNames} />;
  return <View style={styles.container}>
    {aggregation === "weightedBySample" ? <TouchableOpacity onPress={() => setShowWeightedHelp(true)} style={[styles.helpTrigger, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "38" }]}><MaterialIcons name="help-outline" size={18} color={colors.primary} /><Text style={[styles.helpTriggerText, { color: colors.primary }]}>كيف يُحسب متوسط التواجد الموزون؟</Text></TouchableOpacity> : null}
    {groups.map((group) => <View key={group.category} style={styles.group}>
      <View style={[styles.heading, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <View style={styles.sourceAverages}>
          <SourceAverage label="منتجاتنا" value={group.companyAveragePresence} color={colors.primary} colors={colors} />
          <SourceAverage label="المنافسون" value={group.competitorAveragePresence} color={colors.warning} colors={colors} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.categoryLabel, { color: colors.foreground }]}>الصنف: {toWesternDigits(group.category)}</Text>
          <Text style={[styles.scope, { color: colors.muted }]}>{toWesternDigits(scopeLabel)}</Text>
        </View>
      </View>
      <AnalyticsTrackingChart analytics={group.analytics} scopeLabel={`تحليل صنف ${toWesternDigits(group.category)}`} chartType={chartType} chartOrientation={chartOrientation} selectedSingleCycle={selectedSingleCycle} showValues={showValues} showProductNames={showProductNames} labelSize={labelSize} rotateProductNames={rotateProductNames} />
    </View>)}
    <WeightedPresenceHelpModal visible={showWeightedHelp} colors={colors} onClose={() => setShowWeightedHelp(false)} />
  </View>;
}

function SourceAverage({ label, value, color, colors }: { label: string; value?: number; color: string; colors: ReturnType<typeof useColors> }) { return <View style={[styles.sourceAverage, { backgroundColor: color + "12", borderColor: color + "48" }]}><Text style={[styles.sourceAverageValue, { color }]}>{value === undefined ? "—" : `${value}%`}</Text><Text style={[styles.sourceAverageLabel, { color: colors.muted }]}>{label}</Text></View>; }
function WeightedPresenceHelpModal({ visible, colors, onClose }: { visible: boolean; colors: ReturnType<typeof useColors>; onClose: () => void }) { return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View style={styles.helpBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={[styles.helpModal, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.helpHeader}><TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={21} color={colors.muted} /></TouchableOpacity><Text style={[styles.helpTitle, { color: colors.foreground }]}>متوسط التواجد الموزون</Text></View><Text style={[styles.helpText, { color: colors.foreground }]}>يعطي كل منتج وزناً بحسب عدد المحلات التي رُصد فيها. لذلك لا تؤثر نسبة مبنية على عينة صغيرة بالقدر نفسه الذي تؤثر به نسبة منتج له رصد واسع.</Text><Text style={[styles.helpFormula, { color: colors.primary }]}>إجمالي مرات التواجد ÷ إجمالي الرصد × 100</Text><Text style={[styles.helpText, { color: colors.muted }]}>يُحسب متوسط منتجاتنا ومتوسط المنافسين كلٌ على حدة داخل الصنف. عند تساوي عينات المنتجات، يساوي هذا المتوسط المتوسط العادي للنسب.</Text><TouchableOpacity onPress={onClose} style={[styles.helpConfirm, { backgroundColor: colors.primary }]}><Text style={styles.helpConfirmText}>فهمت</Text></TouchableOpacity></View></View></Modal>; }

const styles = StyleSheet.create({
  container: { gap: 12 },
  group: { gap: 8 },
  heading: { minHeight: 76, borderWidth: 1, borderRadius: 16, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  headingCopy: { flex: 1, gap: 4 },
  categoryLabel: { textAlign: "right", fontSize: 14, fontWeight: "800" },
  scope: { textAlign: "right", fontSize: 10 },
  sourceAverages: { flexDirection: "row", gap: 6 },
  sourceAverage: { minWidth: 62, minHeight: 52, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  sourceAverageValue: { fontSize: 14, fontWeight: "800" },
  sourceAverageLabel: { fontSize: 8, fontWeight: "700" },
  helpTrigger: { minHeight: 38, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  helpTriggerText: { fontSize: 11, fontWeight: "800" },
  helpBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.42)", justifyContent: "center", padding: 18 },
  helpModal: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  helpHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  helpTitle: { fontSize: 15, fontWeight: "800", textAlign: "right" },
  helpText: { fontSize: 12, lineHeight: 19, textAlign: "right" },
  helpFormula: { fontSize: 13, fontWeight: "800", textAlign: "center", direction: "rtl" },
  helpConfirm: { minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  helpConfirmText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
