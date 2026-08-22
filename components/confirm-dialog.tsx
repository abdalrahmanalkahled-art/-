import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { ModalMotion } from '@/components/modal-motion';
import { DESIGN } from '@/lib/design-system';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  isDangerous?: boolean;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: string;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  confirmColor,
  isDangerous = false,
  isSubmitting = false,
  onConfirm,
  onCancel,
  icon,
}: ConfirmDialogProps) {
  const colors = useColors();
  const buttonColor = confirmColor || (isDangerous ? colors.error : colors.primary);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      >
        <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={isSubmitting ? undefined : onCancel} />
        <ModalMotion visible={visible}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
          {/* Icon */}
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: buttonColor + '20' }]}>
              <MaterialIcons name={icon as any} size={40} color={buttonColor} />
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            {title}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.muted }]}>
            {message}
          </Text>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onCancel}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.foreground }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: buttonColor }, isSubmitting && styles.disabledButton]}
              onPress={onConfirm}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                {isSubmitting ? 'جارٍ التنفيذ...' : confirmText}
              </Text>
            </TouchableOpacity>
          </View>
          </View>
        </ModalMotion>
        </View>
      </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dialog: {
    borderRadius: DESIGN.radius.xl,
    paddingVertical: DESIGN.spacing.xxl,
    paddingHorizontal: DESIGN.spacing.xl,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: DESIGN.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: DESIGN.spacing.md,
  },
  button: {
    flex: 1,
    minHeight: DESIGN.control.standard,
    paddingVertical: DESIGN.spacing.sm,
    borderRadius: DESIGN.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  disabledButton: { opacity: 0.65 },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
