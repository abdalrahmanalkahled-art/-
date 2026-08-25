import { Alert, Platform } from "react-native";

import { getGoalImpactMetrics } from "@/lib/goal-impact-metrics";
import { deriveGoalPeriod, getEffectiveGoalStatus, goalPeriodLabel, type GoalPeriod, type StoredGoalStatus } from "@/lib/goal-lifecycle";
import { beginOperationProgress } from "@/lib/operation-progress";
import { addBarChartSlide, addCoverSlide, addListSlide, addMediaSlide, addMetricsSlide, createPptxPresentation, PPTX_COLORS, preparePptxReportMedia, saveAndSharePptx, type PptxBar, writePptxBase64 } from "@/lib/pptx-report-kit";
import type { PptxReportSectionOption, PptxReportSettings } from "@/lib/pptx-report-settings";

export const MARKETING_PLAN_PPTX_SETTINGS_KEY = "madar_marketing_plan_pptx_settings";
export const MARKETING_PLAN_PPTX_SECTIONS: PptxReportSectionOption[] = [
  { key: "overview", label: "ملخص الخطة", description: "مؤشرات الأهداف والفعاليات والأثر الكلي ضمن النطاق." },
  { key: "progress", label: "تقدم الأهداف", description: "مخطط تقدم الأهداف ومؤشرات الأداء المرتبطة بها." },
  { key: "events", label: "الفعاليات المرتبطة", description: "حالة الفعاليات والمستفيدون والهدايا والمناطق." },
  { key: "impact", label: "الأثر والمناطق", description: "الاستفادة والهدايا وتغطية المناطق على مستوى الخطة." },
  { key: "details", label: "تفاصيل الأهداف", description: "بطاقات مختصرة لتفاصيل الأهداف ضمن النطاق." },
];

export interface MarketingPlanPptxGoal {
  id: string;
  title: string;
  brandName?: string;
  description?: string;
  period: GoalPeriod;
  startDate: string;
  endDate: string;
  kpi: string;
  targetValue: number;
  currentValue: number;
  completionPercentage: number;
  status: StoredGoalStatus;
}

export interface MarketingPlanPptxEvent {
  id: string;
  title?: string;
  name?: string;
  eventDate?: string;
  region?: string;
  status?: "planned" | "ongoing" | "completed" | "cancelled";
  attendeesCount?: number | string | null;
  giftsDistributed?: number | string | null;
  goalId?: string;
  brandName?: string;
  imageUri?: string;
  mediaUris?: string[];
}

