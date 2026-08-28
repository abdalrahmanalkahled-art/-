import { MaterialIcons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ReactNode } from "react";

import { useColors } from "@/hooks/use-colors";

export type FieldColors = ReturnType<typeof useColors>;

export function formatFieldDate(value?: string): string {
  if (!value) return "غير محدد";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}

export function FieldListHero({
  icon,
  title,
  subtitle,
  count,
  accent,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  count: number;
  accent: string;
}) {
  return (
    <View style={[styles.hero, { backgroundColor: accent }]}>
      <View style={styles.heroIcon}><MaterialIcons name={icon} size={25} color="#fff" /></View>
      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.heroCount, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
        <Text style={styles.heroCountValue}>{count}</Text>
        <Text style={styles.heroCountLabel}>سجل</Text>
      </View>
    </View>
  );
}

export function FieldRecordCard({
  icon,
  title,
  subtitle,
  meta,
  value,
  valueColor,
  accent,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  meta: string;
  value?: string;
  valueColor?: string;
  accent: string;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      activeOpacity={0.76}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.recordCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.recordIcon, { backgroundColor: accent + "18" }]}><MaterialIcons name={icon} size={22} color={accent} /></View>
      <View style={styles.recordCopy}>
        <View style={styles.recordTitleRow}>
          {value ? <View style={[styles.valueBadge, { backgroundColor: (valueColor || accent) + "18" }]}><Text style={[styles.valueText, { color: valueColor || accent }]}>{value}</Text></View> : null}
          <Text numberOfLines={1} style={[styles.recordTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.recordSubtitle, { color: colors.foreground }]}>{subtitle}</Text>
        <Text numberOfLines={1} style={[styles.recordMeta, { color: colors.muted }]}>{meta}</Text>
      </View>
      <MaterialIcons name="chevron-left" size={20} color={colors.muted} />
    </TouchableOpacity>
  );
}

export function FieldEmptyState({ icon, title, subtitle }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; subtitle: string }) {
  const colors = useColors();
  return (
    <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "12" }]}><MaterialIcons name={icon} size={30} color={colors.primary} /></View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>{subtitle}</Text>
    </View>
  );
}

export function FieldDetailSection({ title, icon, children }: { title: string; icon: keyof typeof MaterialIcons.glyphMap; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}><View style={[styles.sectionIcon, { backgroundColor: colors.primary + "14" }]}><MaterialIcons name={icon} size={17} color={colors.primary} /></View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text></View>
      {children}
    </View>
  );
}

export function FieldInfoRow({ label, value, icon }: { label: string; value: string; icon?: keyof typeof MaterialIcons.glyphMap }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      {icon ? <MaterialIcons name={icon} size={17} color={colors.muted} /> : null}
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value || "غير محدد"}</Text>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export function FieldScoreGrid({ scores }: { scores: { label: string; value: number; color?: string }[] }) {
  const colors = useColors();
  return (
    <View style={styles.scoreGrid}>
      {scores.map((score) => {
        const tone = score.color || colors.primary;
        return <View key={score.label} style={[styles.scoreCard, { backgroundColor: tone + "12", borderColor: tone + "30" }]}><Text style={[styles.scoreValue, { color: tone }]}>{score.value}/5</Text><Text style={[styles.scoreLabel, { color: colors.muted }]}>{score.label}</Text></View>;
      })}
    </View>
  );
}

export function FieldLoadingState() {
  const colors = useColors();
  return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.muted }]}>جارٍ تحميل السجلات...</Text></View>;
}

const styles = StyleSheet.create({
  hero: { margin: 14, minHeight: 116, borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", gap: 11 },
  heroIcon: { width: 47, height: 47, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
  heroCopy: { flex: 1, alignItems: "flex-end", gap: 5 },
  heroTitle: { color: "#fff", fontSize: 17, fontWeight: "900" as const, textAlign: "right" },
  heroSubtitle: { color: "rgba(255,255,255,0.82)", fontSize: 11, textAlign: "right", lineHeight: 17 },
  heroCount: { minWidth: 49, minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  heroCountValue: { color: "#fff", fontSize: 18, fontWeight: "900" as const },
  heroCountLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, marginTop: 1 },
  recordCard: { minHeight: 96, borderWidth: 1, borderRadius: 17, padding: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  recordIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  recordCopy: { flex: 1, alignItems: "flex-end", gap: 3 },
  recordTitleRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 7 },
  recordTitle: { flex: 1, fontSize: 13, fontWeight: "800" as const, textAlign: "right" },
  recordSubtitle: { width: "100%", fontSize: 11, textAlign: "right" },
  recordMeta: { width: "100%", fontSize: 10, textAlign: "right" },
  valueBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  valueText: { fontSize: 10, fontWeight: "900" as const },
  empty: { marginHorizontal: 14, marginTop: 10, minHeight: 210, borderRadius: 18, borderWidth: 1, padding: 20, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  emptyTitle: { fontSize: 15, fontWeight: "800" as const, textAlign: "center" },
  emptySubtitle: { maxWidth: 285, fontSize: 12, lineHeight: 19, textAlign: "center" },
  detailSection: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 7 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 4 },
  sectionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "800" as const, textAlign: "right" },
  infoRow: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { minWidth: 98, fontSize: 11, textAlign: "right" },
  infoValue: { flex: 1, fontSize: 13, fontWeight: "700" as const, textAlign: "right" },
  scoreGrid: { flexDirection: "row", gap: 8 },
  scoreCard: { flex: 1, minHeight: 72, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, gap: 4 },
  scoreValue: { fontSize: 17, fontWeight: "900" as const },
  scoreLabel: { fontSize: 10, textAlign: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 12 },
});
