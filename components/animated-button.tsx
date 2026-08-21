import React, { useState } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";

interface AnimatedButtonProps {
  onPress: () => void | Promise<void>;
  title: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
}

export const AnimatedButton = React.memo(
  ({
    onPress,
    title,
    variant = "primary",
    size = "medium",
    disabled = false,
    loading = false,
    style,
    textStyle,
    hapticFeedback = true,
  }: AnimatedButtonProps) => {
    const colors = useColors();
    const [isPressed, setIsPressed] = useState(false);

    const handlePressIn = () => {
      setIsPressed(true);
      if (hapticFeedback && !disabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    const handlePressOut = () => {
      setIsPressed(false);
    };

    const handlePress = async () => {
      if (disabled || loading) return;
      try {
        await onPress();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error("Button press error:", error);
      }
    };

    const getVariantStyles = () => {
      const baseStyles: ViewStyle = {
        backgroundColor: colors.primary,
      };

      switch (variant) {
        case "secondary":
          return {
            ...baseStyles,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          };
        case "danger":
          return {
            ...baseStyles,
            backgroundColor: colors.error,
          };
        case "success":
          return {
            ...baseStyles,
            backgroundColor: colors.success,
          };
        default:
          return baseStyles;
      }
    };

    const getSizeStyles = () => {
      switch (size) {
        case "small":
          return {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 6,
          };
        case "large":
          return {
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 10,
          };
        default:
          return {
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 8,
          };
      }
    };

    const getTextSize = () => {
      switch (size) {
        case "small":
          return 12;
        case "large":
          return 16;
        default:
          return 14;
      }
    };

    const getTextColor = () => {
      if (variant === "secondary") {
        return colors.foreground;
      }
      return "#fff";
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();
    const textSize = getTextSize();
    const textColor = getTextColor();

    const opacity = disabled ? 0.5 : isPressed ? 0.8 : 1;
    const scale = isPressed ? 0.96 : 1;

    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          variantStyles,
          sizeStyles,
          style,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <Text
            style={[
              styles.text,
              textStyle,
              {
                color: textColor,
                fontSize: textSize,
              },
            ]}
          >
            {title}
          </Text>
        )}
      </Pressable>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  text: {
    fontWeight: "600" as any,
  },
});
