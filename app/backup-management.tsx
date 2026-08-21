import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { SuccessModal } from "@/components/success-modal";
import { useColors } from "@/hooks/use-colors";
import { createBackupPreview, createMergePreview, readBackupFromUri, restoreFullBackup, type BackupPreview, type RestoreMode } from "@/lib/backup-restore";
import type { BackupMergePreview } from "@/lib/backup-merge";
import { getLastRestoreHistory, type LastRestoreHistory } from "@/lib/backup-restore-history";
import { BACKUP_SECTION_OPTIONS, createFullBackup, createPartialBackup, type BackupSectionId, type FullBackupPayload } from "@/lib/full-backup";
import { useApp } from "@/lib/app-context";
import { deleteLocalBackup, listLocalBackups, previewLocalBackup, type LocalBackupFile } from "@/lib/storage-detail-manager";
import { saveSelectedBackupsToPhone, shareSelectedBackups } from "@/lib/selected-backup-export";
import { STORAGE_KEYS, verifyLocalUserPassword } from "@/lib/storage";
import { formatStorageBytes } from "@/lib/storage-space-model";

type CreateMode = "full" | "partial" | null;
type PendingRestore = { label: string; payload: FullBackupPayload; preview: BackupPreview; mergePreview: BackupMergePreview };

