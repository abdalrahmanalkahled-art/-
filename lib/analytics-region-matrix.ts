import type { AnalyticsProductOption } from "./advanced-analytics";
import type { AnalyticsRegionMatrixSettings, PresenceBasis } from "./analytics-settings-model";
import type { SurveyResult } from "./types/survey-types";

export interface RegionMatrixCell {
  region: string;
  productId: string;
  productName: string;
  category?: string;
  type: "company" | "competitor";
  sampleSize: number;
  presentCount: number;
  storeCount: number;
  presencePercentage: number;
  averageShelfPercentage?: number;
  value: number;
}

export interface RegionMatrixData {
  regions: string[];
  products: AnalyticsProductOption[];
  cells: RegionMatrixCell[];
  metricLabel: string;
}

export interface RegionMatrixSelection {
  regionNames?: string[];
  productIds?: string[];
}

function normalizeRegion(value: string | undefined): string {
  return value?.trim() || "غير محددة";
}

function cellKey(region: string, productId: string): string {
  return `${region}::${productId}`;
}

export function buildRegionProductMatrix(
  results: SurveyResult[],
  productOptions: AnalyticsProductOption[],
  settings: AnalyticsRegionMatrixSettings,
  presenceBasis: PresenceBasis = "visits",
  selection: RegionMatrixSelection = {},
): RegionMatrixData {
  const visibleProducts = selection.productIds?.length ? productOptions.filter((product) => selection.productIds?.includes(product.id)) : productOptions;
  const optionIds = new Set(visibleProducts.map((product) => product.id));
  const regionNames = selection.regionNames?.length ? new Set(selection.regionNames) : undefined;
  const buckets = new Map<string, { region: string; product: AnalyticsProductOption; sampleSize: number; presentCount: number; shelfTotal: number; shelfCount: number; stores: Set<string> }>();
  const latestByStore = new Map<string, SurveyResult>();
  if (presenceBasis === "uniqueStores") results.forEach((result) => { const current = latestByStore.get(result.storeId); if (!current || new Date(result.surveyDate).getTime() >= new Date(current.surveyDate).getTime()) latestByStore.set(result.storeId, result); });
  const sourceResults = presenceBasis === "uniqueStores" ? Array.from(latestByStore.values()) : results;
  sourceResults.forEach((result) => {
    const region = normalizeRegion(result.storeRegion);
    if (regionNames && !regionNames.has(region)) return;
    result.data.forEach((row) => {
      if (!optionIds.has(row.productId)) return;
      const product = productOptions.find((item) => item.id === row.productId);
      if (!product) return;
      const key = cellKey(region, product.id);
      const current = buckets.get(key) || { region, product, sampleSize: 0, presentCount: 0, shelfTotal: 0, shelfCount: 0, stores: new Set<string>() };
      current.sampleSize += 1;
      current.presentCount += row.present ? 1 : 0;
      current.stores.add(result.storeId);
      if (typeof row.shelfPercentage === "number" && Number.isFinite(row.shelfPercentage)) { current.shelfTotal += row.shelfPercentage; current.shelfCount += 1; }
      buckets.set(key, current);
    });
  });
  const cells = Array.from(buckets.values()).map((bucket) => {
    const presencePercentage = bucket.sampleSize ? Math.round((bucket.presentCount / bucket.sampleSize) * 100) : 0;
    const averageShelfPercentage = bucket.shelfCount ? Math.round(bucket.shelfTotal / bucket.shelfCount) : undefined;
    return { region: bucket.region, productId: bucket.product.id, productName: bucket.product.name, category: bucket.product.category, type: bucket.product.type, sampleSize: bucket.sampleSize, presentCount: bucket.presentCount, storeCount: bucket.stores.size, presencePercentage, averageShelfPercentage, value: settings.metric === "shelf" ? averageShelfPercentage ?? 0 : presencePercentage };
  });
  const averageForRegion = (region: string) => {
    const values = cells.filter((cell) => cell.region === region).map((cell) => cell.value);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  };
  const averageForProduct = (id: string) => {
    const values = cells.filter((cell) => cell.productId === id).map((cell) => cell.value);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  };
  const sortedRegions = Array.from(new Set(cells.map((cell) => cell.region))).sort((first, second) => settings.sort === "alphabetical" ? first.localeCompare(second, "ar") : averageForRegion(first) - averageForRegion(second));
  const sortedProducts = [...visibleProducts].sort((first, second) => settings.sort === "alphabetical" ? first.name.localeCompare(second.name, "ar") : settings.sort === "weakest" ? averageForProduct(first.id) - averageForProduct(second.id) : 0);
  const regions = regionNames ? sortedRegions : sortedRegions.slice(0, settings.maxRegions);
  const products = selection.productIds?.length ? sortedProducts : sortedProducts.slice(0, settings.maxProducts);
  return { regions, products, cells: cells.filter((cell) => regions.includes(cell.region) && products.some((product) => product.id === cell.productId)), metricLabel: settings.metric === "shelf" ? "متوسط الظهور" : "نسبة التواجد" };
}

export function getRegionMatrixCell(matrix: RegionMatrixData, region: string, productId: string): RegionMatrixCell | undefined {
  return matrix.cells.find((cell) => cell.region === region && cell.productId === productId);
}
