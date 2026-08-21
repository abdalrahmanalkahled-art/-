import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

import { ensureDirectoryExists, sanitizeFilename } from "./export-sanitizer";
import { recordGeneratedReport, type ReportType } from "./report-history";

export interface ExportOptions {
  filename: string;
  data: Record<string, unknown>[];
  columns?: string[];
}

const REPORTS_DIRECTORY = "reports/";
const EXCEL_DELIMITER = ";";
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** تحويل البيانات إلى CSV بترميز UTF-8 BOM وتعليمة فصل صريحة يتعرف عليها Excel العربي. */
export const convertToCSVWithArabic = (data: Record<string, unknown>[], columns?: string[]): string => {
  if (!data || data.length === 0) return "";

  const keys = columns || Object.keys(data[0]);
  const escapeCell = (value: unknown) => {
    const text = value === null || value === undefined
      ? ""
      : typeof value === "boolean"
        ? value ? "نعم" : "لا"
        : Array.isArray(value)
          ? value.join("; ")
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
    return new RegExp(`["${EXCEL_DELIMITER}\\n]`).test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = keys.map(escapeCell).join(EXCEL_DELIMITER);
  const rows = data.map((item) => keys.map((key) => escapeCell(item[key])).join(EXCEL_DELIMITER));
  return `\uFEFF${[`sep=${EXCEL_DELIMITER}`, header, ...rows].join("\n")}`;
};

/**
 * يرمّز CSV إلى UTF-16LE مع BOM من دون Buffer لتتعرف عليه تطبيقات Excel على Android.
 * يحتفظ الويب بنص UTF-8 مع BOM، بينما يستخدم الحفظ الأصلي هذا الترميز الأكثر توافقاً.
 */
export function encodeExcelCsvForNative(content: string): string {
  const bytes: number[] = [0xff, 0xfe];
  for (let index = 0; index < content.length; index += 1) {
    const codeUnit = content.charCodeAt(index);
    bytes.push(codeUnit & 0xff, codeUnit >> 8);
  }

  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const value = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    encoded += BASE64_ALPHABET[(value >> 18) & 63];
    encoded += BASE64_ALPHABET[(value >> 12) & 63];
    encoded += second === undefined ? "=" : BASE64_ALPHABET[(value >> 6) & 63];
    encoded += third === undefined ? "=" : BASE64_ALPHABET[value & 63];
  }
  return encoded;
}

function getMimeType(type: ReportType): string {
  return type === "CSV" ? "text/csv;charset=utf-16le" : "application/json";
}

async function createNativeReport(
  filename: string,
  extension: "csv" | "json",
  content: string,
  encoding: "utf8" | "base64",
): Promise<{ fileUri: string; safeFilename: string }> {
  const baseDirectory = FileSystem.documentDirectory;
  if (!baseDirectory) throw new Error("لم يتمكن التطبيق من الوصول إلى مجلد المستندات");

  const reportsDirectory = `${baseDirectory}${REPORTS_DIRECTORY}`;
  const directoryReady = await ensureDirectoryExists(reportsDirectory);
  if (!directoryReady) throw new Error("تعذر إنشاء مجلد التقارير");

  const safeFilename = sanitizeFilename(filename, extension);
  const fileUri = `${reportsDirectory}${safeFilename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: encoding === "base64" ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
  });
  return { fileUri, safeFilename };
}

async function shareNativeReport(fileUri: string, safeFilename: string, type: ReportType): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(fileUri, {
    mimeType: getMimeType(type),
    dialogTitle: `مشاركة ${safeFilename}`,
    UTI: type === "CSV" ? "public.comma-separated-values-text" : "public.json",
  });
}

async function exportNativeFile(
  filename: string,
  extension: "csv" | "json",
  content: string,
): Promise<void> {
  const type: ReportType = extension.toUpperCase() as ReportType;
  const usesExcelEncoding = extension === "csv";
  const nativeContent = usesExcelEncoding ? encodeExcelCsvForNative(content) : content;
  const { fileUri, safeFilename } = await createNativeReport(
    filename,
    extension,
    nativeContent,
    usesExcelEncoding ? "base64" : "utf8",
  );
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const fileSize = fileInfo.exists && !fileInfo.isDirectory ? fileInfo.size : undefined;
  await recordGeneratedReport({ title: safeFilename, type, uri: fileUri, size: fileSize });
  await shareNativeReport(fileUri, safeFilename, type);

  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert("تم الحفظ", `حُفظ التقرير داخل مجلد التقارير بالتطبيق:\n${safeFilename}`);
  }
}

function downloadWebFile(filename: string, extension: "csv" | "json", content: string): void {
  const safeFilename = sanitizeFilename(filename, extension);
  const blob = new Blob([content], { type: `${getMimeType(extension.toUpperCase() as ReportType)};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFilename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  Alert.alert("تم التحميل", `تم إنشاء ${safeFilename}`);
}

async function runExport(options: ExportOptions, extension: "csv" | "json", content: string): Promise<void> {
  if (Platform.OS === "web") {
    downloadWebFile(options.filename, extension, content);
    return;
  }

  try {
    await exportNativeFile(options.filename, extension, content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    console.error("Export error:", error);
    Alert.alert("فشل حفظ التقرير", `${message}\n\nلم يتم إنشاء ملف ناقص أو مسار غير صالح.`);
  }
}

/** تصدير CSV آمن بمجلد تقارير ثابت واسم ملف معقم. */
export async function exportToCSVWithPathPicker(options: ExportOptions): Promise<void> {
  if (!options.data?.length) {
    Alert.alert("تنبيه", "لا توجد بيانات للتصدير");
    return;
  }
  await runExport(options, "csv", convertToCSVWithArabic(options.data, options.columns));
}

/** تصدير JSON آمن بمجلد تقارير ثابت واسم ملف معقم. */
export async function exportToJSONWithPathPicker(options: ExportOptions): Promise<void> {
  if (!options.data?.length) {
    Alert.alert("تنبيه", "لا توجد بيانات للتصدير");
    return;
  }
  await runExport(options, "json", JSON.stringify(options.data, null, 2));
}
