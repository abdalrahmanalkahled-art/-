import * as FileSystem from "expo-file-system/legacy";
export { sanitizeFilename } from "./export-filename";

/**
 * ضمان إنشاء المجلدات الأبوية قبل الكتابة في المستندات أو التخزين المؤقت
 */
export async function ensureDirectoryExists(dirUri: string): Promise<boolean> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(dirUri);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
    }
    return true;
  } catch (error) {
    console.error("Error creating directory:", error);
    return false;
  }
}
