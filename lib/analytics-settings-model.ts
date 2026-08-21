export type ChartType = "line" | "bar" | "pie" | "area" | "scatter" | "radar" | "candlestick";
export type ChartLabelSize = "small" | "medium" | "large";
export type ChartOrientation = "vertical" | "horizontal";
export type AnalyticsReportPurpose = "executive" | "field" | "comparison";
export type PresenceBasis = "visits" | "uniqueStores";
export type CategoryAggregation = "equalProducts" | "weightedBySample";
export type ProductSort = "template" | "highestPresence" | "largestDecline" | "alphabetical";
export type StoreDetailDepth = "latest" | "allVisits" | "firstVsLatest";
export type ComparisonReference = "none" | "previousCycle" | "firstInRange";
export type MatrixMetric = "presence" | "shelf";
export type MatrixSort = "template" | "weakest" | "alphabetical";
export type AnalyticsReportTable = "productDetails" | "studiedStores" | "marketing" | "decisionIndicators" | "dataWarnings" | "regionMatrix";

export interface AnalyticsEnabledIndicators {
  cycleChange: boolean;
  uniqueStorePresence: boolean;
  surveyCoverage: boolean;
  opportunityList: boolean;
  sampleConfidence: boolean;
}

export interface AnalyticsRegionMatrixSettings {
  enabled: boolean;
  metric: MatrixMetric;
  maxRegions: number;
  maxProducts: number;
  lowThreshold: number;
  highThreshold: number;
  sort: MatrixSort;
  showSampleSize: boolean;
  categoryMatricesEnabled: boolean;
  categoryMatrixCategoryNames: string[];
}

export interface AnalyticsReportTables {
  productDetails: boolean;
  studiedStores: boolean;
  marketing: boolean;
  decisionIndicators: boolean;
  dataWarnings: boolean;
  regionMatrix: boolean;
}

export interface AnalyticsSettings {
  chartType: ChartType;
  logoUri?: string;
  reportTables: AnalyticsReportTables;
  reportSectionOrder: AnalyticsReportTable[];
  showChartValues: boolean;
  showChartProductNames: boolean;
  chartLabelSize: ChartLabelSize;
  rotateProductNames: boolean;
  chartOrientation: ChartOrientation;
  horizontalBarMaxItems: number;
  reportPurpose: AnalyticsReportPurpose;
  presenceBasis: PresenceBasis;
  categoryAggregation: CategoryAggregation;
  productSort: ProductSort;
  storeDetailDepth: StoreDetailDepth;
  comparisonReference: ComparisonReference;
  lowSampleThreshold: number;
  strongSampleThreshold: number;
  opportunityThreshold: number;
  enabledIndicators: AnalyticsEnabledIndicators;
  regionMatrix: AnalyticsRegionMatrixSettings;
}

export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettings = {
  chartType: "line",
  reportTables: { productDetails: true, studiedStores: true, marketing: true, decisionIndicators: true, dataWarnings: true, regionMatrix: true },
  reportSectionOrder: ["productDetails", "studiedStores", "marketing", "decisionIndicators", "dataWarnings", "regionMatrix"],
  showChartValues: false,
  showChartProductNames: false,
  chartLabelSize: "medium",
  rotateProductNames: false,
  chartOrientation: "vertical",
  horizontalBarMaxItems: 10,
  reportPurpose: "executive",
  presenceBasis: "visits",
  categoryAggregation: "equalProducts",
  productSort: "template",
  storeDetailDepth: "latest",
  comparisonReference: "previousCycle",
  lowSampleThreshold: 5,
  strongSampleThreshold: 15,
  opportunityThreshold: 50,
  enabledIndicators: { cycleChange: true, uniqueStorePresence: true, surveyCoverage: true, opportunityList: true, sampleConfidence: true },
  regionMatrix: { enabled: true, metric: "presence", maxRegions: 8, maxProducts: 8, lowThreshold: 40, highThreshold: 70, sort: "template", showSampleSize: true, categoryMatricesEnabled: false, categoryMatrixCategoryNames: [] },
};

