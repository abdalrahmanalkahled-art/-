import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";

import { ensureDirectoryExists, sanitizeFilename } from "@/lib/export-sanitizer";
import { preparePdfImageDataUri } from "@/lib/pdf-media";
import type { PptxMediaCardField, PptxMediaCompression, PptxReportSettings } from "@/lib/pptx-report-settings";
import { recordGeneratedReport } from "@/lib/report-history";

export const PPTX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
export const PPTX_PAGE = { width: 13.333, height: 7.5 };
export const PPTX_COLORS = { navy: "0F2B5B", blue: "1A56DB", violet: "7C3AED", green: "059669", amber: "D97706", red: "DC2626", ink: "172033", muted: "64748B", pale: "F6F8FC", line: "DCE3F0", white: "FFFFFF" } as const;

export type PptxSlide = ReturnType<PptxGenJS["addSlide"]>;
export type PptxMediaCandidate = { uri?: string; title: string; subtitle?: string; metadata?: Partial<Record<PptxMediaCardField, string>> };
export type PreparedPptxMedia = Omit<PptxMediaCandidate, "uri"> & { data: string };
export type PptxMetric = { label: string; value: string; accent?: string; description?: string };
export type PptxListItem = { title: string; detail?: string; badge?: string; accent?: string };
export type PptxBar = { label: string; value: number; displayValue?: string; color?: string };

export function createPptxPresentation(title: string) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.rtlMode = true;
  pptx.author = "مساعد التسويق الميداني";
  pptx.company = "مساعد التسويق الميداني";
  pptx.subject = title;
  pptx.title = title;
  return pptx;
}

export function addCoverSlide(pptx: PptxGenJS, title: string, subtitle: string, generatedAt: string, accent = PPTX_COLORS.violet) {
  const slide = pptx.addSlide();
  slide.background = { color: PPTX_COLORS.navy };
  slide.addShape(pptx.ShapeType.arc, { x: -1.25, y: -1.35, w: 6.6, h: 6.6, rotate: 34, line: { color: accent, transparency: 100 }, fill: { color: accent, transparency: 10 } });
  slide.addShape(pptx.ShapeType.arc, { x: 9.3, y: 4.2, w: 5.1, h: 5.1, rotate: 214, line: { color: "4B8BFF", transparency: 100 }, fill: { color: "4B8BFF", transparency: 30 } });
  slide.addShape(pptx.ShapeType.roundRect, { x: 9.55, y: 0.72, w: 2.95, h: 0.48, rectRadius: 0.08, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  slide.addText("مساعد التسويق الميداني", { x: 9.72, y: 0.83, w: 2.6, h: 0.22, fontFace: "Arial", fontSize: 10, bold: true, color: PPTX_COLORS.white, align: "center", rtlMode: true, margin: 0 });
  slide.addText(title, { x: 1.05, y: 2.35, w: 11.2, h: 0.8, fontFace: "Arial", fontSize: 32, bold: true, color: PPTX_COLORS.white, align: "right", rtlMode: true, margin: 0, breakLine: false, fit: "shrink" });
  slide.addShape(pptx.ShapeType.line, { x: 8.2, y: 3.45, w: 4.05, h: 0, line: { color: accent, width: 2.2 } });
  slide.addText(subtitle, { x: 2.05, y: 3.72, w: 10.2, h: 0.72, fontFace: "Arial", fontSize: 15, color: "DCE6FA", align: "right", rtlMode: true, margin: 0, fit: "shrink" });
  slide.addText(`أُنشئ في ${generatedAt}`, { x: 8.1, y: 6.48, w: 4.15, h: 0.26, fontFace: "Arial", fontSize: 9.5, color: "BFCBE0", align: "right", rtlMode: true, margin: 0 });
  return slide;
}

export function addMetricsSlide(pptx: PptxGenJS, title: string, description: string, metrics: PptxMetric[], accent = PPTX_COLORS.blue) {
  const slide = addStandardSlide(pptx, title, description, accent);
  const visible = metrics.slice(0, 6);
  const columns = visible.length > 4 ? 3 : 2;
  const rows = Math.ceil(visible.length / columns);
  const gap = 0.2;
  const cardWidth = (11.9 - gap * (columns - 1)) / columns;
  const cardHeight = Math.min(1.62, (4.3 - gap * (rows - 1)) / Math.max(rows, 1));
  visible.forEach((metric, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = 0.72 + (columns - 1 - col) * (cardWidth + gap);
    const y = 1.73 + row * (cardHeight + gap);
    const cardAccent = metric.accent || accent;
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: cardWidth, h: cardHeight, rectRadius: 0.09, fill: { color: PPTX_COLORS.white }, line: { color: PPTX_COLORS.line, width: 0.8 }, shadow: { type: "outer", color: "9DB2D0", opacity: 0.12, blur: 1, angle: 45 } });
    slide.addShape(pptx.ShapeType.roundRect, { x: x + cardWidth - 0.55, y: y + 0.22, w: 0.31, h: 0.31, rectRadius: 0.08, fill: { color: cardAccent, transparency: 3 }, line: { color: cardAccent, transparency: 100 } });
    slide.addText(metric.value, { x: x + 0.27, y: y + 0.38, w: cardWidth - 0.8, h: 0.44, fontFace: "Arial", fontSize: 22, bold: true, color: PPTX_COLORS.ink, align: "right", rtlMode: true, margin: 0, fit: "shrink" });
    slide.addText(metric.label, { x: x + 0.27, y: y + 0.93, w: cardWidth - 0.42, h: 0.23, fontFace: "Arial", fontSize: 10.5, bold: true, color: PPTX_COLORS.muted, align: "right", rtlMode: true, margin: 0, fit: "shrink" });
    if (metric.description) slide.addText(metric.description, { x: x + 0.27, y: y + cardHeight - 0.32, w: cardWidth - 0.42, h: 0.16, fontFace: "Arial", fontSize: 7.8, color: "8492A6", align: "right", rtlMode: true, margin: 0, fit: "shrink" });
  });
  return slide;
}

