import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppPageHeader } from "@/components/app-page-header";
import { useColors } from "@/hooks/use-colors";
import { getItems, STORAGE_KEYS } from "@/lib/storage";
import { getGoalImpactMetrics } from "@/lib/goal-impact-metrics";

type GoalStatus = "on_track" | "delayed" | "completed" | "cancelled";
type EventStatus = "planned" | "ongoing" | "completed" | "cancelled";

interface MarketingGoal {
  id: string;
  title: string;
  brandName?: string;
  description?: string;
  period: "monthly" | "quarterly" | "annual";
  startDate: string;
  endDate: string;
  kpi?: string;
  targetValue: number;
  currentValue: number;
  completionPercentage: number;
  status: GoalStatus;
}

interface EventItem {
  id: string;
  title: string;
  eventDate: string;
  location?: string;
  region?: string;
  status: EventStatus;
  attendeesCount?: number;
  giftsDistributed?: number;
  goalId?: string;
  brandName?: string;
}

const GOAL_STATUS: Record<GoalStatus, { label: string; color: string }> = {
  on_track: { label: "في المسار", color: "#10B981" },
  delayed: { label: "متأخر", color: "#EF4444" },
  completed: { label: "مكتمل", color: "#64748B" },
  cancelled: { label: "ملغي", color: "#9CA3AF" },
};

const EVENT_STATUS: Record<EventStatus, { label: string; color: string }> = {
  planned: { label: "مخططة", color: "#F59E0B" },
  ongoing: { label: "جارية", color: "#3B82F6" },
  completed: { label: "مكتملة", color: "#10B981" },
  cancelled: { label: "ملغاة", color: "#EF4444" },
};

const PERIOD_LABELS: Record<MarketingGoal["period"], string> = {
  monthly: "شهري",
  quarterly: "ربع سنوي",
  annual: "سنوي",
};

