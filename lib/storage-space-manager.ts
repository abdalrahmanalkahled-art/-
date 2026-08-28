import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { BACKUP_DATA_KEYS, collectManagedMediaUris } from "./full-backup";
import { buildStorageOverview, type StorageBucketId, type StorageOverview } from "./storage-space-model";

type LocalFile = { uri: string; size: number };
export interface StorageCleanupResult { removedBytes: number; removedFiles: number; }

const CLEANABLE_PREFIXES = [
  "reports/",
  "survey-store-photos/",
  "competitor-observations/",
  "event_documentation/",
  "analytics/",
  "external-analytics-packages/",
  "market-visit-reports/generated/",
  "market-visit-reports/templates/",
];

function bucketFor(uri: string, base: string): StorageBucketId {
  const relative = uri.slice(base.length);
  if (relative.startsWith("reports/") || relative.startsWith("market-visit-reports/generated/")) return "reports";
  if (relative.startsWith("survey-store-photos/")) return "storePhotos";
  if (relative.startsWith("competitor-observations/")) return "competitorPhotos";
  if (relative.startsWith("signage-media/")) return "signageMedia";
  if (relative.startsWith("event_documentation/")) return "eventMedia";
  if (relative.startsWith("market-visit-reports/templates/")) return "templates";
  if (relative.startsWith("backups/")) return "backups";
  if (relative.startsWith("survey-template-exports/")) return "exports";
  if (relative.startsWith("analytics/")) return "analytics";
  if (relative.startsWith("external-analytics-packages/")) return "externalAnalytics";
  return "other";
}

async function listFiles(directory: string): Promise<LocalFile[]> {
  const rootInfo = await FileSystem.getInfoAsync(directory).catch(() => null);
  if (!rootInfo?.exists) return [];
  const names = await FileSystem.readDirectoryAsync(directory).catch(() => [] as string[]);
  const nested = await Promise.all(names.map(async (name) => {
    const uri = `${directory}${name}`;
    const info = await FileSystem.getInfoAsync(uri).catch(() => null);
    if (!info?.exists) return [] as LocalFile[];
    if (info.isDirectory) return listFiles(`${uri}/`);
    return [{ uri, size: typeof info.size === "number" ? info.size : 0 }];
  }));
  return nested.flat();
}

async function deleteFiles(files: LocalFile[]): Promise<StorageCleanupResult> {
  await Promise.all(files.map(async (file) => {
    try { await FileSystem.deleteAsync(file.uri, { idempotent: true }); } catch { /* يستمر تنظيف بقية الملفات. */ }
  }));
  return { removedBytes: files.reduce((total, file) => total + file.size, 0), removedFiles: files.length };
}

async function managedReferences(base: string): Promise<Set<string>> {
  const values = await AsyncStorage.multiGet(BACKUP_DATA_KEYS);
  const data = Object.fromEntries(values.filter(([, value]) => value !== null) as [string, string][]);
  return new Set(collectManagedMediaUris(data, base));
}

export async function getStorageOverview(): Promise<StorageOverview> {
  const base = FileSystem.documentDirectory;
  const cache = FileSystem.cacheDirectory;
  if (!base) return buildStorageOverview({});
  const [documentFiles, temporaryFiles, freeBytes] = await Promise.all([
    listFiles(base),
    cache ? listFiles(cache) : Promise.resolve([] as LocalFile[]),
    FileSystem.getFreeDiskStorageAsync().catch(() => null),
  ]);
  const values: Partial<Record<StorageBucketId, { bytes: number; fileCount: number }>> = {};
  documentFiles.forEach((file) => {
    const bucket = bucketFor(file.uri, base);
    const current = values[bucket] || { bytes: 0, fileCount: 0 };
    values[bucket] = { bytes: current.bytes + file.size, fileCount: current.fileCount + 1 };
  });
  values.temporary = { bytes: temporaryFiles.reduce((total, file) => total + file.size, 0), fileCount: temporaryFiles.length };
  return buildStorageOverview(values, freeBytes);
}

/** يحذف فقط محتوى cacheDirectory، وهي ملفات قابلة لإعادة الإنشاء ولا تتضمن بيانات أعمال محفوظة. */
export async function cleanTemporaryStorage(): Promise<StorageCleanupResult> {
  const cache = FileSystem.cacheDirectory;
  return cache ? deleteFiles(await listFiles(cache)) : { removedBytes: 0, removedFiles: 0 };
}

/** ينظف تلقائياً ملفات cache التي لم تُستخدم خلال يوم كامل فقط. */
export async function cleanExpiredTemporaryFiles(maxAgeMs = 24 * 60 * 60 * 1000, now = Date.now()): Promise<StorageCleanupResult> {
  const cache = FileSystem.cacheDirectory;
  if (!cache) return { removedBytes: 0, removedFiles: 0 };
  const files = await listFiles(cache);
  const stale = await Promise.all(files.map(async (file) => {
    const info = await FileSystem.getInfoAsync(file.uri).catch(() => null);
    const modificationTime = (info as { modificationTime?: number } | null)?.modificationTime;
    const modifiedAt = modificationTime ? modificationTime * 1000 : null;
    return modifiedAt !== null && now - modifiedAt >= maxAgeMs ? file : null;
  }));
  return deleteFiles(stale.filter((file): file is LocalFile => file !== null));
}

/** ينظف ملفات التطبيق التي لم تعد تشير إليها أي بيانات محفوظة، مع إبقاء النسخ الاحتياطية والتصديرات اليدوية. */
export async function cleanUnusedManagedFiles(): Promise<StorageCleanupResult> {
  const base = FileSystem.documentDirectory;
  if (!base) return { removedBytes: 0, removedFiles: 0 };
  const [files, references] = await Promise.all([listFiles(base), managedReferences(base)]);
  const unused = files.filter((file) => {
    const relative = file.uri.slice(base.length);
    return CLEANABLE_PREFIXES.some((prefix) => relative.startsWith(prefix)) && !references.has(file.uri);
  });
  return deleteFiles(unused);
}
