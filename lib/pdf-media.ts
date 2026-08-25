import * as FileSystem from "expo-file-system/legacy";

export interface PdfImageProfile {
  width: number;
  quality: number;
  prefix?: string;
}

const DEFAULT_PROFILE: PdfImageProfile = { width: 1024, quality: 0.6, prefix: "pdf-media" };
const MAX_SOURCE_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_EMBEDDED_IMAGE_BYTES = 2 * 1024 * 1024;
const FAST_PATH_IMAGE_BYTES = 512 * 1024;

class PdfMediaMemoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfMediaMemoryError";
  }
}

async function assertSafeImageSize(uri: string): Promise<number | undefined> {
  if (uri.startsWith("data:image/")) {
    if (uri.length > MAX_EMBEDDED_IMAGE_BYTES * 1.4) throw new PdfMediaMemoryError("الصورة المضمّنة كبيرة جداً لعرضها بأمان داخل تقرير PDF.");
    return undefined;
  }
  const info = await FileSystem.getInfoAsync(uri).catch(() => null);
  if (info?.exists && !info.isDirectory && typeof info.size === "number" && info.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new PdfMediaMemoryError(`حجم الصورة الأصلية (${Math.ceil(info.size / (1024 * 1024))} MB) أكبر من الحد الآمن لإدراجها في التقرير.`);
  }
  return info?.exists && !info.isDirectory && typeof info.size === "number" ? info.size : undefined;
}

function imageMimeType(uri: string): string {
  const extension = uri.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

async function smallImageDataUri(uri: string): Promise<string | undefined> {
  const options = { encoding: FileSystem.EncodingType.Base64 };
  const base64 = uri.startsWith("content://")
    ? await FileSystem.StorageAccessFramework.readAsStringAsync(uri, options)
    : await FileSystem.readAsStringAsync(uri, options);
  return base64 ? `data:${imageMimeType(uri)};base64,${base64}` : undefined;
}

async function localPdfImageUri(uri: string, prefix: string): Promise<{ uri: string; temporaryUri?: string }> {
  if (!uri.startsWith("content://") || !FileSystem.cacheDirectory) return { uri };
  const temporaryUri = `${FileSystem.cacheDirectory}${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: temporaryUri });
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
    const originalSize = await assertSafeImageSize(uri);
    if (uri.startsWith("data:image/")) return uri;
    if (typeof originalSize === "number" && originalSize <= FAST_PATH_IMAGE_BYTES) return smallImageDataUri(uri);
    const local = uri.startsWith("data:image/") ? { uri } : await localPdfImageUri(uri, options.prefix || DEFAULT_PROFILE.prefix!);
    temporaryUri = local.temporaryUri;
    const ImageManipulator = await import("expo-image-manipulator");
    const profiles = [
      { width: options.width, quality: options.quality },
      { width: Math.min(options.width, 900), quality: Math.min(options.quality, 0.6) },
      { width: Math.min(options.width, 640), quality: Math.min(options.quality, 0.45) },
    ].filter((candidate, index, candidates) => index === 0 || !candidates.slice(0, index).some((previous) => previous.width === candidate.width && previous.quality === candidate.quality));
    for (const candidate of profiles) {
      const resized = await ImageManipulator.manipulateAsync(local.uri, [{ resize: { width: candidate.width } }], { compress: candidate.quality, format: ImageManipulator.SaveFormat.JPEG });
      if (resizedUri) await FileSystem.deleteAsync(resizedUri, { idempotent: true }).catch(() => undefined);
      resizedUri = resized.uri;
      const info = await FileSystem.getInfoAsync(resizedUri);
      if (info.exists && !info.isDirectory && typeof info.size === "number" && info.size <= MAX_EMBEDDED_IMAGE_BYTES) {
        const base64 = await FileSystem.readAsStringAsync(resizedUri, { encoding: FileSystem.EncodingType.Base64 });
        return base64 ? `data:image/jpeg;base64,${base64}` : undefined;
      }
    }
    throw new PdfMediaMemoryError("تعذر ضغط الصورة إلى حجم آمن للتقرير.");
  } catch (error) {
    if (error instanceof PdfMediaMemoryError) throw error;
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
  if (/outofmemory|out of memory|failed to allocate|java\.lang\.outofmemory/i.test(message)) {
    return "نفدت ذاكرة التطبيق أثناء معالجة وسائط كبيرة. أعد التصدير بعد تقليل عدد الصور أو اختيار ضغط الصور، ولا تحاول إدراج فيديو أو صورة أصلية كبيرة داخل PDF.";
  }
  if (/enospc|no space|not enough space|insufficient storage/i.test(message)) {
    return stage === "media"
      ? "تعذر تحضير الوسائط للطباعة. لم يُحفظ تقرير ناقص؛ أعد المحاولة بعد تقليل عدد الصور المرفقة في التقرير."
      : "تعذر لمحرك الطباعة إنشاء ملف PDF أثناء معالجة الوسائط. تم ضغط الصور قبل الطباعة ولم يُحفظ ملف غير مكتمل؛ أعد المحاولة بعد تقليل عدد الصور في التقرير.";
  }
  if (stage === "media") return `تعذر قراءة أو ضغط إحدى الوسائط المرفقة: ${message}`;
  if (stage === "save") return `تم إنشاء التقرير مؤقتاً لكن تعذر حفظه في مجلد التقارير: ${message}`;
  return `تعذر إنشاء ملف PDF: ${message}`;
}
