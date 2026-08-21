import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  height?: number;
}

export function ProgressBar({ value, max = 100, label, showPercentage = true, color, height = 8 }: ProgressBarProps) {
  const colors = useColors();
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const barColor = color || (percentage >= 80 ? colors.success : percentage >= 50 ? colors.warning : colors.error);

  return (
    <View style={styles.container}>
      {(label || showPercentage) && (
        <View style={styles.labelRow}>
          {label && <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>}
          {showPercentage && <Text style={[styles.percentage, { color: barColor }]}>{Math.round(percentage)}%</Text>}
        </View>
      )}
      <View style={[styles.track, { backgroundColor: colors.border, height }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: barColor, width: `${percentage}%` as any, height },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontSize: 13, fontWeight: "500" as any },
  percentage: { fontSize: 13, fontWeight: "700" as any },
  track: { borderRadius: 100, overflow: "hidden", width: "100%" },
  fill: { borderRadius: 100 },
});
