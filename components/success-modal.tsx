import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, View, Text, StyleSheet, Animated, Easing, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

interface SuccessModalProps {
  visible: boolean;
  message: string;
  onClose?: () => void;
  duration?: number;
}

export function SuccessModal({
  visible,
  message,
  onClose,
  duration = 2000,
}: SuccessModalProps) {
  const colors = useColors();
  const scaleValue = useRef(new Animated.Value(0.985)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const [isMounted, setIsMounted] = useState(visible);
  const closing = useRef(false);
  const closeCallback = useRef(onClose);

  useEffect(() => { closeCallback.current = onClose; }, [onClose]);

  const hide = useCallback((notifyParent: boolean) => {
    if (closing.current || !isMounted) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(scaleValue, { toValue: 0.985, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacityValue, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -8, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => { setIsMounted(false); closing.current = false; if (notifyParent) closeCallback.current?.(); });
  }, [isMounted, opacityValue, scaleValue, translateY]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      closing.current = false;
      scaleValue.setValue(0.985);
      opacityValue.setValue(0);
      translateY.setValue(14);
      const entry = Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
      ]);
      entry.start();
      const timer = setTimeout(() => hide(true), Math.max(300, duration));
      return () => { entry.stop(); clearTimeout(timer); };
    }
    if (isMounted) hide(false);
  }, [duration, hide, isMounted, opacityValue, scaleValue, translateY, visible]);

  return (
    <Modal visible={isMounted} transparent animationType="none" statusBarTranslucent onRequestClose={() => hide(true)}>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => hide(true)} />
        <Animated.View
          style={[
            styles.successBox,
            {
              backgroundColor: colors.surface,
              borderColor: "#22C55E",
              transform: [{ translateY }, { scale: scaleValue }],
              opacity: opacityValue,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconBackground,
                { backgroundColor: "rgba(34, 197, 94, 0.1)" },
              ]}
            >
              <MaterialIcons name="check-circle" size={48} color="#22C55E" />
            </View>
          </View>
          <Text style={[styles.message, { color: colors.foreground }]}>
            {message}
          </Text>
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
  successBox: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
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
  message: {
    fontSize: 16,
    fontWeight: "600" as any,
    textAlign: "center",
  },
});
