import React, { useEffect } from "react";
import { Modal, View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

interface ConfirmDeleteModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDeleteModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "حذف",
  cancelText = "إلغاء",
}: ConfirmDeleteModalProps) {
  const colors = useColors();
  const scaleValue = new Animated.Value(0);
  const opacityValue = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.confirmBox,
            {
              backgroundColor: colors.surface,
              borderColor: "#EF4444",
              transform: [{ scale: scaleValue }],
              opacity: opacityValue,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconBackground,
                { backgroundColor: "rgba(239, 68, 68, 0.1)" },
              ]}
            >
              <MaterialIcons name="warning" size={48} color="#EF4444" />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {title}
          </Text>

          <Text style={[styles.message, { color: colors.muted }]}>
            {message}
          </Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: colors.foreground }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={onConfirm}
            >
              <Text style={[styles.buttonText, { color: "#fff" }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  confirmBox: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    minWidth: 280,
    maxWidth: 320,
  },
  iconContainer: {
    marginBottom: 8,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as any,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontWeight: "500" as any,
    textAlign: "center",
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600" as any,
  },
});