export function addBarChartSlide(pptx: PptxGenJS, title: string, description: string, bars: PptxBar[], accent = PPTX_COLORS.violet) {
  const slide = addStandardSlide(pptx, title, description, accent);
  const visible = bars.filter((bar) => Number.isFinite(bar.value) && bar.value >= 0).slice(0, 8);
  if (!visible.length) {
    addEmptyState(slide, pptx, "لا توجد بيانات كافية لإنشاء مخطط ضمن نطاق التقرير.");
    return slide;
  }
  const max = Math.max(...visible.map((bar) => bar.value), 1);
  const chartX = 1.1;
  const chartY = 1.78;
  const chartW = 11.1;
  const rowHeight = Math.min(0.55, 4.5 / visible.length);
  visible.forEach((bar, index) => {
    const y = chartY + index * rowHeight;
    const labelW = 3.2;
    const railX = chartX;
    const railW = chartW - labelW - 0.9;
    const filled = Math.max(0.12, railW * Math.min(bar.value / max, 1));
    slide.addText(bar.label, { x: railX + railW + 0.25, y: y + 0.07, w: labelW, h: 0.23, fontFace: "Arial", fontSize: 10.2, bold: true, color: PPTX_COLORS.ink, align: "right", rtlMode: true, margin: 0, fit: "shrink" });
    slide.addShape(pptx.ShapeType.roundRect, { x: railX, y: y + 0.08, w: railW, h: 0.22, rectRadius: 0.04, fill: { color: "E8EDF6" }, line: { color: "E8EDF6", transparency: 100 } });
    slide.addShape(pptx.ShapeType.roundRect, { x: railX + railW - filled, y: y + 0.08, w: filled, h: 0.22, rectRadius: 0.04, fill: { color: bar.color || accent }, line: { color: bar.color || accent, transparency: 100 } });
    slide.addText(bar.displayValue || String(bar.value), { x: railX - 0.77, y: y + 0.05, w: 0.62, h: 0.22, fontFace: "Arial", fontSize: 9.7, bold: true, color: bar.color || accent, align: "left", rtlMode: true, margin: 0, fit: "shrink" });
  });
  return slide;
}

