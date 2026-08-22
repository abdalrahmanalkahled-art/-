import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";
import { DESIGN } from "@/lib/design-system";

export type CardAction = { id: string; label: string; icon: keyof typeof MaterialIcons.glyphMap; tone?: "primary" | "danger" | "success" | "warning"; onPress: () => void };

export function CardActionModal({ visible, title, description = "اختر الإجراء المطلوب", actions, onClose }: { visible: boolean; title: string; description?: string; actions: CardAction[]; onClose: () => void }) {
  const colors = useColors();
  const colorFor = (tone: CardAction["tone"]) => tone === "danger" ? colors.error : tone === "success" ? colors.success : tone === "warning" ? colors.warning : colors.primary;
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}><TouchableOpacity onPress={onClose} style={[styles.close, { backgroundColor: colors.background }]}><MaterialIcons name="close" size={20} color={colors.foreground} /></TouchableOpacity><View style={styles.copy}><Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>{title}</Text><Text style={[styles.description, { color: colors.muted }]}>{description}</Text></View></View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {actions.map((action) => { const actionColor = colorFor(action.tone); return <TouchableOpacity key={action.id} onPress={action.onPress} style={[styles.action, { borderColor: colors.border }]}><View style={[styles.actionIcon, { backgroundColor: actionColor + "16" }]}><MaterialIcons name={action.icon} size={20} color={actionColor} /></View><Text style={[styles.actionText, { color: action.tone === "danger" ? colors.error : colors.foreground }]}>{action.label}</Text><MaterialIcons name="chevron-left" size={20} color={colors.muted} /></TouchableOpacity>; })}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, backgroundColor: "rgba(0,0,0,0.24)" }, dialog: { width: "100%", maxWidth: 360, borderWidth: 1, borderRadius: DESIGN.radius.xl, padding: DESIGN.spacing.lg, gap: DESIGN.spacing.md, elevation: 12 }, header: { flexDirection: "row", alignItems: "center", gap: 12 }, close: { width: DESIGN.control.compact, height: DESIGN.control.compact, borderRadius: DESIGN.radius.pill, alignItems: "center", justifyContent: "center" }, copy: { flex: 1, alignItems: "flex-end" }, title: { fontSize: 16, fontWeight: "800" as any, textAlign: "right" }, description: { marginTop: 3, fontSize: 11, textAlign: "right" }, divider: { height: StyleSheet.hairlineWidth }, action: { minHeight: DESIGN.control.large, flexDirection: "row-reverse", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: DESIGN.radius.md, paddingHorizontal: DESIGN.spacing.sm }, actionIcon: { width: DESIGN.control.compact, height: DESIGN.control.compact, borderRadius: DESIGN.radius.sm, alignItems: "center", justifyContent: "center" }, actionText: { flex: 1, textAlign: "right", fontSize: 13, fontWeight: "700" as any } });
