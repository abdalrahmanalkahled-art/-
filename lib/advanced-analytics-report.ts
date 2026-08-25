import type { AdvancedSurveyAnalytics } from "./advanced-analytics";
import { formatAnalyticsDate, formatAnalyticsDateTime, formatAnalyticsNumber, toWesternDigits } from "./analytics-number-format";
import type { MarketingAnalyticsSummary } from "./marketing-analytics";
import type { AnalyticsSettings } from "./analytics-settings-model";
import type { AnalyticsDecisionMetrics } from "./analytics-decision-metrics";
import type { RegionMatrixData } from "./analytics-region-matrix";
import { groupAnalyticsByCategory } from "./analytics-category-groups";

export interface AnalyticsReportScope {
  analysisName: string;
  reportTitle?: string;
  templateName: string;
  cycleName: string;
  brandName: string;
  regionName: string;
  storeName: string;
  reportPurpose?: string;
  presenceBasis?: string;
  comparisonReference?: string;
}

export interface AnalyticsReportRow {
  الدورة: string;
  "تاريخ البداية": string;
  "تاريخ النهاية": string;
  الصنف: string;
  المنتج: string;
  "نسبة التواجد": string;
  "عدد مرات التواجد": number;
  "إجمالي الرصد": number;
  "متوسط نسبة الظهور"?: string;
  "متوسط السعر"?: string;
}

export interface AnalyticsStudiedStoreRow {
  "اسم المحل": string;
  التصنيف: string;
  المنطقة: string;
  "رقم التواصل": string;
  "المواد المدروسة": string;
  الملاحظات: string;
  "تاريخ الزيارة": string;
  "موضع الزيارة"?: string;
  حالات_المواد: Record<string, "موجود" | "غير موجود" | "غير مدروس">;
}

export interface AnalyticsReportSources {
  stores: Array<{ id: string; name: string; region: string; category?: string; phone?: string }>;
  results: Array<{ id: string; templateId: string; cycleId?: string; storeId: string; storeName: string; storeRegion: string; surveyDate: string; notes?: string; data: Array<{ productId: string; productName: string; present: boolean }> }>;
  filters?: { templateId?: string; cycleIds?: string[]; productIds?: string[]; regionName?: string; storeIds?: string[] };
}

export interface AnalyticsReportData {
  title: string;
  generatedAt: string;
  scope: AnalyticsReportScope;
  summary: { label: string; value: string }[];
  cycleRows: AnalyticsReportRow[];
  marketingRows: { البند: string; الإجمالي: string }[];
  marketingEvents: Array<{ الفعالية: string; الحالة: string; التاريخ: string; المنطقة: string; الماركة: string; المستفيدون: string; الهدايا: string; الهدف: string }>;
  marketingGoals: Array<{ الهدف: string; الماركة: string; الحالة: string; الفترة: string; المؤشر: string; الإنجاز: string; "عدد الفعاليات المرتبطة": string }>;
  marketingSignages: Array<{ اللوحة: string; النوع: string; الماركة: string; المنطقة: string; الموقع: string; الحالة: string; "نهاية العقد": string }>;
  marketingStands: Array<{ الستاند: string; الماركة: string; المحل: string; الحالة: string; "تاريخ التركيب": string; "سجل الصيانة": string }>;
  studiedStores: AnalyticsStudiedStoreRow[];
  decisionIndicators: { label: string; value: string; detail?: string }[];
  dataWarnings: string[];
  regionMatrix?: RegionMatrixData;
  categoryMatrices?: Array<{ category: string; matrix: RegionMatrixData }>;
  categorySourceAverages: Array<{ الصنف: string; "متوسط منتجاتنا": string; "متوسط المنافسين": string; "طريقة الحساب": string }>;
}

export interface AnalyticsSourcePresenceAverages {
  company?: number;
  competitor?: number;
}

