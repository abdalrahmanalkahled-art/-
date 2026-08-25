import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Platform } from "react-native";

import { loadAppSettings } from "./app-settings";
import { isWithinDateRange, type DailyReportDateRange, type DailyReportSummary } from "./daily-report-model";
import { ensureDirectoryExists, sanitizeFilename } from "./export-sanitizer";
import { applyPdfReportTemplate } from "./pdf-report-templates";
import { loadSharedPdfReportLogo, pdfLogoMarkup } from "./pdf-report-logo";
import { pdfExportErrorMessage, preparePdfImageDataUri } from "./pdf-media";
import { recordGeneratedReport } from "./report-history";
import { getItems, STORAGE_KEYS } from "./storage";
import { formatArabicDate } from "./analytics-number-format";
import { beginOperationProgress } from "./operation-progress";
import type { SurveyResult } from "./types/survey-types";

export interface DailyReportData {
  range: DailyReportDateRange;
  surveyResults: SurveyResult[];
  events: any[];
  summary: DailyReportSummary;
}

export interface DailyReportExportOptions {
  includeMedia?: boolean;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "—").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatArabicDate(date, { year: "numeric", month: "long", day: "numeric" });
}

function dateLabel(range: DailyReportDateRange): string {
  return range.startDate === range.endDate ? formatDate(range.startDate) : `${formatDate(range.startDate)} — ${formatDate(range.endDate)}`;
}

function surveyPhotoUris(result: SurveyResult): string[] {
  return Array.from(new Set([
    ...(Array.isArray(result.storePhotoUris) ? result.storePhotoUris : []),
    result.storePhotoUri,
    result.imageUri,
  ].filter((uri): uri is string => typeof uri === "string" && uri.trim().length > 0)));
}

export function buildDailyReportData(
  range: DailyReportDateRange,
  surveyResults: SurveyResult[],
  events: any[],
  stores: Array<{ id: string; region?: string }> = [],
): DailyReportData {
  const regionsByStoreId = new Map(stores.map((store) => [store.id, String(store.region || "").trim()]));
  const includedSurveys = surveyResults
    .filter((result) => isWithinDateRange(result.surveyDate || result.createdAt, range))
    .map((result) => ({
      ...result,
      storeRegion: String(result.storeRegion || "").trim() || regionsByStoreId.get(result.storeId) || "",
    }));
  const includedEvents = events.filter((event) => isWithinDateRange(event.eventDate || event.createdAt, range));
  const regions = [...new Set([
    ...includedSurveys.map((result) => result.storeRegion),
    ...includedEvents.map((event) => String(event.region || "").trim()),
  ].filter(Boolean))];
  return {
    range,
    surveyResults: includedSurveys.sort((a, b) => String(a.surveyDate).localeCompare(String(b.surveyDate))),
    events: includedEvents.sort((a, b) => String(a.eventDate || a.createdAt).localeCompare(String(b.eventDate || b.createdAt))),
    summary: {
      storesVisited: new Set(includedSurveys.map((result) => result.storeId)).size,
      surveyResults: includedSurveys.length,
      regionsVisited: regions,
      eventsCount: includedEvents.length,
      photosCount: includedSurveys.reduce((count, result) => count + surveyPhotoUris(result).length, 0),
    },
  };
}

async function imageDataUri(uri?: string): Promise<string | null> {
  return (await preparePdfImageDataUri(uri, { width: 1024, quality: 0.6, prefix: "daily-report" })) || null;
}

function productsHtml(result: SurveyResult): string {
  const products = Array.isArray(result.data) ? result.data : [];
  if (!products.length) return "<p class=\"muted\">لا توجد بيانات منتجات محفوظة لهذا الاستبيان.</p>";
  return `<table><thead><tr><th>المنتج</th><th>الحالة</th><th>التواجد</th>${result.hasProductPrice ? "<th>السعر</th>" : ""}</tr></thead><tbody>${products.map((product) => `<tr><td>${escapeHtml(product.productName)}</td><td><span class=\"${product.present ? "present" : "missing"}\">${product.present ? "موجود" : "غير موجود"}</span></td><td>${result.hasShelfPercentage ? `${Math.round(product.shelfPercentage || 0)}%` : "—"}</td>${result.hasProductPrice ? `<td>${product.price ?? "—"}</td>` : ""}</tr>`).join("")}</tbody></table>`;
}

