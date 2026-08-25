import { Alert, Platform } from "react-native";

import type { AnalyticsReportData } from "@/lib/advanced-analytics-report";
import { beginOperationProgress } from "@/lib/operation-progress";
import { addBarChartSlide, addCoverSlide, addListSlide, addMetricsSlide, addPagedMediaSlides, chunkPptxItems, createPptxPresentation, PPTX_COLORS, preparePptxReportMedia, saveAndSharePptx, type PptxBar, type PptxListItem, type PptxMediaCandidate, writePptxBase64 } from "@/lib/pptx-report-kit";
import type { PptxReportSectionOption, PptxReportSettings } from "@/lib/pptx-report-settings";

export const ADVANCED_ANALYTICS_PPTX_SETTINGS_KEY = "madar_advanced_analytics_pptx_settings";
export const ADVANCED_ANALYTICS_PPTX_SECTIONS: PptxReportSectionOption[] = [
  { key: "overview", label: "الملخص التنفيذي", description: "بطاقات المؤشرات الأساسية ضمن نطاق التحليل." },
  { key: "presence", label: "تحليل التواجد", description: "أبرز المنتجات ونسب التواجد المرصودة." },
  { key: "categories", label: "مقارنة الأصناف", description: "مقارنة متوسط منتجاتنا والمنافسين حسب الصنف." },
  { key: "decisions", label: "مؤشرات القرار", description: "الفرص والتنبيهات والمؤشرات المستخرجة من البيانات." },
  { key: "marketing", label: "الأثر التسويقي", description: "الفعاليات والأهداف واللوحات والستاندات ضمن النطاق." },
  { key: "productDetails", label: "تفاصيل الأصناف والمنتجات", description: "تقسيم المنتجات إلى شرائح متتابعة لكل صنف من دون سرد المحلات." },
  { key: "details", label: "تفاصيل الأصول التسويقية", description: "قوائم مختصرة باللوحات والستاندات عند وجودها ضمن النطاق." },
];

