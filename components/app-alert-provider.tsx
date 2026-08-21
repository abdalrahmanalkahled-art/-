import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, type AlertButton } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";
import { ModalMotion } from "@/components/modal-motion";

interface AlertState { title: string; message?: string; buttons: AlertButton[]; }
type AlertHandler = typeof Alert.alert;

function toneFor(button: AlertButton) {
  if (button.style === "destructive") return "error";
  if (button.style === "cancel") return "muted";
  return "primary";
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const [alert, setAlert] = useState<AlertState | null>(null);
  const originalAlert = useRef<AlertHandler>(Alert.alert);

  useEffect(() => {
    const original = Alert.alert;
    originalAlert.current = original;
    const managedAlert: AlertHandler = (title, message, buttons) => {
      setAlert({ title: String(title || "تنبيه"), message, buttons: buttons?.length ? buttons : [{ text: "حسنًا" }] });
    };
    Alert.alert = managedAlert;
    return () => { Alert.alert = original; };
  }, []);

  const dismiss = (button?: AlertButton) => {
    setAlert(null);
    button?.onPress?.();
  };
  const isDanger = alert?.buttons.some((button) => button.style === "destructive");
  const icon = isDanger ? "warning-amber" : "info-outline";
  const iconColor = isDanger ? colors.error : colors.primary;

  return <>{children}<Modal transparent visible={Boolean(alert)} animationType="fade" onRequestClose={() => dismiss()}>
    <View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss()} /><ModalMotion visible={Boolean(alert)}><View style={[styles.dialog, { backgroundColor: colors.surface }]}>
      <View style={[styles.icon, { backgroundColor: iconColor + "16" }]}><MaterialIcons name={icon} size={31} color={iconColor} /></View>
      <Text style={[styles.title, { color: colors.foreground }]}>{alert?.title}</Text>
      {alert?.message ? <Text style={[styles.message, { color: colors.muted }]}>{alert.message}</Text> : null}
      <View style={styles.actions}>{alert?.buttons.map((button, index) => {
        const tone = toneFor(button); const color = tone === "error" ? colors.error : tone === "muted" ? colors.foreground : colors.primary;
        return <TouchableOpacity key={`${button.text || "حسنًا"}-${index}`} onPress={() => dismiss(button)} style={[styles.action, tone === "muted" ? { borderWidth: 1, borderColor: colors.border } : { backgroundColor: color }]}><Text style={[styles.actionText, { color: tone === "muted" ? colors.foreground : "#fff" }]}>{button.text || "حسنًا"}</Text></TouchableOpacity>;
      })}</View>
    </View></ModalMotion></View>
  </Modal></>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.52)", alignItems: "center", justifyContent: "center", padding: 20 }, dialog: { width: "100%", maxWidth: 420, borderRadius: 24, padding: 21, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 }, icon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 12 }, title: { fontSize: 17, fontWeight: "800", textAlign: "center" }, message: { fontSize: 13, lineHeight: 21, textAlign: "center", marginTop: 8 }, actions: { width: "100%", flexDirection: "row", gap: 9, marginTop: 20 }, action: { flex: 1, minHeight: 45, borderRadius: 13, justifyContent: "center", alignItems: "center", paddingHorizontal: 8 }, actionText: { fontSize: 13, fontWeight: "800", textAlign: "center" },
});
