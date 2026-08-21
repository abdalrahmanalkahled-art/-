import React, { useState } from "react";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Animated,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  children: React.ReactNode;
  style?: ViewStyle | ((state: { pressed: boolean }) => ViewStyle);
  onPress?: () => void | Promise<void>;
  hapticFeedback?: boolean;
  scaleOnPress?: number;
  opacityOnPress?: number;
}

export const AnimatedPressable = React.memo(
  ({
    children,
    style,
    onPress,
    hapticFeedback = true,
    scaleOnPress = 0.96,
    opacityOnPress = 0.8,
    ...props
  }: AnimatedPressableProps) => {
    const [isPressed, setIsPressed] = useState(false);
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const opacityAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      setIsPressed(true);
      if (hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: scaleOnPress,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: opacityOnPress,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const handlePressOut = () => {
      setIsPressed(false);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 5,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const handlePress = async () => {
      if (!onPress) return;
      try {
        await onPress();
      } catch (error) {
        console.error("Pressable error:", error);
      }
    };

    const animatedStyle = {
      transform: [{ scale: scaleAnim }],
      opacity: opacityAnim,
    };

    const computedStyle =
      typeof style === "function" ? style({ pressed: isPressed }) : style;

    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          {...props}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={computedStyle}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }
);

AnimatedPressable.displayName = "AnimatedPressable";
