import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { BACKUP_KEY_LABELS, LOCAL_SETTINGS_KEYS, mergeBackupData, type BackupMergePreview } from "./backup-merge";
import { createLastRestoreHistory, saveLastRestoreHistory } from "./backup-restore-history";
import { BACKUP_DATA_KEYS } from "./full-backup";
import type { BackupMediaFile, BackupSectionId, FullBackupPayload } from "./full-backup";

export interface BackupPreviewGroup {
  key: string;
  label: string;
  records: number;
}

export interface BackupPreview {
  createdAt: string;
  dataGroupCount: number;
  recordCount: number;
  mediaCount: number;
  skippedMediaCount: number;
  isPartial: boolean;
  sections: BackupSectionId[];
  groups: BackupPreviewGroup[];
}

export type RestoreMode = "replace" | "merge";

export interface RestoreResult {
  dataGroupCount: number;
  mediaCount: number;
  mode: RestoreMode;
  mergePreview?: BackupMergePreview;
}

const ALLOWED_KEYS = new Set(BACKUP_DATA_KEYS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.startsWith("/") || value.includes("\\") || value.includes(":")) return false;
  return value.split("/").every((part) => part && part !== "." && part !== "..");
}

function validateMedia(value: unknown): value is BackupMediaFile {
  if (!isRecord(value) || !isSafeRelativePath(value.relativePath) || typeof value.base64 !== "string" || !value.base64) return false;
  return typeof value.size === "number" && value.size >= 0;
}

/** يتحقق من أن الملف نسخة صادرة عن التطبيق، لا JSON عشوائي أو مسار يخرج من مساحة التطبيق. */
export function parseFullBackup(raw: string): FullBackupPayload {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("ملف النسخة الاحتياطية ليس JSON صالحاً"); }
  if (!isRecord(parsed) || parsed.type !== "madar-full-backup" || parsed.schemaVersion !== 1 || typeof parsed.createdAt !== "string" || !isRecord(parsed.data) || !Array.isArray(parsed.media) || !Array.isArray(parsed.skippedMediaPaths)) {
    throw new Error("هذا الملف لا يحمل بنية نسخة احتياطية متوافقة مع مدير تسويق مدار");
  }
  const data: Record<string, string> = {};
  Object.entries(parsed.data).forEach(([key, value]) => {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`تحتوي النسخة على مفتاح غير مدعوم: ${key}`);
    if (typeof value !== "string") throw new Error(`قيمة البيانات غير صالحة في: ${key}`);
    data[key] = value;
  });
  const media = parsed.media.filter(validateMedia);
  if (media.length !== parsed.media.length) throw new Error("تحتوي النسخة على وسائط غير صالحة أو مسارات غير آمنة");
  const backupKind = parsed.backupKind === "partial" ? "partial" : "full";
  const sections = Array.isArray(parsed.sections) ? parsed.sections.filter((section): section is BackupSectionId => typeof section === "string") : [];
  return { schemaVersion: 1, type: "madar-full-backup", backupKind, ...(backupKind === "partial" ? { sections } : {}), createdAt: parsed.createdAt, data, media, skippedMediaPaths: parsed.skippedMediaPaths.filter((path): path is string => typeof path === "string") };
}

function recordsCount(raw: string): number {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 1;
  } catch { return 1; }
}

export function createBackupPreview(payload: FullBackupPayload): BackupPreview {
  const groups = Object.entries(payload.data).map(([key, value]) => ({ key, label: BACKUP_KEY_LABELS[key] || key, records: recordsCount(value) }));
  return {
    createdAt: payload.createdAt,
    dataGroupCount: groups.length,
    recordCount: groups.reduce((sum, group) => sum + group.records, 0),
    mediaCount: payload.media.length,
    skippedMediaCount: payload.skippedMediaPaths.length,
    isPartial: payload.backupKind === "partial",
    sections: payload.sections || [],
    groups,
  };
}

export async function readBackupFromUri(uri: string): Promise<FullBackupPayload> {
  const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  return parseFullBackup(content);
}

async function writeMediaToDirectory(media: BackupMediaFile[], directory: string): Promise<void> {
  for (const file of media) {
    const uri = `${directory}${file.relativePath}`;
    const parent = uri.slice(0, uri.lastIndexOf("/") + 1);
    const parentInfo = await FileSystem.getInfoAsync(parent);
    if (!parentInfo.exists) await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
    await FileSystem.writeAsStringAsync(uri, file.base64, { encoding: FileSystem.EncodingType.Base64 });
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory || !info.size) throw new Error(`تعذر استعادة ملف الوسائط: ${file.relativePath}`);
  }
}

