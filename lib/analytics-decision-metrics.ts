import type { AnalyticsEnabledIndicators, ComparisonReference, ProductSort } from "./analytics-settings-model";
import type { AdvancedSurveyAnalytics, AdvancedAnalyticsFilters, CycleProductPresence } from "./advanced-analytics";
import type { Store, SurveyResult } from "./types/survey-types";

export type SampleConfidence = "low" | "adequate" | "strong";

export interface CycleChangeMetric {
  productId: string;
  productName: string;
  currentPresence: number;
  previousPresence?: number;
  change: number;
}

export interface UniqueStorePresenceMetric {
  productId: string;
  productName: string;
  presentStores: number;
  observedStores: number;
  presencePercentage: number;
}

export interface SampleConfidenceMetric {
  productId: string;
  productName: string;
  sampleSize: number;
  confidence: SampleConfidence;
}

export interface OpportunityMetric {
  productId: string;
  productName: string;
  presencePercentage: number;
  sampleSize: number;
  cycleChange?: number;
}

export interface SurveyCoverageMetric {
  eligibleStores: number;
  surveyedStores: number;
  percentage: number;
}

export interface AnalyticsDecisionMetrics {
  cycleChanges: CycleChangeMetric[];
  uniqueStorePresence: UniqueStorePresenceMetric[];
  sampleConfidence: SampleConfidenceMetric[];
  opportunities: OpportunityMetric[];
  surveyCoverage: SurveyCoverageMetric;
  dataWarnings: string[];
}

/** يعيد ترتيب جميع سلاسل المنتج دون تعديل قيمها أو ترتيب الدورات. */
export function sortAnalyticsProducts(analytics: AdvancedSurveyAnalytics, sort: ProductSort): AdvancedSurveyAnalytics {
  if (sort === "template") return analytics;
  const latest = analytics.points.at(-1)?.products || [];
  const previous = new Map((analytics.points.at(-2)?.products || []).map((product) => [product.productId, product.presencePercentage]));
  const values = new Map(latest.map((product) => [product.productId, {
    presence: product.presencePercentage,
    decline: product.presencePercentage - (previous.get(product.productId) ?? product.presencePercentage),
    name: product.productName,
  }]));
  const compare = (first: string, second: string) => {
    const a = values.get(first); const b = values.get(second);
    if (!a || !b) return 0;
    if (sort === "highestPresence") return b.presence - a.presence || a.name.localeCompare(b.name, "ar");
    if (sort === "largestDecline") return a.decline - b.decline || a.name.localeCompare(b.name, "ar");
    return a.name.localeCompare(b.name, "ar");
  };
  const order = new Map(latest.map((product) => product.productId).sort(compare).map((id, index) => [id, index]));
  const orderProducts = <T extends { productId: string }>(products: T[]): T[] => [...products].sort((first, second) => (order.get(first.productId) ?? Number.MAX_SAFE_INTEGER) - (order.get(second.productId) ?? Number.MAX_SAFE_INTEGER));
  const orderOptions = [...analytics.productOptions].sort((first, second) => (order.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(second.id) ?? Number.MAX_SAFE_INTEGER));
  return { ...analytics, points: analytics.points.map((point) => ({ ...point, products: orderProducts(point.products) })), productOptions: orderOptions };
}

function latestProductSeries(analytics: AdvancedSurveyAnalytics): CycleProductPresence[] {
  return analytics.points.at(-1)?.products || [];
}

function chooseLatestResultByStore(results: SurveyResult[]): SurveyResult[] {
  const latest = new Map<string, SurveyResult>();
  results.forEach((result) => {
    const current = latest.get(result.storeId);
    const currentDate = current ? new Date(current.surveyDate).getTime() : -Infinity;
    if (!current || new Date(result.surveyDate).getTime() >= currentDate) latest.set(result.storeId, result);
  });
  return Array.from(latest.values());
}

function confidenceFor(sampleSize: number, lowThreshold: number, strongThreshold: number): SampleConfidence {
  if (sampleSize < lowThreshold) return "low";
  if (sampleSize >= strongThreshold) return "strong";
  return "adequate";
}