export async function exportMarketingPlanPptx(goals: MarketingPlanPptxGoal[], events: MarketingPlanPptxEvent[], settings: PptxReportSettings): Promise<void> {
  if (!goals.length) {
    Alert.alert("تنبيه", "لا توجد أهداف ضمن النطاق المحدد لتصديرها.");
    return;
  }
  if (Platform.OS === "web") {
    Alert.alert("التصدير من الويب", "تصدير PowerPoint متاح في تطبيق الهاتف لحفظ الملف ومشاركته محلياً.");
    return;
  }
  const scopedEvents = events.filter((event) => goals.some((goal) => goal.id === event.goalId));
  const mediaCandidates = scopedEvents.flatMap((event) => [event.imageUri, ...(event.mediaUris || [])].filter((uri): uri is string => Boolean(uri)).map((uri) => ({ uri, title: event.title || event.name || "فعالية ميدانية", subtitle: `${event.region || "منطقة غير محددة"} · ${event.eventDate || "بدون تاريخ"}` })));
  const progress = beginOperationProgress({ kind: "export", title: "تصدير الخطة التسويقية PowerPoint", steps: ["تجهيز الخطة والأثر", "تجهيز الوسائط المضغوطة", "بناء عرض PowerPoint", "حفظ التقرير والتحقق منه", "فتح المشاركة"] });
  try {
    progress.update({ stepIndex: 0, message: "جارٍ تجهيز الأهداف والفعاليات ضمن النطاق" });
    const preparedMedia = await preparePptxReportMedia(mediaCandidates, settings, (completed, total) => progress.update({ stepIndex: 1, message: total ? `جارٍ تجهيز الصورة ${completed} من ${total}` : "لا توجد وسائط ضمن النطاق", completedItems: completed, totalItems: total }));
    const pptx = buildMarketingPlanPptx(goals, scopedEvents, settings, preparedMedia);
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

export function buildMarketingPlanPptx(goals: MarketingPlanPptxGoal[], events: MarketingPlanPptxEvent[], settings: PptxReportSettings, preparedMedia: Awaited<ReturnType<typeof preparePptxReportMedia>> = []) {
  const pptx = createPptxPresentation(settings.reportTitle);
  const impact = getGoalImpactMetrics(events);
  const goalIds = new Set(goals.map((goal) => goal.id));
  const brandedGoals = Array.from(new Set(goals.map((goal) => goal.brandName).filter(Boolean))).join(" · ");
  const scope = `${goals.length} أهداف${brandedGoals ? ` · ${brandedGoals}` : ""}`;
  addCoverSlide(pptx, settings.reportTitle, scope, new Date().toLocaleDateString("en-US"), PPTX_COLORS.violet);
  if (settings.sections.overview !== false) addMetricsSlide(pptx, "ملخص الخطة", "لقطة تنفيذية من الأهداف والفعاليات ضمن النطاق المحدد.", [
    { label: "الأهداف", value: formatNumber(goals.length), accent: PPTX_COLORS.violet },
    { label: "الفعاليات المرتبطة", value: formatNumber(events.length), accent: PPTX_COLORS.blue },
    { label: "إجمالي المستفيدين", value: formatNumber(impact.totalBeneficiaries), accent: PPTX_COLORS.green },
    { label: "إجمالي الهدايا", value: formatNumber(impact.totalGifts), accent: PPTX_COLORS.amber },
    { label: "المناطق المغطاة", value: formatNumber(impact.coveredRegionCount), accent: PPTX_COLORS.blue },
    { label: "أهداف مكتملة", value: formatNumber(goals.filter((goal) => getEffectiveGoalStatus(goal) === "completed").length), accent: PPTX_COLORS.green },
  ], PPTX_COLORS.violet);
  if (settings.sections.progress !== false) addBarChartSlide(pptx, "تقدم الأهداف", "نسبة الإنجاز المسجلة لكل هدف ضمن النطاق.", goals.map((goal) => ({ label: goal.title, value: Math.max(0, Math.round(Number(goal.completionPercentage) || 0)), displayValue: `${Math.max(0, Math.round(Number(goal.completionPercentage) || 0))}%`, color: goalProgressColor(goal) })).sort((first, second) => second.value - first.value), PPTX_COLORS.violet);
  if (settings.sections.events !== false) {
    addBarChartSlide(pptx, "حالة الفعاليات", "عدد الفعاليات المرتبطة بحسب حالتها الحالية.", eventStatusBars(events), PPTX_COLORS.blue);
    addListSlide(pptx, "أهم الفعاليات المرتبطة", "تعرض البطاقات الحالة والتاريخ والمنطقة والأثر الميداني لكل فعالية.", events.map((event) => ({ title: event.title || event.name || "فعالية ميدانية", detail: `${event.eventDate || "بدون تاريخ"} · ${event.region || "منطقة غير محددة"} · ${formatNumber(event.attendeesCount)} مستفيد · ${formatNumber(event.giftsDistributed)} هدية`, badge: eventStatusLabel(event.status), accent: eventStatusColor(event.status) })), PPTX_COLORS.blue);
  }
  if (settings.sections.impact !== false) addListSlide(pptx, "الأثر والمناطق", "الأثر المحسوب من الفعاليات المرتبطة بالأهداف المحددة.", [
    { title: `المستفيدون: ${formatNumber(impact.totalBeneficiaries)}`, detail: "مجموع الحضور المسجل في الفعاليات المرتبطة.", badge: "استفادة", accent: PPTX_COLORS.green },
    { title: `الهدايا: ${formatNumber(impact.totalGifts)}`, detail: "إجمالي الهدايا الموزعة في الفعاليات المرتبطة.", badge: "توزيع", accent: PPTX_COLORS.amber },
    { title: `المناطق: ${formatNumber(impact.coveredRegionCount)}`, detail: regionDetail(events), badge: "تغطية", accent: PPTX_COLORS.blue },
    { title: `الفعاليات المكتملة: ${formatNumber(events.filter((event) => event.status === "completed").length)}`, detail: "الفعاليات التي سُجلت حالتها مكتملة.", badge: "إنجاز", accent: PPTX_COLORS.violet },
  ], PPTX_COLORS.green);
  if (settings.sections.details !== false) addListSlide(pptx, "تفاصيل الأهداف", "مؤشرات الأداء والفترة وحالة كل هدف ضمن الخطة.", goals.map((goal) => ({ title: goal.title, detail: `${goal.brandName || "بدون ماركة"} · ${goalPeriodLabel(deriveGoalPeriod(goal.startDate, goal.endDate))} · ${goal.startDate || "—"} ← ${goal.endDate || "—"} · ${goal.kpi || "بدون مؤشر"} · ${formatNumber(goal.currentValue)} من ${formatNumber(goal.targetValue)}`, badge: goalStatusLabel(getEffectiveGoalStatus(goal)), accent: goalProgressColor(goal) })), PPTX_COLORS.violet);
  if (settings.includeMedia) addMediaSlide(pptx, "وسائط توثيق الفعاليات", "صور الفعاليات المرتبطة بعد ضغطها تدريجياً ضمن حد الوسائط المحدد.", preparedMedia, PPTX_COLORS.violet);
  addListSlide(pptx, "خلاصة العرض", "العرض مبني محلياً من الأهداف والفعاليات الحالية ضمن النطاق المحدد.", [{ title: "الخطة جاهزة للمراجعة", detail: `الأهداف المضمنة: ${formatNumber(goalIds.size)} · الفعاليات المرتبطة: ${formatNumber(events.length)} · التقديم التلقائي: ${settings.autoAdvance ? `${settings.autoAdvanceSeconds} ثوانٍ` : "غير مفعّل"}`, badge: "جاهز", accent: PPTX_COLORS.green }], PPTX_COLORS.violet);
  return pptx;
}

function eventStatusBars(events: MarketingPlanPptxEvent[]): PptxBar[] {
  const statuses: NonNullable<MarketingPlanPptxEvent["status"]>[] = ["completed", "ongoing", "planned", "cancelled"];
  return statuses.map((status) => ({ label: eventStatusLabel(status), value: events.filter((event) => (event.status || "planned") === status).length, displayValue: formatNumber(events.filter((event) => (event.status || "planned") === status).length), color: eventStatusColor(status) }));
}

function goalProgressColor(goal: MarketingPlanPptxGoal) {
  const status = getEffectiveGoalStatus(goal);
  return status === "completed" ? PPTX_COLORS.green : status === "delayed" || status === "expired" ? PPTX_COLORS.red : status === "cancelled" ? PPTX_COLORS.muted : PPTX_COLORS.violet;
}
function eventStatusLabel(status: MarketingPlanPptxEvent["status"]) { return status === "completed" ? "مكتملة" : status === "ongoing" ? "قيد التنفيذ" : status === "cancelled" ? "ملغاة" : "مخططة"; }
function eventStatusColor(status: MarketingPlanPptxEvent["status"]) { return status === "completed" ? PPTX_COLORS.green : status === "ongoing" ? PPTX_COLORS.blue : status === "cancelled" ? PPTX_COLORS.red : PPTX_COLORS.amber; }
function goalStatusLabel(status: ReturnType<typeof getEffectiveGoalStatus>) { return status === "completed" ? "مكتمل" : status === "delayed" ? "متأخر" : status === "expired" ? "منتهٍ" : status === "cancelled" ? "ملغي" : "في المسار"; }
function formatNumber(value: number | string | null | undefined) { const number = Number(value) || 0; return number.toLocaleString("en-US", { maximumFractionDigits: 1 }); }
function regionDetail(events: MarketingPlanPptxEvent[]) { const regions = Array.from(new Set(events.map((event) => event.region?.trim()).filter((value): value is string => Boolean(value)))); return regions.length ? regions.slice(0, 6).join(" · ") : "لا توجد منطقة مسجلة للفعاليات المرتبطة."; }
function pptxExportErrorMessage(message: string) { return /outofmemory|out of memory|failed to allocate|java\.lang\.outofmemory/i.test(message) ? "نفدت ذاكرة التطبيق أثناء تجهيز الوسائط. قلّل عدد الصور أو اختر ضغطاً أعلى ثم أعد التصدير." : message; }
