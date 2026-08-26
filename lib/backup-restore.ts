import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { BACKUP_KEY_LABELS, LOCAL_SETTINGS_KEYS, mergeBackupData, type BackupMergePreview } from "./backup-merge";
import { createLastRestoreHistory, saveLastRestoreHistory } from "./backup-restore-history";
import { BACKUP_DATA_KEYS } from "./full-backup";
import type { BackupMediaFile, BackupSectionId, FullBackupPayload } from "./full-backup";
import { restoreMarketingManagerFile, restoreMarketingManagerFileFromUri } from "./marketing-manager-storage";
import { describeBackupRestoreSpaceError, estimateBackupRestoreSpace, hasEnoughBackupRestoreSpace } from "./backup-storage-capacity";
import { LegacyBackupStreamParser, type LegacyBackupHeader, type LegacyBackupMediaMeta } from "./legacy-backup-stream";
import { beginOperationProgress } from "./operation-progress";
import { logAudit } from "./audit-log";

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
const STREAMING_BACKUP_THRESHOLD_BYTES = 6 * 1024 * 1024;
const STREAM_READ_CHUNK_BYTES = 192 * 1024;
const streamingBackupSources = new WeakMap<FullBackupPayload, { uri: string; temporaryUri?: string }>();

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
    throw new Error("هذا الملف لا يحمل بنية نسخة احتياطية متوافقة مع مساعد التسويق الميداني");
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
  const info = await FileSystem.getInfoAsync(uri).catch(() => null);
  if (info?.exists && !info.isDirectory && typeof info.size === "number" && info.size > STREAMING_BACKUP_THRESHOLD_BYTES) return readLargeBackupHeader(uri);
  const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  return parseFullBackup(content);
}

function byteArrayFromBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function localStreamingSource(uri: string): Promise<{ uri: string; temporaryUri?: string }> {
  if (!uri.startsWith("content://") || !FileSystem.cacheDirectory) return { uri };
  const temporaryUri = `${FileSystem.cacheDirectory}madar-large-backup-${Date.now()}.json`;
  await FileSystem.copyAsync({ from: uri, to: temporaryUri });
  return { uri: temporaryUri, temporaryUri };
}

function payloadFromLegacyHeader(header: LegacyBackupHeader, media: LegacyBackupMediaMeta[]): FullBackupPayload {
  if (header.type !== "madar-full-backup" || header.schemaVersion !== 1 || !header.createdAt || !header.data || typeof header.data !== "object") throw new Error("هذا الملف لا يحمل بنية نسخة احتياطية متوافقة مع مساعد التسويق الميداني.");
  Object.keys(header.data).forEach((key) => { if (!ALLOWED_KEYS.has(key)) throw new Error(`تحتوي النسخة على مفتاح غير مدعوم: ${key}`); });
  media.forEach((item) => { if (!isSafeRelativePath(item.relativePath)) throw new Error("تحتوي النسخة على مسار وسيط غير آمن."); });
  return { schemaVersion: 1, type: "madar-full-backup", backupKind: header.backupKind === "partial" ? "partial" : "full", ...(header.backupKind === "partial" ? { sections: (header.sections || []).filter((section): section is BackupSectionId => typeof section === "string") } : {}), createdAt: header.createdAt, data: header.data, media: media.map((item) => ({ ...item, base64: "" })), skippedMediaPaths: [] };
}

export async function readLargeBackupHeader(sourceUri: string): Promise<FullBackupPayload> {
  const source = await localStreamingSource(sourceUri);
  const parser = new LegacyBackupStreamParser();
  const decoder = new TextDecoder();
  let header: LegacyBackupHeader | null = null;
  const media: LegacyBackupMediaMeta[] = [];
  let position = 0;
  try {
    const info = await FileSystem.getInfoAsync(source.uri);
    if (!info.exists || info.isDirectory || !info.size) throw new Error("تعذر قراءة ملف النسخة الاحتياطية.");
    while (position < info.size) {
      const length = Math.min(STREAM_READ_CHUNK_BYTES, info.size - position);
      const encoded = await FileSystem.readAsStringAsync(source.uri, { encoding: FileSystem.EncodingType.Base64, position, length });
      position += length;
      const text = decoder.decode(byteArrayFromBase64(encoded), { stream: position < info.size });
      for (const event of parser.feed(text, position >= info.size)) {
        if (event.type === "header") header = event.header;
        // في النسخ القديمة يأتي sourceUri وحجم الملف بعد سلسلة Base64؛ لذلك لا تصلح بيانات بداية الوسيط لإعادة الربط.
        if (event.type === "media-end") media.push(event.media);
      }
    }
    if (!header) throw new Error("تعذر قراءة رأس النسخة الاحتياطية.");
    const payload = payloadFromLegacyHeader(header, media);
    streamingBackupSources.set(payload, source);
    return payload;
  } catch (error) {
    if (source.temporaryUri) await FileSystem.deleteAsync(source.temporaryUri, { idempotent: true }).catch(() => undefined);
    throw error;
  }
}

