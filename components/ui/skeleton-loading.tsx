import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/use-colors";

type SkeletonWidth = DimensionValue;

function SkeletonBlock({
  width = "100%",
  height,
  radius = 10,
  style,
}: {
  width?: SkeletonWidth;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.46)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 760, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.46, duration: 760, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width, height, borderRadius: radius, backgroundColor: colors.border, opacity }, style]} />;
}

export function SkeletonList({ rows = 4, hasFilters = true }: { rows?: number; hasFilters?: boolean }) {
  const rowKeys = useMemo(() => Array.from({ length: rows }, (_, index) => `skeleton-row-${index}`), [rows]);
  return (
    <View style={styles.list} accessibilityLabel="جارٍ تحميل البيانات">
      {hasFilters ? <View style={styles.filters}><SkeletonBlock width={74} height={34} radius={12} /><SkeletonBlock width={94} height={34} radius={12} /><SkeletonBlock width={82} height={34} radius={12} /></View> : null}
      {rowKeys.map((key) => <View key={key} style={styles.card}><View style={styles.cardTop}><SkeletonBlock width={42} height={42} radius={14} /><View style={styles.cardCopy}><SkeletonBlock width="68%" height={15} /><SkeletonBlock width="42%" height={11} style={styles.lineGap} /></View></View><SkeletonBlock width="100%" height={9} radius={5} style={styles.cardLine} /></View>)}
    </View>
  );
}

export function SkeletonPage({ cards = 3 }: { cards?: number }) {
  return (
    <View style={styles.page} accessibilityLabel="جارٍ تحميل الصفحة">
      <View style={styles.hero}><SkeletonBlock width={48} height={48} radius={16} /><View style={styles.heroCopy}><SkeletonBlock width="58%" height={18} /><SkeletonBlock width="36%" height={11} style={styles.lineGap} /></View></View>
      <SkeletonList rows={cards} hasFilters={false} />
    </View>
  );
}

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  const fieldKeys = useMemo(() => Array.from({ length: fields }, (_, index) => `skeleton-field-${index}`), [fields]);
  return (
    <View style={styles.form} accessibilityLabel="جارٍ تجهيز النموذج">
      <View style={styles.formHeader}><SkeletonBlock width={26} height={26} radius={13} /><SkeletonBlock width="42%" height={17} /><View style={styles.headerSpacer} /></View>
      <View style={styles.formContent}>{fieldKeys.map((key) => <View key={key} style={styles.field}><SkeletonBlock width="30%" height={12} /><SkeletonBlock width="100%" height={48} radius={10} style={styles.fieldGap} /></View>)}</View>
      <View style={styles.formFooter}><SkeletonBlock width="48%" height={48} radius={10} /><SkeletonBlock width="48%" height={48} radius={10} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 14 },
  hero: { minHeight: 80, marginHorizontal: 14, borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  heroCopy: { flex: 1, alignItems: "flex-end", gap: 8 },
  list: { paddingHorizontal: 14, paddingTop: 12, gap: 10 },
  filters: { flexDirection: "row", gap: 8, alignItems: "center", minHeight: 42 },
  card: { minHeight: 88, borderRadius: 18, padding: 14, gap: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  cardCopy: { flex: 1, alignItems: "flex-end" },
  lineGap: { marginTop: 7 },
  cardLine: { marginTop: 1 },
  form: { flex: 1 },
  formHeader: { minHeight: 64, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerSpacer: { width: 26 },
  formContent: { flex: 1, padding: 16 },
  field: { marginBottom: 16 },
  fieldGap: { marginTop: 8 },
  formFooter: { flexDirection: "row", gap: 12, padding: 16 },
});
