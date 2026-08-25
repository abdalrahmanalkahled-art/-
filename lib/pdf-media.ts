import * as FileSystem from "expo-file-system/legacy";

export interface PdfImageProfile {
  width: number;
  quality: number;
  prefix?: string;
}

const DEFAULT_PROFILE: PdfImageProfile = { width: 1024, quality: 0.6, prefix: "pdf-media" };

async function readImageBase64(uri: string): Promise<string> {
  const options = { encoding: FileSystem.EncodingType.Base64 };
  return uri.startsWith("content://")
    ? FileSystem.StorageAccessFramework.readAsStringAsync(uri, options)
    : FileSystem.readAsStringAsync(uri, options);
}

async function localPdfImageUri(uri: string, prefix: string): Promise<{ uri: string; temporaryUri?: string }> {
  if (!uri.startsWith("content://") || !FileSystem.cacheDirectory) return { uri };
  const temporaryUri = `${FileSystem.cacheDirectory}${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  await FileSystem.writeAsStringAsync(temporaryUri, await readImageBase64(uri), { encoding: FileSystem.EncodingType.Base64 });
  return { uri: temporaryUri, temporaryUri };
}

/**
 * يحوّل وسائط الهاتف وSAF إلى JPEG مصغّر مضمّن في HTML.
 * لا يعيد الصورة الأصلية عند تعذر الضغط، حتى لا يؤدي Data URI ضخم إلى فشل WebView وكأنه نقص مساحة.
 */
export async function preparePdfImageDataUri(uri: string | undefined, profile: Partial<PdfImageProfile> = {}): Promise<string | undefined> {
  if (!uri || !uri.startsWith("data:image/") && !uri.startsWith("file:") && !uri.startsWith("content://")) return undefined;
  const options = { ...DEFAULT_PROFILE, ...profile };
  let temporaryUri: string | undefined;
  let resizedUri: string | undefined;
  try {
    const local = uri.startsWith("data:image/") ? { uri } : await localPdfImageUri(uri, options.prefix || DEFAULT_PROFILE.prefix!);
    temporaryUri = local.temporaryUri;
    const ImageManipulator = await import("expo-image-manipulator");
    const resized = await ImageManipulator.manipulateAsync(
      local.uri,
      [{ resize: { width: options.width } }],
      { compress: options.quality, format: ImageManipulator.SaveFormat.JPEG },
    );
    resizedUri = resized.uri;
    const base64 = await FileSystem.readAsStringAsync(resizedUri, { encoding: FileSystem.EncodingType.Base64 });
    return base64 ? `data:image/jpeg;base64,${base64}` : undefined;
  } catch {
    return undefined;
  } finally {
    await Promise.all(
      [temporaryUri, resizedUri]
        .filter((entry): entry is string => Boolean(entry))
        .map((entry) => FileSystem.deleteAsync(entry, { idempotent: true }).catch(() => undefined)),
    );
  }
}

export function pdfExportErrorMessage(error: unknown, stage: "media" | "render" | "save" = "render"): string {
  const message = error instanceof Error ? error.message : String(error || "خطأ غير معروف");
  if (/enospc|no space|not enough space|insufficient storage/i.test(message)) {
    return stage === "media"
      ? "تعذر تحضير الوسائط للطباعة. لم يُحفظ تقرير ناقص؛ أعد المحاولة بعد تقليل عدد الصور المرفقة في التقرير."
      : "تعذر لمحرك الطباعة إنشاء ملف PDF أثناء معالجة الوسائط. تم ضغط الصور قبل الطباعة ولم يُحفظ ملف غير مكتمل؛ أعد المحاولة بعد تقليل عدد الصور في التقرير.";
  }
  if (stage === "media") return `تعذر قراءة أو ضغط إحدى الوسائط المرفقة: ${message}`;
  if (stage === "save") return `تم إنشاء التقرير مؤقتاً لكن تعذر حفظه في مجلد التقارير: ${message}`;
  return `تعذر إنشاء ملف PDF: ${message}`;
}
