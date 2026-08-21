import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";

import { getKeyboardAvoidingBehavior } from "@/lib/keyboard-layout";

interface FloatingFormModalProps {
  visible: boolean;
  onClose: () => void;
  backgroundColor: string;
  compactHeight?: boolean;
  children: ReactNode;
}

/** غلاف موحد يحافظ على محتوى نماذج الإضافة ويعرضه كنافذة عائمة مناسبة للهاتف. */
export function FloatingFormModal({ visible, onClose, backgroundColor, compactHeight = false, children }: FloatingFormModalProps) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView behavior={getKeyboardAvoidingBehavior(Platform.OS)} style={styles.keyboard}>
        <View style={[styles.dialog, compactHeight && styles.compactDialog, { backgroundColor }]}>{children}</View>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 26 },
  keyboard: { flex: 1, justifyContent: "center" },
  dialog: { flex: 1, maxHeight: "100%", borderRadius: 24, overflow: "hidden", elevation: 12 },
  compactDialog: { flex: 0, height: "72%", maxHeight: "72%" },
});