export function addListSlide(pptx: PptxGenJS, title: string, description: string, items: PptxListItem[], accent = PPTX_COLORS.blue) {
  const slide = addStandardSlide(pptx, title, description, accent);
  const visible = items.slice(0, 6);
  if (!visible.length) {
    addEmptyState(slide, pptx, "لا توجد عناصر ضمن النطاق المختار.");
    return slide;
  }
  const rowHeight = Math.min(0.73, 4.5 / visible.length);
  visible.forEach((item, index) => {
    const y = 1.72 + index * rowHeight;
    const itemAccent = item.accent || accent;
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.8, y, w: 11.72, h: rowHeight - 0.1, rectRadius: 0.06, fill: { color: index % 2 ? "FAFBFE" : PPTX_COLORS.white }, line: { color: PPTX_COLORS.line, width: 0.55 } });
    slide.addShape(pptx.ShapeType.ellipse, { x: 12.04, y: y + (rowHeight - 0.31) / 2, w: 0.31, h: 0.31, fill: { color: itemAccent }, line: { color: itemAccent, transparency: 100 } });
    slide.addText(item.title, { x: 4.1, y: y + 0.13, w: 7.55, h: 0.22, fontFace: "Arial", fontSize: 11.2, bold: true, color: PPTX_COLORS.ink, align: "right", rtlMode: true, margin: 0, fit: "shrink" });
    if (item.detail) slide.addText(item.detail, { x: 1.2, y: y + 0.39, w: 10.45, h: 0.16, fontFace: "Arial", fontSize: 8.6, color: PPTX_COLORS.muted, align: "right", rtlMode: true, margin: 0, fit: "shrink" });
    if (item.badge) {
      slide.addShape(pptx.ShapeType.roundRect, { x: 0.98, y: y + 0.15, w: 1.12, h: 0.29, rectRadius: 0.05, fill: { color: itemAccent, transparency: 86 }, line: { color: itemAccent, transparency: 100 } });
      slide.addText(item.badge, { x: 1.03, y: y + 0.225, w: 1.02, h: 0.1, fontFace: "Arial", fontSize: 7.2, bold: true, color: itemAccent, align: "center", rtlMode: true, margin: 0, fit: "shrink" });
    }
  });
  return slide;
}

export function addMediaSlide(pptx: PptxGenJS, title: string, description: string, media: PreparedPptxMedia[], accent = PPTX_COLORS.violet) {
  const slide = addStandardSlide(pptx, title, description, accent);
  const visible = media.slice(0, 6);
  if (!visible.length) {
    addEmptyState(slide, pptx, "لا توجد صور توثيق محلية صالحة ضمن النطاق أو اختار المستخدم عدم تضمينها.");
    return slide;
  }
  const columns = visible.length <= 2 ? visible.length : 3;
  const rows = Math.ceil(visible.length / columns);
  const gap = 0.18;
  const frameWidth = (11.7 - gap * (columns - 1)) / columns;
  const frameHeight = Math.min(2.2, (4.65 - gap * (rows - 1)) / rows);
  visible.forEach((entry, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = 0.8 + (columns - 1 - col) * (frameWidth + gap);
    const y = 1.65 + row * (frameHeight + gap);
    const metadata = mediaCaption(entry);
    const captionHeight = metadata.length > 2 ? 0.71 : metadata.length > 1 ? 0.61 : 0.5;
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: frameWidth, h: frameHeight, rectRadius: 0.06, fill: { color: "E9EEF7" }, line: { color: PPTX_COLORS.line, width: 0.6 } });
    slide.addImage({ data: entry.data, x: x + 0.04, y: y + 0.04, w: frameWidth - 0.08, h: frameHeight - captionHeight - 0.08, rounding: true });
    slide.addShape(pptx.ShapeType.rect, { x: x + 0.04, y: y + frameHeight - captionHeight - 0.04, w: frameWidth - 0.08, h: captionHeight, fill: { color: PPTX_COLORS.navy, transparency: 7 }, line: { color: PPTX_COLORS.navy, transparency: 100 } });
    slide.addText(entry.title, { x: x + 0.14, y: y + frameHeight - captionHeight + 0.07, w: frameWidth - 0.27, h: 0.1, fontFace: "Arial", fontSize: 7.8, bold: true, color: PPTX_COLORS.white, align: "right", rtlMode: true, margin: 0, fit: "shrink" });
    if (metadata.length) slide.addText(metadata.join(" · "), { x: x + 0.14, y: y + frameHeight - captionHeight + 0.24, w: frameWidth - 0.27, h: captionHeight - 0.28, fontFace: "Arial", fontSize: 6.8, color: "D8E4FB", align: "right", rtlMode: true, margin: 0, fit: "shrink" });
  });
  return slide;
}

