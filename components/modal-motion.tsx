import { Animated, Easing, type ViewStyle } from "react-native";
import { useEffect, useRef } from "react";

interface ModalMotionProps {
  visible: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

/** حركة دخول هادئة للنوافذ: تلاشي قصير مع ارتفاع خفيف، من دون ارتداد مشتت. */
export function ModalMotion({ visible, children, style }: ModalMotionProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const scale = useRef(new Animated.Value(0.985)).current;

  useEffect(() => {
    if (!visible) return;

    opacity.setValue(0);
    translateY.setValue(14);
    scale.setValue(0.985);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, scale, translateY, visible]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }, { scale }] }]}>
      {children}
    </Animated.View>
  );
}
