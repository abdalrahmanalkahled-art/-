import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

interface LoadingScreenProps {
  visible?: boolean;
  message?: string;
}

const DOT_DELAYS = [0, 140, 280] as const;

export function LoadingScreen({ visible = true, message = "جاري تحميل التطبيق..." }: LoadingScreenProps) {
  const colors = useColors();
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceScale = useRef(new Animated.Value(0.96)).current;
  const logoPulse = useRef(new Animated.Value(0.98)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;
  const progressOffset = useRef(new Animated.Value(-96)).current;
  const dotValues = useRef(DOT_DELAYS.map(() => new Animated.Value(0.34))).current;

  useEffect(() => {
    if (!visible) return;

    const entrance = Animated.parallel([
      Animated.timing(entranceOpacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(entranceScale, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.035, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 0.985, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const orbit = Animated.loop(
      Animated.timing(orbitRotation, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
    );
    const progress = Animated.loop(
      Animated.timing(progressOffset, { toValue: 96, duration: 1350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    const dots = Animated.loop(
      Animated.stagger(
        140,
        dotValues.map((value) =>
          Animated.sequence([
            Animated.timing(value, { toValue: 1, duration: 260, useNativeDriver: true }),
            Animated.timing(value, { toValue: 0.34, duration: 420, useNativeDriver: true }),
          ]),
        ),
      ),
    );

    entrance.start();
    pulse.start();
    orbit.start();
    progress.start();
    dots.start();

    return () => {
      entrance.stop();
      pulse.stop();
      orbit.stop();
      progress.stop();
      dots.stop();
    };
  }, [dotValues, entranceOpacity, entranceScale, logoPulse, orbitRotation, progressOffset, visible]);

  if (!visible) return null;

  const orbit = orbitRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View
      accessibilityLabel="جاري تهيئة التطبيق"
      accessibilityRole="progressbar"
      pointerEvents="none"
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          opacity: entranceOpacity,
          transform: [{ scale: entranceScale }],
        },
      ]}
    >
      <View style={[styles.softGlow, styles.topGlow, { backgroundColor: `${colors.primary}10` }]} />
      <View style={[styles.softGlow, styles.bottomGlow, { backgroundColor: `${colors.primary}0A` }]} />

      <View style={styles.content}>
        <View style={styles.brandMarkArea}>
          <Animated.View style={[styles.orbit, { borderColor: `${colors.primary}2B`, borderTopColor: colors.primary, transform: [{ rotate: orbit }] }]} />
          <Animated.View style={[styles.logoWell, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}24`, transform: [{ scale: logoPulse }] }]}>
            <View style={[styles.logoSurface, { backgroundColor: colors.surface }]}>
              <Image source={require("@/assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
            </View>
          </Animated.View>
        </View>

        <View style={styles.copyArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>مساعد التسويق الميداني</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>نُهيّئ مساحة عملك الميدانية</Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: `${colors.primary}14` }]}>
          <Animated.View style={[styles.progressHighlight, { backgroundColor: colors.primary, transform: [{ translateX: progressOffset }] }]} />
        </View>

        <View style={styles.statusRow}>
          <View style={styles.dots}>
            {dotValues.map((opacity, index) => (
              <Animated.View key={DOT_DELAYS[index]} style={[styles.dot, { backgroundColor: colors.primary, opacity }]} />
            ))}
          </View>
          <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
        </View>
      </View>

      <Text style={[styles.footer, { color: colors.muted }]}>إدارة منظمة، متابعة أسرع</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", overflow: "hidden", zIndex: 9999, elevation: 9999 },
  softGlow: { position: "absolute", width: 280, height: 280, borderRadius: 140 },
  topGlow: { top: -112, right: -84 },
  bottomGlow: { bottom: -122, left: -112 },
  content: { width: "100%", maxWidth: 340, alignItems: "center", paddingHorizontal: 28 },
  brandMarkArea: { width: 148, height: 148, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  orbit: { position: "absolute", width: 140, height: 140, borderRadius: 70, borderWidth: 2 },
  logoWell: { width: 106, height: 106, borderRadius: 32, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logoSurface: { width: 86, height: 86, borderRadius: 25, alignItems: "center", justifyContent: "center", shadowColor: "#1A56DB", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  logo: { width: 68, height: 68 },
  copyArea: { alignItems: "center", gap: 8 },
  title: { fontSize: 19, fontWeight: "900", textAlign: "center" },
  subtitle: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  progressTrack: { width: "100%", height: 6, borderRadius: 99, overflow: "hidden", marginTop: 32 },
  progressHighlight: { width: 96, height: "100%", borderRadius: 99, opacity: 0.9 },
  statusRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9, marginTop: 14 },
  dots: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  message: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  footer: { position: "absolute", bottom: 42, fontSize: 11, fontWeight: "600", letterSpacing: 0.1 },
});