/** يحسب متوسط التواجد لكل مصدر من إجمالي الرصد، أو من المحلات الفريدة عند اختيارها. */
export function calculateAnalyticsSourcePresenceAverages(analytics: AdvancedSurveyAnalytics, uniqueStorePresence?: AnalyticsDecisionMetrics["uniqueStorePresence"]): AnalyticsSourcePresenceAverages {
  const productTypes = new Map(analytics.points.flatMap((point) => point.products).map((product) => [product.productId, product.type]));
  const sourceRows = uniqueStorePresence?.length ? uniqueStorePresence.map((metric) => {
    const type = productTypes.get(metric.productId);
    return type ? { type, present: metric.presentStores, sample: metric.observedStores } : null;
  }).filter((item): item is { type: "company" | "competitor"; present: number; sample: number } => Boolean(item)) : analytics.points.flatMap((point) => point.products.map((product) => ({ type: product.type, present: product.presentCount, sample: product.sampleSize })));
  const totals = sourceRows.reduce((current, row) => ({ ...current, [row.type]: { present: current[row.type].present + row.present, sample: current[row.type].sample + row.sample } }), { company: { present: 0, sample: 0 }, competitor: { present: 0, sample: 0 } });
  return {
    company: totals.company.sample ? Math.round((totals.company.present / totals.company.sample) * 100) : undefined,
    competitor: totals.competitor.sample ? Math.round((totals.competitor.present / totals.competitor.sample) * 100) : undefined,
  };
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? toWesternDigits(value) : formatAnalyticsDate(date);
}

function buildStudiedStoreRows(sources?: AnalyticsReportSources, depth: AnalyticsSettings["storeDetailDepth"] = "latest"): AnalyticsStudiedStoreRow[] {
  if (!sources) return [];
  const { filters = {}, stores } = sources;
  const matchingResults = sources.results.filter((result) => {
    if (filters.templateId && result.templateId !== filters.templateId) return false;
    if (filters.cycleIds?.length && !filters.cycleIds.includes(result.cycleId || "")) return false;
    if (filters.regionName && result.storeRegion !== filters.regionName) return false;
    if (filters.storeIds?.length && !filters.storeIds.includes(result.storeId)) return false;
    return !filters.productIds?.length || result.data.some((product) => filters.productIds?.includes(product.productId));
  });
  const byStore = new Map<string, typeof matchingResults>();
  matchingResults.forEach((result) => byStore.set(result.storeId, [...(byStore.get(result.storeId) || []), result]));
  const selected = depth === "allVisits" ? matchingResults.map((result) => ({ result, position: "زيارة ضمن النطاق" })) : Array.from(byStore.values()).flatMap((storeResults) => {
    const ordered = [...storeResults].sort((first, second) => new Date(first.surveyDate).getTime() - new Date(second.surveyDate).getTime());
    if (depth === "firstVsLatest" && ordered.length > 1) return [{ result: ordered[0], position: "أول زيارة" }, { result: ordered.at(-1)!, position: "أحدث زيارة" }];
    return [{ result: ordered.at(-1)!, position: "أحدث زيارة" }];
  });
  return selected.map(({ result, position }) => {
    const store = stores.find((item) => item.id === result.storeId);
    const relevantProducts = filters.productIds?.length ? result.data.filter((product) => filters.productIds?.includes(product.productId)) : result.data;
    const states = Object.fromEntries(relevantProducts.map((product) => [toWesternDigits(product.productName), product.present ? "موجود" : "غير موجود"] as const));
    return {
      "اسم المحل": toWesternDigits(store?.name || result.storeName),
      التصنيف: toWesternDigits(store?.category || "غير مصنف"),
      المنطقة: toWesternDigits(store?.region || result.storeRegion || "غير محددة"),
      "رقم التواصل": toWesternDigits(store?.phone || "غير متاح"),
      "تاريخ الزيارة": dateLabel(result.surveyDate),
      ...(depth === "latest" ? {} : { "موضع الزيارة": position }),
      "المواد المدروسة": toWesternDigits(relevantProducts.map((product) => product.productName).join("، ") || "لا توجد مواد"),
      الملاحظات: toWesternDigits(result.notes?.trim() || "—"),
      حالات_المواد: states,
    };
  }).sort((first, second) => first["اسم المحل"].localeCompare(second["اسم المحل"], "ar") || first["تاريخ الزيارة"].localeCompare(second["تاريخ الزيارة"]));
}

