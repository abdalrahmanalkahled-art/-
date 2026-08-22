import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { DESIGN } from "@/lib/design-system";

interface AnimatedCardProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hapticFeedback?: boolean;
  disabled?: boolean;
}

export const AnimatedCard = React.memo(
  ({
    onPress,
    onLongPress,
    children,
    style,
    hapticFeedback = true,
    disabled = false,
  }: AnimatedCardProps) => {
    const colors = useColors();
    const [isPressed, setIsPressed] = useState(false);
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      setIsPressed(true);
      if (hapticFeedback && !disabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      Animated.spring(scaleAnim, {
        toValue: DESIGN.press.scale,
        useNativeDriver: true,
        speed: 20,
        bounciness: 5,
      }).start();
    };

    const handlePressOut = () => {
      setIsPressed(false);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 5,
      }).start();
    };

    const handlePress = () => {
      if (disabled) return;
      onPress?.();
    };

    const cardStyle = {
      transform: [{ scale: scaleAnim }],
      opacity: disabled ? 0.6 : 1,
    };

    if (!onPress) {
      return (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
            style,
          ]}
        >
          {children}
        </View>
      );
    }

    return (
      <Animated.View style={cardStyle}>
        <Pressable
          onPress={handlePress}
          onLongPress={onLongPress}
          delayLongPress={DESIGN.press.longPressDelay}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
            style,
            {
              opacity: isPressed ? 0.85 : 1,
            },
          ]}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

const styles = StyleSheet.create({
  card: {
    borderRadius: DESIGN.radius.md,
    borderWidth: 1,
    padding: DESIGN.spacing.lg,
    marginVertical: DESIGN.spacing.sm,
    marginHorizontal: DESIGN.spacing.md,
  },
});
