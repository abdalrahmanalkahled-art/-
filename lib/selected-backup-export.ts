import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
import { Platform } from "react-native";

import type { LocalBackupFile } from "./storage-detail-manager";

const JSON_MIME = "application/json";
const ZIP_MIME = "application/zip";

function archiveFilename() {
  return `madar_selected_backups_${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
}

async function ensureReadableBackups(backups: LocalBackupFile[]) {
  if (!backups.length) throw new Error("يرجى تحديد نسخة احتياطية واحدة على الأقل.");
  return Promise.all(backups.map(async (backup) => ({
    ...backup,
    content: await FileSystem.readAsStringAsync(backup.uri, { encoding: FileSystem.EncodingType.UTF8 }),
  })));
}

async function createSelectedBackupsArchive(backups: LocalBackupFile[]) {
  const files = await ensureReadableBackups(backups);
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error("تعذر الوصول إلى مساحة الملفات المؤقتة.");

  const zip = new JSZip();
  files.forEach((file) => zip.file(file.filename, file.content));
  const archiveBase64 = await zip.generateAsync({ type: "base64", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const uri = `${cacheDirectory}${archiveFilename()}`;
  await FileSystem.writeAsStringAsync(uri, archiveBase64, { encoding: FileSystem.EncodingType.Base64 });
  return { uri, filename: uri.split("/").pop() || "madar_selected_backups.zip" };
}

export async function shareSelectedBackups(backups: LocalBackupFile[]): Promise<void> {
  if (Platform.OS === "web") throw new Error("مشاركة ملفات النسخ المحددة متاحة من تطبيق الهاتف.");
  if (!backups.length) throw new Error("يرجى تحديد نسخة احتياطية واحدة على الأقل.");
  if (!(await Sharing.isAvailableAsync())) throw new Error("المشاركة غير متاحة على هذا الجهاز.");

  if (backups.length === 1) {
    await Sharing.shareAsync(backups[0].uri, { dialogTitle: "مشاركة النسخة الاحتياطية", mimeType: JSON_MIME, UTI: "public.json" });
    return;
  }

  const archive = await createSelectedBackupsArchive(backups);
  await Sharing.shareAsync(archive.uri, { dialogTitle: `مشاركة ${backups.length} نسخ احتياطية`, mimeType: ZIP_MIME, UTI: "public.zip-archive" });
}

export async function saveSelectedBackupsToPhone(backups: LocalBackupFile[]): Promise<number> {
  if (Platform.OS !== "android") throw new Error("حفظ النسخ في مجلد تختاره متاح حالياً على Android.");
  const files = await ensureReadableBackups(backups);
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return 0;

  let saved = 0;
  for (const file of files) {
    const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, file.filename, JSON_MIME);
    await FileSystem.writeAsStringAsync(destinationUri, file.content, { encoding: FileSystem.EncodingType.UTF8 });
    saved += 1;
  }
  return saved;
}
