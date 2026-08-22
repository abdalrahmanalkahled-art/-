import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { ProgressBar } from "@/components/ui/progress-bar";
import { useColors } from "@/hooks/use-colors";
import type { SurveyResult, SurveyTemplate } from "@/lib/types/survey-types";

interface SurveyTemplateCardProps {
  template: SurveyTemplate;
  activeCycleResultCount: number;
  onStart: () => void;
  onLongPress: () => void;
}

export function SurveyTemplateCard({ template, activeCycleResultCount, onStart, onLongPress }: SurveyTemplateCardProps) {
  const colors = useColors();
  return (
    <Pressable delayLongPress={300} onLongPress={onLongPress} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.88 }]}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]}>{template.name}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{template.products.length} منتج • {activeCycleResultCount} محل في الدورة الحالية</Text>
        </View>
        <TouchableOpacity onPress={onStart} onLongPress={onLongPress} delayLongPress={300} style={[styles.startButton, { backgroundColor: colors.primary }]} activeOpacity={0.7} accessibilityLabel={`بدء استبيان ${template.name}`}>
          <MaterialIcons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

interface SurveyResultCardProps {
  result: SurveyResult;
  displayName: string;
  onPress: () => void;
  onLongPress: () => void;
}

export function SurveyResultCard({ result, displayName, onPress, onLongPress }: SurveyResultCardProps) {
  const colors = useColors();
  const presentCount = result.data.filter((item) => item.present).length;
  const percentage = result.data.length ? Math.round((presentCount / result.data.length) * 100) : 0;
  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} delayLongPress={350} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]}>{result.storeName}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{displayName} • {result.surveyDate}</Text>
        </View>
        <View style={[styles.percentageBadge, { backgroundColor: colors.primary + "20" }]}><Text style={[styles.percentageText, { color: colors.primary }]}>{percentage}%</Text></View>
      </View>
      <ProgressBar value={percentage} label="نسبة التواجد" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 12, borderWidth: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  startButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  percentageBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  percentageText: { fontSize: 12, fontWeight: "700" },
});
