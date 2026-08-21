import { describe, expect, it } from "vitest";

import { groupAnalyticsByCategory } from "../analytics-category-groups";

describe("تجميع التحليلات حسب الصنف", () => {
  it("يفصل المنتجات ويعيد حساب متوسط التواجد لكل صنف", () => {
    const groups = groupAnalyticsByCategory({
      points: [{
        cycleId: "c1", cycleName: "الدورة الأولى", startDate: "2026-01-01", endDate: "2026-01-02", surveyCount: 2, storeCount: 2,
        products: [
          { productId: "p1", productName: "مسحوق الشركة", category: "مسحوق", type: "company", color: "#2563EB", presencePercentage: 80, presentCount: 8, sampleSize: 10 },
          { productId: "p2", productName: "مسحوق منافس", category: "مسحوق", type: "competitor", color: "#DB2777", presencePercentage: 40, presentCount: 4, sampleSize: 10 },
          { productId: "p3", productName: "منظف الشركة", category: "منظفات", type: "company", color: "#0E9F6E", presencePercentage: 60, presentCount: 6, sampleSize: 10 },
        ],
      }],
      productOptions: [], totalSurveys: 2, totalStores: 2, averagePresence: 60, notes: [], noteCounts: { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 },
    });

    expect(groups.map((group) => group.category)).toEqual(["مسحوق", "منظفات"]);
    expect(groups[0].averagePresence).toBe(60);
    expect(groups[0].companyAveragePresence).toBe(80);
    expect(groups[0].competitorAveragePresence).toBe(40);
    expect(groups[0].analytics.points[0].products).toHaveLength(2);
    expect(groups[1].averagePresence).toBe(60);
    expect(groups[1].companyAveragePresence).toBe(60);
    expect(groups[1].competitorAveragePresence).toBeUndefined();
    expect(groups[1].analytics.points[0].products[0].productName).toBe("منظف الشركة");
  });

  it("يعرض الأصناف وفق تسلسل قالب الاستبيان حتى عند اختلاف تسلسل البيانات", () => {
    const analytics = {
      points: [{ cycleId: "c1", cycleName: "الدورة الأولى", startDate: "2026-01-01", endDate: "2026-01-02", surveyCount: 1, storeCount: 1, products: [
        { productId: "p1", productName: "منتج منظفات", category: "منظفات", type: "company" as const, color: "#2563EB", presencePercentage: 80, presentCount: 8, sampleSize: 10 },
        { productId: "p2", productName: "منتج مسحوق", category: "مسحوق", type: "company" as const, color: "#7C3AED", presencePercentage: 60, presentCount: 6, sampleSize: 10 },
      ] }], productOptions: [], totalSurveys: 1, totalStores: 1, averagePresence: 70, notes: [], noteCounts: { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 },
    };
    expect(groupAnalyticsByCategory(analytics, "equalProducts", ["مسحوق", "منظفات"]).map((group) => group.category)).toEqual(["مسحوق", "منظفات"]);
  });
});
