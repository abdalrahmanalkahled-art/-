import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";

import { getKeyboardAvoidingBehavior } from "@/lib/keyboard-layout";
import { DESIGN } from "@/lib/design-system";
import { SkeletonForm } from "@/components/ui/skeleton-loading";

interface FloatingFormModalProps {
  visible: boolean;
  onClose: () => void;
  backgroundColor: string;
  compactHeight?: boolean;
  isLoading?: boolean;
  isDismissDisabled?: boolean;
  children: ReactNode;
}

/** غلاف موحد يحافظ على محتوى نماذج الإضافة ويعرضه كنافذة عائمة مناسبة للهاتف. */
export function FloatingFormModal({ visible, onClose, backgroundColor, compactHeight = false, isLoading = false, isDismissDisabled = false, children }: FloatingFormModalProps) {
  const requestClose = isDismissDisabled ? undefined : onClose;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
      <KeyboardAvoidingView behavior={getKeyboardAvoidingBehavior(Platform.OS)} style={styles.keyboard}>
        <View style={[styles.dialog, compactHeight && styles.compactDialog, { backgroundColor }]}>{isLoading ? <SkeletonForm /> : children}</View>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "center", paddingHorizontal: DESIGN.spacing.md, paddingVertical: DESIGN.spacing.xl },
  keyboard: { flex: 1, width: "100%", justifyContent: "center", alignItems: "center" },
  dialog: { width: "100%", height: "88%", maxHeight: "88%", borderRadius: DESIGN.radius.xl, overflow: "hidden", elevation: 12 },
  compactDialog: { flex: 0, height: "72%", maxHeight: "72%" },
});
