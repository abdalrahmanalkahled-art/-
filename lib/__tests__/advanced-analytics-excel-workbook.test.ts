import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { buildAnalyticsReportData } from "../advanced-analytics-report";
import { buildAdvancedAnalyticsWorkbook } from "../advanced-analytics-excel-workbook";
import { DEFAULT_ANALYTICS_SETTINGS } from "../analytics-settings-model";

describe("مصنف Excel للتحليلات المتقدمة", () => {
  it("ينشئ أوراقاً عربية مرتبة مع اتجاه من اليمين إلى اليسار", () => {
    const analytics = { points: [{ cycleId: "c1", cycleName: "دورة نيسان", startDate: "2026-04-01", endDate: "2026-04-15", surveyCount: 1, storeCount: 1, products: [{ productId: "p1", productName: "منتج مدار", type: "company" as const, color: "#2563EB", presencePercentage: 100, presentCount: 1, sampleSize: 1 }] }], productOptions: [], totalSurveys: 1, totalStores: 1, averagePresence: 100, notes: [], noteCounts: { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 } };
    const report = buildAnalyticsReportData(analytics, { analysisName: "استبيان", templateName: "دراسة", cycleName: "كل الدورات", brandName: "مدار", regionName: "دمشق", storeName: "كل المحلات" }, { events: [], signages: [], stands: [], totalBudget: 0, totalCost: 0, activeSignages: 0, activeStands: 0, goals: [] });
    const workbook = buildAdvancedAnalyticsWorkbook(report);

    expect(workbook.SheetNames).toEqual(["ملخص التحليل", "الدورات والمنتجات", "متوسطات الأصناف", "ملخص تسويقي"]);
    expect(workbook.Workbook?.Views?.[0]?.RTL).toBe(true);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["الدورات والمنتجات"])[0]).toMatchObject({ المنتج: "منتج مدار" });
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["متوسطات الأصناف"])[0]).toMatchObject({ الصنف: "بدون تصنيف", "متوسط منتجاتنا": "100%" });
  });

  it("ينشئ ورقة مصفوفة ملونة عند تفعيل محتوى التقرير", () => {
    const analytics = { points: [], productOptions: [], totalSurveys: 0, totalStores: 0, averagePresence: 0, notes: [], noteCounts: { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 } };
    const report = buildAnalyticsReportData(analytics, { analysisName: "استبيان", templateName: "دراسة", cycleName: "دورة", brandName: "مدار", regionName: "كل المناطق", storeName: "كل المحلات" }, undefined, undefined, { settings: DEFAULT_ANALYTICS_SETTINGS, regionMatrix: { regions: ["دمشق"], products: [{ id: "p1", name: "منتج مدار", type: "company" }], cells: [{ region: "دمشق", productId: "p1", productName: "منتج مدار", type: "company", sampleSize: 3, presentCount: 3, storeCount: 3, presencePercentage: 100, value: 100 }], metricLabel: "نسبة التواجد" } });
    const workbook = buildAdvancedAnalyticsWorkbook(report, DEFAULT_ANALYTICS_SETTINGS);

    expect(workbook.SheetNames).toContain("مصفوفة المناطق");
    expect(workbook.Sheets["مصفوفة المناطق"].B2.v).toContain("100%");
    expect(workbook.Sheets["مصفوفة المناطق"].B2.s.fill.fgColor.rgb).toBe("DCFCE7");
  });

  it("ينشئ ورقة مستقلة لكل مصفوفة صنف مفعلة", () => {
    const analytics = { points: [], productOptions: [], totalSurveys: 0, totalStores: 0, averagePresence: 0, notes: [], noteCounts: { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 } };
    const matrix = { regions: ["دمشق"], products: [{ id: "p1", name: "منتج مدار", type: "company" as const }], cells: [{ region: "دمشق", productId: "p1", productName: "منتج مدار", type: "company" as const, sampleSize: 3, presentCount: 3, storeCount: 3, presencePercentage: 100, value: 100 }], metricLabel: "نسبة التواجد" };
    const report = buildAnalyticsReportData(analytics, { analysisName: "استبيان", templateName: "دراسة", cycleName: "دورة", brandName: "مدار", regionName: "كل المناطق", storeName: "كل المحلات" }, undefined, undefined, { settings: DEFAULT_ANALYTICS_SETTINGS, categoryMatrices: [{ category: "مساحيق", matrix }, { category: "منظفات", matrix }] });
    const workbook = buildAdvancedAnalyticsWorkbook(report, DEFAULT_ANALYTICS_SETTINGS);

    expect(workbook.SheetNames).toEqual(expect.arrayContaining(["مصفوفة مساحيق", "مصفوفة منظفات"]));
    expect(workbook.Sheets["مصفوفة مساحيق"].B2.v).toContain("100%");
  });

  it("يرتب أوراق محتوى التقرير وفق الترتيب المحفوظ مع إبقاء الملخص أولاً", () => {
    const analytics = { points: [{ cycleId: "c1", cycleName: "دورة", startDate: "2026-04-01", endDate: "2026-04-15", surveyCount: 1, storeCount: 1, products: [{ productId: "p1", productName: "منتج مدار", type: "company" as const, color: "#2563EB", presencePercentage: 100, presentCount: 1, sampleSize: 1 }] }], productOptions: [], totalSurveys: 1, totalStores: 1, averagePresence: 100, notes: [], noteCounts: { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 } };
    const report = buildAnalyticsReportData(analytics, { analysisName: "استبيان", templateName: "دراسة", cycleName: "كل الدورات", brandName: "مدار", regionName: "دمشق", storeName: "كل المحلات" }, { events: [], signages: [], stands: [], totalBudget: 0, totalCost: 0, activeSignages: 0, activeStands: 0, goals: [] });
    const workbook = buildAdvancedAnalyticsWorkbook(report, { ...DEFAULT_ANALYTICS_SETTINGS, reportSectionOrder: ["marketing", "productDetails", "studiedStores", "decisionIndicators", "dataWarnings", "regionMatrix"] });

    expect(workbook.SheetNames.slice(0, 3)).toEqual(["ملخص التحليل", "ملخص تسويقي", "الدورات والمنتجات"]);
  });
});
