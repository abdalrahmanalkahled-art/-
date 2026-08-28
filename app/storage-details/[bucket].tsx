import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ScreenContainer } from "@/components/screen-container";
import { SuccessModal } from "@/components/success-modal";
import { useColors } from "@/hooks/use-colors";
import { restoreFullBackup, type BackupPreview } from "@/lib/backup-restore";
import type { FullBackupPayload } from "@/lib/full-backup";
import type { MarketVisitReportTemplate } from "@/lib/market-visit-report-model";
import { deleteLocalBackup, deleteStorageCompetitorObservationPhoto, deleteStorageExternalAnalyticsPackage, deleteStorageSignageMedia, deleteStorageStorePhoto, deleteStorageTemplate, listLocalBackups, listStorageCompetitorObservationPhotos, listStorageExternalAnalyticsPackages, listStorageSignageMedia, listStorageStorePhotos, listStorageTemplates, previewLocalBackup, type LocalBackupFile, type StorageCompetitorObservationPhoto, type StorageDetailBucketId, type StorageExternalAnalyticsPackage, type StorageSignageMedia, type StorageStorePhoto } from "@/lib/storage-detail-manager";
import { formatStorageBytes } from "@/lib/storage-space-model";
import { closeTopOverlay, useOverlayBackHandler } from "@/lib/use-overlay-back-handler";

type Item = StorageStorePhoto | StorageCompetitorObservationPhoto | StorageSignageMedia | MarketVisitReportTemplate | LocalBackupFile | StorageExternalAnalyticsPackage;
type PendingDelete = { type: "photo"; items: StorageStorePhoto[] } | { type: "competitorPhoto"; items: StorageCompetitorObservationPhoto[] } | { type: "signageMedia"; items: StorageSignageMedia[] } | { type: "template"; items: MarketVisitReportTemplate[] } | { type: "backup"; items: LocalBackupFile[] } | { type: "externalAnalytics"; items: StorageExternalAnalyticsPackage[] };

const DETAILS: Record<StorageDetailBucketId, { title: string; subtitle: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; empty: string }> = {
  storePhotos: { title: "صور المحلات", subtitle: "صور الاستبيانات المحفوظة على هذا الجهاز", icon: "photo-library", color: "#0E9F6E", empty: "لا توجد صور محلات محفوظة حالياً." },
  competitorPhotos: { title: "صور رصد المنافسين", subtitle: "صور الملاحظات الميدانية المرتبطة برصد المنافسين", icon: "photo-camera", color: "#2563EB", empty: "لا توجد صور رصد منافسين محفوظة حالياً." },
  signageMedia: { title: "وسائط اللوحات والستاندات", subtitle: "صور اللوحات والستاندات والأرفف والسيارات والعقود المؤرشفة", icon: "perm-media", color: "#EA580C", empty: "لا توجد وسائط أصول إعلانية محفوظة حالياً." },
  templates: { title: "قوالب زيارة السوق", subtitle: "قوالب PowerPoint المحفوظة للتقارير", icon: "slideshow", color: "#7C3AED", empty: "لا توجد قوالب زيارة سوق محفوظة حالياً." },
  backups: { title: "النسخ الاحتياطية", subtitle: "نسخ محلية من بيانات التطبيق ووسائطه", icon: "backup", color: "#0891B2", empty: "لا توجد نسخ احتياطية داخل التطبيق حالياً." },
  externalAnalytics: { title: "استبيانات محفوظة للتحليل", subtitle: "حزم نتائج خارجية محفوظة محلياً للتحليل فقط", icon: "analytics", color: "#2563EB", empty: "لا توجد حزم تحليل خارجية محفوظة حالياً." },
};

function isBucket(value: string | string[] | undefined): value is StorageDetailBucketId {
  return value === "storePhotos" || value === "competitorPhotos" || value === "signageMedia" || value === "templates" || value === "backups" || value === "externalAnalytics";
}

