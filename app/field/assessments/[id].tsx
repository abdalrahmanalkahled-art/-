import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { AppPageHeader } from "@/components/app-page-header";
import { FieldDetailSection, FieldInfoRow, FieldLoadingState, FieldScoreGrid, formatFieldDate } from "@/components/field-intelligence/field-record-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { type ExecutionAssessment } from "@/lib/field-marketing-model";
import { getItems, STORAGE_KEYS } from "@/lib/storage";

const subjectLabel: Record<ExecutionAssessment["subjectType"], string> = { store: "محل", event: "فعالية", signage: "لوحة أو ستاند" };

export default function FieldAssessmentDetailsScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const assessmentId = typeof params.id === "string" ? params.id : "";
  const [item, setItem] = useState<ExecutionAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const items = await getItems<ExecutionAssessment>(STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS);
    setItem(items.find((entry) => entry.id === assessmentId) || null);
    setLoading(false);
  }, [assessmentId]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><AppPageHeader title="تفاصيل الجودة" onBack={() => router.back()} /><FieldLoadingState /></ScreenContainer>;
  if (!item) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><AppPageHeader title="تفاصيل الجودة" onBack={() => router.back()} /><View style={styles.notFound}><MaterialIcons name="fact-check" size={48} color={colors.muted} /><Text style={[styles.notFoundTitle, { color: colors.foreground }]}>التقييم غير متاح</Text><Text style={[styles.notFoundText, { color: colors.muted }]}>قد يكون السجل قد حُذف من هذا الجهاز.</Text><TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.primary }]}><Text style={styles.backButtonText}>العودة إلى الجودة</Text></TouchableOpacity></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <AppPageHeader title="تفاصيل جودة التنفيذ" subtitle="قراءة كاملة للتقييم الميداني" onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}><View style={styles.heroIcon}><MaterialIcons name="fact-check" size={26} color="#fff" /></View><Text style={styles.heroTitle}>{item.subjectName}</Text><Text style={styles.heroSubtitle}>{subjectLabel[item.subjectType]}{item.region ? ` · ${item.region}` : ""}</Text><View style={styles.scoreBadge}><Text style={styles.scoreBadgeValue}>{item.score}/5</Text><Text style={styles.scoreBadgeLabel}>النتيجة الإجمالية</Text></View></View>
      <FieldDetailSection title="ملخص التقييم" icon="assignment"><FieldInfoRow label="الموقع" value={item.subjectName} icon="place" /><FieldInfoRow label="نوع الموقع" value={subjectLabel[item.subjectType]} icon="category" /><FieldInfoRow label="المنطقة" value={item.region || ""} icon="location-on" /><FieldInfoRow label="تاريخ التقييم" value={formatFieldDate(item.createdAt)} icon="event" /></FieldDetailSection>
      <FieldDetailSection title="المؤشرات التفصيلية" icon="analytics"><FieldScoreGrid scores={[{ label: "وضوح التفعيل", value: item.visibility, color: colors.primary }, { label: "الالتزام بالهوية", value: item.brandAlignment, color: colors.accent || colors.primary }, { label: "حالة المواد", value: item.materialCondition, color: colors.success }]} /></FieldDetailSection>
      {item.notes ? <FieldDetailSection title="ملاحظات إضافية" icon="notes"><Text style={[styles.body, { color: colors.foreground }]}>{item.notes}</Text></FieldDetailSection> : null}
      <Text style={[styles.footerHint, { color: colors.muted }]}>يمكن تعديل هذا السجل أو حذفه من قائمة الجودة عبر الضغط المطوّل على بطاقته.</Text>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 14, gap: 12, paddingBottom: 32 }, hero: { borderRadius: 22, padding: 18, minHeight: 170, alignItems: "flex-end", gap: 7 }, heroIcon: { alignSelf: "flex-start", width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }, heroTitle: { color: "#fff", fontSize: 22, fontWeight: "900" as const, textAlign: "right" }, heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "right" }, scoreBadge: { marginTop: 4, minWidth: 112, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center" }, scoreBadgeValue: { color: "#fff", fontSize: 19, fontWeight: "900" as const }, scoreBadgeLabel: { color: "rgba(255,255,255,0.82)", fontSize: 10 }, body: { fontSize: 13, lineHeight: 22, textAlign: "right" }, footerHint: { fontSize: 11, textAlign: "center", lineHeight: 18 }, notFound: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }, notFoundTitle: { fontSize: 18, fontWeight: "800" as const }, notFoundText: { textAlign: "center", fontSize: 13 }, backButton: { marginTop: 10, minHeight: 46, paddingHorizontal: 20, borderRadius: 13, justifyContent: "center" }, backButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" as const } });