function buildDecisionIndicators(metrics?: AnalyticsDecisionMetrics, settings?: AnalyticsSettings): AnalyticsReportData["decisionIndicators"] {
  if (!metrics || !settings) return [];
  const enabled = settings.enabledIndicators;
  const indicators: AnalyticsReportData["decisionIndicators"] = [];
  if (enabled.surveyCoverage) indicators.push({ label: "تغطية المحلات", value: `${metrics.surveyCoverage.percentage}%`, detail: `${formatAnalyticsNumber(metrics.surveyCoverage.surveyedStores)} من ${formatAnalyticsNumber(metrics.surveyCoverage.eligibleStores)} محل مؤهل` });
  if (enabled.opportunityList) indicators.push({ label: "فرص التحسين", value: formatAnalyticsNumber(metrics.opportunities.length), detail: metrics.opportunities.slice(0, 3).map((item) => item.productName).join("، ") || "لا توجد فرص ضمن الحد المحدد" });
  if (enabled.cycleChange) {
    const declining = metrics.cycleChanges.filter((item) => item.previousPresence !== undefined && item.change < 0).sort((first, second) => first.change - second.change);
    indicators.push({ label: "المنتجات المتراجعة", value: formatAnalyticsNumber(declining.length), detail: declining.slice(0, 3).map((item) => `${item.productName} (${item.change} نقطة)`).join("، ") || "لا يوجد تراجع مرصود" });
  }
  if (enabled.uniqueStorePresence) indicators.push({ label: "تواجد المحلات الفريدة", value: `${metrics.uniqueStorePresence.length ? Math.round(metrics.uniqueStorePresence.reduce((sum, item) => sum + item.presencePercentage, 0) / metrics.uniqueStorePresence.length) : 0}%`, detail: "محسوب من أحدث زيارة لكل محل ضمن النطاق" });
  if (enabled.sampleConfidence) indicators.push({ label: "عينات منخفضة", value: formatAnalyticsNumber(metrics.sampleConfidence.filter((item) => item.confidence === "low").length), detail: `الحد الأدنى للعينة الكافية: ${formatAnalyticsNumber(settings.lowSampleThreshold)}` });
  return indicators;
}

