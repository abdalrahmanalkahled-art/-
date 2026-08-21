import { describe, expect, it } from "vitest";

import { DEFAULT_ANALYTICS_SETTINGS, normalizeAnalyticsSettings } from "../analytics-settings-model";

describe("إعدادات التحليلات", () => {
  it("يعيد الإعداد الافتراضي عند غياب بيانات صالحة", () => {
    expect(normalizeAnalyticsSettings(undefined)).toEqual(DEFAULT_ANALYTICS_SETTINGS);
    expect(normalizeAnalyticsSettings({ chartType: "غير مدعوم" })).toEqual(DEFAULT_ANALYTICS_SETTINGS);
  });

  it("يحافظ على نوع المخطط المدعوم ومسار الشعار غير الفارغ", () => {
    expect(normalizeAnalyticsSettings({ chartType: "radar", logoUri: "file:///logo.png" })).toMatchObject({ chartType: "radar", logoUri: "file:///logo.png", reportTables: { productDetails: true, studiedStores: true, marketing: true }, showChartValues: false, showChartProductNames: false, chartLabelSize: "medium", rotateProductNames: false });
  });

  it("يحفظ خيارات الجداول وتسميات المخطط المدعومة", () => {
    expect(normalizeAnalyticsSettings({ chartType: "bar", showChartValues: true, showChartProductNames: true, chartLabelSize: "large", rotateProductNames: true, reportTables: { productDetails: false, studiedStores: true, marketing: false } })).toMatchObject({ chartType: "bar", showChartValues: true, showChartProductNames: true, chartLabelSize: "large", rotateProductNames: true, reportTables: { productDetails: false, studiedStores: true, marketing: false } });
  });

  it("يحفظ اتجاه مخطط الأعمدة وحد تقسيم التقرير ضمن النطاق الآمن", () => {
    expect(normalizeAnalyticsSettings({ chartType: "bar", chartOrientation: "horizontal", horizontalBarMaxItems: 8 })).toMatchObject({ chartOrientation: "horizontal", horizontalBarMaxItems: 8 });
    expect(normalizeAnalyticsSettings({ chartOrientation: "غير صالح", horizontalBarMaxItems: 99 })).toMatchObject({ chartOrientation: "vertical", horizontalBarMaxItems: 30 });
  });

  it("يطبع إعدادات المنهجية والمؤشرات الجديدة ضمن الحدود الآمنة", () => {
    const settings = normalizeAnalyticsSettings({ reportPurpose: "comparison", presenceBasis: "uniqueStores", categoryAggregation: "equalProducts", productSort: "largestDecline", storeDetailDepth: "firstVsLatest", comparisonReference: "firstInRange", lowSampleThreshold: 4, strongSampleThreshold: 20, opportunityThreshold: 45, enabledIndicators: { cycleChange: false, uniqueStorePresence: true, surveyCoverage: false, opportunityList: true, sampleConfidence: false }, reportTables: { decisionIndicators: false, dataWarnings: true } });
    expect(settings).toMatchObject({ reportPurpose: "comparison", presenceBasis: "uniqueStores", categoryAggregation: "equalProducts", productSort: "largestDecline", storeDetailDepth: "firstVsLatest", comparisonReference: "firstInRange", lowSampleThreshold: 4, strongSampleThreshold: 20, opportunityThreshold: 45, enabledIndicators: { cycleChange: false, surveyCoverage: false, sampleConfidence: false }, reportTables: { decisionIndicators: false, dataWarnings: true } });
  });

  it("يحفظ إعدادات المصفوفة ضمن حدود آمنة مع الإعدادات السابقة", () => {
    const settings = normalizeAnalyticsSettings({ regionMatrix: { enabled: false, metric: "shelf", maxRegions: 99, maxProducts: 3, lowThreshold: -3, highThreshold: 150, sort: "weakest", showSampleSize: false } });
    expect(settings.regionMatrix).toEqual({ enabled: false, metric: "shelf", maxRegions: 20, maxProducts: 3, lowThreshold: 0, highThreshold: 100, sort: "weakest", showSampleSize: false, categoryMatricesEnabled: false, categoryMatrixCategoryNames: [] });
  });

  it("يسمح بإخفاء المصفوفة من محتوى التقرير دون إيقافها داخل التطبيق", () => {
    expect(normalizeAnalyticsSettings({ reportTables: { regionMatrix: false }, regionMatrix: { enabled: true } }).reportTables.regionMatrix).toBe(false);
    expect(normalizeAnalyticsSettings({ reportTables: {} }).reportTables.regionMatrix).toBe(true);
  });

  it("يحافظ على ترتيب أقسام التقرير المخصص ويضيف الأقسام الغائبة بأمان", () => {
    expect(normalizeAnalyticsSettings({ reportSectionOrder: ["regionMatrix", "marketing", "regionMatrix", "غير صالح"] }).reportSectionOrder).toEqual(["regionMatrix", "marketing", "productDetails", "studiedStores", "decisionIndicators", "dataWarnings"]);
  });
});
