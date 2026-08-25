import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export const SIGNAGE_MEDIA_DIRECTORY = "signage-media/";

function extensionFromUri(uri: string): string {
  const cleanUri = uri.split("?")[0].toLowerCase();
  if (cleanUri.endsWith(".png")) return "png";
  if (cleanUri.endsWith(".webp")) return "webp";
  return "jpg";
}

/** ينقل الصورة إلى مستندات التطبيق لتبقى مرتبطة بالأصل ولا تتأثر بتنظيف الذاكرة المؤقتة. */
export async function persistSignageMediaUri(uri?: string, kind = "asset"): Promise<string | undefined> {
  if (!uri) return undefined;
  if (Platform.OS === "web") return uri;
  const base = FileSystem.documentDirectory;
  if (!base || uri.startsWith(`${base}${SIGNAGE_MEDIA_DIRECTORY}`)) return uri;
  try {
    const source = await FileSystem.getInfoAsync(uri);
    if (!source.exists || source.isDirectory) return uri;
    const directory = `${base}${SIGNAGE_MEDIA_DIRECTORY}`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const safeKind = kind.replace(/[^a-z0-9_-]/gi, "").slice(0, 24) || "asset";
    const destination = `${directory}${safeKind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extensionFromUri(uri)}`;
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  } catch {
    // لا يمنع تعذر نسخ ملف قديم عرض الأصل أو حفظه ضمن بيانات التطبيق.
    return uri;
  }
}

export function isSignageMediaUri(uri: string | undefined): boolean {
  return Boolean(uri && FileSystem.documentDirectory && uri.startsWith(`${FileSystem.documentDirectory}${SIGNAGE_MEDIA_DIRECTORY}`));
}

/** تُستخدم قبل الترحيل الجماعي لتجنب أي فحص أو نسخ للملفات المُدارة مسبقاً. */
export function needsSignageMediaPersistence(uri: string | undefined): boolean {
  return Boolean(uri && Platform.OS !== "web" && !isSignageMediaUri(uri));
}
