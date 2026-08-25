import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

import { buildMarketVisitPptx, type MarketVisitPptxEntry } from "@/lib/market-visit-pptx";
import { sanitizeFilename, ensureDirectoryExists } from "@/lib/export-sanitizer";
import { recordGeneratedReport } from "@/lib/report-history";
import type { MarketVisitImageCompression, MarketVisitImageFit, MarketVisitReportTemplate, MarketVisitSlideRepeatMode } from "@/lib/market-visit-report-model";
import type { MarketVisitProductMetric } from "@/lib/market-visit-product-metrics";
import { persistMarketingManagerFile } from "@/lib/marketing-manager-storage";

const ROOT = `${FileSystem.documentDirectory}market-visit-reports/`;
const TEMPLATE_DIR = `${ROOT}templates/`;
const OUTPUT_DIR = `${ROOT}generated/`;
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type MarketVisitTemplatePersistStage = "copy-external" | "copy-local" | "verify";
export type MarketVisitPptxGenerationStage = "build" | "save" | "share";

export async function persistMarketVisitTemplate(sourceUri: string, name: string, size?: number, onProgress?: (stage: MarketVisitTemplatePersistStage) => void): Promise<MarketVisitReportTemplate> {
  try {
    onProgress?.("copy-external");
    const externalUri = await persistMarketingManagerFile(sourceUri, "templates", name);
    if (externalUri !== sourceUri) {
      onProgress?.("verify");
      return { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: name.replace(/\.pptx$/i, "") || "قالب زيارة السوق", fileName: name, uri: externalUri, size, createdAt: new Date().toISOString() };
    }
  } catch {
    // بعض مزوّدي SAF يرفضون النسخ إلى المجلد الخارجي برسالة مساحة مضللة؛ الحفظ المحلي يبقي الرفع متاحاً.
  }
  await ensureDirectoryExists(TEMPLATE_DIR);
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fileName = sanitizeFilename(`${name || "قالب_زيارة_السوق"}_${id}`, "pptx");
  const uri = `${TEMPLATE_DIR}${fileName}`;
  onProgress?.("copy-local");
  await FileSystem.copyAsync({ from: sourceUri, to: uri });
  onProgress?.("verify");
  return { id, name: name.replace(/\.pptx$/i, "") || "قالب زيارة السوق", fileName, uri, size, createdAt: new Date().toISOString() };
}

export async function generateAndShareMarketVisitPptx(template: MarketVisitReportTemplate, cycleName: string, visits: MarketVisitPptxEntry[], imageFit: MarketVisitImageFit = "fill", slideRepeatMode: MarketVisitSlideRepeatMode = "second-slide", productMetrics: MarketVisitProductMetric[] = [], onProgress?: (stage: MarketVisitPptxGenerationStage) => void) {
  onProgress?.("build");
  const templateBase64 = await FileSystem.readAsStringAsync(template.uri, { encoding: FileSystem.EncodingType.Base64 });
  const outputBase64 = await buildMarketVisitPptx({ templateBase64, cycleName, generatedAt: new Date().toLocaleDateString("en-US"), visits, imageFit, slideRepeatMode, productMetrics });
  onProgress?.("save");
  await ensureDirectoryExists(OUTPUT_DIR);
  const uri = `${OUTPUT_DIR}${sanitizeFilename(`زيارة_السوق_${cycleName}_${new Date().toISOString().slice(0, 10)}`, "pptx")}`;
  await FileSystem.writeAsStringAsync(uri, outputBase64, { encoding: FileSystem.EncodingType.Base64 });
  const info = await FileSystem.getInfoAsync(uri);
  await recordGeneratedReport({ title: `زيارة السوق - ${cycleName}`, type: "PPTX", uri, size: info.exists ? info.size : undefined });
  onProgress?.("share");
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: "مشاركة تقرير زيارة السوق", mimeType: PPTX_MIME });
  return uri;
}

export async function deleteMarketVisitTemplateFile(template: MarketVisitReportTemplate): Promise<void> {
  const info = await FileSystem.getInfoAsync(template.uri);
  if (info.exists) await FileSystem.deleteAsync(template.uri, { idempotent: true });
}

export async function toPptxImages(uris: string[], compression: MarketVisitImageCompression = "compressed") {
  const images: Array<{ base64: string; extension: "png" | "jpeg"; width?: number; height?: number }> = [];
  for (const uri of uris) {
    try { images.push(await preparePptxImage(uri, compression)); } catch { /* تُتجاوز الصورة غير القابلة للقراءة فقط. */ }
  }
  return images;
}

async function preparePptxImage(uri: string, compression: MarketVisitImageCompression) {
  const dimensions = await imageDimensions(uri).catch(() => null);
  const longestSide = dimensions ? Math.max(dimensions.width, dimensions.height) : 0;
  if (compression === "compressed" && dimensions) {
    const limit = Math.min(longestSide || 1400, 1400);
    const result = await ImageManipulator.manipulateAsync(uri, [dimensions.width >= dimensions.height ? { resize: { width: limit } } : { resize: { height: limit } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    if (!result.base64) throw new Error("تعذر تجهيز بيانات الصورة للتقرير.");
    return { base64: result.base64, extension: "jpeg" as const, width: result.width, height: result.height };
  }
  return { base64: await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }), extension: uri.toLowerCase().endsWith(".png") ? "png" as const : "jpeg" as const, width: dimensions?.width, height: dimensions?.height };
}

function imageDimensions(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => Image.getSize(uri, (width, height) => resolve({ width, height }), reject));
}
