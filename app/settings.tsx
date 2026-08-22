import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { DashboardCustomizationSheet } from "@/components/dashboard-customization-sheet";
import { AppCustomizationSheet } from "@/components/app-customization-sheet";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useApp, useIsManager } from "@/lib/app-context";
import { loadAppSettings, saveAppSettings } from "@/lib/app-settings";
import { getItems, STORAGE_KEYS } from "@/lib/storage";
import { DEFAULT_PDF_CUSTOMIZATION, type PdfCustomization } from "@/lib/app-settings-model";
import { PdfCustomizationSheet } from "@/components/pdf-customization-sheet";
import { PresenceProductPickerSheet } from "@/components/presence-product-picker-sheet";
import { type DashboardSettings } from "@/lib/dashboard-settings-model";
import { createFullBackup } from "@/lib/full-backup";
import { createBackupPreview, readBackupFromUri, restoreFullBackup, type BackupPreview } from "@/lib/backup-restore";
import type { FullBackupPayload } from "@/lib/full-backup";
import { clearRoadsideContractPhoneReminders, getNotificationPreferences, requestNotificationPermission, saveNotificationPreferences, syncRoadsideContractPhoneReminders } from "@/lib/notification-center";
import type { NotificationPreferences } from "@/lib/notifications-model";
import { useThemeContext } from "@/lib/theme-provider";
import { useAppCustomization } from "@/lib/app-customization-context";
import { chooseMarketingManagerLocation, loadMarketingManagerLocation, type MarketingManagerLocation } from "@/lib/marketing-manager-storage";
import { ProfileSettingsModal } from "@/components/profile-settings-modal";

interface SettingRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  color: string;
  onPress?: () => void;
  right?: React.ReactNode;
}

