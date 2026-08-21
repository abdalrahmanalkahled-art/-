import * as FileSystem from "expo-file-system/legacy";

import { createBackupPreview, readBackupFromUri, type BackupPreview } from "@/lib/backup-restore";
import type { FullBackupPayload } from "@/lib/full-backup";
import type { MarketVisitReportTemplate } from "@/lib/market-visit-report-model";
import { deleteMarketVisitTemplateFile } from "@/lib/market-visit-report-service";
import { deleteExternalAnalyticsPackage, listExternalAnalyticsPackages, type ExternalAnalyticsPackage } from "@/lib/external-analytics-packages";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { isSignageMediaUri, SIGNAGE_MEDIA_DIRECTORY } from "@/lib/signage-media-storage";
import type { AdvertisingVehicle } from "@/lib/advertising-vehicles";
import type { RoadsideContract } from "@/lib/roadside-contracts";
import type { ShelfInstallation } from "@/lib/shelves";
import type { SurveyResult } from "@/lib/types/survey-types";

const STORE_PHOTOS_DIRECTORY = "survey-store-photos/";
const BACKUPS_DIRECTORY = "backups/";

export type StorageDetailBucketId = "storePhotos" | "signageMedia" | "templates" | "backups" | "externalAnalytics";

export interface StorageStorePhoto {
  uri: string;
  size: number;
  storeName: string;
  storeRegion: string;
  surveyDate: string;
}

export interface LocalBackupFile {
  uri: string;
  filename: string;
  size: number;
  createdAt: string;
}

export interface StorageExternalAnalyticsPackage extends ExternalAnalyticsPackage {
  uri: string;
  size: number;
}

export interface StorageSignageMedia {
  uri: string;
  size: number;
  title: string;
  subtitle: string;
}

function isInsideDocumentDirectory(uri: string, directory: string): boolean {
  const base = FileSystem.documentDirectory;
  return Boolean(base && uri.startsWith(`${base}${directory}`));
}

function getResultPhotoUris(result: SurveyResult): string[] {
  return result.storePhotoUris?.length ? result.storePhotoUris : result.storePhotoUri ? [result.storePhotoUri] : [];
}

export async function listStorageStorePhotos(): Promise<StorageStorePhoto[]> {
  const results = await getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS);
  const unique = new Map<string, Omit<StorageStorePhoto, "size">>();
  results.forEach((result) => {
    getResultPhotoUris(result).forEach((uri) => {
      if (!isInsideDocumentDirectory(uri, STORE_PHOTOS_DIRECTORY) || unique.has(uri)) return;
      unique.set(uri, { uri, storeName: result.storeName || "محل غير مسمى", storeRegion: result.storeRegion || "منطقة غير محددة", surveyDate: result.surveyDate });
    });
  });

  const entries = await Promise.all([...unique.values()].map(async (photo) => {
    const info = await FileSystem.getInfoAsync(photo.uri).catch(() => null);
    return info?.exists && !info.isDirectory ? { ...photo, size: typeof info.size === "number" ? info.size : 0 } : null;
  }));
  return entries.filter((entry): entry is StorageStorePhoto => entry !== null).sort((left, right) => right.surveyDate.localeCompare(left.surveyDate));
}

export async function deleteStorageStorePhoto(uri: string): Promise<void> {
  if (!isInsideDocumentDirectory(uri, STORE_PHOTOS_DIRECTORY)) throw new Error("لا يمكن حذف صورة خارج مساحة صور المحلات.");
  const results = await getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS);
  const updated = results.map((result) => {
    const nextUris = getResultPhotoUris(result).filter((item) => item !== uri);
    if (nextUris.length === getResultPhotoUris(result).length) return result;
    return {
      ...result,
      storePhotoUris: nextUris.length ? nextUris : undefined,
      storePhotoUri: result.storePhotoUri === uri ? nextUris[0] : result.storePhotoUri,
    };
  });
  await saveItems(STORAGE_KEYS.SURVEY_RESULTS, updated);
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

function addSignageMediaReference(references: Map<string, Omit<StorageSignageMedia, "size">>, uri: string | undefined, title: string, subtitle: string): void {
  if (isSignageMediaUri(uri) && uri && !references.has(uri)) references.set(uri, { uri, title, subtitle });
}