const CHART_TYPES: ChartType[] = ["line", "bar", "pie", "area", "scatter", "radar", "candlestick"];
const CHART_LABEL_SIZES: ChartLabelSize[] = ["small", "medium", "large"];
const CHART_ORIENTATIONS: ChartOrientation[] = ["vertical", "horizontal"];
const REPORT_PURPOSES: AnalyticsReportPurpose[] = ["executive", "field", "comparison"];
const PRESENCE_BASES: PresenceBasis[] = ["visits", "uniqueStores"];
const CATEGORY_AGGREGATIONS: CategoryAggregation[] = ["equalProducts", "weightedBySample"];
const PRODUCT_SORTS: ProductSort[] = ["template", "highestPresence", "largestDecline", "alphabetical"];
const STORE_DETAIL_DEPTHS: StoreDetailDepth[] = ["latest", "allVisits", "firstVsLatest"];
const COMPARISON_REFERENCES: ComparisonReference[] = ["none", "previousCycle", "firstInRange"];
const MATRIX_METRICS: MatrixMetric[] = ["presence", "shelf"];
const MATRIX_SORTS: MatrixSort[] = ["template", "weakest", "alphabetical"];
const REPORT_SECTION_ORDER: AnalyticsReportTable[] = ["productDetails", "studiedStores", "marketing", "decisionIndicators", "dataWarnings", "regionMatrix"];

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : fallback;
}

function normalizeReportSectionOrder(value: unknown): AnalyticsReportTable[] {
  const selected = Array.isArray(value) ? value.filter((item): item is AnalyticsReportTable => typeof item === "string" && REPORT_SECTION_ORDER.includes(item as AnalyticsReportTable)) : [];
  return [...Array.from(new Set(selected)), ...REPORT_SECTION_ORDER.filter((item) => !selected.includes(item))];
}