export default function StorageDetailsScreen() {
  const colors = useColors();
  const { bucket: rawBucket } = useLocalSearchParams<{ bucket?: string }>();
  const bucket: StorageDetailBucketId = isBucket(rawBucket) ? rawBucket : "storePhotos";
  const detail = DETAILS[bucket];
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ file: LocalBackupFile; payload: FullBackupPayload; preview: BackupPreview } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [success, setSuccess] = useState("");

  const handleOverlayBack = useCallback(() => closeTopOverlay([
    () => {
      if (!pendingRestore || busy) return false;
      setPendingRestore(null);
      return true;
    },
    () => {
      if (!pendingDelete || busy) return false;
      setPendingDelete(null);
      return true;
    },
    () => {
      if (!selectionMode) return false;
      exitSelection();
      return true;
    },
  ]), [pendingRestore, busy, pendingDelete, selectionMode]);
  useOverlayBackHandler(handleOverlayBack);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (bucket === "storePhotos") setItems(await listStorageStorePhotos());
      else if (bucket === "competitorPhotos") setItems(await listStorageCompetitorObservationPhotos());
      else if (bucket === "signageMedia") setItems(await listStorageSignageMedia());
      else if (bucket === "templates") setItems(await listStorageTemplates());
      else if (bucket === "externalAnalytics") setItems(await listStorageExternalAnalyticsPackages());
      else setItems(await listLocalBackups());
    } finally { setLoading(false); }
  }, [bucket]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const totalBytes = useMemo(() => items.reduce((total, item) => total + (typeof item.size === "number" ? item.size : 0), 0), [items]);
  const isSelectable = bucket === "storePhotos" || bucket === "competitorPhotos" || bucket === "signageMedia" || bucket === "templates" || bucket === "externalAnalytics";
  const isSelected = (uri: string) => selectedUris.includes(uri);
  const toggleSelection = (uri: string) => setSelectedUris((current) => current.includes(uri) ? current.filter((item) => item !== uri) : [...current, uri]);
  const startSelection = (uri: string) => { if (isSelectable) { setSelectionMode(true); setSelectedUris((current) => current.includes(uri) ? current : [...current, uri]); } };
  const exitSelection = () => { setSelectionMode(false); setSelectedUris([]); };

  const requestRestore = async (file: LocalBackupFile) => {
    setBusy(true);
    try { const parsed = await previewLocalBackup(file); setPendingRestore({ file, ...parsed }); }
    catch { setSuccess("تعذر قراءة النسخة الاحتياطية. تأكد من أن الملف لم يتلف ثم حاول مجدداً."); }
    finally { setBusy(false); }
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    setBusy(true);
    try {
      const result = await restoreFullBackup(pendingRestore.payload);
      setPendingRestore(null);
      setSuccess(`تمت استعادة ${result.dataGroupCount} مجموعة بيانات و${result.mediaCount} ملف وسائط.`);
    } catch (error) { setSuccess(error instanceof Error ? error.message : "تعذر استعادة النسخة الاحتياطية."); }
    finally { setBusy(false); }
  };

  const requestSelectedDelete = () => {
    if (!selectedUris.length) return;
    if (bucket === "storePhotos") setPendingDelete({ type: "photo", items: items.filter((item): item is StorageStorePhoto => "storeName" in item && selectedUris.includes(item.uri)) });
    else if (bucket === "competitorPhotos") setPendingDelete({ type: "competitorPhoto", items: items.filter((item): item is StorageCompetitorObservationPhoto => "competitorName" in item && selectedUris.includes(item.uri)) });
    else if (bucket === "signageMedia") setPendingDelete({ type: "signageMedia", items: items.filter((item): item is StorageSignageMedia => "subtitle" in item && selectedUris.includes(item.uri)) });
    else if (bucket === "templates") setPendingDelete({ type: "template", items: items.filter((item): item is MarketVisitReportTemplate => "fileName" in item && selectedUris.includes(item.uri)) });
    else if (bucket === "externalAnalytics") setPendingDelete({ type: "externalAnalytics", items: items.filter((item): item is StorageExternalAnalyticsPackage => "sourceTemplateName" in item && selectedUris.includes(item.uri)) });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      if (pendingDelete.type === "photo") await Promise.all(pendingDelete.items.map((item) => deleteStorageStorePhoto(item.uri)));
      else if (pendingDelete.type === "competitorPhoto") await Promise.all(pendingDelete.items.map((item) => deleteStorageCompetitorObservationPhoto(item.uri)));
      else if (pendingDelete.type === "signageMedia") await Promise.all(pendingDelete.items.map((item) => deleteStorageSignageMedia(item.uri)));
      else if (pendingDelete.type === "template") await Promise.all(pendingDelete.items.map((item) => deleteStorageTemplate(item)));
      else if (pendingDelete.type === "externalAnalytics") await Promise.all(pendingDelete.items.map((item) => deleteStorageExternalAnalyticsPackage(item)));
      else await Promise.all(pendingDelete.items.map((item) => deleteLocalBackup(item)));
      const count = pendingDelete.items.length;
      setPendingDelete(null); exitSelection(); await load();
      setSuccess(`تم حذف ${count} عنصر نهائياً وتحديث مساحة التخزين.`);
    } catch (error) { setSuccess(error instanceof Error ? error.message : "تعذر حذف العناصر المحددة."); }
    finally { setBusy(false); }
  };

  const renderItem = ({ item }: { item: Item }) => {
    if (bucket === "storePhotos") {
      const photo = item as StorageStorePhoto;
      const selected = isSelected(photo.uri);
      return <TouchableOpacity onLongPress={() => startSelection(photo.uri)} onPress={() => selectionMode && toggleSelection(photo.uri)} activeOpacity={0.82} style={[styles.photoRow, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
        {selectionMode ? <View style={[styles.check, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>{selected ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View> : <Image source={{ uri: photo.uri }} style={styles.photo} />}
        <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{photo.storeName}</Text><Text style={[styles.rowSubtitle, { color: colors.muted }]}>{photo.storeRegion} • {photo.surveyDate}</Text><Text style={[styles.rowMeta, { color: colors.muted }]}>{formatStorageBytes(photo.size)}</Text></View>
        {!selectionMode ? <TouchableOpacity accessibilityLabel="حذف صورة المحل" onPress={() => setPendingDelete({ type: "photo", items: [photo] })} style={[styles.iconButton, { backgroundColor: colors.error + "14" }]}><MaterialIcons name="delete-outline" size={21} color={colors.error} /></TouchableOpacity> : null}
      </TouchableOpacity>;
    }
    if (bucket === "competitorPhotos") {
      const photo = item as StorageCompetitorObservationPhoto;
      const selected = isSelected(photo.uri);
      return <TouchableOpacity onLongPress={() => startSelection(photo.uri)} onPress={() => selectionMode && toggleSelection(photo.uri)} activeOpacity={0.82} style={[styles.photoRow, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
        {selectionMode ? <View style={[styles.check, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>{selected ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View> : <Image source={{ uri: photo.uri }} style={styles.photo} />}
        <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{photo.competitorName}</Text><Text style={[styles.rowSubtitle, { color: colors.muted }]}>{photo.storeName} • {photo.region}</Text><Text style={[styles.rowMeta, { color: colors.muted }]}>{formatStorageBytes(photo.size)} • {new Date(photo.createdAt).toLocaleString("en-US")}</Text></View>
        {!selectionMode ? <TouchableOpacity accessibilityLabel="حذف صورة رصد المنافس" onPress={() => setPendingDelete({ type: "competitorPhoto", items: [photo] })} style={[styles.iconButton, { backgroundColor: colors.error + "14" }]}><MaterialIcons name="delete-outline" size={21} color={colors.error} /></TouchableOpacity> : null}
      </TouchableOpacity>;
    }
    if (bucket === "signageMedia") {
      const media = item as StorageSignageMedia;
      const selected = isSelected(media.uri);
      return <TouchableOpacity onLongPress={() => startSelection(media.uri)} onPress={() => selectionMode && toggleSelection(media.uri)} activeOpacity={0.82} style={[styles.photoRow, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
        {selectionMode ? <View style={[styles.check, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>{selected ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View> : <Image source={{ uri: media.uri }} style={styles.photo} />}
        <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{media.title}</Text><Text style={[styles.rowSubtitle, { color: colors.muted }]} numberOfLines={1}>{media.subtitle}</Text><Text style={[styles.rowMeta, { color: colors.muted }]}>{formatStorageBytes(media.size)}</Text></View>
        {!selectionMode ? <TouchableOpacity accessibilityLabel="حذف وسيط إعلاني" onPress={() => setPendingDelete({ type: "signageMedia", items: [media] })} style={[styles.iconButton, { backgroundColor: colors.error + "14" }]}><MaterialIcons name="delete-outline" size={21} color={colors.error} /></TouchableOpacity> : null}
      </TouchableOpacity>;
    }
    if (bucket === "templates") {
      const template = item as MarketVisitReportTemplate;
      const selected = isSelected(template.uri);
      return <TouchableOpacity onLongPress={() => startSelection(template.uri)} onPress={() => selectionMode && toggleSelection(template.uri)} activeOpacity={0.82} style={[styles.fileRow, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
        {selectionMode ? <View style={[styles.check, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>{selected ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View> : <TouchableOpacity accessibilityLabel="حذف قالب زيارة السوق" onPress={() => setPendingDelete({ type: "template", items: [template] })} style={[styles.iconButton, { backgroundColor: colors.error + "14" }]}><MaterialIcons name="delete-outline" size={21} color={colors.error} /></TouchableOpacity>}
        <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{template.name}</Text><Text style={[styles.rowSubtitle, { color: colors.muted }]}>{new Date(template.createdAt).toLocaleString("en-US")}</Text><Text style={[styles.rowMeta, { color: colors.muted }]}>{formatStorageBytes(template.size || 0)} • PPTX</Text></View><View style={[styles.fileIcon, { backgroundColor: detail.color + "18" }]}><MaterialIcons name="slideshow" size={23} color={detail.color} /></View>
      </TouchableOpacity>;
    }
    if (bucket === "externalAnalytics") {
      const externalPackage = item as StorageExternalAnalyticsPackage;
      const selected = isSelected(externalPackage.uri);
      return <TouchableOpacity onLongPress={() => startSelection(externalPackage.uri)} onPress={() => selectionMode && toggleSelection(externalPackage.uri)} activeOpacity={0.82} style={[styles.fileRow, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>{selectionMode ? <View style={[styles.check, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>{selected ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View> : <TouchableOpacity accessibilityLabel="حذف حزمة تحليل محفوظة" onPress={() => setPendingDelete({ type: "externalAnalytics", items: [externalPackage] })} style={[styles.iconButton, { backgroundColor: colors.error + "14" }]}><MaterialIcons name="delete-outline" size={21} color={colors.error} /></TouchableOpacity>}<View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{externalPackage.name}</Text><Text style={[styles.rowSubtitle, { color: colors.muted }]}>{externalPackage.sourceTemplateName} • {externalPackage.resultCount} نتائج</Text><Text style={[styles.rowMeta, { color: colors.muted }]}>{formatStorageBytes(externalPackage.size)} • JSON</Text></View><View style={[styles.fileIcon, { backgroundColor: detail.color + "18" }]}><MaterialIcons name="analytics" size={23} color={detail.color} /></View></TouchableOpacity>;
    }
    const backup = item as LocalBackupFile;
    return <View style={[styles.fileRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.backupActions}><TouchableOpacity accessibilityLabel="حذف النسخة الاحتياطية" onPress={() => setPendingDelete({ type: "backup", items: [backup] })} style={[styles.iconButton, { backgroundColor: colors.error + "14" }]}><MaterialIcons name="delete-outline" size={21} color={colors.error} /></TouchableOpacity><TouchableOpacity accessibilityLabel="استعادة النسخة الاحتياطية" disabled={busy} onPress={() => void requestRestore(backup)} style={[styles.iconButton, { backgroundColor: detail.color + "16" }]}>{busy ? <ActivityIndicator size="small" color={detail.color} /> : <MaterialIcons name="restore" size={21} color={detail.color} />}</TouchableOpacity></View><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{backup.filename}</Text><Text style={[styles.rowSubtitle, { color: colors.muted }]}>{new Date(backup.createdAt).toLocaleString("en-US")}</Text><Text style={[styles.rowMeta, { color: colors.muted }]}>{formatStorageBytes(backup.size)} • JSON</Text></View><View style={[styles.fileIcon, { backgroundColor: detail.color + "18" }]}><MaterialIcons name="backup" size={23} color={detail.color} /></View></View>;
  };

  const deleteTitle = pendingDelete?.type === "photo" ? `حذف ${pendingDelete.items.length} صورة` : pendingDelete?.type === "competitorPhoto" ? `حذف ${pendingDelete.items.length} صورة رصد` : pendingDelete?.type === "signageMedia" ? `حذف ${pendingDelete.items.length} وسيط إعلاني` : pendingDelete?.type === "template" ? `حذف ${pendingDelete.items.length} قالب` : pendingDelete?.type === "externalAnalytics" ? `حذف ${pendingDelete.items.length} تحليل محفوظ` : "حذف النسخة الاحتياطية";
  const deleteMessage = pendingDelete?.type === "photo" ? "ستُحذف الصور المحددة وتُزال مراجعها من نتائج الاستبيانات. لا يمكن استعادتها بعد الحذف." : pendingDelete?.type === "competitorPhoto" ? "ستُحذف صور الرصد المحددة وتُزال مراجعها من سجلات رصد المنافسين. لا يمكن استعادتها بعد الحذف." : pendingDelete?.type === "signageMedia" ? "ستُحذف الوسائط المحددة من الجهاز وتُزال من اللوحات أو الستاندات أو الأرشيف المرتبط بها. لا يمكن استعادتها بعد الحذف." : pendingDelete?.type === "template" ? "ستُحذف قوالب PowerPoint المحددة من الجهاز ومن قائمة القوالب. لا يمكن استعادتها بعد الحذف." : pendingDelete?.type === "externalAnalytics" ? "ستُحذف الحزم التحليلية المحددة وملفاتها المحلية نهائياً. لا يمكن استعادتها بعد الحذف." : "سيُحذف ملف النسخة الاحتياطية من الجهاز فقط. لا تتأثر بيانات التطبيق الحالية.";

  return <ScreenContainer containerClassName="bg-background">
    <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={() => { if (!handleOverlayBack()) router.back(); }} style={[styles.back, { backgroundColor: colors.surface }]}><MaterialIcons name={selectionMode ? "close" : "arrow-forward"} size={22} color={colors.foreground} /></TouchableOpacity><View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>{selectionMode ? `${selectedUris.length} عنصر محدد` : detail.title}</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>{selectionMode ? "اضغط العناصر لتحديدها أو إلغاء تحديدها" : detail.subtitle}</Text></View></View>
    <FlatList data={items} keyExtractor={(item) => item.uri} renderItem={renderItem} refreshing={loading} onRefresh={() => void load()} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} ListHeaderComponent={<View style={[styles.summary, { backgroundColor: detail.color, borderColor: detail.color }]}><MaterialIcons name={detail.icon} size={29} color="#fff" /><View style={styles.summaryCopy}><Text style={styles.summaryValue}>{items.length}</Text><Text style={styles.summaryLabel}>عنصر محفوظ • {formatStorageBytes(totalBytes)}</Text></View></View>} ListEmptyComponent={!loading ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name={detail.icon} size={36} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>{detail.empty}</Text></View> : <View style={styles.loading}><ActivityIndicator size="large" color={detail.color} /></View>} ItemSeparatorComponent={() => <View style={styles.gap} />} />
    <ConfirmDialog visible={Boolean(pendingDelete)} title={deleteTitle} message={deleteMessage} confirmText="حذف نهائياً" isDangerous isSubmitting={busy} icon="delete-outline" onCancel={() => !busy && setPendingDelete(null)} onConfirm={() => void confirmDelete()} />
    <ConfirmDialog visible={Boolean(pendingRestore)} title="استعادة النسخة الاحتياطية" message={pendingRestore ? `تاريخ النسخة: ${new Date(pendingRestore.preview.createdAt).toLocaleString("en-US")}\n${pendingRestore.preview.recordCount} سجل و${pendingRestore.preview.mediaCount} ملف وسائط.\n\nسيتم استبدال بيانات الأعمال الحالية على هذا الجهاز، بينما تبقى بيانات الدخول الحالية دون تغيير.` : ""} confirmText="استعادة الآن" isSubmitting={busy} icon="restore" onCancel={() => !busy && setPendingRestore(null)} onConfirm={() => void confirmRestore()} />
    <SuccessModal visible={Boolean(success)} message={success} onClose={() => { const restored = success.startsWith("تمت استعادة"); setSuccess(""); if (restored) router.replace("/(tabs)" as any); }} />
    {selectionMode ? <View style={[styles.selectionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}><TouchableOpacity onPress={() => setSelectedUris(items.map((item) => item.uri))} style={[styles.selectAllButton, { borderColor: colors.border }]}><Text style={[styles.selectAllText, { color: colors.foreground }]}>تحديد الكل</Text></TouchableOpacity><TouchableOpacity disabled={!selectedUris.length || busy} onPress={requestSelectedDelete} style={[styles.deleteSelectedButton, { backgroundColor: colors.error, opacity: selectedUris.length ? 1 : 0.55 }]}><MaterialIcons name="delete-outline" size={19} color="#fff" /><Text style={styles.deleteSelectedText}>حذف المحدد</Text></TouchableOpacity></View> : null}
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  header: { height: 76, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1 }, back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "flex-end" }, headerTitle: { fontSize: 18, fontWeight: "800" as any }, headerSubtitle: { fontSize: 11, marginTop: 2, textAlign: "right" }, content: { padding: 16, paddingBottom: 105 }, summary: { minHeight: 100, borderRadius: 20, padding: 18, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1 }, summaryCopy: { flex: 1, alignItems: "flex-end" }, summaryValue: { color: "#fff", fontSize: 25, fontWeight: "900" as any }, summaryLabel: { color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 4, textAlign: "right" }, gap: { height: 9 }, photoRow: { minHeight: 92, borderWidth: 1, borderRadius: 17, padding: 8, flexDirection: "row", alignItems: "center", gap: 10 }, photo: { width: 74, height: 74, borderRadius: 12, backgroundColor: "#E5E7EB" }, fileRow: { minHeight: 88, borderWidth: 1, borderRadius: 17, paddingHorizontal: 11, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 }, fileIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" }, rowCopy: { flex: 1, alignItems: "flex-end" }, rowTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right" }, rowSubtitle: { fontSize: 10, marginTop: 4, textAlign: "right" }, rowMeta: { fontSize: 10, marginTop: 4, textAlign: "right" }, iconButton: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" }, backupActions: { gap: 7 }, check: { width: 25, height: 25, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" }, empty: { minHeight: 210, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }, emptyText: { fontSize: 12, textAlign: "center" }, loading: { minHeight: 210, alignItems: "center", justifyContent: "center" }, selectionBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1, flexDirection: "row", gap: 10 }, selectAllButton: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, selectAllText: { fontSize: 13, fontWeight: "700" as any }, deleteSelectedButton: { flex: 1.25, height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, deleteSelectedText: { color: "#fff", fontSize: 13, fontWeight: "800" as any },
});