function SettingRow({ icon, title, subtitle, color, onPress, right }: SettingRowProps) {
  const colors = useColors();
  return <TouchableOpacity disabled={!onPress} onPress={onPress} activeOpacity={0.72} style={[styles.row, { borderBottomColor: colors.border, opacity: onPress || right ? 1 : 0.62 }]}>
    {right || (onPress ? <MaterialIcons name="chevron-left" size={21} color={colors.muted} /> : <View style={styles.rightSpacer} />)}
    <View style={styles.rowBody}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>{subtitle ? <Text style={[styles.rowSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}</View>
    <View style={[styles.rowIcon, { backgroundColor: color + "16" }]}><MaterialIcons name={icon} size={20} color={color} /></View>
  </TouchableOpacity>;
}

export default function SettingsScreen() {
  const colors = useColors();
  const { user, dispatch } = useApp();
  const { colorScheme, setColorScheme } = useThemeContext();
  const { settings: customization, save: saveCustomization } = useAppCustomization();
  const [pdfCustomization, setPdfCustomization] = useState<PdfCustomization>({ ...DEFAULT_PDF_CUSTOMIZATION });
  const [showPdfCustomization, setShowPdfCustomization] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<FullBackupPayload | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [backupFilename, setBackupFilename] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardSettings | null>(null);
  const [showDashboardCustomization, setShowDashboardCustomization] = useState(false);
  const [showPresenceProductPicker, setShowPresenceProductPicker] = useState(false);
  const [dashboardProducts, setDashboardProducts] = useState<{ id: string; name: string }[]>([]);
  const [showAppCustomization, setShowAppCustomization] = useState(false);
  const [roadReminderDays, setRoadReminderDays] = useState<15 | 30 | 60>(30);
  const [showRoadReminderPicker, setShowRoadReminderPicker] = useState(false);
  const [marketingManagerLocation, setMarketingManagerLocation] = useState<MarketingManagerLocation | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const load = useCallback(async () => {
    const [settings, storedPreferences, products, storageLocation] = await Promise.all([loadAppSettings(), getNotificationPreferences(), getItems<{ id: string; name: string }>(STORAGE_KEYS.PRODUCTS), loadMarketingManagerLocation()]);
    setPdfCustomization(settings.pdfCustomization);
    setDashboard(settings.dashboard);
    setDashboardProducts(products);
    setPreferences(storedPreferences);
    setRoadReminderDays(settings.roadsideContractReminderDays);
    setMarketingManagerLocation(storageLocation);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const savePdfCustomization = async (next: PdfCustomization) => {
    const settings = await loadAppSettings();
    await saveAppSettings({ ...settings, pdfCustomization: next });
    setPdfCustomization(next);
    setShowPdfCustomization(false);
  };
  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    const next = { ...(preferences || await getNotificationPreferences()), ...updates };
    await saveNotificationPreferences(next);
    setPreferences(next);
    if (updates.roadContractReminders === false) await clearRoadsideContractPhoneReminders();
    if (next.enabled) await requestNotificationPermission();
  };
  const saveRoadReminderDays = async (days: 15 | 30 | 60) => {
    const settings = await loadAppSettings();
    await saveAppSettings({ ...settings, roadsideContractReminderDays: days });
    setRoadReminderDays(days);
    const contracts = await getItems<any>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS);
    await syncRoadsideContractPhoneReminders(contracts.filter((contract) => contract.status === "active")).catch(() => undefined);
    setShowRoadReminderPicker(false);
  };
  const saveDashboardCustomization = async (next: DashboardSettings) => {
    const settings = await loadAppSettings();
    await saveAppSettings({ ...settings, dashboard: next });
    setDashboard(next);
    setShowDashboardCustomization(false);
  };
  const choosePresenceProduct = () => {
    if (!dashboardProducts.length || !dashboard) { Alert.alert("لا توجد منتجات", "أضف منتجاً من إدارة المنتجات أولاً ليظهر في مخطط التواجد."); return; }
    setShowPresenceProductPicker(true);
  };
  const selectPresenceProduct = (product: { id: string; name: string }) => {
    if (!dashboard) return;
    setShowPresenceProductPicker(false);
    void saveDashboardCustomization({ ...dashboard, presenceProductId: product.id });
  };
  const chooseMarketingManagerFolder = async () => {
    try {
      const location = await chooseMarketingManagerLocation();
      if (!location) return;
      setMarketingManagerLocation(location);
      Alert.alert("تم اختيار الموقع", "أُنشئ مجلد marketing manager ومجلداته الفرعية داخل الموقع الذي اخترته.");
    } catch (error) {
      Alert.alert("تعذر اختيار الموقع", error instanceof Error ? error.message : "تعذر منح التطبيق صلاحية الوصول إلى المجلد المختار.");
    }
  };
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await createFullBackup({ share: false });
      Alert.alert("تم إنشاء النسخة", result.shared ? "اختر تطبيق الملفات أو التخزين السحابي لحفظ النسخة خارج التطبيق." : "حُفظت النسخة داخل مساحة التطبيق.");
    } catch (error) {
      Alert.alert("تعذر النسخ الاحتياطي", error instanceof Error ? error.message : "حدث خطأ غير معروف");
    } finally { setIsBackingUp(false); }
  };
  const pickBackupForPreview = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/json"], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const backup = await readBackupFromUri(asset.uri);
      setPendingBackup(backup);
      setBackupPreview(createBackupPreview(backup));
      setBackupFilename(asset.name || "نسخة احتياطية JSON");
      setShowRestoreConfirmation(false);
    } catch (error) {
      setPendingBackup(null); setBackupPreview(null); setBackupFilename(""); setShowRestoreConfirmation(false);
      Alert.alert("تعذر قراءة النسخة", error instanceof Error ? error.message : "تعذر التحقق من ملف النسخة الاحتياطية.");
    }
  };
  const confirmRestore = async () => {
    if (!pendingBackup) return;
    setIsRestoring(true);
    try {
      const result = await restoreFullBackup(pendingBackup);
      setPendingBackup(null); setBackupPreview(null); setBackupFilename(""); setShowRestoreConfirmation(false);
      Alert.alert("تمت الاستعادة", `استُعيدت ${result.dataGroupCount} مجموعة بيانات و${result.mediaCount} ملف وسائط. ستظهر البيانات عند العودة للرئيسية.`, [{ text: "حسناً", onPress: () => router.replace("/(tabs)" as any) }]);
    } catch (error) {
      Alert.alert("تعذر استعادة النسخة", error instanceof Error ? error.message : "حدث خطأ غير معروف. لم يُغلق التطبيق ولم يُحذف ملف النسخة." );
    } finally { setIsRestoring(false); }
  };
  return <ScreenContainer containerClassName="bg-background">
    <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]}><MaterialIcons name="arrow-forward" size={22} color={colors.foreground} /></TouchableOpacity><View style={styles.headerText}><Text style={[styles.headerSubtitle, { color: colors.muted }]}>تخصيص التطبيق والبيانات والتقارير</Text></View></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>الملف الشخصي</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingRow icon="manage-accounts" title="إدارة الملف الشخصي" subtitle={`${user?.name || "المستخدم الرئيسي"} · ${user?.username || "admin"}`} color="#9333EA" onPress={() => setShowProfileSettings(true)} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>المظهر</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <SettingRow icon={colorScheme === "dark" ? "dark-mode" : "light-mode"} title="الوضع الليلي" subtitle="تغيير المظهر دون التأثير في البيانات" color={colors.primary} right={<Switch value={colorScheme === "dark"} onValueChange={(value) => setColorScheme(value ? "dark" : "light")} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.muted }]}>الشاشة الرئيسية</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <SettingRow icon="dashboard-customize" title="تخصيص الشاشة الرئيسية" subtitle="إظهار الأقسام والمخططات وترتيبها حسب طريقة عملك" color="#2563EB" onPress={() => setShowDashboardCustomization(true)} />
        <SettingRow icon="category" title="منتج مخطط التواجد" subtitle={dashboard?.presenceProductId ? dashboardProducts.find((product) => product.id === dashboard.presenceProductId)?.name || "منتج محدد" : "اختر المنتج الذي تتابع تواجده"} color="#0E9F6E" onPress={choosePresenceProduct} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.muted }]}>تخصيص التطبيق</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <SettingRow icon="admin-panel-settings" title="التبويبات والإجراءات" subtitle="تفعيل أو إلغاء التبويبات وتحديد الإنشاء والتعديل والحذف" color="#7C3AED" onPress={() => setShowAppCustomization(true)} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.muted }]}>الإشعارات</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingRow icon="notifications-active" title="تنبيهات الهاتف" subtitle="مخزون ومهام وفعاليات وأدوات وعقود" color="#2563EB" right={<Switch value={preferences?.enabled ?? true} onValueChange={(value) => void updatePreferences({ enabled: value })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />} />
        <SettingRow icon="inventory-2" title="تنبيه المخزون" subtitle="إشعار عند وصول المادة للحد الأدنى" color="#D97706" right={<Switch value={preferences?.lowStock ?? true} onValueChange={(value) => void updatePreferences({ lowStock: value })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />} />
        <SettingRow icon="event" title="تذكير الفعاليات" subtitle="إشعار بالفعاليات القريبة" color="#7C3AED" right={<Switch value={preferences?.eventReminders ?? true} onValueChange={(value) => void updatePreferences({ eventReminders: value })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />} />
        <SettingRow icon="directions" title="تنبيهات عقود اللوحات" subtitle={`تذكير قبل ${roadReminderDays} يوماً وعند انتهاء العقد`} color="#0E9F6E" right={<Switch value={preferences?.roadContractReminders ?? true} onValueChange={(value) => void updatePreferences({ roadContractReminders: value })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />} />
        <SettingRow icon="timer" title="مدة تذكير عقود اللوحات" subtitle={`التنبيه المبكر: قبل ${roadReminderDays} يوماً من نهاية العقد`} color="#0891B2" onPress={() => setShowRoadReminderPicker(true)} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.muted }]}>التقارير</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <SettingRow icon="picture-as-pdf" title="قالب PDF الافتراضي" subtitle="القالب التنفيذي الحالي — محفوظ دون تغيير" color="#DC2626" />
        <SettingRow icon="palette" title="تخصيص مظهر قالب PDF" subtitle="ألوان الجداول والمخططات وطريقة عرضها" color="#7C3AED" onPress={() => setShowPdfCustomization(true)} />
        <SettingRow icon="today" title="التقرير اليومي" subtitle="تقرير الزيارات والاستبيانات والصور ضمن تاريخ محدد" color="#0E9F6E" onPress={() => router.push("/daily-report" as any)} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.muted }]}>البيانات</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingRow icon="folder-open" title="موقع ملفات marketing manager" subtitle={marketingManagerLocation ? "تم اختيار موقع خارجي للصور والقوالب والشعارات" : "اختر موقع المجلد الذي سيحفظ ملفات التطبيق"} color="#7C3AED" onPress={() => void chooseMarketingManagerFolder()} />
        <SettingRow icon="storage" title="إدارة مساحة التخزين" subtitle="عرض أحجام الملفات وتنظيف المؤقتات والملفات غير المستخدمة" color="#2563EB" onPress={() => router.push("/storage-management" as any)} />
        <SettingRow icon="backup" title="إدارة النسخ الاحتياطية" subtitle="إنشاء واستعادة واستيراد وحذف النسخ المحمية" color="#0891B2" onPress={() => router.push("/backup-management" as any)} />
        <SettingRow icon="delete-sweep" title="تهيئة التطبيق" subtitle="حذف جميع البيانات أو بيانات تبويبة محددة مع إبقاء النسخ الاحتياطية" color={colors.error} onPress={() => router.push("/app-reset" as any)} />
      </View>
      {backupPreview && <View style={[styles.restorePreview, { backgroundColor: colors.primary + "0C", borderColor: colors.primary + "32" }]}>
        <View style={styles.previewHeader}><View style={[styles.previewIcon, { backgroundColor: colors.primary + "18" }]}><MaterialIcons name="fact-check" size={21} color={colors.primary} /></View><View style={styles.previewText}><Text style={[styles.previewTitle, { color: colors.foreground }]}>معاينة قبل الاستعادة</Text><Text style={[styles.previewFile, { color: colors.muted }]} numberOfLines={1}>{backupFilename}</Text></View></View>
        <Text style={[styles.previewDate, { color: colors.muted }]}>تاريخ النسخة: {new Date(backupPreview.createdAt).toLocaleString("en-US")}</Text>
        <View style={styles.previewMetrics}><Text style={[styles.previewMetric, { color: colors.foreground }]}>{backupPreview.recordCount} سجل</Text><Text style={[styles.previewMetric, { color: colors.foreground }]}>{backupPreview.dataGroupCount} مجموعة بيانات</Text><Text style={[styles.previewMetric, { color: colors.foreground }]}>{backupPreview.mediaCount} وسائط</Text></View>
        <Text style={[styles.previewGroups, { color: colors.muted }]} numberOfLines={2}>{backupPreview.groups.slice(0, 6).map((group) => `${group.label} (${group.records})`).join(" • ")}{backupPreview.groups.length > 6 ? " • …" : ""}</Text>
        {backupPreview.skippedMediaCount > 0 && <Text style={[styles.previewWarning, { color: colors.warning }]}>تحتوي النسخة على {backupPreview.skippedMediaCount} مسار وسائط لم يُضمّن عند النسخ.</Text>}
        <Text style={[styles.previewWarning, { color: colors.error }]}>الاستعادة ستستبدل بيانات الأعمال الحالية على هذا الجهاز، ولن تشمل بيانات الدخول الحالية.</Text>
        <View style={styles.previewActions}><TouchableOpacity onPress={() => { setPendingBackup(null); setBackupPreview(null); setBackupFilename(""); setShowRestoreConfirmation(false); }} style={[styles.previewCancel, { borderColor: colors.border }]}><Text style={[styles.previewCancelText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowRestoreConfirmation(true)} style={[styles.previewRestore, { backgroundColor: colors.primary }]}><Text style={styles.previewRestoreText}>استعادة النسخة</Text></TouchableOpacity></View>
      </View>}

      <Text style={[styles.sectionTitle, { color: colors.muted }]}>حول التطبيق</Text><View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><SettingRow icon="info" title="مساعد التسويق الميداني" subtitle={`المستخدم الحالي: ${user?.name || "—"}`} color={colors.muted} /></View>
    </ScrollView>
    <ConfirmDialog visible={showRestoreConfirmation && Boolean(pendingBackup && backupPreview)} title="تأكيد استعادة النسخة" message={backupPreview ? `سيتم استبدال ${backupPreview.dataGroupCount} مجموعة بيانات حالية بالبيانات الموجودة في النسخة المحددة. لا يمكن التراجع عن هذه العملية من داخل التطبيق.` : ""} confirmText="استعادة الآن" isSubmitting={isRestoring} isDangerous icon="restore" onCancel={() => !isRestoring && setShowRestoreConfirmation(false)} onConfirm={() => void confirmRestore()} />
    {dashboard ? <DashboardCustomizationSheet visible={showDashboardCustomization} value={dashboard} onClose={() => setShowDashboardCustomization(false)} onSave={(next) => void saveDashboardCustomization(next)} /> : null}
    <PresenceProductPickerSheet visible={showPresenceProductPicker} products={dashboardProducts} selectedProductId={dashboard?.presenceProductId} onClose={() => setShowPresenceProductPicker(false)} onSelect={selectPresenceProduct} />
    <PdfCustomizationSheet visible={showPdfCustomization} value={pdfCustomization} onClose={() => setShowPdfCustomization(false)} onSave={(next) => void savePdfCustomization(next)} />
    <AppCustomizationSheet visible={showAppCustomization} username={user?.username} value={customization} onClose={() => setShowAppCustomization(false)} onSave={saveCustomization} />
    <ProfileSettingsModal visible={showProfileSettings} user={user} onClose={() => setShowProfileSettings(false)} onSaved={(updated) => dispatch({ type: "SET_USER", payload: updated })} />
    <Modal transparent visible={showRoadReminderPicker} animationType="fade" onRequestClose={() => setShowRoadReminderPicker(false)}><View style={styles.pickerOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => setShowRoadReminderPicker(false)} /><View style={[styles.reminderDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.reminderHeader}><TouchableOpacity onPress={() => setShowRoadReminderPicker(false)} style={[styles.reminderClose, { backgroundColor: colors.background }]}><MaterialIcons name="close" size={20} color={colors.foreground} /></TouchableOpacity><View style={styles.reminderCopy}><Text style={[styles.reminderTitle, { color: colors.foreground }]}>مدة تذكير عقود اللوحات</Text><Text style={[styles.reminderSubtitle, { color: colors.muted }]}>يُعاد جدولة تنبيهات الهاتف للعقود النشطة تلقائياً.</Text></View></View>{([15, 30, 60] as const).map((days) => <TouchableOpacity key={days} onPress={() => void saveRoadReminderDays(days)} style={[styles.reminderOption, { borderColor: roadReminderDays === days ? colors.primary : colors.border, backgroundColor: roadReminderDays === days ? colors.primary + "10" : colors.background }]}><View style={[styles.reminderRadio, { borderColor: roadReminderDays === days ? colors.primary : colors.border }]}>{roadReminderDays === days ? <View style={[styles.reminderRadioDot, { backgroundColor: colors.primary }]} /> : null}</View><View style={styles.reminderOptionCopy}><Text style={[styles.reminderOptionTitle, { color: colors.foreground }]}>{days} يوماً قبل نهاية العقد</Text><Text style={[styles.reminderOptionSubtitle, { color: colors.muted }]}>{days === 15 ? "تنبيه قريب ومركز" : days === 30 ? "الخيار المتوازن" : "تنبيه مبكر للتخطيط"}</Text></View></TouchableOpacity>)}</View></View></Modal>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  header: { height: 76, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1 }, backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerText: { flex: 1, alignItems: "flex-end" }, headerTitle: { fontSize: 18, fontWeight: "800" as any }, headerSubtitle: { fontSize: 11, marginTop: 2 }, content: { padding: 16, paddingBottom: 38 }, sectionTitle: { fontSize: 12, fontWeight: "800" as any, textAlign: "right", marginTop: 12, marginBottom: 7, marginRight: 4 }, card: { borderWidth: 1, borderRadius: 16, overflow: "hidden" }, row: { minHeight: 67, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth }, rightSpacer: { width: 21 }, rowBody: { flex: 1, alignItems: "flex-end" }, rowTitle: { fontSize: 14, fontWeight: "700" as any, textAlign: "right" }, rowSubtitle: { fontSize: 11, textAlign: "right", marginTop: 3 }, rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  restorePreview: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 10 }, previewHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, previewIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, previewText: { flex: 1, alignItems: "flex-end" }, previewTitle: { fontSize: 14, fontWeight: "800" as any }, previewFile: { fontSize: 11, marginTop: 3, maxWidth: "100%" }, previewDate: { fontSize: 11, textAlign: "right", marginTop: 10 }, previewMetrics: { flexDirection: "row", justifyContent: "space-between", marginTop: 11 }, previewMetric: { fontSize: 11, fontWeight: "700" as any }, previewGroups: { fontSize: 11, textAlign: "right", lineHeight: 18, marginTop: 9 }, previewWarning: { fontSize: 11, textAlign: "right", lineHeight: 18, marginTop: 8 }, previewActions: { flexDirection: "row", gap: 9, marginTop: 13 }, previewCancel: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 11, justifyContent: "center", alignItems: "center" }, previewCancelText: { fontSize: 13, fontWeight: "700" as any }, previewRestore: { flex: 1, minHeight: 42, borderRadius: 11, justifyContent: "center", alignItems: "center" }, previewRestoreText: { color: "#fff", fontSize: 13, fontWeight: "800" as any }, pickerOverlay: { flex: 1, justifyContent: "center", padding: 22, backgroundColor: "rgba(0,0,0,0.3)" }, reminderDialog: { borderWidth: 1, borderRadius: 22, padding: 16 }, reminderHeader: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 12 }, reminderClose: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }, reminderCopy: { flex: 1, alignItems: "flex-end" }, reminderTitle: { fontSize: 16, fontWeight: "800" as any, textAlign: "right" }, reminderSubtitle: { fontSize: 10, textAlign: "right", marginTop: 3 }, reminderOption: { minHeight: 59, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }, reminderRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" }, reminderRadioDot: { width: 10, height: 10, borderRadius: 5 }, reminderOptionCopy: { flex: 1, alignItems: "flex-end" }, reminderOptionTitle: { fontSize: 13, fontWeight: "800" as any }, reminderOptionSubtitle: { fontSize: 10, marginTop: 3 },
});
