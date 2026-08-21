import { describe, expect, it } from "vitest";

import { calculateSurveyAnalytics } from "../survey-analytics-calculator";

describe("خدمة حساب تحليلات الاستبيانات", () => {
  it("تحسب الملخصات من دون قيم غير رقمية عند وجود استبيان فارغ", () => {
    const analytics = calculateSurveyAnalytics([
      { id: "result-1", templateId: "template-1", templateName: "دورة", storeId: "store-1", storeName: "محل", storeRegion: "دمشق", surveyDate: "2026-08-19", data: [], createdAt: "2026-08-19" },
    ], []);
    expect(analytics.overallStats.avgPresence).toBe(0);
    expect(analytics.storeAnalysis[0].overallPresencePercentage).toBe(0);
  });

  it("يفصل حضور منتجات الشركة والمنافسين ويختار المنتج الأعلى في المنطقة", () => {
    const analytics = calculateSurveyAnalytics([
      { id: "result-1", templateId: "template-1", templateName: "دورة", storeId: "store-1", storeName: "محل", storeRegion: "دمشق", surveyDate: "2026-08-19", data: [{ productId: "company", productName: "منتج الشركة", present: true, shelfPercentage: 60 }, { productId: "competitor", productName: "منتج منافس", present: false, shelfPercentage: 0 }], createdAt: "2026-08-19" },
    ], [
      { id: "company", name: "منتج الشركة", categoryName: "منظفات", type: "company" },
      { id: "competitor", name: "منتج منافس", categoryName: "منظفات", type: "competitor", competitorName: "منافس" },
    ]);
    expect(analytics.categoryAnalysis[0].companyProducts[0].presencePercentage).toBe(100);
    expect(analytics.categoryAnalysis[0].competitorProducts[0].presencePercentage).toBe(0);
    expect(analytics.topProductsByRegion[0].topProduct.productId).toBe("company");
  });
});