export default function GoalDetailsScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const goalId = typeof params.id === "string" ? params.id : "";
  const [goal, setGoal] = useState<MarketingGoal | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDetails = useCallback(async () => {
    if (!goalId) {
      setGoal(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [goals, allEvents] = await Promise.all([
      getItems<MarketingGoal>(STORAGE_KEYS.MARKETING_GOALS),
      getItems<EventItem>(STORAGE_KEYS.EVENTS),
    ]);
    setGoal(goals.find((item) => item.id === goalId) ?? null);
    setEvents(
      allEvents
        .filter((item) => item.goalId === goalId)
        .sort((left, right) => new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime()),
    );
    setLoading(false);
  }, [goalId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  if (loading) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator size="large" color={colors.primary} /></ScreenContainer>;
  }

  if (!goal) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <MaterialIcons name="flag" size={48} color={colors.muted} />
        <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>الهدف غير متاح</Text>
        <Text style={[styles.notFoundBody, { color: colors.muted }]}>قد يكون الهدف قد حُذف أو لم يعد متوفراً على هذا الجهاز.</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.primary }]}><Text style={styles.backButtonText}>العودة إلى الخطة</Text></TouchableOpacity>
      </ScreenContainer>
    );
  }

  const goalStatus = GOAL_STATUS[goal.status] ?? GOAL_STATUS.on_track;
  const { totalGifts, totalBeneficiaries, coveredRegionCount } = getGoalImpactMetrics(events);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <AppPageHeader title="تفاصيل الهدف" onBack={() => router.back()} />
      

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.heroStatus, { backgroundColor: "rgba(255,255,255,0.18)" }]}><View style={[styles.statusDot, { backgroundColor: goalStatus.color }]} /><Text style={styles.heroStatusText}>{goalStatus.label}</Text></View>
            <View style={styles.heroIcon}><MaterialIcons name="flag" size={25} color="#fff" /></View>
          </View>
          <Text style={styles.heroTitle}>{goal.title}</Text>
          {goal.brandName ? <View style={styles.heroBrand}><MaterialIcons name="sell" size={14} color="#fff" /><Text style={styles.heroBrandText}>{goal.brandName}</Text></View> : null}
          <Text style={styles.heroPeriod}>{PERIOD_LABELS[goal.period]} · {goal.startDate || "غير محدد"}{goal.endDate ? ` ← ${goal.endDate}` : ""}</Text>
        </View>

        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>تقدم الهدف</Text><Text style={[styles.progressPercent, { color: colors.primary }]}>{Math.round(goal.completionPercentage || 0)}%</Text></View>
          <ProgressBar value={goal.completionPercentage || 0} label={`${goal.currentValue || 0} / ${goal.targetValue || 0}`} />
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <Metric icon="event" label="فعاليات مرتبطة" value={events.length.toLocaleString("en-US")} color={colors.primary} colors={colors} />
            <Metric icon="map" label="مناطق مغطاة" value={coveredRegionCount.toLocaleString("en-US")} color="#10B981" colors={colors} />
            <Metric icon="leaderboard" label="المؤشر" value={goal.kpi || "—"} color="#8B5CF6" colors={colors} compact />
          </View>
        </View>

        <View style={styles.impactRow}>
          <ImpactMetric icon="redeem" label="إجمالي الهدايا" value={totalGifts.toLocaleString("en-US")} color="#D97706" colors={colors} />
          <ImpactMetric icon="groups" label="إجمالي المستفيدين" value={totalBeneficiaries.toLocaleString("en-US")} color={colors.primary} colors={colors} />
        </View>

        {goal.description ? <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>وصف الهدف</Text><Text style={[styles.description, { color: colors.muted }]}>{goal.description}</Text></View> : null}

        <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>الفعاليات المرتبطة</Text><Text style={[styles.sectionCount, { color: colors.muted }]}>{events.length.toLocaleString("en-US")}</Text></View>
        {events.length ? events.map((event) => {
          const eventStatus = EVENT_STATUS[event.status] ?? EVENT_STATUS.planned;
          return <TouchableOpacity key={event.id} activeOpacity={0.76} onPress={() => router.push({ pathname: "/(tabs)/events", params: { eventId: event.id } })} style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel={`تفاصيل الفعالية ${event.title}`}><View style={styles.eventTopRow}><View style={[styles.eventBadge, { backgroundColor: eventStatus.color + "18" }]}><Text style={[styles.eventBadgeText, { color: eventStatus.color }]}>{eventStatus.label}</Text></View><View style={styles.eventTitleWrap}><Text style={[styles.eventTitle, { color: colors.foreground }]}>{event.title}</Text><Text style={[styles.eventDate, { color: colors.muted }]}>{event.eventDate}</Text></View><View style={[styles.eventIcon, { backgroundColor: colors.primary + "16" }]}><MaterialIcons name="celebration" size={20} color={colors.primary} /></View></View><View style={[styles.eventDivider, { backgroundColor: colors.border }]} /><View style={styles.eventMetaRow}><EventMeta icon="location-on" value={event.region || event.location || "الموقع غير محدد"} colors={colors} /><EventMeta icon="groups" value={`${event.attendeesCount || 0} حاضر`} colors={colors} /><EventMeta icon="redeem" value={`${event.giftsDistributed || 0} هدية`} colors={colors} /></View></TouchableOpacity>;
        }) : <EmptyState icon="event-busy" label="لا توجد فعاليات مرتبطة بهذا الهدف حتى الآن" colors={colors} />}
      </ScrollView>
    </ScreenContainer>
  );
}

function Metric({ icon, label, value, color, colors, compact = false }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; color: string; colors: ReturnType<typeof useColors>; compact?: boolean }) {
  return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: color + "16" }]}><MaterialIcons name={icon} size={17} color={color} /></View><Text numberOfLines={1} style={[styles.metricValue, compact && styles.metricCompactValue, { color: colors.foreground }]}>{value}</Text><Text numberOfLines={1} style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text></View>;
}

function ImpactMetric({ icon, label, value, color, colors }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; color: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.impactMetric, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.impactIcon, { backgroundColor: color + "18" }]}><MaterialIcons name={icon} size={20} color={color} /></View><View style={styles.impactCopy}><Text style={[styles.impactValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.impactLabel, { color: colors.muted }]}>{label}</Text></View></View>;
}

