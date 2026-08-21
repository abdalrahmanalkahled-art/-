import { describe, expect, it } from "vitest";

import { buildBrandTrackingProfile, buildStoreTrackingProfile } from "../entity-tracking";

const analytics = {
  points: [{ cycleId: "c1", cycleName: "دورة", startDate: "2026-01-01", endDate: "2026-01-31", surveyCount: 2, storeCount: 2, products: [
    { productId: "p1", productName: "منتج مدار", brandName: "مدار", category: "مساحيق", type: "company" as const, color: "#000", presencePercentage: 50, presentCount: 1, sampleSize: 2 },
    { productId: "p2", productName: "منتج منافس", brandName: "منافس", category: "مساحيق", type: "competitor" as const, color: "#000", presencePercentage: 100, presentCount: 2, sampleSize: 2 },
  ] }], productOptions: [], totalSurveys: 2, totalStores: 2, averagePresence: 75, notes: [], noteCounts: { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 },
};

const marketing = { events: [{ id: "e1", brandName: "مدار" }], signages: [{ id: "s1", brand: "مدار" }], stands: [{ id: "st1", brand: "مدار", condition: "good" as const }], totalBudget: 100, totalCost: 80, activeSignages: 1, activeStands: 1, goals: [{ id: "g1", brandName: "مدار" }], goalProgress: 60 };

describe("ملف تتبع الكيان", () => {
  it("يجمع منتجات الماركة ومنافسيها ضمن الأصناف نفسها مع الأصول المرتبطة", () => {
    const profile = buildBrandTrackingProfile("مدار", analytics, marketing);
    expect(profile.primaryProducts.map((item) => item.productName)).toEqual(["منتج مدار"]);
    expect(profile.competingProducts.map((item) => item.productName)).toEqual(["منتج منافس"]);
    expect(profile.events).toHaveLength(1);
    expect(profile.signages).toHaveLength(1);
  });

  it("يفصل ملف المحل منتجات الشركة عن المنافسين", () => {
    const profile = buildStoreTrackingProfile("محل التجربة", analytics, marketing);
    expect(profile.primaryProducts).toHaveLength(1);
    expect(profile.competingProducts).toHaveLength(1);
    expect(profile.totalEventCost).toBe(80);
  });
});