/** يوزع بطاقات الوسائط على شرائح متتابعة كي لا يتحول العرض إلى شبكة مزدحمة. */
export function addPagedMediaSlides(pptx: PptxGenJS, title: string, description: string, media: PreparedPptxMedia[], accent = PPTX_COLORS.violet, perSlide = 6) {
  if (!media.length) return [addMediaSlide(pptx, title, description, [], accent)];
  const totalPages = Math.ceil(media.length / perSlide);
  return chunkPptxItems(media, perSlide).map((page, index) => addMediaSlide(pptx, totalPages > 1 ? `${title} (${index + 1}/${totalPages})` : title, description, page, accent));
}

export function limitPptxMediaCandidates(candidates: PptxMediaCandidate[], mediaLimit: PptxReportSettings["mediaLimit"]): PptxMediaCandidate[] {
  const unique = Array.from(new Map(candidates.filter((candidate) => Boolean(candidate.uri)).map((candidate) => [candidate.uri!, candidate])).values());
  return mediaLimit === "all" ? unique : unique.slice(0, mediaLimit);
}

export async function preparePptxReportMedia(candidates: PptxMediaCandidate[], settings: Pick<PptxReportSettings, "includeMedia" | "mediaLimit" | "mediaCompression" | "mediaCardFields" | "mediaCardOrder">, onProgress?: (completed: number, total: number) => void): Promise<PreparedPptxMedia[]> {
  if (!settings.includeMedia) return [];
  const unique = limitPptxMediaCandidates(candidates, settings.mediaLimit);
  const output: PreparedPptxMedia[] = [];
  const profile = mediaProfile(settings.mediaCompression);
  for (const [index, candidate] of unique.entries()) {
    const data = await preparePdfImageDataUri(candidate.uri, profile).catch(() => undefined);
    if (data) output.push({ title: candidate.title, ...(candidate.subtitle ? { subtitle: candidate.subtitle } : {}), ...(candidate.metadata ? { metadata: orderedMediaMetadata(candidate.metadata, settings) } : {}), data });
    onProgress?.(index + 1, unique.length);
  }
  return output;
}

export function chunkPptxItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function orderedMediaMetadata(metadata: Partial<Record<PptxMediaCardField, string>>, settings: Pick<PptxReportSettings, "mediaCardFields" | "mediaCardOrder">): Partial<Record<PptxMediaCardField, string>> {
  return Object.fromEntries(settings.mediaCardOrder.filter((field) => settings.mediaCardFields[field] && Boolean(metadata[field])).map((field) => [field, metadata[field]!]));
}

function mediaCaption(entry: PreparedPptxMedia): string[] {
  const labels: Record<PptxMediaCardField, string> = { storeName: "المحل", region: "المنطقة", category: "التصنيف" };
  const orderedMetadata = entry.metadata ? (Object.entries(entry.metadata) as [PptxMediaCardField, string][]).filter(([, value]) => Boolean(value)).map(([field, value]) => `${labels[field]}: ${value}`) : [];
  return orderedMetadata.length ? orderedMetadata : entry.subtitle ? [entry.subtitle] : [];
}

export async function writePptxBase64(pptx: PptxGenJS, autoAdvance: boolean, seconds: number): Promise<string> {
  const raw = await pptx.write({ outputType: "base64", compression: true });
  if (typeof raw !== "string" || !raw) throw new Error("تعذر إنشاء بيانات PowerPoint صالحة.");
  return autoAdvance ? withFadeAutoAdvance(raw, seconds) : raw;
}

