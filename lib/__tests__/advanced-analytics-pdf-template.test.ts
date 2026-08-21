import { describe, expect, it } from "vitest";

import { buildAnalyticsReportData } from "../advanced-analytics-report";
import { buildAdvancedAnalyticsPdfHtml } from "../advanced-analytics-pdf-template";
import { DEFAULT_ANALYTICS_SETTINGS } from "../analytics-settings-model";

describe("قالب PDF للتحليلات المتقدمة", () => {
  const analytics = {
    points: [{ cycleId: "c1", cycleName: "دورة آذار", startDate: "2026-03-01", endDate: "2026-03-15", surveyCount: 2, storeCount: 2, products: [{ productId: "p1", productName: "مسحوق مدار", category: "مسحوق", type: "company" as const, color: "#2563EB", presencePercentage: 75, presentCount: 3, sampleSize: 4 }, { productId: "p2", productName: "منظف منافس", category: "منظفات", type: "competitor" as const, color: "#DB2777", presencePercentage: 50, presentCount: 2, sampleSize: 4 }] }],
    productOptions: [], totalSurveys: 2, totalStores: 2, averagePresence: 75, notes: [], noteCounts: { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 },
  };

  it("يبني مستنداً عربياً RTL يتضمن مخططاً خطياً ومؤشراً حلقياً", () => {
    const report = buildAnalyticsReportData(analytics, { analysisName: "تتبع محل", templateName: "دراسة مسحوق", cycleName: "كل الدورات", brandName: "مدار", regionName: "دمشق", storeName: "سوبر ماركت" });
    const html = buildAdvancedAnalyticsPdfHtml(report, analytics);

    expect(html).toContain('dir="rtl"');
    expect(html).toContain("polyline");
    expect(html).toContain("donut-value");
    expect(html).toContain("مسحوق مدار");
    expect(html).toContain("متوسط منتجاتنا");
    expect(html).toContain("متوسط المنافسين");
    expect(html).toContain("متوسطات المصدر");
  });

  it("يفصل المخطط وجدول التفاصيل حسب الصنف", () => {
    const report = buildAnalyticsReportData(analytics, { analysisName: "تتبع محل", templateName: "دراسة متعددة الأصناف", cycleName: "كل الدورات", brandName: "مدار", regionName: "دمشق", storeName: "سوبر ماركت" });
    const html = buildAdvancedAnalyticsPdfHtml(report, analytics);

    expect(html).toContain("الصنف: مسحوق");
    expect(html).toContain("الصنف: منظفات");
    expect(html.match(/تفاصيل منتجات ودورات الصنف/g)?.length).toBe(2);
  });

  it("يعرض الشعار والمخطط المختار في التقرير", () => {
    const report = buildAnalyticsReportData(analytics, { analysisName: "تتبع محل", templateName: "دراسة مسحوق", cycleName: "كل الدورات", brandName: "مدار", regionName: "دمشق", storeName: "سوبر ماركت" });
    const html = buildAdvancedAnalyticsPdfHtml(report, analytics, { chartType: "pie", logoDataUri: "data:image/png;base64,AAA" });

    expect(html).toContain("مخطط دائري");
    expect(html).toContain("data:image/png;base64,AAA");
  });

  it("يبقي اسم الاستبيان في معلومات التقرير ولا يعيده كتسمية أسفل المخطط", () => {
    const report = buildAnalyticsReportData(analytics, { analysisName: "تتبع محل", templateName: "دراسة مسحوق", cycleName: "كل الدورات", brandName: "مدار", regionName: "دمشق", storeName: "سوبر ماركت" });
    const html = buildAdvancedAnalyticsPdfHtml(report, analytics, { chartType: "bar", showChartProductNames: true, labelFontSize: "large", rotateProductNames: true });

    expect(html.match(/دراسة مسحوق/g)?.length).toBe(1);
    expect(html).toContain('transform="rotate(-48');
    expect(html).toContain('font-size:10px');
    expect(html).not.toContain(">دورة آذار</text>");
  });

  it("يبعد تسمية المنتج وقيمته عن الأعمدة داخل مخطط PDF", () => {
    const report = buildAnalyticsReportData(analytics, { analysisName: "تتبع محل", templateName: "دراسة مسحوق", cycleName: "كل الدورات", brandName: "مدار", regionName: "دمشق", storeName: "سوبر ماركت" });
    const html = buildAdvancedAnalyticsPdfHtml(report, analytics, { chartType: "bar", showChartProductNames: true, showChartValues: true });

    expect(html).toContain('y="231"');
    expect(html).toContain('y="248"');
  });

  it("يعيد حساب مؤشر التواجد داخل كل صنف", () => {
    const report = buildAnalyticsReportData(analytics, { analysisName: "تتبع محل", templateName: "دراسة متعددة الأصناف", cycleName: "كل الدورات", brandName: "مدار", regionName: "دمشق", storeName: "سوبر ماركت" });
    const html = buildAdvancedAnalyticsPdfHtml(report, analytics);

    expect(html).toContain("الصنف: مسحوق");
    expect(html).toContain("75%");
    expect(html).toContain("الصنف: منظفات");
    expect(html).toContain("50%");
  });

  it("يوحد الأرقام إلى صيغة 123 داخل بيانات ومخططات التقرير", () => {
    const numberedAnalytics = { ...analytics, points: [{ ...analytics.points[0], cycleName: "دورة ١", products: [{ ...analytics.points[0].products[0], productName: "مسحوق ٢", category: "صنف ٣" }] }] };
    const report = buildAnalyticsReportData(numberedAnalytics, { analysisName: "تحليل ٤", templateName: "دراسة ٥", cycleName: "دورة ١", brandName: "ماركة ٦", regionName: "منطقة ٧", storeName: "محل ٨" });
    const html = buildAdvancedAnalyticsPdfHtml(report, numberedAnalytics);

    expect(html).toContain("دورة 1");
    expect(html).toContain("مسحوق 2");
    expect(html).toContain("صنف 3");
    expect(html).not.toMatch(/[٠-٩]/);
  });

  it("يقسم مخططات الأعمدة الشاقولية إلى أجزاء متتابعة وفق الحد المحدد", () => {
    const products = Array.from({ length: 5 }, (_, index) => ({ productId: `p${index + 1}`, productName: `منتج ${index + 1}`, category: "مسحوق", type: "company" as const, color: "#2563EB", presencePercentage: 20 + index * 10, presentCount: 1, sampleSize: 4 }));
    const manyProductsAnalytics = { ...analytics, points: [{ ...analytics.points[0], products }], averagePresence: 40 };
    const report = buildAnalyticsReportData(manyProductsAnalytics, { analysisName: "تتبع محل", templateName: "دراسة مسحوق", cycleName: "كل الدورات", brandName: "مدار", regionName: "دمشق", storeName: "سوبر ماركت" });
    const html = buildAdvancedAnalyticsPdfHtml(report, manyProductsAnalytics, { chartType: "bar", chartOrientation: "vertical", horizontalBarMaxItems: 2 });

    expect(html).toContain('class="chart-stack"');
    expect(html).toContain("الجزء 1 من 3");
    expect(html).toContain("الجزء 3 من 3");
  });

  it("يتضمن المصفوفة الملونة عند تفعيلها ويخفيها عند إلغائها", () => {
    const report = buildAnalyticsReportData(analytics, { analysisName: "استبيان", templateName: "دراسة مسحوق", cycleName: "كل الدورات", brandName: "مدار", regionName: "كل المناطق", storeName: "كل المحلات" }, undefined, undefined, { settings: DEFAULT_ANALYTICS_SETTINGS, regionMatrix: { regions: ["دمشق"], products: [{ id: "p1", name: "مسحوق مدار", type: "company" }], cells: [{ region: "دمشق", productId: "p1", productName: "مسحوق مدار", type: "company", sampleSize: 4, presentCount: 3, storeCount: 3, presencePercentage: 75, value: 75 }], metricLabel: "نسبة التواجد" } });
    const shown = buildAdvancedAnalyticsPdfHtml(report, analytics, { reportTables: DEFAULT_ANALYTICS_SETTINGS.reportTables, regionMatrix: DEFAULT_ANALYTICS_SETTINGS.regionMatrix });
    const hidden = buildAdvancedAnalyticsPdfHtml(report, analytics, { reportTables: { ...DEFAULT_ANALYTICS_SETTINGS.reportTables, regionMatrix: false }, regionMatrix: DEFAULT_ANALYTICS_SETTINGS.regionMatrix });

    expect(shown).toContain("مصفوفة المنطقة والمنتج");
    expect(shown).toContain("#DCFCE7");
    expect(hidden).not.toContain("مصفوفة المنطقة والمنتج");
  });

  it("يتضمن مصفوفة مستقلة لكل صنف مفعل في التقرير", () => {
    const matrix = { regions: ["دمشق"], products: [{ id: "p1", name: "مسحوق مدار", type: "company" as const }], cells: [{ region: "دمشق", productId: "p1", productName: "مسحوق مدار", type: "company" as const, sampleSize: 4, presentCount: 3, storeCount: 3, presencePercentage: 75, value: 75 }], metricLabel: "نسبة التواجد" };
    const report = buildAnalyticsReportData(analytics, { analysisName: "استبيان", templateName: "دراسة مسحوق", cycleName: "كل الدورات", brandName: "مدار", regionName: "كل المناطق", storeName: "كل المحلات" }, undefined, undefined, { settings: DEFAULT_ANALYTICS_SETTINGS, categoryMatrices: [{ category: "مساحيق", matrix }, { category: "منظفات", matrix }] });
    const html = buildAdvancedAnalyticsPdfHtml(report, analytics, { reportTables: DEFAULT_ANALYTICS_SETTINGS.reportTables, regionMatrix: DEFAULT_ANALYTICS_SETTINGS.regionMatrix });

    expect(html).toContain("مصفوفة الصنف: مساحيق");
    expect(html).toContain("مصفوفة الصنف: منظفات");
  });

  it("يطبق ترتيب أقسام المحتوى المختار داخل PDF", () => {
    const report = buildAnalyticsReportData(analytics, { analysisName: "استبيان", templateName: "دراسة مسحوق", cycleName: "كل الدورات", brandName: "مدار", regionName: "كل المناطق", storeName: "كل المحلات" }, undefined, undefined, { settings: DEFAULT_ANALYTICS_SETTINGS, regionMatrix: { regions: ["دمشق"], products: [{ id: "p1", name: "مسحوق مدار", type: "company" }], cells: [{ region: "دمشق", productId: "p1", productName: "مسحوق مدار", type: "company", sampleSize: 4, presentCount: 3, storeCount: 3, presencePercentage: 75, value: 75 }], metricLabel: "نسبة التواجد" } });
    const html = buildAdvancedAnalyticsPdfHtml(report, analytics, { reportTables: DEFAULT_ANALYTICS_SETTINGS.reportTables, reportSectionOrder: ["regionMatrix", "productDetails", "studiedStores", "marketing", "decisionIndicators", "dataWarnings"], regionMatrix: DEFAULT_ANALYTICS_SETTINGS.regionMatrix });

    expect(html.indexOf("مصفوفة المنطقة والمنتج")).toBeLessThan(html.indexOf("الصنف: مسحوق"));
  });
});