async function storeDetailHtml(result: SurveyResult, index: number, includeMedia: boolean, onMediaPrepared?: () => void): Promise<string> {
  const photos: string[] = [];
  if (includeMedia) {
    for (const uri of surveyPhotoUris(result)) {
      const photo = await imageDataUri(uri);
      if (photo) photos.push(photo);
      onMediaPrepared?.();
    }
  }
  const answers = result.questions?.length ? `<div class=\"notes\"><strong>إجابات الأسئلة</strong>${result.questions.map((question) => `<p><b>${escapeHtml(question.question)}:</b> ${escapeHtml(question.answer)}</p>`).join("")}</div>` : "";
  const notes = result.notes ? `<div class=\"notes\"><strong>${result.noteType || "ملاحظات"}</strong><p>${escapeHtml(result.notes)}</p></div>` : "";
  const photosHtml = photos.length ? `<div class="store-photos" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px">${photos.map((photo, photoIndex) => `<img class="store-photo" style="display:block;width:100%;height:180px;margin:0;object-fit:cover" src="${photo}" alt="صورة المحل ${photoIndex + 1}"/>`).join("")}</div>` : "";
  return `<section class="store"><div class="store-heading"><div><span class="store-number">${index + 1}</span><h2>${escapeHtml(result.storeName)}</h2></div><p>${escapeHtml(result.storeRegion || "بدون منطقة")} • ${formatDate(result.surveyDate)}</p></div>${photosHtml}<div class="survey-meta"><span>الاستبيان: ${escapeHtml(result.templateName)}</span>${result.cycleName ? `<span>الدورة: ${escapeHtml(result.cycleName)}</span>` : ""}${result.totalShelves ? `<span>رفوف المحل: ${result.totalShelves}</span>` : ""}</div>${productsHtml(result)}${answers}${notes}</section>`;
}

async function buildDailyReportHtml(report: DailyReportData, options: DailyReportExportOptions = {}, onMediaPrepared?: (completed: number) => void): Promise<string> {
  const includeMedia = options.includeMedia !== false;
  const logoMarkup = pdfLogoMarkup(await loadSharedPdfReportLogo());
  const details: string[] = [];
  let preparedMedia = 0;
  for (const [index, result] of report.surveyResults.entries()) details.push(await storeDetailHtml(result, index, includeMedia, () => { preparedMedia += 1; onMediaPrepared?.(preparedMedia); }));
  const eventHtml = report.events.length ? `<section class=\"events\"><h2>الفعاليات المنفذة</h2>${report.events.map((event) => `<div class=\"event\"><b>${escapeHtml(event.title || "فعالية")}</b><span>${formatDate(event.eventDate || event.createdAt)}${event.region ? ` • ${escapeHtml(event.region)}` : ""}</span>${event.description ? `<p>${escapeHtml(event.description)}</p>` : ""}</div>`).join("")}</section>` : "";
  const summary = report.summary;
  const executive = `<section class=\"executive\"><h2>الملخص التنفيذي</h2><p>خلال الفترة المحددة، شملت الأعمال الميدانية زيارة <b>${summary.storesVisited}</b> محل${summary.storesVisited === 1 ? "" : "اً"} عبر <b>${summary.regionsVisited.length}</b> منطقة، وتنفيذ <b>${summary.surveyResults}</b> استبيان${summary.surveyResults === 1 ? "" : "اً"}${summary.eventsCount ? ` وتنفيذ <b>${summary.eventsCount}</b> فعالية` : ""}. ${summary.regionsVisited.length ? `المناطق المغطاة: ${escapeHtml(summary.regionsVisited.join("، "))}.` : "لا توجد زيارات ميدانية ضمن هذه الفترة."}</p></section>`;
  const base = `<!DOCTYPE html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"utf-8\"/><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#172033;font-size:11px;line-height:1.7}.report-head{background:linear-gradient(135deg,#1455b8,#1d6cd1);color:#fff;border-radius:16px;padding:22px;margin-bottom:18px}.report-head h1{font-size:25px;margin:0 0 5px}.report-head p{margin:0;color:#dbeafe}.metrics{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.metric{flex:1;min-width:112px;border:1px solid #dbe7f6;border-radius:11px;padding:10px;background:#f8fbff;text-align:center}.metric b{display:block;font-size:21px;color:#1455b8}.metric span{font-size:10px;color:#64748b}.store,.events,.executive{break-inside:avoid;border:1px solid #e1e8f2;border-radius:14px;padding:14px;margin-top:14px}.store-heading{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e8eef7;padding-bottom:8px}.store-heading h2,.events h2,.executive h2{margin:0;color:#1455b8;font-size:16px}.store-heading p{margin:0;color:#64748b;font-size:10px}.store-number{display:inline-flex;width:23px;height:23px;border-radius:12px;justify-content:center;align-items:center;background:#1455b8;color:#fff;margin-left:7px}.store-photo{display:block;max-width:100%;max-height:220px;margin:12px auto;border-radius:10px;object-fit:cover}.survey-meta{display:flex;gap:9px;flex-wrap:wrap;padding:10px 0;color:#475569;font-size:10px}.survey-meta span{background:#eff6ff;border-radius:8px;padding:3px 7px}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#1455b8;color:#fff}th,td{padding:7px;border-bottom:1px solid #e5edf7;text-align:right}.present{color:#15803d;font-weight:bold}.missing{color:#dc2626;font-weight:bold}.notes{margin-top:10px;padding:10px;border-right:3px solid #60a5fa;background:#f8fbff}.notes p{margin:4px 0}.event{padding:10px 0;border-bottom:1px solid #e5edf7}.event span{display:block;font-size:10px;color:#64748b}.event p{margin:4px 0}.executive{background:#eff6ff;border-color:#bfdbfe}.muted{color:#64748b}@media print{.store{break-inside:avoid}}</style></head><body><header class=\"report-head\"><h1>التقرير اليومي الميداني</h1><p>الفترة: ${dateLabel(report.range)} • تاريخ الإنشاء: ${formatDate(new Date().toISOString())}</p></header><section class=\"metrics\"><div class=\"metric\"><b>${summary.storesVisited}</b><span>محلات مزارة</span></div><div class=\"metric\"><b>${summary.surveyResults}</b><span>استبيانات منفذة</span></div><div class=\"metric\"><b>${summary.regionsVisited.length}</b><span>مناطق مغطاة</span></div><div class=\"metric\"><b>${summary.eventsCount}</b><span>فعاليات</span></div><div class=\"metric\"><b>${summary.photosCount}</b><span>صور محلات</span></div></section><h2>تفاصيل المحلات والاستبيانات</h2>${details.join("") || "<p class=\"muted\">لا توجد استبيانات ضمن الفترة المحددة.</p>"}${eventHtml}${executive}</body></html>`;
  const mediaMetric = `<div class="metric"><b>${summary.photosCount}</b><span>صور محلات</span></div>`;
  const reportWithLogo = base.replace(".report-head h1", ".shared-report-logo{float:left;width:52px;height:52px;object-fit:contain;border-radius:11px;background:#fff;padding:4px}.report-head h1").replace("<header class=\"report-head\"><h1>", `<header class="report-head">${logoMarkup}<h1>`);
  const reportWithoutMediaMetric = includeMedia ? reportWithLogo : reportWithLogo.replace(mediaMetric, "");
  const settings = await loadAppSettings();
  return applyPdfReportTemplate(reportWithoutMediaMetric, settings.pdfTemplate, "التقرير اليومي الميداني", settings.pdfCustomization);
}