/** تُكتب وسائط التطبيق مباشرة في موضعها النهائي؛ أما ملفات المجلد الخارجي فتحتاج محطة محلية قصيرة قبل نقل SAF الأصلي. */
export function streamingRestoreTargetUri(documentDirectory: string, relativePath: string): string {
  return relativePath.startsWith("marketing-manager/")
    ? `${documentDirectory}madar-restore-stream/${relativePath}`
    : `${documentDirectory}${relativePath}`;
}

async function streamLegacyBackupMedia(payload: FullBackupPayload, documentDirectory: string, onMediaRestored?: (completed: number) => void): Promise<Map<string, string>> {
  const source = streamingBackupSources.get(payload);
  if (!source) return new Map<string, string>();
  const parser = new LegacyBackupStreamParser();
  const decoder = new TextDecoder();
  const uriMap = new Map<string, string>();
  let current: { media: LegacyBackupMediaMeta; temporaryUri: string; handle: { writeBytes: (bytes: Uint8Array) => void; close: () => void }; pending: string } | null = null;
  let position = 0;
  let restoredCount = 0;
  try {
    const info = await FileSystem.getInfoAsync(source.uri);
    if (!info.exists || info.isDirectory || !info.size) throw new Error("تعذر الوصول إلى ملف النسخة الكبيرة.");
    while (position < info.size) {
      const length = Math.min(STREAM_READ_CHUNK_BYTES, info.size - position);
      const encoded = await FileSystem.readAsStringAsync(source.uri, { encoding: FileSystem.EncodingType.Base64, position, length });
      position += length;
      const text = decoder.decode(byteArrayFromBase64(encoded), { stream: position < info.size });
      for (const event of parser.feed(text, position >= info.size)) {
        if (event.type === "media-start") {
          const temporaryUri = streamingRestoreTargetUri(documentDirectory, event.media.relativePath);
          const parent = temporaryUri.slice(0, temporaryUri.lastIndexOf("/") + 1);
          await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
          const fileSystemNext = await import("expo-file-system/next");
          const file = new fileSystemNext.File(temporaryUri);
          file.create({ intermediates: true, overwrite: true });
          current = { media: event.media, temporaryUri, handle: file.open(), pending: "" };
        }
        if (event.type === "media-base64" && current) {
          const combined = current.pending + event.value;
          const fullLength = combined.length - (combined.length % 4);
          if (fullLength) current.handle.writeBytes(byteArrayFromBase64(combined.slice(0, fullLength)));
          current.pending = combined.slice(fullLength);
        }
        if (event.type === "media-end" && current) {
          if (current.pending) current.handle.writeBytes(byteArrayFromBase64(current.pending));
          current.handle.close();
          // بيانات نهاية الوسيط تحمل sourceUri في النسخ القديمة، لأنه يقع بعد base64 داخل JSON.
          const saved = { ...current, media: event.media };
          current = null;
          const localInfo = await FileSystem.getInfoAsync(saved.temporaryUri);
          if (!localInfo.exists || localInfo.isDirectory || !localInfo.size) throw new Error(`تعذر استعادة ملف الوسائط: ${saved.media.relativePath}`);
          if (saved.media.relativePath.startsWith("marketing-manager/")) {
            const target = await restoreMarketingManagerFileFromUri(saved.media.relativePath.replace(/^marketing-manager\//, ""), saved.temporaryUri);
            if (saved.media.sourceUri) uriMap.set(saved.media.sourceUri, target);
            await FileSystem.deleteAsync(saved.temporaryUri, { idempotent: true }).catch(() => undefined);
          } else if (saved.media.sourceUri) uriMap.set(saved.media.sourceUri, saved.temporaryUri);
          restoredCount += 1;
          onMediaRestored?.(restoredCount);
        }
      }
    }
    return uriMap;
  } finally {
    if (current) current.handle.close();
    if (source.temporaryUri) await FileSystem.deleteAsync(source.temporaryUri, { idempotent: true }).catch(() => undefined);
    streamingBackupSources.delete(payload);
  }
}

/** يزيل فقط مجلدات المرحلية التي أنشأتها إصدارات أقدم من الاستعادة عند انقطاع محاولة سابقة. */
async function clearStaleRestoreStagingDirectories(): Promise<void> {
  const roots = [FileSystem.cacheDirectory, FileSystem.documentDirectory].filter((root): root is string => Boolean(root));
  await Promise.all(roots.map(async (root) => {
    const names = await FileSystem.readDirectoryAsync(root).catch(() => [] as string[]);
    await Promise.all(names
      .filter((name) => name.startsWith("madar-restore-"))
      .map((name) => FileSystem.deleteAsync(`${root}${name}`, { idempotent: true }).catch(() => undefined)));
  }));
}

async function writeLocalMediaDirectly(media: BackupMediaFile[], documentDirectory: string, onMediaRestored?: (completed: number) => void): Promise<Map<string, string>> {
  const restored = new Map<string, string>();
  for (const [index, file] of media.entries()) {
    const uri = `${documentDirectory}${file.relativePath}`;
    const parent = uri.slice(0, uri.lastIndexOf("/") + 1);
    const parentInfo = await FileSystem.getInfoAsync(parent);
    if (!parentInfo.exists) await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
    await FileSystem.writeAsStringAsync(uri, file.base64, { encoding: FileSystem.EncodingType.Base64 });
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory || !info.size) throw new Error(`تعذر استعادة ملف الوسائط: ${file.relativePath}`);
    if (file.sourceUri) restored.set(file.sourceUri, uri);
    onMediaRestored?.(index + 1);
  }
  return restored;
}

function rebaseValue(value: unknown, uriMap: Map<string, string>): unknown {
  if (typeof value === "string") return uriMap.get(value) || value;
  if (Array.isArray(value)) return value.map((item) => rebaseValue(item, uriMap));
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rebaseValue(item, uriMap)]));
  return value;
}