export function buildAnalyticsReportData(
  analytics: AdvancedSurveyAnalytics,
  scope: AnalyticsReportScope,
  marketing?: MarketingAnalyticsSummary,
  sources?: AnalyticsReportSources,
  options?: { settings?: AnalyticsSettings; decisionMetrics?: AnalyticsDecisionMetrics; regionMatrix?: RegionMatrixData; categoryMatrices?: Array<{ category: string; matrix: RegionMatrixData }> },
): AnalyticsReportData {
  const sourcePresence = calculateAnalyticsSourcePresenceAverages(analytics, options?.settings?.presenceBasis === "uniqueStores" ? options.decisionMetrics?.uniqueStorePresence : undefined);
  const categoryAggregation = options?.settings?.categoryAggregation || "equalProducts";
  const categorySourceAverages = groupAnalyticsByCategory(analytics, categoryAggregation).map((group) => ({
    الصنف: toWesternDigits(group.category),
    "متوسط منتجاتنا": group.companyAveragePresence === undefined ? "غير متاح" : `${group.companyAveragePresence}%`,
    "متوسط المنافسين": group.competitorAveragePresence === undefined ? "غير متاح" : `${group.competitorAveragePresence}%`,
    "طريقة الحساب": categoryAggregation === "weightedBySample" ? "موزون بالعينة" : "متوسط متساوٍ",
  }));
  const cycleRows = analytics.points.flatMap((point) => point.products.map((product) => ({
    الدورة: toWesternDigits(point.cycleName),
    "تاريخ البداية": dateLabel(point.startDate),
    "تاريخ النهاية": dateLabel(point.endDate),
    الصنف: toWesternDigits(product.category || "بدون تصنيف"),
    المنتج: toWesternDigits(product.productName),
    "نسبة التواجد": `${product.presencePercentage}%`,
    "عدد مرات التواجد": product.presentCount,
    "إجمالي الرصد": product.sampleSize,
    ...(product.averageShelfPercentage !== undefined ? { "متوسط نسبة الظهور": `${product.averageShelfPercentage}%` } : {}),
    ...(product.averagePrice !== undefined ? { "متوسط السعر": `${formatAnalyticsNumber(product.averagePrice)} ل.س` } : {}),
  })));
  const eventStatusLabels = { planned: "مخططة", ongoing: "قيد التنفيذ", completed: "مكتملة", cancelled: "ملغاة" } as const;
  const goalStatusLabels = { on_track: "في المسار", delayed: "متأخر", completed: "مكتمل", cancelled: "ملغي" } as const;
  const boardTypeLabels = { store: "لوحة محل", road: "لوحة طرقية", wall: "لوحة جدارية", island: "منصف إعلاني" } as const;
  const standConditionLabels = { good: "بحالة جيدة", damaged: "متضرر", needs_repair: "يحتاج صيانة" } as const;
  const periodLabels = { monthly: "شهري", quarterly: "ربع سنوي", annual: "سنوي" } as const;
  const goalsById = new Map((marketing?.goals || []).map((goal) => [goal.id, goal]));
  const marketingRows = marketing ? [
    { البند: "الفعاليات ضمن النطاق", الإجمالي: formatAnalyticsNumber(marketing.events.length) },
    { البند: "فعاليات مكتملة", الإجمالي: formatAnalyticsNumber(marketing.eventStatusCounts?.completed || 0) },
    { البند: "إجمالي المستفيدين", الإجمالي: formatAnalyticsNumber(marketing.totalAttendees || 0) },
    { البند: "إجمالي الهدايا", الإجمالي: formatAnalyticsNumber(marketing.totalGifts || 0) },
    { البند: "الأهداف المرتبطة", الإجمالي: formatAnalyticsNumber(marketing.goals.length) },
    { البند: "تقدم الأهداف المرتبطة", الإجمالي: marketing.goalProgress === undefined ? "غير متاح" : `${marketing.goalProgress}%` },
    { البند: "المناطق المغطاة", الإجمالي: formatAnalyticsNumber(marketing.coveredRegions?.length || 0) },
    { البند: "اللوحات النشطة", الإجمالي: formatAnalyticsNumber(marketing.activeSignages) },
    { البند: "الستاندات بحالة جيدة", الإجمالي: formatAnalyticsNumber(marketing.activeStands) },
    { البند: "ستاندات تحتاج متابعة", الإجمالي: formatAnalyticsNumber(marketing.standsNeedingAttention || 0) },
  ] : [];
  const marketingEvents = (marketing?.events || []).map((event) => ({
    الفعالية: toWesternDigits(event.title || event.name || "فعالية ميدانية"),
    الحالة: eventStatusLabels[event.status || "planned"],
    التاريخ: dateLabel(event.eventDate || ""),
    المنطقة: toWesternDigits(event.region || "غير محددة"),
    الماركة: toWesternDigits(event.brandName || "غير محددة"),
    المستفيدون: formatAnalyticsNumber(Number(event.attendeesCount) || 0),
    الهدايا: formatAnalyticsNumber(Number(event.giftsDistributed) || 0),
    الهدف: toWesternDigits(event.goalId ? goalsById.get(event.goalId)?.title || "هدف مرتبط" : "—"),
  })).sort((first, second) => first.التاريخ.localeCompare(second.التاريخ));
  const marketingGoals = (marketing?.goals || []).map((goal) => ({
    الهدف: toWesternDigits(goal.title || "هدف تسويقي"),
    الماركة: toWesternDigits(goal.brandName || "غير محددة"),
    الحالة: goalStatusLabels[goal.status || "on_track"],
    الفترة: periodLabels[goal.period || "monthly"],
    المؤشر: toWesternDigits(goal.kpi || "—"),
    الإنجاز: `${Math.round(Number(goal.completionPercentage) || (Number(goal.targetValue) ? (Number(goal.currentValue) / Number(goal.targetValue)) * 100 : 0))}%`,
    "عدد الفعاليات المرتبطة": formatAnalyticsNumber((marketing?.events || []).filter((event) => event.goalId === goal.id).length),
  }));
  const marketingSignages = (marketing?.signages || []).map((signage) => ({
    اللوحة: toWesternDigits(signage.storeName || signage.address || signage.brand || "لوحة إعلانية"),
    النوع: boardTypeLabels[signage.type || "store"],
    الماركة: toWesternDigits(signage.brand || signage.frontBrand || signage.backBrand || "غير محددة"),
    المنطقة: toWesternDigits(signage.region || "غير محددة"),
    الموقع: toWesternDigits(signage.address || signage.storeName || "غير محدد"),
    الحالة: signage.isActive === false ? "غير نشطة" : "نشطة",
    "نهاية العقد": dateLabel(signage.contractEndDate || ""),
  }));
  const marketingStands = (marketing?.stands || []).map((stand) => ({
    الستاند: toWesternDigits(stand.storeName || stand.brand || "ستاند ترويجي"),
    الماركة: toWesternDigits(stand.brand || "غير محددة"),
    المحل: toWesternDigits(stand.storeName || "غير محدد"),
    الحالة: stand.isActive === false ? "غير نشط" : standConditionLabels[stand.condition || "good"],
    "تاريخ التركيب": dateLabel(stand.installDate || ""),
    "سجل الصيانة": formatAnalyticsNumber(stand.maintenanceHistory?.length || 0),
  }));
  return {
    title: toWesternDigits(scope.reportTitle || "تقرير التحليلات المتقدمة"),
    generatedAt: formatAnalyticsDateTime(new Date()),
    scope: {
      analysisName: toWesternDigits(scope.analysisName),
      templateName: toWesternDigits(scope.templateName),
      cycleName: toWesternDigits(scope.cycleName),
      brandName: toWesternDigits(scope.brandName),
      regionName: toWesternDigits(scope.regionName),
      storeName: toWesternDigits(scope.storeName),
      ...(scope.reportPurpose ? { reportPurpose: toWesternDigits(scope.reportPurpose) } : {}),
      ...(scope.presenceBasis ? { presenceBasis: toWesternDigits(scope.presenceBasis) } : {}),
      ...(scope.comparisonReference ? { comparisonReference: toWesternDigits(scope.comparisonReference) } : {}),
    },
    summary: [
      { label: "الدورات المعروضة", value: formatAnalyticsNumber(analytics.points.length) },
      { label: "المحلات ضمن النطاق", value: formatAnalyticsNumber(analytics.totalStores) },
      { label: "متوسط منتجاتنا", value: sourcePresence.company === undefined ? "غير متاح" : `${sourcePresence.company}%` },
      { label: "متوسط المنافسين", value: sourcePresence.competitor === undefined ? "غير متاح" : `${sourcePresence.competitor}%` },
      ...(marketing ? [{ label: "الفعاليات المكتملة", value: formatAnalyticsNumber(marketing.eventStatusCounts?.completed || 0) }, { label: "المستفيدون", value: formatAnalyticsNumber(marketing.totalAttendees || 0) }] : []),
    ],
    cycleRows,
    marketingRows,
    marketingEvents,
    marketingGoals,
    marketingSignages,
    marketingStands,
    studiedStores: buildStudiedStoreRows(sources, options?.settings?.storeDetailDepth),
    decisionIndicators: buildDecisionIndicators(options?.decisionMetrics, options?.settings),
    dataWarnings: options?.settings?.reportTables.dataWarnings === false ? [] : options?.decisionMetrics?.dataWarnings || [],
    ...(options?.settings?.reportTables.regionMatrix !== false && options?.regionMatrix ? { regionMatrix: options.regionMatrix } : {}),
    ...(options?.settings?.reportTables.regionMatrix !== false && options?.categoryMatrices?.length ? { categoryMatrices: options.categoryMatrices } : {}),
    categorySourceAverages,
  };
}

export function flattenAnalyticsReportForExcel(report: AnalyticsReportData): Record<string, unknown>[] {
  return report.cycleRows.map((row) => ({
    "اسم التقرير": report.title,
    الاستبيان: report.scope.templateName,
    الدورة_المختارة: report.scope.cycleName,
    الماركة: report.scope.brandName,
    المنطقة: report.scope.regionName,
    المحل: report.scope.storeName,
    ...row,
  }));
}
