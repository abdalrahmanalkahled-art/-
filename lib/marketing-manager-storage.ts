import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const LOCATION_STORAGE_KEY = "@madar_marketing_manager_location_v1";
const FILE_REGISTRY_STORAGE_KEY = "@madar_marketing_manager_files_v1";
const ROOT_NAME = "marketing manager";

export type MarketingManagerFileKind = "media" | "templates" | "branding" | "backups";

export interface MarketingManagerLocation {
  rootUri: string;
  mediaUri: string;
  templatesUri: string;
  brandingUri: string;
  backupsUri: string;
  selectedAt: string;
}

export interface MarketingManagerFileEntry {
  uri: string;
  relativePath: string;
  kind: MarketingManagerFileKind;
  createdAt: string;
}

function isNamedDirectory(uri: string, name: string): boolean {
  const decoded = decodeURIComponent(uri).toLocaleLowerCase();
  const normalizedName = name.toLocaleLowerCase();
  return decoded.endsWith(`/${normalizedName}`) || decoded.endsWith(`:${normalizedName}`);
}

async function getOrCreateDirectory(parentUri: string, name: string): Promise<string> {
  const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri).catch(() => [] as string[]);
  const existing = children.find((uri) => isNamedDirectory(uri, name));
  return existing || FileSystem.StorageAccessFramework.makeDirectoryAsync(parentUri, name);
}

export async function loadMarketingManagerLocation(): Promise<MarketingManagerLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) as MarketingManagerLocation : null;
  } catch {
    return null;
  }
}

/** يفتح منتقي مجلد Android؛ ينشئ marketing manager داخل الموقع الذي اختاره المستخدم ويحفظ صلاحية الوصول. */
export async function chooseMarketingManagerLocation(): Promise<MarketingManagerLocation | null> {
  if (Platform.OS !== "android") throw new Error("اختيار مجلد خارجي متاح حالياً على Android فقط.");
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted || !permission.directoryUri) return null;
  const rootUri = await getOrCreateDirectory(permission.directoryUri, ROOT_NAME);
  const [mediaUri, templatesUri, brandingUri, backupsUri] = await Promise.all([
    getOrCreateDirectory(rootUri, "media"),
    getOrCreateDirectory(rootUri, "templates"),
    getOrCreateDirectory(rootUri, "branding"),
    getOrCreateDirectory(rootUri, "backups"),
  ]);
  const location: MarketingManagerLocation = { rootUri, mediaUri, templatesUri, brandingUri, backupsUri, selectedAt: new Date().toISOString() };
  await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
  return location;
}

function extensionFromUri(uri: string): string {
  const extension = uri.split("?")[0]?.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]{1,8}$/.test(extension) ? extension : "bin";
}

function mimeTypeFor(extension: string): string {
  if (["jpg", "jpeg"].includes(extension)) return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (extension === "pdf") return "application/pdf";
  return "application/octet-stream";
}

function directoryFor(location: MarketingManagerLocation, kind: MarketingManagerFileKind): string {
  if (kind === "media") return location.mediaUri;
  if (kind === "templates") return location.templatesUri;
  if (kind === "branding") return location.brandingUri;
  return location.backupsUri;
}

async function loadRegistry(): Promise<MarketingManagerFileEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(FILE_REGISTRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) as MarketingManagerFileEntry[] : [];
  } catch {
    return [];
  }
}

async function saveRegistry(entries: MarketingManagerFileEntry[]): Promise<void> {
  await AsyncStorage.setItem(FILE_REGISTRY_STORAGE_KEY, JSON.stringify(entries));
}

export async function getMarketingManagerFiles(): Promise<MarketingManagerFileEntry[]> {
  return loadRegistry();
}

/** ينسخ الملف إلى المجلد الخارجي المختار ويسجل مرجعاً محمولاً لا يعتمد على حاوية التطبيق. */
export async function persistMarketingManagerFile(sourceUri: string, kind: MarketingManagerFileKind, preferredName?: string): Promise<string> {
  const location = await loadMarketingManagerLocation();
  if (!location || Platform.OS !== "android") return sourceUri;
  const extension = extensionFromUri(preferredName || sourceUri);
  const baseName = (preferredName || `${kind}_${Date.now()}`).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48) || kind;
  const storedName = `${baseName}_${Date.now()}`;
  const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(directoryFor(location, kind), storedName, mimeTypeFor(extension));
  await FileSystem.StorageAccessFramework.copyAsync({ from: sourceUri, to: targetUri });
  const info = await FileSystem.getInfoAsync(targetUri);
  if (!info.exists || info.isDirectory || !info.size) throw new Error("تعذر حفظ نسخة صالحة من الملف في marketing manager");
  const entry: MarketingManagerFileEntry = { uri: targetUri, relativePath: `${kind}/${storedName}.${extension}`, kind, createdAt: new Date().toISOString() };
  const current = await loadRegistry();
  await saveRegistry([...current.filter((item) => item.uri !== targetUri), entry]);
  return targetUri;
}

/** يعيد كتابة ملف النسخة داخل المجلد الخارجي المختار ويحدّث سجل المراجع. */
export async function restoreMarketingManagerFile(relativePath: string, base64: string): Promise<string> {
  const location = await loadMarketingManagerLocation();
  if (!location || Platform.OS !== "android") throw new Error("اختر موقع مجلد marketing manager قبل استعادة الملفات.");
  const [kindText, fileName] = relativePath.split("/", 2);
  const kind: MarketingManagerFileKind = ["media", "templates", "branding", "backups"].includes(kindText) ? kindText as MarketingManagerFileKind : "media";
  const extension = extensionFromUri(fileName || "asset.bin");
  const name = (fileName || `restored_${Date.now()}`).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48) || "restored";
  const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(directoryFor(location, kind), name, mimeTypeFor(extension));
  await FileSystem.StorageAccessFramework.writeAsStringAsync(targetUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  const info = await FileSystem.getInfoAsync(targetUri);
  if (!info.exists || info.isDirectory || !info.size) throw new Error(`تعذر استعادة الملف: ${relativePath}`);
  const entry: MarketingManagerFileEntry = { uri: targetUri, relativePath, kind, createdAt: new Date().toISOString() };
  const current = await loadRegistry();
  await saveRegistry([...current.filter((item) => item.relativePath !== relativePath), entry]);
  return targetUri;
}