export function rebasePayloadMediaReferences(payload: FullBackupPayload, uriMap: Map<string, string>): FullBackupPayload {
  if (!uriMap.size) return payload;
  const data = Object.fromEntries(Object.entries(payload.data).map(([key, raw]) => {
    try { return [key, JSON.stringify(rebaseValue(JSON.parse(raw), uriMap))]; }
    catch { return [key, raw]; }
  }));
  return { ...payload, data };
}

export async function restoreDataWithRollback(payload: FullBackupPayload): Promise<void> {
  const current = await AsyncStorage.multiGet(BACKUP_DATA_KEYS);
  const currentMap = new Map(current);
  const incomingKeys = Object.keys(payload.data).filter((key) => !LOCAL_SETTINGS_KEYS.has(key));
  try {
    if (incomingKeys.length) await AsyncStorage.multiSet(incomingKeys.map((key) => [key, payload.data[key]]));
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
  const progress = beginOperationProgress({ kind: "restore", title: "استعادة النسخة الاحتياطية", steps: ["فحص النسخة ومساحة التخزين", "تحضير موقع الملفات", "استعادة الوسائط", "تحديث البيانات والمراجع", "تسجيل نتيجة الاستعادة"] });
  try {
    progress.update({ stepIndex: 0, message: "جارٍ فحص محتوى النسخة والمساحة المتاحة" });
    await clearStaleRestoreStagingDirectories();
    const availableBytes = await FileSystem.getFreeDiskStorageAsync().catch(() => null);
    if (!hasEnoughBackupRestoreSpace(payload, availableBytes)) {
      throw new Error(describeBackupRestoreSpaceError(estimateBackupRestoreSpace(payload).requiredBytes, availableBytes!));
    }
    progress.update({ stepIndex: 1, message: "جارٍ تحضير وجهات الملفات الآمنة" });
    const reportMedia = (completed: number) => progress.update({ stepIndex: 2, message: `جارٍ استعادة ملف الوسائط ${completed} من ${payload.media.length}`, completedItems: completed, totalItems: payload.media.length });
    progress.update({ stepIndex: 2, message: payload.media.length ? "جارٍ استعادة الوسائط" : "لا توجد وسائط ضمن النسخة", completedItems: 0, totalItems: payload.media.length });
    const uriMap = streamingBackupSources.has(payload)
      ? await streamLegacyBackupMedia(payload, documentDirectory, reportMedia)
      : await (async () => {
        const marketingManagerMedia = payload.media.filter((media) => media.relativePath.startsWith("marketing-manager/"));
        const localMedia = payload.media.filter((media) => !media.relativePath.startsWith("marketing-manager/"));
        const restored = await writeLocalMediaDirectly(localMedia, documentDirectory, reportMedia);
        let restoredCount = localMedia.length;
        for (const media of marketingManagerMedia) {
          const target = await restoreMarketingManagerFile(media.relativePath.replace(/^marketing-manager\//, ""), media.base64);
          if (media.sourceUri) restored.set(media.sourceUri, target);
          restoredCount += 1;
          reportMedia(restoredCount);
        }
        return restored;
      })();
    progress.update({ stepIndex: 3, message: mode === "merge" ? "جارٍ دمج البيانات وإعادة ربط الوسائط" : "جارٍ تحديث البيانات وإعادة ربط الوسائط" });
    const restoredPayload = rebasePayloadMediaReferences(payload, uriMap);
    const mergePreview = mode === "merge" ? await mergeDataWithRollback(restoredPayload) : undefined;
    if (mode === "replace") await restoreDataWithRollback(restoredPayload);
    progress.update({ stepIndex: 4, message: "جارٍ حفظ سجل الاستعادة" });
    const preview = createBackupPreview(payload);
    const history = createLastRestoreHistory(payload, preview, mode, sourceLabel, mergePreview);
    await saveLastRestoreHistory(history);
    await logAudit("RESTORE", "النسخ الاحتياطية", `تمت ${mode === "merge" ? "مزامنة" : "استعادة"} ${Object.keys(payload.data).filter((key) => !LOCAL_SETTINGS_KEYS.has(key)).length} مجموعة بيانات و${payload.media.length} وسائط`);
    return { dataGroupCount: Object.keys(payload.data).filter((key) => !LOCAL_SETTINGS_KEYS.has(key)).length, mediaCount: payload.media.length, mode, mergePreview };
  } finally {
    progress.complete();
  }
}