export async function exportAdvancedAnalyticsPptx(report: AnalyticsReportData, settings: PptxReportSettings, mediaCandidates: PptxMediaCandidate[] = []): Promise<void> {
  if (!report.cycleRows.length && !report.marketingRows.length && !report.studiedStores.length) {
    Alert.alert("تنبيه", "لا توجد نتائج تحليل ضمن المرشحات المحددة لتصديرها.");
    return;
  }
  if (Platform.OS === "web") {
    Alert.alert("التصدير من الويب", "تصدير PowerPoint متاح في تطبيق الهاتف لحفظ الملف ومشاركته محلياً.");
    return;
  }
  const progress = beginOperationProgress({ kind: "export", title: "تصدير التحليلات المتقدمة PowerPoint", steps: ["تجهيز محتوى الشرائح", "تجهيز الوسائط المضغوطة", "بناء عرض PowerPoint", "حفظ التقرير والتحقق منه", "فتح المشاركة"] });
  try {
    progress.update({ stepIndex: 0, message: "جارٍ تجهيز مؤشرات ونطاق التحليلات" });
    const preparedMedia = await preparePptxReportMedia(mediaCandidates, settings, (completed, total) => progress.update({ stepIndex: 1, message: total ? `جارٍ تجهيز الصورة ${completed} من ${total}` : "لا توجد وسائط ضمن النطاق", completedItems: completed, totalItems: total }));
    const pptx = buildAdvancedAnalyticsPptx(report, settings, preparedMedia);
    progress.update({ stepIndex: 2, message: "جارٍ بناء شرائح PowerPoint" });
    const base64 = await writePptxBase64(pptx, settings.autoAdvance, settings.autoAdvanceSeconds);
    progress.update({ stepIndex: 3, message: "جارٍ حفظ ملف PowerPoint والتحقق منه" });
    await saveAndSharePptx(base64, `${settings.reportTitle}_${Date.now()}`, settings.reportTitle);
    progress.update({ stepIndex: 4, message: "تم فتح خيارات مشاركة التقرير" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    Alert.alert("فشل تصدير PowerPoint", `${pptxExportErrorMessage(message)}\n\nلم يتم اعتماد ملف فارغ أو غير مكتمل.`);
  } finally {
    progress.complete();
  }
}

export function buildAdvancedAnalyticsPptx(report: AnalyticsReportData, settings: PptxReportSettings, preparedMedia: Awaited<ReturnType<typeof preparePptxReportMedia>> = []) {
  const pptx = createPptxPresentation(settings.reportTitle);
  const scope = [report.scope.analysisName, report.scope.templateName, report.scope.cycleName, report.scope.brandName, report.scope.regionName].filter((value) => value && value !== "كل الاستبيانات" && value !== "كل الدورات" && value !== "كل الماركات" && value !== "كل المناطق").join(" · ") || "تحليل شامل ضمن نطاق البيانات المتاحة";
  addCoverSlide(pptx, settings.reportTitle, scope, report.generatedAt, PPTX_COLORS.violet);
  if (settings.sections.overview !== false) addMetricsSlide(pptx, "لقطة تنفيذية", "مؤشرات مركزة من نطاق التحليل المختار.", report.summary.map((metric, index) => ({ ...metric, accent: [PPTX_COLORS.violet, PPTX_COLORS.blue, PPTX_COLORS.green, PPTX_COLORS.amber][index % 4] })), PPTX_COLORS.violet);
  if (settings.sections.presence !== false) addBarChartSlide(pptx, "أبرز نسب التواجد", "المنتجات مرتبة حسب نسبة التواجد المرصودة ضمن العينة.", topPresenceBars(report), PPTX_COLORS.blue);
  if (settings.sections.categories !== false) addBarChartSlide(pptx, "مقارنة متوسط التواجد حسب الصنف", "يعرض متوسط منتجاتنا مقابل المنافسين لكل صنف ضمن النطاق.", categoryComparisonBars(report), PPTX_COLORS.violet);
  if (settings.sections.decisions !== false) addListSlide(pptx, "مؤشرات تدعم القرار", "الفرص والتنبيهات المستخرجة من النتائج الميدانية.", report.decisionIndicators.map((item) => ({ title: item.label, detail: item.detail, badge: item.value, accent: PPTX_COLORS.amber })), PPTX_COLORS.amber);
  if (settings.sections.marketing !== false && report.marketingRows.length) {
    addMetricsSlide(pptx, "الأثر التسويقي ضمن النطاق", "مؤشرات الفعاليات والأهداف والأصول الإعلانية المرتبطة.", report.marketingRows.slice(0, 6).map((item, index) => ({ label: item.البند, value: item.الإجمالي, accent: [PPTX_COLORS.green, PPTX_COLORS.amber, PPTX_COLORS.violet, PPTX_COLORS.blue][index % 4] })), PPTX_COLORS.green);
    addListSlide(pptx, "الفعاليات والأهداف المرتبطة", "أهم العناصر التسويقية التي تشكل الأثر ضمن التقرير.", [...report.marketingEvents.map((event) => ({ title: event.الفعالية, detail: `${event.التاريخ} · ${event.المنطقة} · ${event.المستفيدون} مستفيد · ${event.الهدايا} هدية`, badge: event.الحالة, accent: event.الحالة === "مكتملة" ? PPTX_COLORS.green : event.الحالة === "ملغاة" ? PPTX_COLORS.red : PPTX_COLORS.blue })), ...report.marketingGoals.map((goal) => ({ title: goal.الهدف, detail: `${goal.الماركة} · ${goal.الفترة} · ${goal.المؤشر} · ${goal["عدد الفعاليات المرتبطة"]} فعاليات مرتبطة`, badge: goal.الإنجاز, accent: PPTX_COLORS.violet }))], PPTX_COLORS.green);
  }
  if (settings.sections.productDetails !== false) addCategoryProductDetailSlides(pptx, report);
  if (settings.sections.details !== false && (report.marketingSignages.length || report.marketingStands.length)) addListSlide(pptx, "تفاصيل الأصول التسويقية", "لوحات وستاندات مرتبطة ضمن النطاق، من دون إدراج قائمة المحلات.", detailsForReport(report), PPTX_COLORS.blue);
  if (settings.includeMedia) addPagedMediaSlides(pptx, "وسائط توثيق مختارة", "صور الدورات أو الأصول وفق الإعدادات، موزعة تلقائياً على شرائح مريحة.", preparedMedia, PPTX_COLORS.violet);
  addListSlide(pptx, "خلاصة التقرير", report.dataWarnings.length ? "تنبيهات جودة البيانات التي يجب أخذها في الاعتبار عند قراءة المؤشرات." : "العرض جاهز للمراجعة والمشاركة ويعكس نطاق المرشحات المختارة.", report.dataWarnings.length ? report.dataWarnings.map((warning) => ({ title: warning, accent: PPTX_COLORS.amber })) : [{ title: "تم إنشاء العرض محلياً", detail: "يتضمن الشرائح التي فُعّلت في إعدادات PowerPoint، مع تلاشي تلقائي اختياري بين الشرائح.", badge: "جاهز", accent: PPTX_COLORS.green }], PPTX_COLORS.violet);
  return pptx;
}

function topPresenceBars(report: AnalyticsReportData): PptxBar[] {
  const byProduct = new Map<string, { total: number; count: number }>();
  report.cycleRows.forEach((row) => {
    const value = percentage(row["نسبة التواجد"]);
    const previous = byProduct.get(row.المنتج) || { total: 0, count: 0 };
    byProduct.set(row.المنتج, { total: previous.total + value, count: previous.count + 1 });
  });
  return Array.from(byProduct.entries()).map(([label, value]) => ({ label, value: Math.round(value.total / Math.max(value.count, 1)), displayValue: `${Math.round(value.total / Math.max(value.count, 1))}%`, color: PPTX_COLORS.blue })).sort((first, second) => second.value - first.value).slice(0, 8);
}

function categoryComparisonBars(report: AnalyticsReportData): PptxBar[] {
  return report.categorySourceAverages.flatMap((item) => [
    { label: `${item.الصنف} · منتجاتنا`, value: percentage(item["متوسط منتجاتنا"]), displayValue: item["متوسط منتجاتنا"], color: PPTX_COLORS.violet },
    { label: `${item.الصنف} · منافسون`, value: percentage(item["متوسط المنافسين"]), displayValue: item["متوسط المنافسين"], color: PPTX_COLORS.amber },
  ]).sort((first, second) => second.value - first.value).slice(0, 8);
}

function detailsForReport(report: AnalyticsReportData) {
  if (report.marketingSignages.length || report.marketingStands.length) return [
    ...report.marketingSignages.map((item) => ({ title: item.اللوحة, detail: `${item.النوع} · ${item.الماركة} · ${item.المنطقة} · نهاية العقد: ${item["نهاية العقد"]}`, badge: item.الحالة, accent: item.الحالة === "نشطة" ? PPTX_COLORS.green : PPTX_COLORS.muted })),
    ...report.marketingStands.map((item) => ({ title: item.الستاند, detail: `${item.الماركة} · ${item.المحل} · تركيب: ${item["تاريخ التركيب"]} · سجلات صيانة: ${item["سجل الصيانة"]}`, badge: item.الحالة, accent: item.الحالة === "بحالة جيدة" ? PPTX_COLORS.green : PPTX_COLORS.amber })),
  ];
  return [];
}

function addCategoryProductDetailSlides(pptx: ReturnType<typeof createPptxPresentation>, report: AnalyticsReportData) {
  const categories = new Map<string, AnalyticsReportData["cycleRows"]>();
  report.cycleRows.forEach((row) => categories.set(row.الصنف, [...(categories.get(row.الصنف) || []), row]));
  Array.from(categories.entries()).forEach(([category, rows]) => {
    const products = aggregateCategoryProducts(rows);
    const pages = chunkPptxItems(products, 6);
    pages.forEach((page, index) => addListSlide(pptx, `الصنف: ${category}${pages.length > 1 ? ` (${index + 1}/${pages.length})` : ""}`, "تفاصيل المنتجات ضمن الصنف. قُسمت القائمة تلقائياً للحفاظ على وضوح القراءة.", page, PPTX_COLORS.violet));
  });
}

function aggregateCategoryProducts(rows: AnalyticsReportData["cycleRows"]): PptxListItem[] {
  const products = new Map<string, { present: number; sample: number; shelf: number[]; prices: number[] }>();
  rows.forEach((row) => {
    const current = products.get(row.المنتج) || { present: 0, sample: 0, shelf: [], prices: [] };
    current.present += Number(row["عدد مرات التواجد"]) || 0;
    current.sample += Number(row["إجمالي الرصد"]) || 0;
    if (row["متوسط نسبة الظهور"]) current.shelf.push(percentage(row["متوسط نسبة الظهور"]));
    if (row["متوسط السعر"]) current.prices.push(Number(String(row["متوسط السعر"]).replace(/[^0-9.-]/g, "")) || 0);
    products.set(row.المنتج, current);
  });
  return Array.from(products.entries()).map(([title, value]) => {
    const presence = value.sample ? Math.round((value.present / value.sample) * 100) : 0;
    const details = [`التواجد: ${presence}%`, `الرصد: ${value.present}/${value.sample}`];
    if (value.shelf.length) details.push(`الظهور: ${Math.round(value.shelf.reduce((sum, item) => sum + item, 0) / value.shelf.length)}%`);
    if (value.prices.length) details.push(`متوسط السعر: ${Math.round(value.prices.reduce((sum, item) => sum + item, 0) / value.prices.length).toLocaleString("en-US")}`);
    return { title, detail: details.join(" · "), badge: `${presence}%`, accent: presence >= 70 ? PPTX_COLORS.green : presence >= 40 ? PPTX_COLORS.amber : PPTX_COLORS.red };
  }).sort((first, second) => percentage(second.badge || "0") - percentage(first.badge || "0") || first.title.localeCompare(second.title, "ar"));
}

function percentage(value: string): number {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function pptxExportErrorMessage(message: string) {
  if (/outofmemory|out of memory|failed to allocate|java\.lang\.outofmemory/i.test(message)) return "نفدت ذاكرة التطبيق أثناء تجهيز الوسائط. قلّل عدد الصور أو اختر ضغطاً أعلى ثم أعد التصدير.";
  return message;
}
