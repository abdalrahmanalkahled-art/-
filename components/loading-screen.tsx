import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet, Animated, Easing } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface LoadingScreenProps {
  visible?: boolean;
  message?: string;
}

export function LoadingScreen({ visible = true, message = "جاري التحميل..." }: LoadingScreenProps) {
  const colors = useColors();
  const spinValue = new Animated.Value(0);
  const scaleValue = new Animated.Value(0.8);
  const opacityValue = new Animated.Value(0);

  useEffect(() => {
    // تأثير الدوران المستمر للوغو
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // تأثير الظهور والاختفاء للنص
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // تأثير التكبير والتصغير البسيط للوغو
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [spinValue, scaleValue, opacityValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* خلفية بتدرج لطيف */}
      <View style={[styles.backgroundGradient, { backgroundColor: colors.surface }]} />

      {/* محتوى التحميل */}
      <View style={styles.content}>
        {/* اللوغو مع التأثيرات */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ rotate: spin }, { scale: scaleValue }],
            },
          ]}
        >
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* شريط التقدم */}
        <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: colors.primary,
                opacity: opacityValue,
              },
            ]}
          />
        </View>

        {/* رسالة التحميل */}
        <Animated.Text
          style={[
            styles.loadingText,
            {
              color: colors.foreground,
              opacity: opacityValue,
            },
          ]}
        >
          {message}
        </Animated.Text>

        {/* نقاط متحركة */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.primary,
                  opacity: opacityValue,
                  marginLeft: index * 8,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* نص إضافي في الأسفل */}
      <Text style={[styles.footerText, { color: colors.muted }]}>
        مدير تسويق مدار
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  progressBarContainer: {
    width: 200,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 16,
  },
  progressBar: {
    height: "100%",
    width: "60%",
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600" as any,
    marginTop: 12,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    position: "absolute",
    bottom: 40,
    fontSize: 12,
    fontWeight: "500" as any,
  },
});