export function normalizeAnalyticsSettings(value: unknown): AnalyticsSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_ANALYTICS_SETTINGS };
  const candidate = value as Partial<AnalyticsSettings>;
  return {
    chartType: CHART_TYPES.includes(candidate.chartType as ChartType) ? candidate.chartType as ChartType : DEFAULT_ANALYTICS_SETTINGS.chartType,
    reportTables: {
      productDetails: candidate.reportTables?.productDetails !== false,
      studiedStores: candidate.reportTables?.studiedStores !== false,
      marketing: candidate.reportTables?.marketing !== false,
      decisionIndicators: candidate.reportTables?.decisionIndicators !== false,
      dataWarnings: candidate.reportTables?.dataWarnings !== false,
      regionMatrix: candidate.reportTables?.regionMatrix !== false,
    },
    reportSectionOrder: normalizeReportSectionOrder(candidate.reportSectionOrder),
    showChartValues: candidate.showChartValues === true,
    showChartProductNames: candidate.showChartProductNames === true,
    chartLabelSize: CHART_LABEL_SIZES.includes(candidate.chartLabelSize as ChartLabelSize) ? candidate.chartLabelSize as ChartLabelSize : DEFAULT_ANALYTICS_SETTINGS.chartLabelSize,
    rotateProductNames: candidate.rotateProductNames === true,
    chartOrientation: CHART_ORIENTATIONS.includes(candidate.chartOrientation as ChartOrientation) ? candidate.chartOrientation as ChartOrientation : DEFAULT_ANALYTICS_SETTINGS.chartOrientation,
    horizontalBarMaxItems: boundedInteger(candidate.horizontalBarMaxItems, DEFAULT_ANALYTICS_SETTINGS.horizontalBarMaxItems, 2, 30),
    reportPurpose: REPORT_PURPOSES.includes(candidate.reportPurpose as AnalyticsReportPurpose) ? candidate.reportPurpose as AnalyticsReportPurpose : DEFAULT_ANALYTICS_SETTINGS.reportPurpose,
    presenceBasis: PRESENCE_BASES.includes(candidate.presenceBasis as PresenceBasis) ? candidate.presenceBasis as PresenceBasis : DEFAULT_ANALYTICS_SETTINGS.presenceBasis,
    categoryAggregation: CATEGORY_AGGREGATIONS.includes(candidate.categoryAggregation as CategoryAggregation) ? candidate.categoryAggregation as CategoryAggregation : DEFAULT_ANALYTICS_SETTINGS.categoryAggregation,
    productSort: PRODUCT_SORTS.includes(candidate.productSort as ProductSort) ? candidate.productSort as ProductSort : DEFAULT_ANALYTICS_SETTINGS.productSort,
    storeDetailDepth: STORE_DETAIL_DEPTHS.includes(candidate.storeDetailDepth as StoreDetailDepth) ? candidate.storeDetailDepth as StoreDetailDepth : DEFAULT_ANALYTICS_SETTINGS.storeDetailDepth,
    comparisonReference: COMPARISON_REFERENCES.includes(candidate.comparisonReference as ComparisonReference) ? candidate.comparisonReference as ComparisonReference : DEFAULT_ANALYTICS_SETTINGS.comparisonReference,
    lowSampleThreshold: boundedInteger(candidate.lowSampleThreshold, DEFAULT_ANALYTICS_SETTINGS.lowSampleThreshold, 1, 1000),
    strongSampleThreshold: boundedInteger(candidate.strongSampleThreshold, DEFAULT_ANALYTICS_SETTINGS.strongSampleThreshold, 2, 5000),
    opportunityThreshold: boundedInteger(candidate.opportunityThreshold, DEFAULT_ANALYTICS_SETTINGS.opportunityThreshold, 0, 100),
    enabledIndicators: {
      cycleChange: candidate.enabledIndicators?.cycleChange !== false,
      uniqueStorePresence: candidate.enabledIndicators?.uniqueStorePresence !== false,
      surveyCoverage: candidate.enabledIndicators?.surveyCoverage !== false,
      opportunityList: candidate.enabledIndicators?.opportunityList !== false,
      sampleConfidence: candidate.enabledIndicators?.sampleConfidence !== false,
    },
    regionMatrix: {
      enabled: candidate.regionMatrix?.enabled !== false,
      metric: MATRIX_METRICS.includes(candidate.regionMatrix?.metric as MatrixMetric) ? candidate.regionMatrix?.metric as MatrixMetric : DEFAULT_ANALYTICS_SETTINGS.regionMatrix.metric,
      maxRegions: boundedInteger(candidate.regionMatrix?.maxRegions, DEFAULT_ANALYTICS_SETTINGS.regionMatrix.maxRegions, 1, 20),
      maxProducts: boundedInteger(candidate.regionMatrix?.maxProducts, DEFAULT_ANALYTICS_SETTINGS.regionMatrix.maxProducts, 1, 20),
      lowThreshold: boundedInteger(candidate.regionMatrix?.lowThreshold, DEFAULT_ANALYTICS_SETTINGS.regionMatrix.lowThreshold, 0, 99),
      highThreshold: boundedInteger(candidate.regionMatrix?.highThreshold, DEFAULT_ANALYTICS_SETTINGS.regionMatrix.highThreshold, 1, 100),
      sort: MATRIX_SORTS.includes(candidate.regionMatrix?.sort as MatrixSort) ? candidate.regionMatrix?.sort as MatrixSort : DEFAULT_ANALYTICS_SETTINGS.regionMatrix.sort,
      showSampleSize: candidate.regionMatrix?.showSampleSize !== false,
      categoryMatricesEnabled: candidate.regionMatrix?.categoryMatricesEnabled === true,
      categoryMatrixCategoryNames: Array.isArray(candidate.regionMatrix?.categoryMatrixCategoryNames) ? Array.from(new Set(candidate.regionMatrix.categoryMatrixCategoryNames.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))) : [],
    },
    ...(typeof candidate.logoUri === "string" && candidate.logoUri.trim() ? { logoUri: candidate.logoUri } : {}),
  };
}
