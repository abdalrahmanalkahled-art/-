import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { Linking, Platform } from "react-native";

const APP_MEDIA_DIRECTORY = "event_documentation/";
const USER_MEDIA_FOLDER = "Madar Marketing Documentation";
const USER_MEDIA_FOLDER_KEY = "madar_event_media_folder_uri";
const MIN_VALID_MEDIA_SIZE = 1;

export type EventMediaType = "image" | "video";

export interface StoredEventMedia {
  localUri: string;
  externalUri: string | null;
  copiedToUserFolder: boolean;
  size: number;
}

export type StoredEventVideo = StoredEventMedia;

export function getMediaExtension(sourceUri: string, originalName?: string | null, mediaType: EventMediaType = "video"): string {
  const candidate = originalName || sourceUri.split("?")[0].split("/").pop() || "";
  const match = candidate.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match?.[1].toLowerCase() || (mediaType === "video" ? "mp4" : "jpg");
}

export function getVideoExtension(sourceUri: string, originalName?: string | null): string {
  return getMediaExtension(sourceUri, originalName, "video");
}

export function buildEventMediaFilename(eventId: string, sourceUri: string, mediaType: EventMediaType, originalName?: string | null): string {
  return `event_${eventId}_${Date.now()}.${getMediaExtension(sourceUri, originalName, mediaType)}`;
}

export function buildEventVideoFilename(eventId: string, sourceUri: string, originalName?: string | null): string {
  return buildEventMediaFilename(eventId, sourceUri, "video", originalName);
}

export function getEventMediaMimeType(extension: string, mediaType: EventMediaType): string {
  if (mediaType === "image") {
    if (extension === "png") return "image/png";
    if (extension === "webp") return "image/webp";
    if (extension === "heic" || extension === "heif") return "image/heic";
    return "image/jpeg";
  }
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  if (extension === "avi") return "video/x-msvideo";
  if (extension === "mkv") return "video/x-matroska";
  return "video/mp4";
}

async function ensureAppMediaDirectory(): Promise<string> {
  const baseDirectory = FileSystem.documentDirectory;
  if (!baseDirectory) throw new Error("تعذر الوصول إلى مساحة التخزين المحلية");
  const directory = `${baseDirectory}${APP_MEDIA_DIRECTORY}`;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  return directory;
}

async function getValidSize(uri: string, label: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || typeof info.size !== "number" || info.size < MIN_VALID_MEDIA_SIZE) {
    throw new Error(`${label} فارغ أو تعذر قراءته`);
  }
  return info.size;
}

async function copyToAppStorage(sourceUri: string, destinationUri: string): Promise<number> {
  await getValidSize(sourceUri, "الملف المحدد");
  await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
  return getValidSize(destinationUri, "النسخة المحلية");
}

async function getUserMediaFolderUri(): Promise<string | null> {
  const storedUri = await AsyncStorage.getItem(USER_MEDIA_FOLDER_KEY);
  if (storedUri) return storedUri;

  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return null;

  let folderUri: string;
  try {
    folderUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(permission.directoryUri, USER_MEDIA_FOLDER);
  } catch {
    const entries = await FileSystem.StorageAccessFramework.readDirectoryAsync(permission.directoryUri);
    folderUri = entries.find((entry) => entry.includes(encodeURIComponent(USER_MEDIA_FOLDER)) || entry.includes(USER_MEDIA_FOLDER)) ?? permission.directoryUri;
  }

  await AsyncStorage.setItem(USER_MEDIA_FOLDER_KEY, folderUri);
  return folderUri;
}

async function copyToUserFolder(localUri: string, folderUri: string, fileName: string, mimeType: string): Promise<string> {
  const externalUri = await FileSystem.StorageAccessFramework.createFileAsync(folderUri, fileName.replace(/\.[^.]+$/, ""), mimeType);
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  if (!base64) throw new Error("تعذر قراءة النسخة المحلية");
  await FileSystem.writeAsStringAsync(externalUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  const externalContent = await FileSystem.readAsStringAsync(externalUri, { encoding: FileSystem.EncodingType.Base64 });
  if (!externalContent) throw new Error("تعذر التحقق من النسخة المحفوظة في مدير الملفات");
  return externalUri;
}

/**
 * يحفظ نسخة تشغيل داخل التطبيق أولاً، ويتحقق من حجمها، ثم ينشئ نسخة مرئية للمستخدم في مجلد يختاره على Android.
 */
export async function persistEventMedia(
  sourceUri: string,
  eventId: string,
  mediaType: EventMediaType,
  originalName?: string | null,
): Promise<StoredEventMedia> {
  const directory = await ensureAppMediaDirectory();
  const fileName = buildEventMediaFilename(eventId, sourceUri, mediaType, originalName);
  const localUri = `${directory}${fileName}`;
  const size = await copyToAppStorage(sourceUri, localUri);

  if (Platform.OS !== "android") return { localUri, externalUri: null, copiedToUserFolder: false, size };

  try {
    const folderUri = await getUserMediaFolderUri();
    if (!folderUri) return { localUri, externalUri: null, copiedToUserFolder: false, size };
    const extension = getMediaExtension(sourceUri, originalName, mediaType);
    const externalUri = await copyToUserFolder(localUri, folderUri, fileName, getEventMediaMimeType(extension, mediaType));
    return { localUri, externalUri, copiedToUserFolder: true, size };
  } catch (error) {
    console.warn("تعذر نسخ التوثيق إلى مجلد المستخدم:", error);
    await AsyncStorage.removeItem(USER_MEDIA_FOLDER_KEY);
    return { localUri, externalUri: null, copiedToUserFolder: false, size };
  }
}

export async function persistEventVideo(sourceUri: string, eventId: string, originalName?: string | null): Promise<StoredEventVideo> {
  return persistEventMedia(sourceUri, eventId, "video", originalName);
}

export async function openEventMediaExternally(uri: string, mediaType: EventMediaType): Promise<void> {
  await getValidSize(uri, "ملف التوثيق");
  const mimeType = mediaType === "video" ? "video/*" : "image/*";
  if (Platform.OS === "android") {
    const contentUri = uri.startsWith("content://") ? uri : await FileSystem.getContentUriAsync(uri);
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: contentUri, type: mimeType, flags: 1 });
    return;
  }
  await Linking.openURL(uri);
}

export async function shareEventMedia(uri: string, mediaType: EventMediaType): Promise<void> {
  await getValidSize(uri, "ملف التوثيق");
  if (!(await Sharing.isAvailableAsync())) throw new Error("المشاركة غير متاحة على هذا الجهاز");
  await Sharing.shareAsync(uri, {
    dialogTitle: "مشاركة توثيق الفعالية",
    mimeType: mediaType === "video" ? "video/*" : "image/*",
  });
}
