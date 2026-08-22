import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ScreenContainer } from "@/components/screen-container";
import { SuccessModal } from "@/components/success-modal";
import { useColors } from "@/hooks/use-colors";
import { cleanExpiredTemporaryFiles, cleanTemporaryStorage, cleanUnusedManagedFiles, getStorageOverview } from "@/lib/storage-space-manager";
import { formatStorageBytes, type StorageBucketId, type StorageBucketUsage, type StorageOverview } from "@/lib/storage-space-model";

type CleanTarget = "temporary" | "unused";

const BUCKET_ICONS: Record<StorageBucketUsage["id"], keyof typeof MaterialIcons.glyphMap> = { reports: "description", storePhotos: "photo-library", signageMedia: "perm-media", eventMedia: "videocam", templates: "slideshow", backups: "backup", exports: "file-upload", analytics: "insert-photo", externalAnalytics: "analytics", other: "folder", temporary: "cleaning-services" };
const DETAIL_BUCKETS: StorageBucketId[] = ["storePhotos", "signageMedia", "templates", "backups", "externalAnalytics"];

export default function StorageManagementScreen() {
  const colors = useColors();
  const [overview, setOverview] = useState<StorageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanTarget, setCleanTarget] = useState<CleanTarget | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { await cleanExpiredTemporaryFiles(); setOverview(await getStorageOverview()); }
    catch (error) { Alert.alert("تعذر قراءة المساحة", error instanceof Error ? error.message : "تعذر تحليل ملفات التطبيق المحلية."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const confirmClean = async () => {
    if (!cleanTarget) return;
    setCleaning(true);
    try {
      const result = cleanTarget === "temporary" ? await cleanTemporaryStorage() : await cleanUnusedManagedFiles();
      setCleanTarget(null);
      setOverview(await getStorageOverview());
      setSuccess(result.removedFiles ? `تم حذف ${result.removedFiles} ملف وتحرير ${formatStorageBytes(result.removedBytes)}.` : "لا توجد ملفات قابلة للحذف حالياً.");
    } catch (error) { Alert.alert("تعذر التنظيف", error instanceof Error ? error.message : "حدث خطأ أثناء تنظيف الملفات."); }
    finally { setCleaning(false); }
  };

  const visibleBuckets = overview?.buckets.filter((bucket) => bucket.bytes > 0 || DETAIL_BUCKETS.includes(bucket.id)) || [];
  const maxBytes = Math.max(1, ...visibleBuckets.map((bucket) => bucket.bytes));
  return <ScreenContainer containerClassName="bg-background">
    <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}><MaterialIcons name="arrow-back" size={22} color={colors.foreground} /></TouchableOpacity><View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>إدارة مساحة التخزين</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>عرض وتنظيف الملفات المحلية بأمان</Text></View></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {loading || !overview ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.muted }]}>جارٍ تحليل مساحة التطبيق...</Text></View> : <>
        <View style={[styles.summary, { backgroundColor: colors.primary, borderColor: colors.primary }]}><MaterialIcons name="storage" size={30} color="#fff" /><View style={styles.summaryCopy}><Text style={styles.summaryValue}>{formatStorageBytes(overview.totalBytes)}</Text><Text style={styles.summaryLabel}>المساحة التي تستخدمها ملفات التطبيق</Text></View></View>
        <View style={styles.metrics}><View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: colors.foreground }]}>{formatStorageBytes(overview.documentBytes)}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>بيانات محفوظة</Text></View><View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: colors.foreground }]}>{formatStorageBytes(overview.temporaryBytes)}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>ملفات مؤقتة</Text></View></View>
        {overview.freeBytes !== null ? <Text style={[styles.free, { color: colors.muted }]}>المساحة المتاحة على الجهاز: {formatStorageBytes(overview.freeBytes)}</Text> : null}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>تفاصيل الاستخدام</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{visibleBuckets.length ? visibleBuckets.map((bucket) => { const canOpen = DETAIL_BUCKETS.includes(bucket.id); return <TouchableOpacity key={bucket.id} disabled={!canOpen} onPress={() => canOpen && (bucket.id === "backups" ? router.push("/backup-management" as any) : router.push({ pathname: "/storage-details/[bucket]" as any, params: { bucket: bucket.id } }))} style={[styles.bucket, canOpen && styles.bucketLink]}><View style={styles.bucketTop}><View style={styles.bucketMeta}><Text style={[styles.bucketSize, { color: colors.foreground }]}>{formatStorageBytes(bucket.bytes)}</Text><Text style={[styles.bucketFiles, { color: colors.muted }]}>{bucket.fileCount} ملف</Text></View><View style={styles.bucketLabel}>{canOpen ? <MaterialIcons name="chevron-right" size={18} color={colors.muted} /> : null}<Text style={[styles.bucketTitle, { color: colors.foreground }]}>{bucket.label}</Text><MaterialIcons name={BUCKET_ICONS[bucket.id]} size={19} color={colors.primary} /></View></View><View style={[styles.track, { backgroundColor: colors.border }]}><View style={[styles.fill, { backgroundColor: colors.primary, width: `${Math.max(4, (bucket.bytes / maxBytes) * 100)}%` }]} /></View></TouchableOpacity>; }) : <Text style={[styles.empty, { color: colors.muted }]}>لا توجد ملفات محلية قابلة للقياس حالياً.</Text>}</View>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>تنظيف آمن</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><TouchableOpacity onPress={() => setCleanTarget("temporary")} style={styles.action}><View style={[styles.actionIcon, { backgroundColor: colors.warning + "18" }]}><MaterialIcons name="cleaning-services" size={21} color={colors.warning} /></View><View style={styles.actionCopy}><Text style={[styles.actionTitle, { color: colors.foreground }]}>تنظيف الملفات المؤقتة</Text><Text style={[styles.actionSubtitle, { color: colors.muted }]}>يزيل نسخ المعاينة والتصدير المؤقتة القابلة لإعادة الإنشاء</Text></View><MaterialIcons name="chevron-right" size={21} color={colors.muted} /></TouchableOpacity><TouchableOpacity onPress={() => setCleanTarget("unused")} style={[styles.action, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}><View style={[styles.actionIcon, { backgroundColor: colors.error + "18" }]}><MaterialIcons name="delete-sweep" size={21} color={colors.error} /></View><View style={styles.actionCopy}><Text style={[styles.actionTitle, { color: colors.foreground }]}>حذف الملفات غير المستخدمة</Text><Text style={[styles.actionSubtitle, { color: colors.muted }]}>يحذف الملفات غير المرتبطة بسجل أو قالب أو نتيجة محفوظة فقط</Text></View><MaterialIcons name="chevron-right" size={21} color={colors.muted} /></TouchableOpacity></View>
        <Text style={[styles.note, { color: colors.muted }]}>لا يحذف التنظيف الآمن النسخ الاحتياطية أو ملفات الاستبيانات المصدّرة أو وسائط المحلات والفعاليات واللوحات والستاندات المرتبطة ببيانات قائمة.</Text>
      </>}
    </ScrollView>
    <ConfirmDialog visible={cleanTarget === "temporary"} title="تنظيف الملفات المؤقتة" message="سيتم حذف الملفات المؤقتة القابلة لإعادة الإنشاء فقط. لن تتأثر البيانات أو الصور والوسائط المرتبطة بسجلات التطبيق." confirmText="تنظيف الآن" isSubmitting={cleaning} icon="cleaning-services" onCancel={() => !cleaning && setCleanTarget(null)} onConfirm={() => void confirmClean()} />
    <ConfirmDialog visible={cleanTarget === "unused"} title="حذف الملفات غير المستخدمة" message="سيفحص التطبيق الملفات المحلية ويحذف فقط ما لا تشير إليه أي بيانات محفوظة. لا يمكن استعادة الملفات المحذوفة." confirmText="حذف نهائياً" isDangerous isSubmitting={cleaning} icon="delete-sweep" onCancel={() => !cleaning && setCleanTarget(null)} onConfirm={() => void confirmClean()} />
    <SuccessModal visible={Boolean(success)} message={success} onClose={() => setSuccess("")} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  header: { height: 76, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1 }, back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "flex-start" }, headerTitle: { fontSize: 18, fontWeight: "800" as any }, headerSubtitle: { fontSize: 11, marginTop: 2 }, content: { padding: 16, paddingBottom: 42 }, loading: { minHeight: 280, alignItems: "center", justifyContent: "center", gap: 12 }, loadingText: { fontSize: 13 }, summary: { minHeight: 104, borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1 }, summaryCopy: { flex: 1, alignItems: "flex-start" }, summaryValue: { color: "#fff", fontSize: 25, fontWeight: "900" as any }, summaryLabel: { color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 4, textAlign: "left" }, metrics: { flexDirection: "row", gap: 10, marginTop: 12 }, metric: { flex: 1, borderWidth: 1, borderRadius: 15, minHeight: 77, padding: 12, alignItems: "flex-start", justifyContent: "center" }, metricValue: { fontSize: 14, fontWeight: "800" as any }, metricLabel: { fontSize: 10, marginTop: 5 }, free: { fontSize: 11, textAlign: "left", marginTop: 9 }, sectionTitle: { fontSize: 12, fontWeight: "800" as any, textAlign: "left", marginTop: 20, marginBottom: 7, marginRight: 4 }, card: { borderWidth: 1, borderRadius: 17, overflow: "hidden" }, bucket: { paddingHorizontal: 14, paddingVertical: 11, gap: 8 }, bucketLink: { backgroundColor: "rgba(37,99,235,0.025)" }, bucketTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, bucketLabel: { flexDirection: "row", alignItems: "center", gap: 7 }, bucketTitle: { fontSize: 13, fontWeight: "700" as any }, bucketMeta: { alignItems: "flex-start" }, bucketSize: { fontSize: 12, fontWeight: "800" as any }, bucketFiles: { fontSize: 10, marginTop: 2 }, track: { height: 6, borderRadius: 4, overflow: "hidden", direction: "rtl" }, fill: { height: "100%", borderRadius: 4 }, empty: { textAlign: "center", fontSize: 12, padding: 22 }, action: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 13 }, actionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, actionCopy: { flex: 1, alignItems: "flex-start" }, actionTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "left" }, actionSubtitle: { fontSize: 10, textAlign: "left", lineHeight: 15, marginTop: 3 }, note: { fontSize: 11, textAlign: "left", lineHeight: 18, marginTop: 12, paddingHorizontal: 5 },
});