export default function BackupManagementScreen() {
  const colors = useColors();
  const { user } = useApp();
  const [backups, setBackups] = useState<LocalBackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [sectionPickerVisible, setSectionPickerVisible] = useState(false);
  const [selectedSections, setSelectedSections] = useState<BackupSectionId[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [deletePasswordVisible, setDeletePasswordVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("merge");
  const [lastRestore, setLastRestore] = useState<LastRestoreHistory | null>(null);
  const [restoreHistoryVisible, setRestoreHistoryVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<"share" | "save" | null>(null);
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextBackups, history] = await Promise.all([listLocalBackups(), getLastRestoreHistory()]);
      setBackups(nextBackups);
      setLastRestore(history);
    }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const createFull = async () => {
    setCreateMode("full");
    try {
      const result = await createFullBackup({ share: false });
      await load();
      setSuccess(`تم إنشاء نسخة كاملة تضم ${result.itemCount} مجموعة بيانات و${result.mediaCount} ملف وسائط.`);
    } catch (error) { setSuccess(error instanceof Error ? error.message : "تعذر إنشاء النسخة الاحتياطية."); }
    finally { setCreateMode(null); }
  };

  const createPartial = async () => {
    if (!selectedSections.length) return;
    setCreateMode("partial");
    try {
      const result = await createPartialBackup(selectedSections, { share: false });
      setSectionPickerVisible(false);
      setSelectedSections([]);
      await load();
      setSuccess(`تم إنشاء نسخة جزئية تضم ${result.itemCount} مجموعة بيانات و${result.mediaCount} ملف وسائط.`);
    } catch (error) { setSuccess(error instanceof Error ? error.message : "تعذر إنشاء النسخة الجزئية."); }
    finally { setCreateMode(null); }
  };

  const requestLocalRestore = async (file: LocalBackupFile) => {
    setBusy(true);
    try {
      const parsed = await previewLocalBackup(file);
      const mergePreview = await createMergePreview(parsed.payload);
      setRestoreMode("merge");
      setPendingRestore({ label: file.filename, ...parsed, mergePreview });
    }
    catch { setSuccess("تعذر قراءة النسخة الاحتياطية. تأكد من أنها لم تتلف."); }
    finally { setBusy(false); }
  };

  const importFromPhone = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/json"], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const payload = await readBackupFromUri(asset.uri);
      const mergePreview = await createMergePreview(payload);
      setRestoreMode("merge");
      setPendingRestore({ label: asset.name || "نسخة من الهاتف", payload, preview: createBackupPreview(payload), mergePreview });
    } catch (error) { setSuccess(error instanceof Error ? error.message : "تعذر قراءة النسخة المختارة من الهاتف."); }
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    setBusy(true);
    try {
      const result = await restoreFullBackup(pendingRestore.payload, restoreMode, pendingRestore.label);
      setLastRestore(await getLastRestoreHistory());
      setPendingRestore(null);
      if (result.mode === "merge" && result.mergePreview) {
        const summary = result.mergePreview;
        setSuccess(`تمت الكتابة فوق البيانات: أُضيف ${summary.added}، وحُدّث ${summary.updated}، وبقي ${summary.retained} محلياً. كما استُعيد ${result.mediaCount} ملف وسائط.`);
      } else {
        const verb = pendingRestore.preview.isPartial ? "استُبدلت بيانات الأقسام المحددة في" : "استُعيدت";
        setSuccess(`${verb} ${result.dataGroupCount} مجموعة بيانات و${result.mediaCount} ملف وسائط. بقيت إعدادات التطبيق المحلية محفوظة.`);
      }
    } catch (error) { setSuccess(error instanceof Error ? error.message : "تعذر استعادة النسخة الاحتياطية."); }
    finally { setBusy(false); }
  };

  const toggleSelection = (uri: string) => setSelectedUris((current) => current.includes(uri) ? current.filter((item) => item !== uri) : [...current, uri]);
  const startSelection = (uri: string) => { setSelectionMode(true); setSelectedUris((current) => current.includes(uri) ? current : [...current, uri]); };
  const exitSelection = () => { setSelectionMode(false); setSelectedUris([]); };

  const requestDelete = () => {
    if (!selectedUris.length) return;
    setPassword(""); setPasswordError(""); setDeletePasswordVisible(true);
  };
  const confirmProtectedDelete = async () => {
    if (!user?.username || !(await verifyLocalUserPassword(user.username, password))) { setPasswordError("كلمة المرور غير صحيحة."); return; }
    setBusy(true);
    try {
      const selected = backups.filter((backup) => selectedUris.includes(backup.uri));
      await Promise.all(selected.map((backup) => deleteLocalBackup(backup)));
      setDeletePasswordVisible(false); exitSelection(); await load();
      setSuccess(`تم حذف ${selected.length} نسخة احتياطية نهائياً.`);
    } catch (error) { setPasswordError(error instanceof Error ? error.message : "تعذر حذف النسخ المحددة."); }
    finally { setBusy(false); }
  };

  const selectedBackups = () => backups.filter((backup) => selectedUris.includes(backup.uri));
  const shareSelected = async () => {
    const selected = selectedBackups();
    if (!selected.length) return;
    setExporting("share");
    try {
      await shareSelectedBackups(selected);
      setSuccess(selected.length === 1 ? "فُتحت خيارات مشاركة النسخة المحددة." : `فُتحت خيارات مشاركة ${selected.length} نسخ ضمن ملف واحد.`);
    } catch (error) { setSuccess(error instanceof Error ? error.message : "تعذر مشاركة النسخ المحددة."); }
    finally { setExporting(null); }
  };
  const saveSelectedToPhone = async () => {
    const selected = selectedBackups();
    if (!selected.length) return;
    setExporting("save");
    try {
      const saved = await saveSelectedBackupsToPhone(selected);
      if (!saved) return;
      setSuccess(`تم حفظ ${saved} نسخة احتياطية في المجلد الذي اخترته على الهاتف.`);
    } catch (error) { setSuccess(error instanceof Error ? error.message : "تعذر حفظ النسخ المحددة على الهاتف."); }
    finally { setExporting(null); }
  };

  const renderBackup = ({ item }: { item: LocalBackupFile }) => {
    const selected = selectedUris.includes(item.uri);
    const partial = item.filename.startsWith("madar_partial_backup_");
    return <TouchableOpacity onLongPress={() => startSelection(item.uri)} onPress={() => selectionMode ? toggleSelection(item.uri) : void requestLocalRestore(item)} activeOpacity={0.82} style={[styles.backupRow, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
      {selectionMode ? <View style={[styles.check, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>{selected ? <MaterialIcons name="check" size={16} color="#fff" /> : null}</View> : <View style={[styles.fileIcon, { backgroundColor: (partial ? "#7C3AED" : "#0891B2") + "18" }]}><MaterialIcons name={partial ? "folder-copy" : "backup"} size={23} color={partial ? "#7C3AED" : "#0891B2"} /></View>}
      <View style={styles.backupCopy}><Text style={[styles.backupTitle, { color: colors.foreground }]} numberOfLines={1}>{partial ? "نسخة جزئية" : "نسخة كاملة"}</Text><Text style={[styles.backupName, { color: colors.muted }]} numberOfLines={1}>{item.filename}</Text><Text style={[styles.backupMeta, { color: colors.muted }]}>{new Date(item.createdAt).toLocaleString("ar-SY")} • {formatStorageBytes(item.size)}</Text></View>
      {!selectionMode ? <MaterialIcons name="restore" size={21} color={colors.primary} /> : null}
    </TouchableOpacity>;
  };

  const categoryGroup = pendingRestore?.mergePreview.groups.find((group) => group.key === STORAGE_KEYS.PRODUCT_CATEGORIES);
  const categoryRestoreNotice = pendingRestore
    ? Object.prototype.hasOwnProperty.call(pendingRestore.payload.data, STORAGE_KEYS.PRODUCT_CATEGORIES)
      ? restoreMode === "merge"
        ? ` الأصناف: سيُضاف ${categoryGroup?.added || 0}، ويُحدّث ${categoryGroup?.updated || 0}، ويبقى ${categoryGroup?.retained || 0} محلياً.`
        : " الأصناف: ستتبدل فقط بأصناف النسخة، وتبقى الأصناف المحلية الغائبة عن النسخة محفوظة."
      : " الأصناف: لا تحتوي النسخة المختارة على قسم الأصناف؛ ستبقى أصنافك المحلية كما هي."
    : "";
  const restoreDescription = pendingRestore ? restoreMode === "merge"
    ? `الخيار الموصى به: لا يحذف هذا النمط أي بيانات محلية. يضيف ما هو مفقود ويحدّث العناصر المطابقة بالاسم المنظّف.${categoryRestoreNotice}`
    : `يستبدل هذا النمط بيانات الأقسام الموجودة في النسخة فقط، ولا يحذف الأقسام الغائبة.${categoryRestoreNotice}` : "";

  return <ScreenContainer containerClassName="bg-background">
    <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}><MaterialIcons name="arrow-forward" size={22} color={colors.foreground} /></TouchableOpacity><View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>{selectionMode ? `${selectedUris.length} نسخة محددة` : "إدارة النسخ الاحتياطية"}</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>{selectionMode ? "اضغط النسخ لتحديدها أو إلغاء تحديدها" : "إنشاء واستعادة وإدارة نسخ بيانات التطبيق"}</Text></View>{selectionMode ? <View style={styles.selectionHeaderActions}><TouchableOpacity accessibilityLabel="حفظ النسخ المحددة على الهاتف" disabled={!selectedUris.length || exporting !== null} onPress={() => void saveSelectedToPhone()} style={[styles.selectionHeaderAction, { backgroundColor: colors.surface, borderColor: colors.border, opacity: selectedUris.length ? 1 : 0.5 }]}>{exporting === "save" ? <ActivityIndicator size="small" color={colors.primary} /> : <><MaterialIcons name="save-alt" size={17} color={colors.primary} /><Text style={[styles.selectionHeaderActionText, { color: colors.primary }]}>حفظ</Text></>}</TouchableOpacity><TouchableOpacity accessibilityLabel="مشاركة النسخ المحددة" disabled={!selectedUris.length || exporting !== null} onPress={() => void shareSelected()} style={[styles.selectionHeaderAction, { backgroundColor: colors.surface, borderColor: colors.border, opacity: selectedUris.length ? 1 : 0.5 }]}>{exporting === "share" ? <ActivityIndicator size="small" color={colors.primary} /> : <><MaterialIcons name="share" size={17} color={colors.primary} /><Text style={[styles.selectionHeaderActionText, { color: colors.primary }]}>مشاركة</Text></>}</TouchableOpacity><TouchableOpacity onPress={exitSelection} style={styles.headerAction}><Text style={[styles.headerActionText, { color: colors.primary }]}>إلغاء</Text></TouchableOpacity></View> : null}</View>
    <FlatList data={backups} keyExtractor={(item) => item.uri} renderItem={renderBackup} refreshing={loading} onRefresh={() => void load()} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} ListHeaderComponent={<><View style={[styles.summary, { backgroundColor: colors.primary, borderColor: colors.primary }]}><MaterialIcons name="backup" size={30} color="#fff" /><View style={styles.summaryCopy}><Text style={styles.summaryValue}>{backups.length}</Text><Text style={styles.summaryLabel}>نسخة محفوظة داخل التطبيق</Text></View></View><View style={styles.actions}><TouchableOpacity disabled={createMode !== null} onPress={() => void createFull()} style={[styles.primaryAction, { backgroundColor: colors.primary, opacity: createMode ? 0.7 : 1 }]}>{createMode === "full" ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="backup" size={20} color="#fff" />}<Text style={styles.primaryActionText}>إنشاء نسخة كاملة</Text></TouchableOpacity><View style={styles.secondaryActions}><TouchableOpacity onPress={() => setSectionPickerVisible(true)} style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface }]}><MaterialIcons name="content-copy" size={19} color="#7C3AED" /><Text style={[styles.secondaryActionText, { color: colors.foreground }]}>نسخة جزئية</Text></TouchableOpacity><TouchableOpacity onPress={() => void importFromPhone()} style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface }]}><MaterialIcons name="phone-android" size={19} color="#0891B2" /><Text style={[styles.secondaryActionText, { color: colors.foreground }]}>استعادة من الهاتف</Text></TouchableOpacity></View></View><Text style={[styles.hint, { color: colors.muted }]}>اضغط مطولاً على أي نسخة لبدء التحديد المتعدد وحذف النسخ المحمية بكلمة المرور.</Text></>} ListEmptyComponent={!loading ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="backup" size={38} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد نسخ محفوظة بعد. أنشئ نسخة كاملة أو جزئية لحماية بياناتك.</Text></View> : <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>} ItemSeparatorComponent={() => <View style={styles.gap} />} />
    {!selectionMode && lastRestore ? <TouchableOpacity accessibilityLabel="عرض سجل آخر عملية استعادة" onPress={() => setRestoreHistoryVisible(true)} activeOpacity={0.86} style={[restoreHistoryStyles.shortcut, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[restoreHistoryStyles.shortcutIcon, { backgroundColor: colors.primary + "14" }]}><MaterialIcons name="history" size={20} color={colors.primary} /></View><View style={restoreHistoryStyles.shortcutCopy}><Text style={[restoreHistoryStyles.shortcutTitle, { color: colors.foreground }]}>آخر عملية استعادة</Text><Text style={[restoreHistoryStyles.shortcutMeta, { color: colors.muted }]}>{lastRestore.mode === "merge" ? "كتابة فوق البيانات" : "استبدال البيانات"} • {new Date(lastRestore.restoredAt).toLocaleString("ar-SY")}</Text></View><MaterialIcons name="chevron-left" size={22} color={colors.muted} /></TouchableOpacity> : null}
    {selectionMode ? <View style={[styles.selectionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}><TouchableOpacity onPress={() => setSelectedUris(backups.map((backup) => backup.uri))} style={[styles.selectionButton, { borderColor: colors.border }]}><Text style={[styles.selectionButtonText, { color: colors.foreground }]}>تحديد الكل</Text></TouchableOpacity><TouchableOpacity disabled={!selectedUris.length || busy} onPress={requestDelete} style={[styles.deleteButton, { backgroundColor: colors.error, opacity: selectedUris.length ? 1 : 0.55 }]}><MaterialIcons name="delete-outline" size={19} color="#fff" /><Text style={styles.deleteButtonText}>حذف المحدد</Text></TouchableOpacity></View> : null}
    <Modal visible={sectionPickerVisible} transparent animationType="fade" onRequestClose={() => !createMode && setSectionPickerVisible(false)}><View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => !createMode && setSectionPickerVisible(false)} /><View style={[styles.sectionDialog, { backgroundColor: colors.surface }]}><View style={styles.dialogHeader}><TouchableOpacity onPress={() => setSectionPickerVisible(false)}><MaterialIcons name="close" size={22} color={colors.foreground} /></TouchableOpacity><View style={styles.dialogHeaderCopy}><Text style={[styles.dialogTitle, { color: colors.foreground }]}>إنشاء نسخة جزئية</Text><Text style={[styles.dialogSubtitle, { color: colors.muted }]}>اختر البيانات التي تريد حفظها فقط</Text></View></View><FlatList data={BACKUP_SECTION_OPTIONS} keyExtractor={(item) => item.id} renderItem={({ item }) => { const chosen = selectedSections.includes(item.id); return <TouchableOpacity onPress={() => setSelectedSections((current) => chosen ? current.filter((id) => id !== item.id) : [...current, item.id])} style={[styles.sectionChoice, { borderBottomColor: colors.border }]}><View style={[styles.choiceCheck, { borderColor: chosen ? colors.primary : colors.border, backgroundColor: chosen ? colors.primary : "transparent" }]}>{chosen ? <MaterialIcons name="check" size={15} color="#fff" /> : null}</View><View style={styles.choiceCopy}><Text style={[styles.choiceTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.choiceDescription, { color: colors.muted }]}>{item.description}</Text></View></TouchableOpacity>; }} style={styles.sectionList} /><TouchableOpacity disabled={!selectedSections.length || createMode === "partial"} onPress={() => void createPartial()} style={[styles.createPartialButton, { backgroundColor: colors.primary, opacity: selectedSections.length ? 1 : 0.55 }]}>{createMode === "partial" ? <ActivityIndicator color="#fff" /> : <Text style={styles.createPartialText}>إنشاء النسخة الجزئية</Text>}</TouchableOpacity></View></View></Modal>
    <Modal visible={deletePasswordVisible} transparent animationType="fade" onRequestClose={() => !busy && setDeletePasswordVisible(false)}><View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => !busy && setDeletePasswordVisible(false)} /><View style={[styles.passwordDialog, { backgroundColor: colors.surface }]}><View style={[styles.passwordIcon, { backgroundColor: colors.error + "15" }]}><MaterialIcons name="lock-outline" size={27} color={colors.error} /></View><Text style={[styles.passwordTitle, { color: colors.foreground }]}>تأكيد حذف النسخ</Text><Text style={[styles.passwordMessage, { color: colors.muted }]}>لحماية النسخ الاحتياطية، أدخل كلمة مرور الحساب الحالي لحذف {selectedUris.length} نسخة نهائياً.</Text><TextInput value={password} onChangeText={(value) => { setPassword(value); setPasswordError(""); }} secureTextEntry placeholder="كلمة المرور" placeholderTextColor={colors.muted} textAlign="right" style={[styles.passwordInput, { color: colors.foreground, borderColor: passwordError ? colors.error : colors.border }]} /><Text style={[styles.passwordError, { color: colors.error }]}>{passwordError}</Text><View style={styles.passwordActions}><TouchableOpacity disabled={busy} onPress={() => setDeletePasswordVisible(false)} style={[styles.cancelButton, { borderColor: colors.border }]}><Text style={[styles.cancelButtonText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity><TouchableOpacity disabled={busy || !password} onPress={() => void confirmProtectedDelete()} style={[styles.confirmDeleteButton, { backgroundColor: colors.error, opacity: password ? 1 : 0.55 }]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmDeleteText}>حذف نهائياً</Text>}</TouchableOpacity></View></View></View></Modal>
    <Modal visible={Boolean(pendingRestore)} transparent animationType="fade" onRequestClose={() => !busy && setPendingRestore(null)}><View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => !busy && setPendingRestore(null)} /><View style={[styles.restoreDialog, { backgroundColor: colors.surface }]}><View style={[styles.restoreIcon, { backgroundColor: colors.primary + "18" }]}><MaterialIcons name="restore" size={29} color={colors.primary} /></View><Text style={[styles.restoreTitle, { color: colors.foreground }]}>استعادة النسخة الاحتياطية</Text><Text style={[styles.restoreMeta, { color: colors.muted }]}>{pendingRestore?.label}</Text><Text style={[styles.restoreMeta, { color: colors.muted }]}>{pendingRestore ? `${pendingRestore.preview.recordCount} سجل • ${pendingRestore.preview.mediaCount} ملف وسائط` : ""}</Text><View style={styles.restoreModes}><TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: restoreMode === "replace" }} onPress={() => setRestoreMode("replace")} style={[styles.restoreMode, { borderColor: restoreMode === "replace" ? colors.primary : colors.border, backgroundColor: restoreMode === "replace" ? colors.primary + "10" : "transparent" }]}><View style={[styles.restoreModeIcon, { backgroundColor: colors.error + "14" }]}><MaterialIcons name="sync" size={19} color={colors.error} /></View><View style={styles.restoreModeCopy}><Text style={[styles.restoreModeTitle, { color: colors.foreground }]}>استبدال البيانات</Text><Text style={[styles.restoreModeText, { color: colors.muted }]}>يعيد البيانات كما في النسخة المختارة.</Text></View><View style={[styles.radio, { borderColor: restoreMode === "replace" ? colors.primary : colors.border }]}>{restoreMode === "replace" ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View></TouchableOpacity><TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: restoreMode === "merge" }} onPress={() => setRestoreMode("merge")} style={[styles.restoreMode, { borderColor: restoreMode === "merge" ? colors.primary : colors.border, backgroundColor: restoreMode === "merge" ? colors.primary + "10" : "transparent" }]}><View style={[styles.restoreModeIcon, { backgroundColor: colors.success + "14" }]}><MaterialIcons name="merge-type" size={19} color={colors.success} /></View><View style={styles.restoreModeCopy}><Text style={[styles.restoreModeTitle, { color: colors.foreground }]}>الكتابة فوق البيانات</Text><Text style={[styles.restoreModeText, { color: colors.muted }]}>تضيف المفقود وتحدّث المتطابق بالاسم دون حذف القديم.</Text></View><View style={[styles.radio, { borderColor: restoreMode === "merge" ? colors.primary : colors.border }]}>{restoreMode === "merge" ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View></TouchableOpacity></View><Text style={[styles.restoreDescription, { color: colors.muted }]}>{restoreDescription}</Text>{restoreMode === "merge" && pendingRestore ? <View style={[styles.mergePreview, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[styles.mergePreviewTitle, { color: colors.foreground }]}>معاينة الكتابة فوق</Text><View style={styles.mergeStats}><View style={styles.mergeStat}><Text style={[styles.mergeStatValue, { color: colors.success }]}>{pendingRestore.mergePreview.added}</Text><Text style={[styles.mergeStatLabel, { color: colors.muted }]}>سيُضاف</Text></View><View style={styles.mergeStat}><Text style={[styles.mergeStatValue, { color: colors.primary }]}>{pendingRestore.mergePreview.updated}</Text><Text style={[styles.mergeStatLabel, { color: colors.muted }]}>سيُحدّث</Text></View><View style={styles.mergeStat}><Text style={[styles.mergeStatValue, { color: colors.foreground }]}>{pendingRestore.mergePreview.retained}</Text><Text style={[styles.mergeStatLabel, { color: colors.muted }]}>سيبقى محلياً</Text></View></View><Text style={[styles.settingsNote, { color: colors.muted }]}>إعدادات التطبيق تبقى محلية دائماً{pendingRestore.mergePreview.preservedSettings ? ` • ${pendingRestore.mergePreview.preservedSettings} إعداد محفوظ` : ""}</Text></View> : <Text style={[styles.settingsNote, { color: colors.muted }]}>إعدادات التطبيق تبقى محلية دائماً ولا تُستبدل.</Text>}<View style={styles.restoreActions}><TouchableOpacity disabled={busy} onPress={() => setPendingRestore(null)} style={[styles.cancelButton, { borderColor: colors.border }]}><Text style={[styles.cancelButtonText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={() => void confirmRestore()} style={[styles.restoreConfirmButton, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}>{busy ? <ActivityIndicator color="#fff" /> : <><MaterialIcons name={restoreMode === "merge" ? "merge-type" : "restore"} size={18} color="#fff" /><Text style={styles.restoreConfirmText}>{restoreMode === "merge" ? "ابدأ الكتابة فوق" : "استعادة الآن"}</Text></>}</TouchableOpacity></View></View></View></Modal>
    <Modal visible={restoreHistoryVisible && Boolean(lastRestore)} transparent animationType="fade" onRequestClose={() => setRestoreHistoryVisible(false)}><View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setRestoreHistoryVisible(false)} /><View style={[restoreHistoryStyles.dialog, { backgroundColor: colors.surface }]}>{lastRestore ? <><View style={restoreHistoryStyles.dialogHeader}><TouchableOpacity onPress={() => setRestoreHistoryVisible(false)} style={[restoreHistoryStyles.close, { backgroundColor: colors.background }]}><MaterialIcons name="close" size={19} color={colors.foreground} /></TouchableOpacity><View style={restoreHistoryStyles.dialogHeaderCopy}><Text style={[restoreHistoryStyles.dialogTitle, { color: colors.foreground }]}>سجل آخر عملية استعادة</Text><Text style={[restoreHistoryStyles.dialogSubtitle, { color: colors.muted }]}>{new Date(lastRestore.restoredAt).toLocaleString("ar-SY")}</Text></View></View><View style={[restoreHistoryStyles.source, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[restoreHistoryStyles.sourceLabel, { color: colors.muted }]}>مصدر النسخة</Text><Text style={[restoreHistoryStyles.sourceValue, { color: colors.foreground }]} numberOfLines={1}>{lastRestore.sourceLabel}</Text><Text style={[restoreHistoryStyles.sourceMeta, { color: colors.muted }]}>{lastRestore.mode === "merge" ? "الكتابة فوق البيانات" : "استبدال البيانات"} • {lastRestore.backupKind === "partial" ? "نسخة جزئية" : "نسخة كاملة"}</Text></View><View style={restoreHistoryStyles.stats}>{lastRestore.mode === "merge" && lastRestore.merge ? <><View style={restoreHistoryStyles.stat}><Text style={[restoreHistoryStyles.statValue, { color: colors.success }]}>{lastRestore.merge.added}</Text><Text style={[restoreHistoryStyles.statLabel, { color: colors.muted }]}>أُضيف</Text></View><View style={restoreHistoryStyles.stat}><Text style={[restoreHistoryStyles.statValue, { color: colors.primary }]}>{lastRestore.merge.updated}</Text><Text style={[restoreHistoryStyles.statLabel, { color: colors.muted }]}>حُدّث</Text></View><View style={restoreHistoryStyles.stat}><Text style={[restoreHistoryStyles.statValue, { color: colors.foreground }]}>{lastRestore.merge.retained}</Text><Text style={[restoreHistoryStyles.statLabel, { color: colors.muted }]}>بقي محلياً</Text></View></> : <><View style={restoreHistoryStyles.stat}><Text style={[restoreHistoryStyles.statValue, { color: colors.primary }]}>{lastRestore.recordCount}</Text><Text style={[restoreHistoryStyles.statLabel, { color: colors.muted }]}>سجل استُبدل</Text></View><View style={restoreHistoryStyles.stat}><Text style={[restoreHistoryStyles.statValue, { color: colors.success }]}>{lastRestore.mediaCount}</Text><Text style={[restoreHistoryStyles.statLabel, { color: colors.muted }]}>وسائط استُعيدت</Text></View><View style={restoreHistoryStyles.stat}><Text style={[restoreHistoryStyles.statValue, { color: colors.foreground }]}>{lastRestore.dataGroupCount}</Text><Text style={[restoreHistoryStyles.statLabel, { color: colors.muted }]}>مجموعات بيانات</Text></View></>}</View><Text style={[restoreHistoryStyles.settingsNote, { color: colors.muted }]}>الإعدادات المحلية المحفوظة: {lastRestore.preservedSettings}</Text><Text style={[restoreHistoryStyles.groupsTitle, { color: colors.foreground }]}>تفاصيل الأقسام</Text><FlatList data={lastRestore.groups} keyExtractor={(item) => item.key} style={restoreHistoryStyles.groupList} contentContainerStyle={restoreHistoryStyles.groupListContent} renderItem={({ item }) => <View style={[restoreHistoryStyles.groupRow, { borderBottomColor: colors.border }]}><View style={restoreHistoryStyles.groupCopy}><Text style={[restoreHistoryStyles.groupTitle, { color: colors.foreground }]}>{item.label}</Text><Text style={[restoreHistoryStyles.groupMeta, { color: colors.muted }]}>{lastRestore.mode === "merge" ? `أُضيف ${item.added} • حُدّث ${item.updated} • بقي ${item.retained}` : `استُبدل ${item.updated} سجل`}</Text></View><MaterialIcons name={lastRestore.mode === "merge" ? "merge-type" : "sync"} size={18} color={lastRestore.mode === "merge" ? colors.success : colors.primary} /></View>} /><TouchableOpacity onPress={() => setRestoreHistoryVisible(false)} style={[restoreHistoryStyles.closeButton, { backgroundColor: colors.primary }]}><Text style={restoreHistoryStyles.closeButtonText}>إغلاق</Text></TouchableOpacity></> : null}</View></View></Modal>
    <SuccessModal visible={Boolean(success)} message={success} onClose={() => { const restored = success.startsWith("استُعيدت") || success.startsWith("استُبدلت") || success.startsWith("تمت الكتابة فوق"); setSuccess(""); if (restored) router.replace("/(tabs)" as any); }} />
  </ScreenContainer>;
}

const restoreHistoryStyles = StyleSheet.create({
  shortcut: { position: "absolute", left: 16, right: 16, bottom: 18, minHeight: 62, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", gap: 9 }, shortcutIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, shortcutCopy: { flex: 1, alignItems: "flex-end" }, shortcutTitle: { fontSize: 12, fontWeight: "800" as any, textAlign: "right" }, shortcutMeta: { fontSize: 9, marginTop: 3, textAlign: "right" }, dialog: { maxHeight: "84%", width: "100%", borderRadius: 22, padding: 18 }, dialogHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, close: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" }, dialogHeaderCopy: { flex: 1, alignItems: "flex-end" }, dialogTitle: { fontSize: 17, fontWeight: "800" as any, textAlign: "right" }, dialogSubtitle: { fontSize: 10, marginTop: 3, textAlign: "right" }, source: { marginTop: 14, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: "flex-end" }, sourceLabel: { fontSize: 9 }, sourceValue: { fontSize: 12, fontWeight: "800" as any, marginTop: 3, textAlign: "right" }, sourceMeta: { fontSize: 10, marginTop: 5, textAlign: "right" }, stats: { flexDirection: "row-reverse", marginTop: 13 }, stat: { flex: 1, alignItems: "center" }, statValue: { fontSize: 19, fontWeight: "900" as any }, statLabel: { fontSize: 9, marginTop: 3, textAlign: "center" }, settingsNote: { fontSize: 10, textAlign: "center", marginTop: 12 }, groupsTitle: { fontSize: 12, fontWeight: "800" as any, textAlign: "right", marginTop: 14 }, groupList: { maxHeight: 240, marginTop: 5 }, groupListContent: { paddingBottom: 4 }, groupRow: { minHeight: 53, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, flexDirection: "row-reverse", alignItems: "center", gap: 9 }, groupCopy: { flex: 1, alignItems: "flex-end" }, groupTitle: { fontSize: 12, fontWeight: "800" as any, textAlign: "right" }, groupMeta: { fontSize: 9, marginTop: 3, textAlign: "right" }, closeButton: { minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 12 }, closeButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" as any },
});

const styles = StyleSheet.create({
  header: { height: 76, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1 }, back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "flex-end" }, headerTitle: { fontSize: 18, fontWeight: "800" as any }, headerSubtitle: { fontSize: 11, marginTop: 2, textAlign: "right" }, headerAction: { padding: 6 }, headerActionText: { fontSize: 13, fontWeight: "700" as any }, selectionHeaderActions: { flexDirection: "row-reverse", alignItems: "center", gap: 3 }, selectionHeaderAction: { width: 46, height: 46, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 1 }, selectionHeaderActionText: { fontSize: 8, fontWeight: "700" as any }, content: { padding: 16, paddingBottom: 106 }, summary: { minHeight: 102, borderRadius: 20, padding: 18, flexDirection: "row-reverse", alignItems: "center", gap: 14, borderWidth: 1 }, summaryCopy: { flex: 1, alignItems: "flex-end" }, summaryValue: { color: "#fff", fontSize: 25, fontWeight: "900" as any }, summaryLabel: { color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 4, textAlign: "right" }, actions: { marginTop: 12, gap: 9 }, primaryAction: { minHeight: 50, borderRadius: 15, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 }, primaryActionText: { color: "#fff", fontSize: 14, fontWeight: "800" as any }, secondaryActions: { flexDirection: "row-reverse", gap: 9 }, secondaryAction: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6 }, secondaryActionText: { fontSize: 12, fontWeight: "700" as any }, hint: { fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 12, marginBottom: 14 }, backupRow: { minHeight: 88, borderRadius: 17, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, fileIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center" }, backupCopy: { flex: 1, alignItems: "flex-end" }, backupTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right" }, backupName: { fontSize: 10, marginTop: 3, textAlign: "right" }, backupMeta: { fontSize: 10, marginTop: 4, textAlign: "right" }, check: { width: 23, height: 23, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" }, gap: { height: 9 }, empty: { minHeight: 210, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }, emptyText: { fontSize: 12, textAlign: "center", lineHeight: 19 }, loading: { minHeight: 220, alignItems: "center", justifyContent: "center" }, selectionBar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row-reverse", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1 }, selectionButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, selectionButtonText: { fontSize: 13, fontWeight: "700" as any }, deleteButton: { flex: 1.25, minHeight: 48, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7 }, deleteButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" as any }, modalBackdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 16 }, sectionDialog: { maxHeight: "86%", borderRadius: 22, overflow: "hidden" }, dialogHeader: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }, dialogHeaderCopy: { flex: 1, alignItems: "flex-end" }, dialogTitle: { fontSize: 17, fontWeight: "800" as any }, dialogSubtitle: { fontSize: 11, marginTop: 3 }, sectionList: { maxHeight: 410 }, sectionChoice: { minHeight: 70, paddingHorizontal: 16, flexDirection: "row-reverse", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth }, choiceCheck: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" }, choiceCopy: { flex: 1, alignItems: "flex-end" }, choiceTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right" }, choiceDescription: { fontSize: 10, marginTop: 3, textAlign: "right" }, createPartialButton: { minHeight: 52, margin: 14, borderRadius: 15, alignItems: "center", justifyContent: "center" }, createPartialText: { color: "#fff", fontSize: 14, fontWeight: "800" as any }, passwordDialog: { borderRadius: 22, padding: 20, alignItems: "center" }, passwordIcon: { width: 54, height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center" }, passwordTitle: { fontSize: 18, fontWeight: "800" as any, marginTop: 12 }, passwordMessage: { fontSize: 12, textAlign: "center", lineHeight: 19, marginTop: 8 }, passwordInput: { width: "100%", height: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, marginTop: 16 }, passwordError: { minHeight: 18, alignSelf: "flex-end", fontSize: 11, marginTop: 4 }, passwordActions: { flexDirection: "row-reverse", gap: 9, width: "100%", marginTop: 8 }, cancelButton: { flex: 1, height: 47, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" }, cancelButtonText: { fontSize: 13, fontWeight: "700" as any }, confirmDeleteButton: { flex: 1.2, height: 47, borderRadius: 13, alignItems: "center", justifyContent: "center" }, confirmDeleteText: { color: "#fff", fontSize: 13, fontWeight: "800" as any }, restoreDialog: { borderRadius: 22, padding: 20, alignItems: "center" }, restoreIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" }, restoreTitle: { fontSize: 18, fontWeight: "800" as any, marginTop: 11 }, restoreMeta: { fontSize: 10, marginTop: 4, textAlign: "center" }, restoreModes: { width: "100%", gap: 8, marginTop: 16 }, restoreMode: { minHeight: 76, width: "100%", paddingHorizontal: 11, borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", gap: 9 }, restoreModeIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" }, restoreModeCopy: { flex: 1, alignItems: "flex-end" }, restoreModeTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right" }, restoreModeText: { fontSize: 10, lineHeight: 15, marginTop: 2, textAlign: "right" }, radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center" }, radioDot: { width: 9, height: 9, borderRadius: 5 }, restoreDescription: { fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 12 }, mergePreview: { width: "100%", marginTop: 12, borderRadius: 15, borderWidth: 1, padding: 12 }, mergePreviewTitle: { fontSize: 12, fontWeight: "800" as any, textAlign: "right" }, mergeStats: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 9 }, mergeStat: { flex: 1, alignItems: "center" }, mergeStatValue: { fontSize: 18, fontWeight: "900" as any }, mergeStatLabel: { fontSize: 9, marginTop: 2 }, settingsNote: { fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 10 }, restoreActions: { flexDirection: "row-reverse", gap: 9, width: "100%", marginTop: 14 }, restoreConfirmButton: { flex: 1.3, height: 47, borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 6 }, restoreConfirmText: { color: "#fff", fontSize: 12, fontWeight: "800" as any },
});
