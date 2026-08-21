import { describe, expect, it } from "vitest";

import { calculateCyclePresenceSeries, filterAdvancedSurveyResults } from "../advanced-analytics";
import { groupAnalyticsByCategory } from "../analytics-category-groups";
import type { Product, Store, SurveyCycle, SurveyResult } from "../types/survey-types";

const products: Product[] = [
  { id: "p1", name: "مسحوق ألف", categoryName: "مساحيق", type: "company", brandName: "ماركة ألف" },
  { id: "p2", name: "مسحوق باء", categoryName: "مساحيق", type: "company", brandName: "ماركة ألف" },
  { id: "p3", name: "منافس", categoryName: "مساحيق", type: "competitor", competitorName: "منافس" },
];

const stores: Store[] = [
  { id: "s1", name: "محل الأول", region: "دمشق", isActive: true },
  { id: "s2", name: "محل الثاني", region: "حلب", isActive: true },
];

const cycles: SurveyCycle[] = [
  { id: "c1", templateId: "t1", templateName: "دراسة مسحوق", name: "دراسة مسحوق 1-3 – 4-3", startDate: "2026-03-01", endDate: "2026-03-04", resultIds: [], createdAt: "2026-03-01" },
  { id: "c2", templateId: "t1", templateName: "دراسة مسحوق", name: "دراسة مسحوق 10-3 – 12-3", startDate: "2026-03-10", endDate: "2026-03-12", resultIds: [], createdAt: "2026-03-10" },
];

const results: SurveyResult[] = [
  { id: "r1", templateId: "t1", templateName: "دراسة مسحوق", cycleId: "c1", cycleName: cycles[0].name, hasShelfPercentage: true, hasProductPrice: true, storeId: "s1", storeName: "محل الأول", storeRegion: "دمشق", surveyDate: "2026-03-01", data: [{ productId: "p1", productName: "مسحوق ألف", present: true, shelfPercentage: 60, price: 15000 }, { productId: "p2", productName: "مسحوق باء", present: false, shelfPercentage: 0 }], notes: "تواجد ممتاز للمنتج", noteType: "positive", createdAt: "2026-03-01" },
  { id: "r2", templateId: "t1", templateName: "دراسة مسحوق", cycleId: "c1", cycleName: cycles[0].name, storeId: "s2", storeName: "محل الثاني", storeRegion: "حلب", surveyDate: "2026-03-04", data: [{ productId: "p1", productName: "مسحوق ألف", present: false, shelfPercentage: 0 }, { productId: "p2", productName: "مسحوق باء", present: true, shelfPercentage: 30 }], createdAt: "2026-03-04" },
  { id: "r3", templateId: "t1", templateName: "دراسة مسحوق", cycleId: "c2", cycleName: cycles[1].name, storeId: "s1", storeName: "محل الأول", storeRegion: "دمشق", surveyDate: "2026-03-10", data: [{ productId: "p1", productName: "مسحوق ألف", present: true, shelfPercentage: 80 }, { productId: "p2", productName: "مسحوق باء", present: true, shelfPercentage: 40 }], createdAt: "2026-03-10" },
];

describe("تحليلات دورات الاستبيان", () => {
  it("يفلتر حسب القالب والدورة والمنطقة والمنتج", () => {
    const filtered = filterAdvancedSurveyResults(results, stores, products, { templateId: "t1", cycleIds: ["c1"], regionName: "دمشق", productIds: ["p1"] });
    expect(filtered.map((result) => result.id)).toEqual(["r1"]);
  });

  it("يحسب نسبة التواجد لكل منتج عبر محور الدورات", () => {
    const analytics = calculateCyclePresenceSeries(results, stores, products, cycles, { templateId: "t1", brandName: "ماركة ألف", productIds: ["p1", "p2"] });
    expect(analytics.points).toHaveLength(2);
    expect(analytics.points[0].products.map((product) => product.presencePercentage)).toEqual([50, 50]);
    expect(analytics.points[1].products.map((product) => product.presencePercentage)).toEqual([100, 100]);
    expect(analytics.points[0].products[0].color).not.toBe(analytics.points[0].products[1].color);
    expect(analytics.points[0].products[0].averageShelfPercentage).toBe(60);
    expect(analytics.points[0].products[0].averagePrice).toBe(15000);
  });

  it("يتبع ترتيب منتجات القالب المحدد للأصناف والمنتجات بدلاً من الترتيب الأبجدي", () => {
    const orderedProducts: Product[] = [
      { ...products[0], categoryName: "مساحيق" },
      { ...products[1], categoryName: "منظفات" },
    ];
    const analytics = calculateCyclePresenceSeries(results, stores, orderedProducts, cycles, { templateId: "t1" }, ["p2", "p1"]);
    expect(analytics.points[0].products.map((product) => product.productId)).toEqual(["p2", "p1"]);
    expect(analytics.productOptions.map((product) => product.id)).toEqual(["p2", "p1"]);
    expect(groupAnalyticsByCategory(analytics).map((group) => group.category)).toEqual(["منظفات", "مساحيق"]);
  });

  it("يُبقي القالب القديم قابلاً للتحليل حتى دون cycleId", () => {
    const legacy = { ...results[0], id: "legacy", cycleId: undefined, cycleName: undefined };
    const analytics = calculateCyclePresenceSeries([legacy], stores, products, [], { templateId: "t1" });
    expect(analytics.points[0].cycleId).toBe("legacy-2026-03-01");
    expect(analytics.points[0].cycleName).toBe("الدورة الحالية");
  });

  it("يعيد التعليقات المصنفة ضمن نطاق التتبع المحدد", () => {
    const analytics = calculateCyclePresenceSeries(results, stores, products, cycles, { templateId: "t1", regionName: "دمشق" });
    expect(analytics.notes).toHaveLength(1);
    expect(analytics.notes[0]).toMatchObject({ type: "positive", storeName: "محل الأول", cycleId: "c1" });
    expect(analytics.noteCounts.positive).toBe(1);
    expect(analytics.noteCounts.complaint).toBe(0);
  });
});
