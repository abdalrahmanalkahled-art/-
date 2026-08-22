import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { ANALYTICS_SETTINGS_KEY } from "./analytics-settings";
import { ensureDirectoryExists } from "./export-sanitizer";
import { STORAGE_KEYS } from "./storage";
import { USERS_STORAGE_KEY } from "./user-permissions-model";
import { getMarketingManagerFiles } from "./marketing-manager-storage";

const BACKUPS_DIRECTORY = "backups/";
const BACKUP_SCHEMA_VERSION = 1;
const GENERATED_FILE_DIRECTORIES = [
  BACKUPS_DIRECTORY,
  "reports/",
  "external-analytics-packages/",
  "market-visit-reports/generated/",
  "survey-template-exports/",
  "survey-results-exports/",
] as const;

const ADDITIONAL_DATA_KEYS = [
  "surveys",
  "brands",
  "store_regions",
  ANALYTICS_SETTINGS_KEY,
  "@madar_reports_history_v1",
  "@madar_audit_logs_v1",
  "@madar_theme_preference_v1",
  USERS_STORAGE_KEY,
] as const;

/** قائمة واضحة تمنع تصدير جلسة المستخدم وبيانات الدخول ضمن ملف قابل للمشاركة. */
export const BACKUP_DATA_KEYS = [...Object.values(STORAGE_KEYS), ...ADDITIONAL_DATA_KEYS];

export type BackupSectionId = "stores" | "surveys" | "events" | "warehouse" | "expenses" | "plans" | "signage" | "products" | "brandsRegions" | "reports" | "users";

export const BACKUP_SECTION_OPTIONS: Array<{ id: BackupSectionId; title: string; description: string; keys: string[] }> = [
  { id: "stores", title: "المحلات والمناطق", description: "المحلات والزيارات والتصنيفات والمناطق", keys: [STORAGE_KEYS.STORES, STORAGE_KEYS.STORE_VISITS, STORAGE_KEYS.STORE_CATEGORIES, STORAGE_KEYS.REGIONS] },
  { id: "surveys", title: "الاستبيانات", description: "القوالب والدورات والنتائج وصور المحلات", keys: [STORAGE_KEYS.SURVEYS, STORAGE_KEYS.SURVEY_TEMPLATES, STORAGE_KEYS.SURVEY_CYCLES, STORAGE_KEYS.SURVEY_RESULTS] },
  { id: "events", title: "الفعاليات", description: "الفعاليات وتوثيقها المحفوظ", keys: [STORAGE_KEYS.EVENTS] },
  { id: "warehouse", title: "المستودع", description: "المواد والحركات والأدوات والتصنيفات", keys: [STORAGE_KEYS.WAREHOUSE_ITEMS, STORAGE_KEYS.WAREHOUSE_MOVEMENTS, STORAGE_KEYS.WAREHOUSE_CATEGORIES, STORAGE_KEYS.WAREHOUSE_TOOLS] },
  { id: "expenses", title: "الصرفيات", description: "الصرفيات والتصنيفات والميزانيات", keys: [STORAGE_KEYS.EXPENSES, STORAGE_KEYS.EXPENSE_CATEGORIES, STORAGE_KEYS.BUDGETS] },
  { id: "plans", title: "الخطة التسويقية", description: "الأهداف والمهام", keys: [STORAGE_KEYS.MARKETING_GOALS, STORAGE_KEYS.MARKETING_TASKS] },
  { id: "signage", title: "اللوحات والستاندات", description: "اللوحات والستاندات والأرفف والسيارات المعلنة وعقود اللوحات الطرقية وأنواعها وتقييماتها ووسائطها", keys: [STORAGE_KEYS.SIGNAGE_BOARDS, STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, STORAGE_KEYS.ROAD_SIGNAGE_CATALOG, STORAGE_KEYS.STANDS, STORAGE_KEYS.SHELVES, STORAGE_KEYS.ADVERTISING_VEHICLES] },
  { id: "products", title: "المنتجات والمنافسون", description: "الأصناف والمنتجات والمنافسون", keys: [STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.COMPANY_PRODUCTS, STORAGE_KEYS.COMPETITOR_PRODUCTS, STORAGE_KEYS.PRODUCT_CATEGORIES, STORAGE_KEYS.COMPETITORS] },
  { id: "brandsRegions", title: "الماركات وتقييم المناطق", description: "الماركات والمناطق وتقييماتها", keys: [STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS, STORAGE_KEYS.REGION_RATINGS] },
  { id: "reports", title: "التقارير والإعدادات", description: "قوالب الزيارات وإعدادات التحليل وسجل التقارير والتحليلات الخارجية المحفوظة", keys: [STORAGE_KEYS.MARKET_VISIT_REPORT_TEMPLATES, STORAGE_KEYS.MARKET_VISIT_REPORT_SETTINGS, STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES, ANALYTICS_SETTINGS_KEY, "@madar_reports_history_v1"] },
  { id: "users", title: "المستخدمون والصلاحيات", description: "الحسابات المدارة والصلاحيات فقط", keys: [USERS_STORAGE_KEY] },
];

