import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color?: string;
  onPress?: () => void;
  trend?: { value: number; isPositive: boolean };
}

export function StatCard({ title, value, subtitle, icon, color, onPress, trend }: StatCardProps) {
  const colors = useColors();
  const cardColor = color || colors.primary;

  const content = (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: cardColor + "20" }]}>
          <MaterialIcons name={icon} size={22} color={cardColor} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.isPositive ? colors.success + "20" : colors.error + "20" }]}>
            <MaterialIcons
              name={trend.isPositive ? "trending-up" : "trending-down"}
              size={14}
              color={trend.isPositive ? colors.success : colors.error}
            />
            <Text style={[styles.trendText, { color: trend.isPositive ? colors.success : colors.error }]}>
              {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.title, { color: colors.muted }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.wrapper} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  trendBadge: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, gap: 2 },
  trendText: { fontSize: 11, fontWeight: "600" as any },
  value: { fontSize: 26, fontWeight: "800" as any, marginBottom: 4, textAlign: "left" },
  title: { fontSize: 13, fontWeight: "500" as any, textAlign: "left" },
  subtitle: { fontSize: 11, marginTop: 2, textAlign: "left" },
});