/** يعرض جميع ملفات وسائط الأصول، بما فيها ملفات العقود المؤرشفة والملفات السابقة غير المرتبطة بسجل. */
export async function listStorageSignageMedia(): Promise<StorageSignageMedia[]> {
  const [boards, contracts, stands, shelves, vehicles] = await Promise.all([
    getItems<{ storeName?: string; region?: string; imageUri?: string; frontImageUri?: string; backImageUri?: string }>(STORAGE_KEYS.SIGNAGE_BOARDS),
    getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS),
    getItems<{ storeName?: string; brand?: string; imageUri?: string }>(STORAGE_KEYS.STANDS),
    getItems<ShelfInstallation>(STORAGE_KEYS.SHELVES),
    getItems<AdvertisingVehicle>(STORAGE_KEYS.ADVERTISING_VEHICLES),
  ]);
  const references = new Map<string, Omit<StorageSignageMedia, "size">>();
  boards.forEach((board) => {
    const title = board.storeName || "لوحة محل";
    const subtitle = board.region ? `لوحة محل · ${board.region}` : "لوحة محل";
    addSignageMediaReference(references, board.frontImageUri || board.imageUri, title, subtitle);
    addSignageMediaReference(references, board.backImageUri, title, `${subtitle} · الوجه الثاني`);
  });
  contracts.forEach((contract) => contract.boards.forEach((board, index) => {
    const title = contract.name || "عقد لوحات";
    const status = contract.status === "active" ? "عقد نشط" : "عقد مؤرشف";
    addSignageMediaReference(references, board.frontImageUri || board.imageUri, title, `${status} · لوحة ${index + 1}`);
    addSignageMediaReference(references, board.backImageUri, title, `${status} · لوحة ${index + 1} · الوجه الثاني`);
  }));
  stands.forEach((stand) => addSignageMediaReference(references, stand.imageUri, stand.storeName || stand.brand || "ستاند إعلاني", "ستاند"));
  shelves.forEach((shelf) => addSignageMediaReference(references, shelf.imageUri, shelf.storeName || "أرفف", "تركيب أرفف"));
  vehicles.forEach((vehicle) => Object.entries(vehicle.images).forEach(([side, uri]) => addSignageMediaReference(references, uri, vehicle.vehicleNumber || "سيارة معلنة", `سيارة معلنة · ${side}`)));

  const base = FileSystem.documentDirectory;
  if (!base) return [];
  const directory = `${base}${SIGNAGE_MEDIA_DIRECTORY}`;
  const names = await FileSystem.readDirectoryAsync(directory).catch(() => [] as string[]);
  const files = await Promise.all(names.map(async (name) => {
    const uri = `${directory}${name}`;
    const info = await FileSystem.getInfoAsync(uri).catch(() => null);
    if (!info?.exists || info.isDirectory) return null;
    return { ...(references.get(uri) || { uri, title: "وسيط أصول سابق", subtitle: "ملف محفوظ غير مرتبط بسجل حالي" }), size: typeof info.size === "number" ? info.size : 0 };
  }));
  return files.filter((file): file is StorageSignageMedia => file !== null).sort((left, right) => right.size - left.size || left.title.localeCompare(right.title, "ar"));
}