export interface BackupMediaFile { relativePath: string; base64: string; size: number; sourceUri?: string; }

export interface FullBackupPayload {
  schemaVersion: number;
  type: "madar-full-backup";
  backupKind?: "full" | "partial";
  sections?: BackupSectionId[];
  createdAt: string;
  data: Record<string, string>;
  media: BackupMediaFile[];
  skippedMediaPaths: string[];
}

export interface BackupResult { fileUri?: string; filename: string; itemCount: number; mediaCount: number; shared: boolean; }

/** الملفات المولّدة أو المكررة تبقى خارج النسخة؛ لأن بياناتها الأصلية موجودة أو لأنها ليست بيانات تشغيلية. */
export function isBackupManagedMediaUri(uri: string, documentDirectory: string): boolean {
  if (!uri.startsWith(documentDirectory)) return false;
  const relativePath = uri.slice(documentDirectory.length);
  return !GENERATED_FILE_DIRECTORIES.some((directory) => relativePath.startsWith(directory));
}

function collectUris(value: unknown, documentDirectory: string, output: Set<string>): void {
  if (typeof value === "string") { if (isBackupManagedMediaUri(value, documentDirectory)) output.add(value); return; }
  if (Array.isArray(value)) { value.forEach((entry) => collectUris(entry, documentDirectory, output)); return; }
  if (value && typeof value === "object") Object.values(value).forEach((entry) => collectUris(entry, documentDirectory, output));
}

/** يجمع فقط ملفات الوسائط الداخلية التي تشير إليها البيانات، ولا ينسخ ملفات التطبيق غير المرتبطة بالسجل. */
export function collectManagedMediaUris(data: Record<string, string>, documentDirectory?: string | null): string[] {
  if (!documentDirectory) return [];
  const result = new Set<string>();
  Object.values(data).forEach((raw) => { try { collectUris(JSON.parse(raw), documentDirectory, result); } catch { /* القيم النصية العادية لا تتضمن وسائط منظمة. */ } });
  return [...result];
}

export function getBackupFilename(date = new Date()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
  return `madar_full_backup_${timestamp}.json`;
}

export function getPartialBackupFilename(date = new Date()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
  return `madar_partial_backup_${timestamp}.json`;
}

export function buildFullBackupPayload(
  data: Record<string, string>,
  media: BackupMediaFile[] = [],
  skippedMediaPaths: string[] = [],
  createdAt = new Date().toISOString(),
  backupKind: "full" | "partial" = "full",
  sections: BackupSectionId[] = [],
): FullBackupPayload {
  return { schemaVersion: BACKUP_SCHEMA_VERSION, type: "madar-full-backup", backupKind, ...(backupKind === "partial" ? { sections } : {}), createdAt, data, media, skippedMediaPaths };
}

async function readManagedMedia(mediaUris: string[], documentDirectory: string): Promise<{ media: BackupMediaFile[]; skippedMediaPaths: string[] }> {
  const media: BackupMediaFile[] = [];
  const skippedMediaPaths: string[] = [];
  for (const uri of mediaUris) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || info.isDirectory || !info.size) { skippedMediaPaths.push(uri); continue; }
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      if (!base64) { skippedMediaPaths.push(uri); continue; }
      media.push({ relativePath: uri.slice(documentDirectory.length), base64, size: info.size, sourceUri: uri });
    } catch { skippedMediaPaths.push(uri); }
  }
  return { media, skippedMediaPaths };
}

