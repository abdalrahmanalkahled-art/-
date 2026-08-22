import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

interface AlertItem {
  id: string;
  type: "warning" | "error" | "info";
  title: string;
  message: string;
  time?: string;
}

interface AlertCardProps {
  alerts: AlertItem[];
  onPress?: (alert: AlertItem) => void;
}

export function AlertCard({ alerts, onPress }: AlertCardProps) {
  const colors = useColors();

  if (alerts.length === 0) return null;

  const getAlertColor = (type: AlertItem["type"]) => {
    switch (type) {
      case "error": return colors.error;
      case "warning": return colors.warning;
      default: return colors.primary;
    }
  };

  const getAlertIcon = (type: AlertItem["type"]): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case "error": return "error";
      case "warning": return "warning";
      default: return "info";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <MaterialIcons name="notifications-active" size={18} color={colors.warning} />
        <Text style={[styles.headerText, { color: colors.foreground }]}>التنبيهات</Text>
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>{alerts.length}</Text>
        </View>
      </View>
      {alerts.map((alert, index) => {
        const alertColor = getAlertColor(alert.type);
        return (
          <TouchableOpacity
            key={alert.id}
            style={[
              styles.alertItem,
              { borderLeftColor: alertColor, backgroundColor: alertColor + "10" },
              index < alerts.length - 1 && styles.alertItemBorder,
            ]}
            onPress={() => onPress?.(alert)}
            activeOpacity={0.7}
          >
            <MaterialIcons name={getAlertIcon(alert.type)} size={18} color={alertColor} />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: colors.foreground }]}>{alert.title}</Text>
              <Text style={[styles.alertMessage, { color: colors.muted }]}>{alert.message}</Text>
              {alert.time && <Text style={[styles.alertTime, { color: colors.muted }]}>{alert.time}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 8,
  },
  headerText: { flex: 1, fontSize: 15, fontWeight: "700" as any, textAlign: "left" },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" as any },
  alertItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderLeftWidth: 3,
    gap: 10,
  },
  alertItemBorder: { borderBottomWidth: 0.5 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: "600" as any, textAlign: "left", marginBottom: 2 },
  alertMessage: { fontSize: 12, textAlign: "left", lineHeight: 18 },
  alertTime: { fontSize: 11, textAlign: "left", marginTop: 4 },
});