async function destination(): Promise<{ uri: string; safeFilename: string }> {
  if (!FileSystem.documentDirectory) throw new Error("لم يتمكن التطبيق من الوصول إلى مجلد المستندات");
  const directory = `${FileSystem.documentDirectory}reports/`;
  if (!(await ensureDirectoryExists(directory))) throw new Error("تعذر إنشاء مجلد التقارير");
  const safeFilename = sanitizeFilename(`التقرير_اليومي_${Date.now()}`, "pdf");
  return { uri: `${directory}${safeFilename}`, safeFilename };
}

export async function loadDailyReport(range: DailyReportDateRange): Promise<DailyReportData> {
  const [surveyResults, events, stores] = await Promise.all([
    getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS),
    getItems<any>(STORAGE_KEYS.EVENTS),
    getItems<{ id: string; region?: string }>(STORAGE_KEYS.STORES),
  ]);
  return buildDailyReportData(range, surveyResults, events, stores);
}

export async function exportDailyReportPdf(report: DailyReportData, options: DailyReportExportOptions = {}): Promise<void> {
  if (!report.surveyResults.length && !report.events.length) { Alert.alert("تنبيه", "لا توجد زيارات أو فعاليات ضمن الفترة المحددة."); return; }
  if (Platform.OS === "web") { Alert.alert("التصدير من الويب", "تصدير PDF التفصيلي متاح من تطبيق الهاتف."); return; }
  const progress = beginOperationProgress({ kind: "export", title: "تصدير التقرير اليومي PDF", steps: ["تحضير بيانات التقرير", "تجهيز الصور والقالب", "إنشاء ملف PDF", "حفظ التقرير والتحقق منه", "فتح المشاركة"] });
  try {
    progress.update({ stepIndex: 0, message: "جارٍ تحضير بيانات التقرير اليومي" });
    const html = await buildDailyReportHtml(report, options, (completed) => progress.update({ stepIndex: 1, message: `جارٍ تجهيز الصورة ${completed} من ${report.summary.photosCount}`, completedItems: completed, totalItems: report.summary.photosCount }));
    progress.update({ stepIndex: 2, message: "جارٍ إنشاء ملف PDF" });
    const generated = await Print.printToFileAsync({ html });
    progress.update({ stepIndex: 3, message: "جارٍ حفظ التقرير والتحقق من الملف" });
    const { uri, safeFilename } = await destination();
    await FileSystem.copyAsync({ from: generated.uri, to: uri });
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory || !info.size) throw new Error("تعذر إنشاء ملف PDF صالح");
    await recordGeneratedReport({ title: safeFilename, type: "PDF", uri, size: info.size });
    progress.update({ stepIndex: 4, message: "جارٍ فتح خيارات مشاركة التقرير" });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "مشاركة التقرير اليومي" });
    else Alert.alert("تم الحفظ", `حُفظ التقرير داخل مجلد التقارير بالتطبيق:\n${safeFilename}`);
  } catch (error) {
    Alert.alert("فشل تصدير التقرير", pdfExportErrorMessage(error));
  } finally {
    progress.complete();
  }
}
