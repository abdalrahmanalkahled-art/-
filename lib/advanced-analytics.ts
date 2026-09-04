import type { Product, Store, SurveyCycle, SurveyNoteType, SurveyResult } from "./types/survey-types";

export interface AdvancedAnalyticsData {
  totalSurveys: number;
  averagePresence: number;
  regionAnalysis: { region: string; surveys: number; averagePresence: number; stores: number }[];
  storeAnalysis: { storeId: string; storeName: string; region: string; surveyCount: number; averagePresence: number; trend: "up" | "down" | "stable" }[];
  productAnalysis: { productName: string; presenceCount: number; presencePercentage: number; type: "company" | "competitor" }[];
  notesAnalysis: { complaints: number; suggestions: number; recommendations: number };
}

export interface AdvancedAnalyticsFilters {
  templateId?: string;
  cycleIds?: string[];
  productIds?: string[];
  brandName?: string;
  regionName?: string;
  storeIds?: string[];
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface AnalyticsProductOption {
  id: string;
  name: string;
  brandName?: string;
  category?: string;
  type: "company" | "competitor";
}

export interface CycleProductPresence {
  productId: string;
  productName: string;
  brandName?: string;
  category?: string;
  type: "company" | "competitor";
  color: string;
  presencePercentage: number;
  presentCount: number;
  sampleSize: number;
  averageShelfPercentage?: number;
  averagePrice?: number;
}

export interface CyclePresencePoint {
  cycleId: string;
  cycleName: string;
  startDate: string;
  endDate: string;
  surveyCount: number;
  storeCount: number;
  products: CycleProductPresence[];
}

export interface AdvancedSurveyAnalytics {
  points: CyclePresencePoint[];
  productOptions: AnalyticsProductOption[];
  totalSurveys: number;
  totalStores: number;
  averagePresence: number;
  notes: TrackingNote[];
  noteCounts: Record<SurveyNoteType, number>;
}

export interface TrackingNote {
  id: string;
  type: SurveyNoteType;
  text: string;
  surveyDate: string;
  cycleId: string;
  cycleName: string;
  storeId: string;
  storeName: string;
  region: string;
}

export const PRODUCT_SERIES_COLORS = ["#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#0E9F6E", "#0891B2", "#CA8A04", "#64748B"];
const EMPTY_NOTE_COUNTS: Record<SurveyNoteType, number> = { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 };

function orderIdsByTemplate(ids: string[], products: Product[], templateProductIds: readonly string[]): string[] {
  const catalog = new Map(products.map((product) => [product.id, product]));
  const positions = new Map(templateProductIds.map((id, index) => [id, index]));
  const missingPosition = Number.MAX_SAFE_INTEGER;
  return [...ids].sort((first, second) => {
    const positionDifference = (positions.get(first) ?? missingPosition) - (positions.get(second) ?? missingPosition);
    if (positionDifference) return positionDifference;
    return (catalog.get(first)?.name || first).localeCompare(catalog.get(second)?.name || second, "ar");
  });
}

function surveyPresence(survey: SurveyResult): number {
  if (!survey.data?.length) return 0;
  return Math.round((survey.data.filter((item) => item.present).length / survey.data.length) * 100);
}

export function filterSurveyResultsByDate(results: SurveyResult[], startDate: Date | null, endDate: Date | null): SurveyResult[] {
  if (!startDate || !endDate) return results;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return results.filter((result) => {
    const date = new Date(result.surveyDate);
    return date >= start && date <= end;
  });
}

function resultCycleKey(result: SurveyResult): string {
  return result.cycleId || `legacy-${result.surveyDate.slice(0, 10)}`;
}

export function filterAdvancedSurveyResults(results: SurveyResult[], stores: Store[], products: Product[], filters: AdvancedAnalyticsFilters): SurveyResult[] {
  const storeMap = new Map(stores.map((store) => [store.id, store]));
  const productMap = new Map(products.map((product) => [product.id, product]));
  const selectedStoreIds = filters.storeIds?.length ? new Set(filters.storeIds) : null;
  const selectedCycleIds = filters.cycleIds?.length ? new Set(filters.cycleIds) : null;
  const selectedProductIds = filters.productIds?.length ? new Set(filters.productIds) : null;
  const dated = filterSurveyResultsByDate(results, filters.startDate ?? null, filters.endDate ?? null);
  return dated.filter((result) => {
    if (filters.templateId && result.templateId !== filters.templateId) return false;
    if (selectedCycleIds && !selectedCycleIds.has(resultCycleKey(result))) return false;
    if (selectedStoreIds && !selectedStoreIds.has(result.storeId)) return false;
    const region = result.storeRegion || storeMap.get(result.storeId)?.region || "غير محددة";
    if (filters.regionName && region !== filters.regionName) return false;
    if (filters.brandName && !result.data.some((item) => productMap.get(item.productId)?.brandName === filters.brandName)) return false;
    if (selectedProductIds && !result.data.some((item) => selectedProductIds.has(item.productId))) return false;
    return true;
  });
}

export function getAnalyticsProductOptions(results: SurveyResult[], products: Product[], templateId?: string, templateProductIds: readonly string[] = []): AnalyticsProductOption[] {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const seen = new Set<string>();
  results.forEach((result) => {
    if (!templateId || result.templateId === templateId) result.data.forEach((item) => seen.add(item.productId));
  });
  const optionsById = new Map(Array.from(seen).map((id) => {
    const catalog = productMap.get(id);
    const row = results.flatMap((result) => result.data).find((item) => item.productId === id);
    return { id, name: row?.productName || catalog?.name || "منتج غير معروف", brandName: catalog?.brandName, category: catalog?.categoryName || "بدون تصنيف", type: catalog?.type || "company" };
  }).map((option) => [option.id, option]));
  return orderIdsByTemplate(Array.from(seen), products, templateProductIds).map((id) => optionsById.get(id)!).filter(Boolean);
}

export function calculateCyclePresenceSeries(results: SurveyResult[], stores: Store[], products: Product[], cycles: SurveyCycle[], filters: AdvancedAnalyticsFilters, templateProductIds: readonly string[] = []): AdvancedSurveyAnalytics {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const filtered = filterAdvancedSurveyResults(results, stores, products, filters);
  const selectedProducts = filters.productIds?.length ? new Set(filters.productIds) : null;
  const groups = new Map<string, SurveyResult[]>();
  filtered.forEach((result) => {
    const key = resultCycleKey(result);
    groups.set(key, [...(groups.get(key) || []), result]);
  });
  const cycleMap = new Map(cycles.map((cycle) => [cycle.id, cycle]));
  const productIds = orderIdsByTemplate(Array.from(new Set(filtered.flatMap((result) => result.data.map((item) => item.productId)))).filter((id) => {
    const catalog = productMap.get(id);
    return (!selectedProducts || selectedProducts.has(id)) && (!filters.brandName || catalog?.brandName === filters.brandName);
  }), products, templateProductIds);
  const colorByProduct = new Map(productIds.map((id, index) => [id, PRODUCT_SERIES_COLORS[index % PRODUCT_SERIES_COLORS.length]]));
  const points = Array.from(groups.entries()).map(([cycleId, group]) => {
    const cycle = cycleMap.get(cycleId);
    const dates = group.map((result) => result.surveyDate).sort();
    const productSeries = productIds.map((productId) => {
      const rows = group.flatMap((result) => result.data.filter((item) => item.productId === productId));
      const shelfRows = group.flatMap((result) => result.hasShelfPercentage === false ? [] : result.data.filter((item) => item.productId === productId && item.present && Number.isFinite(item.shelfPercentage)));
      const priceRows = group.flatMap((result) => result.hasProductPrice === false ? [] : result.data.filter((item) => item.productId === productId && item.present && Number.isFinite(item.price)));
      const catalog = productMap.get(productId);
      const presentCount = rows.filter((row) => row.present).length;
      return {
        productId,
        productName: catalog?.name || rows[0]?.productName || "منتج غير معروف",
        brandName: catalog?.brandName,
        category: catalog?.categoryName || "بدون تصنيف",
        type: catalog?.type || "company",
        color: colorByProduct.get(productId) || PRODUCT_SERIES_COLORS[0],
        presencePercentage: rows.length ? Math.round((presentCount / rows.length) * 100) : 0,
        presentCount,
        sampleSize: rows.length,
        averageShelfPercentage: shelfRows.length ? Math.round(shelfRows.reduce((sum, row) => sum + (Number(row.shelfPercentage) || 0), 0) / shelfRows.length) : undefined,
        averagePrice: priceRows.length ? Math.round((priceRows.reduce((sum, row) => sum + (row.price || 0), 0) / priceRows.length) * 100) / 100 : undefined,
      } satisfies CycleProductPresence;
    });
    return {
      cycleId,
      cycleName: cycle?.name || group[0]?.cycleName || "الدورة الحالية",
      startDate: cycle?.startDate || dates[0] || new Date().toISOString(),
      endDate: cycle?.endDate || dates[dates.length - 1] || new Date().toISOString(),
      surveyCount: group.length,
      storeCount: new Set(group.map((result) => result.storeId)).size,
      products: productSeries,
    } satisfies CyclePresencePoint;
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const averagePresence = filtered.length ? Math.round(filtered.reduce((sum, result) => sum + surveyPresence(result), 0) / filtered.length) : 0;
  const notes = filtered.flatMap((result) => result.notes?.trim() && result.noteType ? [{
    id: result.id,
    type: result.noteType,
    text: result.notes.trim(),
    surveyDate: result.surveyDate,
    cycleId: resultCycleKey(result),
    cycleName: cycleMap.get(resultCycleKey(result))?.name || result.cycleName || "الدورة الحالية",
    storeId: result.storeId,
    storeName: result.storeName,
    region: result.storeRegion || stores.find((store) => store.id === result.storeId)?.region || "غير محددة",
  }] satisfies TrackingNote[] : []).sort((first, second) => second.surveyDate.localeCompare(first.surveyDate));
  const noteCounts = notes.reduce<Record<SurveyNoteType, number>>((counts, note) => ({ ...counts, [note.type]: counts[note.type] + 1 }), { ...EMPTY_NOTE_COUNTS });
  return { points, productOptions: getAnalyticsProductOptions(filtered, products, filters.templateId, templateProductIds).filter((option) => productIds.includes(option.id)), totalSurveys: filtered.length, totalStores: new Set(filtered.map((result) => result.storeId)).size, averagePresence, notes, noteCounts };
}

export function calculateAdvancedAnalytics(results: SurveyResult[], stores: Store[], products: Product[]): AdvancedAnalyticsData | null {
  if (results.length === 0) return null;

  const totalSurveys = results.length;
  const averagePresence = Math.round(results.reduce((sum, survey) => sum + surveyPresence(survey), 0) / totalSurveys);

  const regions = new Map<string, { surveys: number; totalPresence: number; storeIds: Set<string> }>();
  const storesById = new Map<string, SurveyResult[]>();
  const productStats = new Map<string, { name: string; type: "company" | "competitor"; present: number; total: number }>();
  const notesAnalysis = { complaints: 0, suggestions: 0, recommendations: 0 };

  results.forEach((survey) => {
    const region = survey.storeRegion || stores.find((store) => store.id === survey.storeId)?.region || "غير محددة";
    const regionStats = regions.get(region) || { surveys: 0, totalPresence: 0, storeIds: new Set<string>() };
    regionStats.surveys += 1;
    regionStats.totalPresence += surveyPresence(survey);
    regionStats.storeIds.add(survey.storeId);
    regions.set(region, regionStats);

    storesById.set(survey.storeId, [...(storesById.get(survey.storeId) || []), survey]);

    survey.data.forEach((item) => {
      const catalogProduct = products.find((product) => product.id === item.productId);
      const current = productStats.get(item.productId) || {
        name: item.productName || catalogProduct?.name || "منتج غير معروف",
        type: catalogProduct?.type || "company",
        present: 0,
        total: 0,
      };
      current.total += 1;
      if (item.present) current.present += 1;
      productStats.set(item.productId, current);
    });

    if (survey.notes?.trim()) {
      if (survey.noteType === "complaint") notesAnalysis.complaints += 1;
      else if (survey.noteType === "suggestion") notesAnalysis.suggestions += 1;
      else if (survey.noteType === "recommendation") notesAnalysis.recommendations += 1;
    }
  });

  const regionAnalysis = Array.from(regions.entries())
    .map(([region, value]) => ({ region, surveys: value.surveys, averagePresence: Math.round(value.totalPresence / value.surveys), stores: value.storeIds.size }))
    .sort((a, b) => b.averagePresence - a.averagePresence);

  const storeAnalysis = Array.from(storesById.entries())
    .map(([storeId, surveys]) => {
      const ordered = [...surveys].sort((a, b) => a.surveyDate.localeCompare(b.surveyDate));
      const values = ordered.map(surveyPresence);
      const midpoint = Math.ceil(values.length / 2);
      const first = values.slice(0, midpoint);
      const second = values.slice(midpoint);
      const firstAverage = first.reduce((sum, value) => sum + value, 0) / first.length;
      const secondAverage = second.length ? second.reduce((sum, value) => sum + value, 0) / second.length : firstAverage;
      const trend: "up" | "down" | "stable" = secondAverage > firstAverage + 5 ? "up" : secondAverage < firstAverage - 5 ? "down" : "stable";
      const store = stores.find((item) => item.id === storeId);
      return {
        storeId,
        storeName: ordered[0]?.storeName || store?.name || "محل غير معروف",
        region: ordered[0]?.storeRegion || store?.region || "",
        surveyCount: surveys.length,
        averagePresence: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
        trend,
      };
    })
    .sort((a, b) => b.averagePresence - a.averagePresence);

  const productAnalysis = Array.from(productStats.values())
    .map((product) => ({
      productName: product.name,
      presenceCount: product.present,
      presencePercentage: Math.round((product.present / product.total) * 100),
      type: product.type,
    }))
    .sort((a, b) => b.presencePercentage - a.presencePercentage);

  return { totalSurveys, averagePresence, regionAnalysis, storeAnalysis, productAnalysis, notesAnalysis };
}
