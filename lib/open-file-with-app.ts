import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

function mimeTypeFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

/**
 * يفتح الملف في عارض Android يدعم نوعه، بدلاً من ورقة المشاركة.
 * يستعمل iOS نافذة النظام كبديل لأن Expo لا يوفر مُنتقي عارضي ملفات مكافئاً هناك.
 */
export async function openFileWithCompatibleApp(uri: string, name: string): Promise<void> {
  if (Platform.OS === "web") {
    Alert.alert("فتح الملف", "افتح الملف أو نزّله من المتصفح باستخدام العارض المناسب.");
    return;
  }
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory) throw new Error("الملف غير متاح على الجهاز أو تم نقله.");

  if (Platform.OS === "android") {
    const contentUri = uri.startsWith("content://") ? uri : await FileSystem.getContentUriAsync(uri);
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      type: mimeTypeFor(name),
      flags: 1,
    });
    return;
  }

  if (!(await Sharing.isAvailableAsync())) throw new Error("لا تتوفر نافذة اختيار تطبيق على هذا الجهاز.");
  await Sharing.shareAsync(uri, { mimeType: mimeTypeFor(name), dialogTitle: `فتح ${name} باستخدام` });
}