export async function saveAndSharePptx(base64: string, filename: string, reportTitle: string): Promise<{ uri: string; filename: string; size: number }> {
  if (!FileSystem.documentDirectory) throw new Error("لم يتمكن التطبيق من الوصول إلى مجلد المستندات.");
  const directory = `${FileSystem.documentDirectory}reports/`;
  if (!(await ensureDirectoryExists(directory))) throw new Error("تعذر إنشاء مجلد التقارير.");
  const safeFilename = sanitizeFilename(filename, "pptx");
  const uri = `${directory}${safeFilename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory || !info.size) throw new Error("تم إيقاف العملية لأن ملف PowerPoint الناتج فارغ أو غير صالح.");
  await recordGeneratedReport({ title: safeFilename, type: "PPTX", uri, size: info.size });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: `مشاركة ${reportTitle}`, mimeType: PPTX_MIME_TYPE });
  return { uri, filename: safeFilename, size: info.size };
}

function addStandardSlide(pptx: PptxGenJS, title: string, description: string, accent: string) {
  const slide = pptx.addSlide();
  slide.background = { color: PPTX_COLORS.pale };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: PPTX_PAGE.width, h: 0.14, fill: { color: accent }, line: { color: accent, transparency: 100 } });
  slide.addText(title, { x: 1.0, y: 0.48, w: 11.25, h: 0.36, fontFace: "Arial", fontSize: 22, bold: true, color: PPTX_COLORS.ink, align: "right", rtlMode: true, margin: 0, fit: "shrink" });
  slide.addText(description, { x: 1.0, y: 0.98, w: 11.25, h: 0.28, fontFace: "Arial", fontSize: 9.8, color: PPTX_COLORS.muted, align: "right", rtlMode: true, margin: 0, fit: "shrink" });
  slide.addShape(pptx.ShapeType.line, { x: 0.8, y: 1.35, w: 11.75, h: 0, line: { color: PPTX_COLORS.line, width: 0.7 } });
  addFooter(slide, pptx);
  return slide;
}

function addFooter(slide: PptxSlide, pptx: PptxGenJS) {
  slide.addText("مساعد التسويق الميداني", { x: 0.8, y: 7.06, w: 3.0, h: 0.15, fontFace: "Arial", fontSize: 7.4, color: "92A0B5", align: "left", rtlMode: true, margin: 0 });
  slide.addShape(pptx.ShapeType.line, { x: 0.8, y: 6.88, w: 11.75, h: 0, line: { color: "DDE5F1", width: 0.55 } });
}

function addEmptyState(slide: PptxSlide, pptx: PptxGenJS, message: string) {
  slide.addShape(pptx.ShapeType.roundRect, { x: 2.2, y: 2.65, w: 8.9, h: 1.25, rectRadius: 0.12, fill: { color: PPTX_COLORS.white }, line: { color: PPTX_COLORS.line, width: 0.8 } });
  slide.addText(message, { x: 2.65, y: 3.12, w: 8.0, h: 0.22, fontFace: "Arial", fontSize: 12, color: PPTX_COLORS.muted, align: "center", rtlMode: true, margin: 0, fit: "shrink" });
}

function mediaProfile(compression: PptxMediaCompression) {
  return compression === "compact" ? { width: 720, quality: 0.45, prefix: "pptx-compact" } : { width: 1100, quality: 0.68, prefix: "pptx-balanced" };
}

async function withFadeAutoAdvance(base64: string, seconds: number): Promise<string> {
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const duration = Math.max(1, Math.round(seconds)) * 1000;
  const slidePaths = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path));
  for (const path of slidePaths) {
    const entry = zip.file(path);
    if (!entry) continue;
    const xml = await entry.async("string");
    if (xml.includes("<p:transition")) continue;
    const transition = `<p:transition spd="med" advClick="1" advTm="${duration}"><p:fade/></p:transition>`;
    zip.file(path, xml.replace("</p:sld>", `${transition}</p:sld>`));
  }
  return zip.generateAsync({ type: "base64", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