export async function deleteStorageSignageMedia(uri: string): Promise<void> {
  if (!isSignageMediaUri(uri)) throw new Error("لا يمكن حذف وسيط خارج مساحة اللوحات والستاندات.");
  const [boards, contracts, stands, shelves, vehicles] = await Promise.all([
    getItems<{ imageUri?: string; frontImageUri?: string; backImageUri?: string }>(STORAGE_KEYS.SIGNAGE_BOARDS),
    getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS),
    getItems<{ imageUri?: string }>(STORAGE_KEYS.STANDS),
    getItems<ShelfInstallation>(STORAGE_KEYS.SHELVES),
    getItems<AdvertisingVehicle>(STORAGE_KEYS.ADVERTISING_VEHICLES),
  ]);
  const clear = (value?: string) => value === uri ? undefined : value;
  const nextBoards = boards.map((board) => ({ ...board, imageUri: clear(board.imageUri), frontImageUri: clear(board.frontImageUri), backImageUri: clear(board.backImageUri) }));
  const nextContracts = contracts.map((contract) => ({ ...contract, boards: contract.boards.map((board) => ({ ...board, imageUri: clear(board.imageUri), frontImageUri: clear(board.frontImageUri), backImageUri: clear(board.backImageUri) })) }));
  const nextStands = stands.map((stand) => ({ ...stand, imageUri: clear(stand.imageUri) }));
  const nextShelves = shelves.map((shelf) => ({ ...shelf, imageUri: clear(shelf.imageUri) }));
  const nextVehicles = vehicles.map((vehicle) => ({ ...vehicle, images: Object.fromEntries(Object.entries(vehicle.images).map(([side, value]) => [side, value === uri ? "" : value])) as AdvertisingVehicle["images"] }));
  await Promise.all([
    saveItems(STORAGE_KEYS.SIGNAGE_BOARDS, nextBoards),
    saveItems(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, nextContracts),
    saveItems(STORAGE_KEYS.STANDS, nextStands),
    saveItems(STORAGE_KEYS.SHELVES, nextShelves),
    saveItems(STORAGE_KEYS.ADVERTISING_VEHICLES, nextVehicles),
  ]);
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function listStorageTemplates(): Promise<MarketVisitReportTemplate[]> {
  const templates = await getItems<MarketVisitReportTemplate>(STORAGE_KEYS.MARKET_VISIT_REPORT_TEMPLATES);
  const available: Array<MarketVisitReportTemplate | null> = await Promise.all(templates.map(async (template) => {
    const info = await FileSystem.getInfoAsync(template.uri).catch(() => null);
    return info?.exists && !info.isDirectory ? { ...template, size: typeof info.size === "number" ? info.size : template.size } as MarketVisitReportTemplate : null;
  }));
  return available.filter((template): template is MarketVisitReportTemplate => template !== null).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function deleteStorageTemplate(template: MarketVisitReportTemplate): Promise<void> {
  await deleteMarketVisitTemplateFile(template);
  const templates = await getItems<MarketVisitReportTemplate>(STORAGE_KEYS.MARKET_VISIT_REPORT_TEMPLATES);
  await saveItems(STORAGE_KEYS.MARKET_VISIT_REPORT_TEMPLATES, templates.filter((item) => item.id !== template.id));
}

export async function listStorageExternalAnalyticsPackages(): Promise<StorageExternalAnalyticsPackage[]> {
  const packages = await listExternalAnalyticsPackages();
  const available = await Promise.all(packages.map(async (item) => {
    const info = await FileSystem.getInfoAsync(item.fileUri).catch(() => null);
    return info?.exists && !info.isDirectory ? { ...item, uri: item.fileUri, size: typeof info.size === "number" ? info.size : 0 } : null;
  }));
  return available.filter((item): item is StorageExternalAnalyticsPackage => item !== null);
}

export async function deleteStorageExternalAnalyticsPackage(item: StorageExternalAnalyticsPackage): Promise<void> {
  await deleteExternalAnalyticsPackage(item.id);
}

export async function listLocalBackups(): Promise<LocalBackupFile[]> {
  const base = FileSystem.documentDirectory;
  if (!base) return [];
  const directory = `${base}${BACKUPS_DIRECTORY}`;
  const root = await FileSystem.getInfoAsync(directory).catch(() => null);
  if (!root?.exists || !root.isDirectory) return [];
  const names = await FileSystem.readDirectoryAsync(directory).catch(() => [] as string[]);
  const files = await Promise.all(names.filter((name) => name.toLowerCase().endsWith(".json")).map(async (filename) => {
    const uri = `${directory}${filename}`;
    const info = await FileSystem.getInfoAsync(uri).catch(() => null);
    if (!info?.exists || info.isDirectory) return null;
    const modifiedAt = typeof info.modificationTime === "number" ? new Date(info.modificationTime * 1000).toISOString() : new Date(0).toISOString();
    return { uri, filename, size: typeof info.size === "number" ? info.size : 0, createdAt: modifiedAt };
  }));
  return files.filter((file): file is LocalBackupFile => file !== null).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function previewLocalBackup(file: LocalBackupFile): Promise<{ payload: FullBackupPayload; preview: BackupPreview }> {
  const payload = await readBackupFromUri(file.uri);
  return { payload, preview: createBackupPreview(payload) };
}

export async function deleteLocalBackup(file: LocalBackupFile): Promise<void> {
  if (!isInsideDocumentDirectory(file.uri, BACKUPS_DIRECTORY)) throw new Error("لا يمكن حذف نسخة خارج مساحة النسخ الاحتياطية.");
  await FileSystem.deleteAsync(file.uri, { idempotent: true });
}