async function restoreDataWithRollback(payload: FullBackupPayload): Promise<void> {
  const current = await AsyncStorage.multiGet(BACKUP_DATA_KEYS);
  const currentMap = new Map(current);
  const incomingKeys = Object.keys(payload.data).filter((key) => !LOCAL_SETTINGS_KEYS.has(key));
  try {
    if (incomingKeys.length) await AsyncStorage.multiSet(incomingKeys.map((key) => [key, payload.data[key]]));
    if (payload.backupKind !== "partial") {
      const absentKeys = BACKUP_DATA_KEYS.filter((key) => !LOCAL_SETTINGS_KEYS.has(key) && !Object.prototype.hasOwnProperty.call(payload.data, key));
      if (absentKeys.length) await AsyncStorage.multiRemove(absentKeys);
    }
  } catch (error) {
    const originalPairs = current.filter((entry): entry is [string, string] => entry[1] !== null) as [string, string][];
    const originallyEmpty = BACKUP_DATA_KEYS.filter((key) => !currentMap.get(key));
    if (originalPairs.length) await AsyncStorage.multiSet(originalPairs);
    if (originallyEmpty.length) await AsyncStorage.multiRemove(originallyEmpty);
    throw error;
  }
}

async function mergeDataWithRollback(payload: FullBackupPayload): Promise<BackupMergePreview> {
  const current = await AsyncStorage.multiGet(BACKUP_DATA_KEYS);
  const merged = mergeBackupData(Object.fromEntries(current), payload.data);
  const keys = Object.keys(merged.data);
  const previous = current.filter(([key]) => Object.prototype.hasOwnProperty.call(merged.data, key));
  const previousMap = new Map(previous);
  try {
    if (keys.length) await AsyncStorage.multiSet(keys.map((key) => [key, merged.data[key]]));
    return merged.preview;
  } catch (error) {
    const originalPairs = previous.filter((entry): entry is [string, string] => entry[1] !== null) as [string, string][];
    const originallyEmpty = keys.filter((key) => !previousMap.get(key));
    if (originalPairs.length) await AsyncStorage.multiSet(originalPairs);
    if (originallyEmpty.length) await AsyncStorage.multiRemove(originallyEmpty);
    throw error;
  }
}

/** يعرض أثر نمط الكتابة فوق قبل تأكيد الاستعادة، من دون تعديل أي بيانات. */
export async function createMergePreview(payload: FullBackupPayload): Promise<BackupMergePreview> {
  const current = await AsyncStorage.multiGet(BACKUP_DATA_KEYS);
  return mergeBackupData(Object.fromEntries(current), payload.data).preview;
}

/** يستعيد البيانات والوسائط فقط بعد أن يمر الملف بمرحلة المعاينة والتحقق. */
export async function restoreFullBackup(payload: FullBackupPayload, mode: RestoreMode = "replace", sourceLabel = "نسخة احتياطية"): Promise<RestoreResult> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) throw new Error("تعذر الوصول إلى مساحة المستندات المحلية");
  const staging = `${FileSystem.cacheDirectory || documentDirectory}madar-restore-${Date.now()}/`;
  try {
    await FileSystem.makeDirectoryAsync(staging, { intermediates: true });
    await writeMediaToDirectory(payload.media, staging);
    for (const media of payload.media) {
      const source = `${staging}${media.relativePath}`;
      const target = `${documentDirectory}${media.relativePath}`;
      const parent = target.slice(0, target.lastIndexOf("/") + 1);
      const parentInfo = await FileSystem.getInfoAsync(parent);
      if (!parentInfo.exists) await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
      await FileSystem.copyAsync({ from: source, to: target });
    }
    const mergePreview = mode === "merge" ? await mergeDataWithRollback(payload) : undefined;
    if (mode === "replace") await restoreDataWithRollback(payload);
    const preview = createBackupPreview(payload);
    const history = createLastRestoreHistory(payload, preview, mode, sourceLabel, mergePreview);
    await saveLastRestoreHistory(history);
    return { dataGroupCount: Object.keys(payload.data).filter((key) => !LOCAL_SETTINGS_KEYS.has(key)).length, mediaCount: payload.media.length, mode, mergePreview };
  } finally {
    const info = await FileSystem.getInfoAsync(staging);
    if (info.exists) await FileSystem.deleteAsync(staging, { idempotent: true });
  }
}
