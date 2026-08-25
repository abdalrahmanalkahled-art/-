import { MaterialIcons } from "@expo/vector-icons";
import { useSyncExternalStore } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { getOperationProgressSnapshot, operationProgressPercent, subscribeOperationProgress } from "@/lib/operation-progress";

export function OperationProgressOverlay() {
  const colors = useColors();
  const progress = useSyncExternalStore(subscribeOperationProgress, getOperationProgressSnapshot, getOperationProgressSnapshot);
  if (!progress) return null;

  const percent = operationProgressPercent(progress);
  const icon = progress.kind === "restore" ? "restore" : "description";
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => undefined} statusBarTranslucent>
      <View style={styles.overlay} accessibilityViewIsModal>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <View style={[styles.icon, { backgroundColor: colors.primary + "16" }]}>
            <MaterialIcons name={icon} color={colors.primary} size={29} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{progress.title}</Text>
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.message, { color: colors.muted }]} accessibilityLiveRegion="polite">{progress.message || progress.steps[progress.stepIndex]}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${Math.max(3, percent)}%`, backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={[styles.percent, { color: colors.primary }]}>{percent}%</Text>
            {typeof progress.completedItems === "number" && typeof progress.totalItems === "number" ? <Text style={[styles.items, { color: colors.muted }]}>{progress.completedItems} من {progress.totalItems} وسائط</Text> : <Text style={[styles.items, { color: colors.muted }]}>المرحلة {progress.stepIndex + 1} من {progress.steps.length}</Text>}
          </View>
          <View style={styles.steps}>
            {progress.steps.map((step, index) => {
              const completed = index < progress.stepIndex;
              const current = index === progress.stepIndex;
              return <View key={step} style={styles.stepRow}>
                <MaterialIcons name={completed ? "check-circle" : current ? "radio-button-checked" : "radio-button-unchecked"} size={17} color={completed || current ? colors.primary : colors.muted} />
                <Text style={[styles.stepText, { color: current ? colors.foreground : colors.muted, fontWeight: current ? "800" : "500" }]}>{step}</Text>
              </View>;
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.52)", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 430, borderRadius: 24, borderWidth: 1, padding: 21, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", alignSelf: "flex-end", marginBottom: 11 },
  title: { fontSize: 17, lineHeight: 24, fontWeight: "800", textAlign: "right" },
  statusRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 9 },
  message: { flex: 1, fontSize: 13, lineHeight: 20, textAlign: "right" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 17 },
  progressFill: { height: "100%", borderRadius: 4 },
  progressMeta: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  percent: { fontSize: 13, fontWeight: "800" },
  items: { fontSize: 12, textAlign: "right" },
  steps: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#cbd5e1", marginTop: 16, paddingTop: 12, gap: 8 },
  stepRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  stepText: { flex: 1, fontSize: 12, lineHeight: 18, textAlign: "right" },
});