function EventMeta({ icon, value, colors }: { icon: keyof typeof MaterialIcons.glyphMap; value: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.eventMeta}><MaterialIcons name={icon} size={15} color={colors.muted} /><Text numberOfLines={1} style={[styles.eventMetaText, { color: colors.muted }]}>{value}</Text></View>;
}

function EmptyState({ icon, label, colors }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name={icon} size={28} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  
  content: { padding: 14, gap: 13, paddingBottom: 30 },
  hero: { borderRadius: 22, padding: 18, gap: 9 }, heroTopRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }, heroStatus: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 }, statusDot: { width: 7, height: 7, borderRadius: 4 }, heroStatusText: { color: "#fff", fontSize: 12, fontWeight: "800" as const }, heroTitle: { color: "#fff", fontSize: 22, fontWeight: "900" as const, textAlign: "right", lineHeight: 30 }, heroBrand: { flexDirection: "row-reverse", alignSelf: "flex-end", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }, heroBrandText: { color: "#fff", fontSize: 12, fontWeight: "700" as const }, heroPeriod: { color: "rgba(255,255,255,0.83)", fontSize: 12, textAlign: "right" },
  progressCard: { borderRadius: 18, borderWidth: 1, padding: 15, gap: 13 }, sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { fontSize: 15, fontWeight: "800" as const, textAlign: "right" }, progressPercent: { fontSize: 16, fontWeight: "900" as const }, statsRow: { flexDirection: "row-reverse", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 13, gap: 6 }, metric: { flex: 1, alignItems: "center", gap: 4, minWidth: 0 }, metricIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" }, metricValue: { fontSize: 13, fontWeight: "800" as const, textAlign: "center" }, metricCompactValue: { fontSize: 11 }, metricLabel: { fontSize: 10, textAlign: "center" },
  impactRow: { flexDirection: "row-reverse", gap: 10 }, impactMetric: { flex: 1, minHeight: 78, borderRadius: 17, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingHorizontal: 12 }, impactIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, impactCopy: { flex: 1, alignItems: "flex-end" }, impactValue: { fontSize: 18, fontWeight: "900" as const }, impactLabel: { marginTop: 2, fontSize: 11, fontWeight: "700" as const, textAlign: "right" },
  detailCard: { borderRadius: 18, padding: 15, borderWidth: 1, gap: 8 }, description: { fontSize: 13, lineHeight: 21, textAlign: "right" }, sectionHeading: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 5 }, sectionCount: { minWidth: 24, textAlign: "center", fontSize: 12, fontWeight: "800" as const },
  taskCard: { minHeight: 67, borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", overflow: "hidden" }, taskStripe: { width: 4 }, taskCopy: { flex: 1, padding: 11, gap: 6 }, taskTopRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9 }, taskTitle: { flex: 1, fontSize: 13, fontWeight: "800" as const, textAlign: "right" }, taskBadge: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 }, taskBadgeText: { fontSize: 10, fontWeight: "800" as const }, taskMeta: { fontSize: 11, textAlign: "right" },
  eventCard: { borderRadius: 17, borderWidth: 1, padding: 13, gap: 11 }, eventTopRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9 }, eventIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, eventTitleWrap: { flex: 1, alignItems: "flex-end", gap: 2 }, eventTitle: { fontSize: 14, fontWeight: "800" as const, textAlign: "right" }, eventDate: { fontSize: 11, textAlign: "right" }, eventBadge: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 }, eventBadgeText: { fontSize: 10, fontWeight: "800" as const }, eventDivider: { height: StyleSheet.hairlineWidth }, eventMetaRow: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 7 }, eventMeta: { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-start", gap: 4, minWidth: 0 }, eventMetaText: { flex: 1, fontSize: 10, textAlign: "right" },
  emptyState: { minHeight: 110, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 }, emptyText: { fontSize: 12, textAlign: "center" }, notFoundTitle: { marginTop: 12, fontSize: 18, fontWeight: "800" as const }, notFoundBody: { marginTop: 6, fontSize: 13, textAlign: "center", lineHeight: 20 }, backButton: { marginTop: 18, minHeight: 44, borderRadius: 12, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" }, backButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" as const },
});
