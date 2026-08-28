import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { AppPageHeader } from "@/components/app-page-header";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { FieldDetailSection, FieldInfoRow, FieldLoadingState, FieldScoreGrid, formatFieldDate } from "@/components/field-intelligence/field-record-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { fieldObservationKindLabel, type CompetitorObservation } from "@/lib/field-marketing-model";
import { resolveCompetitorObservationImageUri } from "@/lib/competitor-observation-media";
import { getItems, STORAGE_KEYS } from "@/lib/storage";

export default function FieldObservationDetailsScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const observationId = typeof params.id === "string" ? params.id : "";
  const [item, setItem] = useState<CompetitorObservation | null>(null);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const items = await getItems<CompetitorObservation>(STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS);
    const found = items.find((entry) => entry.id === observationId) || null;
    setItem(found);
    const resolved = await Promise.all((found?.photoUris || []).map((uri) => resolveCompetitorObservationImageUri(uri)));
    setPhotoUris(resolved.filter((uri): uri is string => Boolean(uri)));
    setLoading(false);
  }, [observationId]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><AppPageHeader title="تفاصيل الرصد" onBack={() => router.back()} /><FieldLoadingState /></ScreenContainer>;
  if (!item) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><AppPageHeader title="تفاصيل الرصد" onBack={() => router.back()} /><View style={styles.notFound}><MaterialIcons name="radar" size={48} color={colors.muted} /><Text style={[styles.notFoundTitle, { color: colors.foreground }]}>الرصد غير متاح</Text><Text style={[styles.notFoundText, { color: colors.muted }]}>قد يكون السجل قد حُذف من هذا الجهاز.</Text><TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.primary }]}><Text style={styles.backButtonText}>العودة إلى الرصد</Text></TouchableOpacity></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <AppPageHeader title="تفاصيل رصد المنافس" subtitle="قراءة كاملة للسجل الميداني" onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { backgroundColor: colors.warning }]}><View style={styles.heroIcon}><MaterialIcons name="radar" size={26} color="#fff" /></View><Text style={styles.heroTitle}>{item.competitorName}</Text><Text style={styles.heroSubtitle}>{item.storeName} · {item.region || "منطقة غير محددة"}</Text><View style={styles.heroDate}><MaterialIcons name="event" size={15} color="#fff" /><Text style={styles.heroDateText}>{formatFieldDate(item.createdAt)}</Text></View></View>
      <FieldDetailSection title="ملخص الرصد" icon="storefront"><FieldInfoRow label="المنافس" value={item.competitorName} icon="business" /><FieldInfoRow label="المحل" value={item.storeName} icon="store" /><FieldInfoRow label="المنطقة" value={item.region} icon="location-on" /><FieldInfoRow label="نوع الظهور" value={fieldObservationKindLabel(item.kind)} icon="visibility" /><FieldInfoRow label="تاريخ الرصد" value={formatFieldDate(item.createdAt)} icon="event" /></FieldDetailSection>
      <FieldDetailSection title="مؤشرات الرصد" icon="analytics"><FieldScoreGrid scores={[{ label: "وضوح الظهور", value: item.visibilityScore, color: colors.warning }, { label: "جودة التنفيذ", value: item.executionScore, color: colors.primary }]} /></FieldDetailSection>
      {item.message ? <FieldDetailSection title="الرسالة الظاهرة" icon="campaign"><Text style={[styles.body, { color: colors.foreground }]}>{item.message}</Text></FieldDetailSection> : null}
      {item.notes ? <FieldDetailSection title="ملاحظات إضافية" icon="notes"><Text style={[styles.body, { color: colors.foreground }]}>{item.notes}</Text></FieldDetailSection> : null}
      {photoUris.length ? (
        <FieldDetailSection title={`صور الرصد (${photoUris.length})`} icon="photo-library"><View style={styles.photoGrid}>{photoUris.map((uri) => <View key={uri} style={styles.photoWrap}><OptimizedImage uri={uri} width="100%" height={150} style={styles.photo} contentFit="cover" onError={() => setPhotoUris((current) => current.filter((value) => value !== uri))} /></View>)}</View></FieldDetailSection>
      ) : item.photoUris?.length ? (
        <FieldDetailSection title="صور الرصد" icon="photo-library"><Text style={[styles.body, { color: colors.muted }]}>تعذر الوصول إلى ملفات الصور المرتبطة بهذا السجل. افتح التعديل لإعادة إرفاقها.</Text></FieldDetailSection>
      ) : null}
      <Text style={[styles.footerHint, { color: colors.muted }]}>يمكن تعديل هذا السجل أو حذفه من قائمة الرصد عبر الضغط المطوّل على بطاقته.</Text>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 14, gap: 12, paddingBottom: 32 }, hero: { borderRadius: 22, padding: 18, minHeight: 145, alignItems: "flex-end", gap: 7 }, heroIcon: { alignSelf: "flex-start", width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }, heroTitle: { color: "#fff", fontSize: 22, fontWeight: "900" as const, textAlign: "right" }, heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "right" }, heroDate: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }, heroDateText: { color: "#fff", fontSize: 11 }, body: { fontSize: 13, lineHeight: 22, textAlign: "right" }, photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, photoWrap: { width: "48%", height: 150, borderRadius: 13, overflow: "hidden" }, photo: { width: "100%", height: 150, borderRadius: 13 }, footerHint: { fontSize: 11, textAlign: "center", lineHeight: 18 }, notFound: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }, notFoundTitle: { fontSize: 18, fontWeight: "800" as const }, notFoundText: { textAlign: "center", fontSize: 13 }, backButton: { marginTop: 10, minHeight: 46, paddingHorizontal: 20, borderRadius: 13, justifyContent: "center" }, backButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" as const } });