async function readMarketingManagerMedia(data: Record<string, string>): Promise<{ media: BackupMediaFile[]; skippedMediaPaths: string[] }> {
  const registry = await getMarketingManagerFiles();
  const referenced = registry.filter((entry) => Object.values(data).some((raw) => raw.includes(entry.uri)));
  const media: BackupMediaFile[] = [];
  const skippedMediaPaths: string[] = [];
  for (const entry of referenced) {
    try {
      const info = await FileSystem.getInfoAsync(entry.uri);
      if (!info.exists || info.isDirectory || !info.size) { skippedMediaPaths.push(entry.uri); continue; }
      const base64 = await FileSystem.readAsStringAsync(entry.uri, { encoding: FileSystem.EncodingType.Base64 });
      if (!base64) { skippedMediaPaths.push(entry.uri); continue; }
      media.push({ relativePath: `marketing-manager/${entry.relativePath}`, base64, size: info.size, sourceUri: entry.uri });
    } catch { skippedMediaPaths.push(entry.uri); }
  }
  return { media, skippedMediaPaths };
}

function downloadBackupOnWeb(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.style.visibility = "hidden";
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
}

async function writeBackupFile(content: string, filename: string, share: boolean): Promise<{ fileUri?: string; shared: boolean }> {
  if (Platform.OS === "web") { downloadBackupOnWeb(filename, content); return { shared: false }; }
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) throw new Error("تعذر الوصول إلى مساحة المستندات المحلية");
  const backupsDirectory = `${documentDirectory}${BACKUPS_DIRECTORY}`;
  if (!(await ensureDirectoryExists(backupsDirectory))) throw new Error("تعذر إنشاء مجلد النسخ الاحتياطي");
  const fileUri = `${backupsDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists || fileInfo.isDirectory || !fileInfo.size) throw new Error("تعذر التحقق من ملف النسخة الاحتياطية بعد إنشائه");
  const sharingAvailable = share && await Sharing.isAvailableAsync();
  if (!sharingAvailable) return { fileUri, shared: false };
  try {
    await Sharing.shareAsync(fileUri, { dialogTitle: "حفظ أو مشاركة النسخة الاحتياطية", mimeType: "application/json", UTI: "public.json" });
    return { fileUri, shared: true };
  } catch {
    // تظل النسخة المحلية صالحة حتى لو أُغلقت ورقة المشاركة أو لم تتوفر على الجهاز.
    return { fileUri, shared: false };
  }
}

async function createBackupForKeys(keys: string[], options: { filename: string; share: boolean; backupKind: "full" | "partial"; sections?: BackupSectionId[] }): Promise<BackupResult> {
  const entries = await AsyncStorage.multiGet(keys);
  const data = Object.fromEntries(entries.filter(([, value]) => value !== null) as [string, string][]);
  const documentDirectory = FileSystem.documentDirectory;
  const mediaUris = collectManagedMediaUris(data, documentDirectory);
  const internal = documentDirectory ? await readManagedMedia(mediaUris, documentDirectory) : { media: [], skippedMediaPaths: mediaUris };
  const external = await readMarketingManagerMedia(data);
  const media = [...internal.media, ...external.media];
  const skippedMediaPaths = [...internal.skippedMediaPaths, ...external.skippedMediaPaths];
  const payload = buildFullBackupPayload(data, media, skippedMediaPaths, new Date().toISOString(), options.backupKind, options.sections || []);
  const written = await writeBackupFile(JSON.stringify(payload), options.filename, options.share);
  return { fileUri: written.fileUri, filename: options.filename, itemCount: Object.keys(data).length, mediaCount: media.length, shared: written.shared };
}

/** ينشئ نسخة كاملة من البيانات والوسائط المسموح بها. */
export async function createFullBackup(options: { share?: boolean } = {}): Promise<BackupResult> {
  return createBackupForKeys(BACKUP_DATA_KEYS, { filename: getBackupFilename(), share: options.share === true, backupKind: "full" });
}

/** ينشئ نسخة جزئية من الأقسام التي يختارها المستخدم مع الوسائط المشار إليها ضمنها. */
export async function createPartialBackup(sections: BackupSectionId[], options: { share?: boolean } = {}): Promise<BackupResult> {
  const selected = [...new Set(sections)].filter((section): section is BackupSectionId => BACKUP_SECTION_OPTIONS.some((option) => option.id === section));
  if (!selected.length) throw new Error("اختر قسماً واحداً على الأقل لإنشاء نسخة جزئية.");
  const keys = [...new Set(selected.flatMap((section) => BACKUP_SECTION_OPTIONS.find((option) => option.id === section)?.keys || []))];
  return createBackupForKeys(keys, { filename: getPartialBackupFilename(), share: options.share === true, backupKind: "partial", sections: selected });
}