export function calculateAnalyticsDecisionMetrics(
  analytics: AdvancedSurveyAnalytics,
  filteredResults: SurveyResult[],
  activeStores: Store[],
  filters: AdvancedAnalyticsFilters,
  options: { lowSampleThreshold: number; strongSampleThreshold: number; opportunityThreshold: number; comparisonReference: ComparisonReference; enabledIndicators: AnalyticsEnabledIndicators },
): AnalyticsDecisionMetrics {
  const latestSeries = latestProductSeries(analytics);
  const previousSeries = options.comparisonReference === "none" ? [] : options.comparisonReference === "firstInRange" ? analytics.points.length > 1 ? analytics.points[0]?.products || [] : [] : analytics.points.length > 1 ? analytics.points.at(-2)?.products || [] : [];
  const previousByProduct = new Map(previousSeries.map((product) => [product.productId, product]));
  const cycleChanges = latestSeries.map((product) => ({
    productId: product.productId,
    productName: product.productName,
    currentPresence: product.presencePercentage,
    previousPresence: previousByProduct.get(product.productId)?.presencePercentage,
    change: product.presencePercentage - (previousByProduct.get(product.productId)?.presencePercentage ?? product.presencePercentage),
  }));

  const latestByStore = chooseLatestResultByStore(filteredResults);
  const uniqueStorePresence = latestSeries.map((product) => {
    const rows = latestByStore.flatMap((result) => result.data.filter((item) => item.productId === product.productId));
    const presentStores = rows.filter((row) => row.present).length;
    return {
      productId: product.productId,
      productName: product.productName,
      presentStores,
      observedStores: rows.length,
      presencePercentage: rows.length ? Math.round((presentStores / rows.length) * 100) : 0,
    };
  });

  const sampleConfidence = latestSeries.map((product) => ({
    productId: product.productId,
    productName: product.productName,
    sampleSize: product.sampleSize,
    confidence: confidenceFor(product.sampleSize, options.lowSampleThreshold, options.strongSampleThreshold),
  }));
  const confidenceByProduct = new Map(sampleConfidence.map((metric) => [metric.productId, metric]));
  const changeByProduct = new Map(cycleChanges.map((metric) => [metric.productId, metric]));
  const opportunities = latestSeries
    .filter((product) => product.presencePercentage <= options.opportunityThreshold && (confidenceByProduct.get(product.productId)?.confidence !== "low"))
    .filter((product) => {
      const change = changeByProduct.get(product.productId);
      return change?.previousPresence === undefined || change.change <= 0;
    })
    .map((product) => ({ productId: product.productId, productName: product.productName, presencePercentage: product.presencePercentage, sampleSize: product.sampleSize, cycleChange: changeByProduct.get(product.productId)?.previousPresence === undefined ? undefined : changeByProduct.get(product.productId)?.change }));

  const eligibleStores = activeStores.filter((store) => {
    if (!store.isActive) return false;
    if (filters.regionName && store.region !== filters.regionName) return false;
    if (filters.storeIds?.length && !filters.storeIds.includes(store.id)) return false;
    return true;
  });
  const surveyedStores = new Set(filteredResults.map((result) => result.storeId)).size;
  const surveyCoverage = {
    eligibleStores: eligibleStores.length,
    surveyedStores,
    percentage: eligibleStores.length ? Math.round((surveyedStores / eligibleStores.length) * 100) : 0,
  };
  const lowSamples = sampleConfidence.filter((item) => item.confidence === "low");
  const dataWarnings = [
    ...(analytics.points.some((point) => point.cycleId.startsWith("legacy-")) ? ["يتضمن التحليل نتائج تاريخية غير مرتبطة بدورة محددة."] : []),
    ...(lowSamples.length ? [`${lowSamples.length} منتجاً بعينة منخفضة؛ فسّر النسب بحذر.`] : []),
    ...(surveyCoverage.eligibleStores > 0 && surveyCoverage.percentage < 50 ? ["تغطية المحلات ضمن النطاق أقل من 50%." ] : []),
  ];
  return { cycleChanges, uniqueStorePresence, sampleConfidence, opportunities, surveyCoverage, dataWarnings };
}
