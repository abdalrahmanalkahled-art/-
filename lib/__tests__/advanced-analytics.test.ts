import { describe, expect, it } from "vitest";
import { calculateAdvancedAnalytics, filterSurveyResultsByDate } from "../advanced-analytics";
import type { SurveyResult } from "../types/survey-types";

const results: SurveyResult[] = [
  {
    id: "survey-1", templateId: "t1", templateName: "زيارة", storeId: "store-1", storeName: "متجر الأمل", storeRegion: "دمشق", surveyDate: "2026-08-01",
    data: [{ productId: "p1", productName: "منظف مدار", present: true, shelfPercentage: 50 }, { productId: "p2", productName: "منافس", present: false, shelfPercentage: 0 }], notes: "نقص في المخزون", noteType: "complaint", createdAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "survey-2", templateId: "t1", templateName: "زيارة", storeId: "store-1", storeName: "متجر الأمل", storeRegion: "دمشق", surveyDate: "2026-08-12",
    data: [{ productId: "p1", productName: "منظف مدار", present: true, shelfPercentage: 70 }, { productId: "p2", productName: "منافس", present: true, shelfPercentage: 30 }], notes: "عرض جيد", noteType: "recommendation", createdAt: "2026-08-12T10:00:00.000Z",
  },
];

describe("التحليلات المتقدمة", () => {
  it("تحلل نتائج الاستبيانات الفعلية المحفوظة ضمن SURVEY_RESULTS", () => {
    const analytics = calculateAdvancedAnalytics(results, [{ id: "store-1", name: "متجر الأمل", region: "دمشق", isActive: true }], [
      { id: "p1", name: "منظف مدار", categoryName: "منظفات", type: "company" },
      { id: "p2", name: "منافس", categoryName: "منظفات", type: "competitor" },
    ]);

    expect(analytics?.totalSurveys).toBe(2);
    expect(analytics?.averagePresence).toBe(75);
    expect(analytics?.regionAnalysis[0]).toMatchObject({ region: "دمشق", surveys: 2, stores: 1, averagePresence: 75 });
    expect(analytics?.productAnalysis).toEqual(expect.arrayContaining([
      expect.objectContaining({ productName: "منظف مدار", presencePercentage: 100, type: "company" }),
      expect.objectContaining({ productName: "منافس", presencePercentage: 50, type: "competitor" }),
    ]));
    expect(analytics?.notesAnalysis).toEqual({ complaints: 1, suggestions: 0, recommendations: 1 });
  });

  it("يطبّق نطاق التاريخ على النتائج قبل الحساب", () => {
    const filtered = filterSurveyResultsByDate(results, new Date("2026-08-10"), new Date("2026-08-20"));
    expect(filtered.map((result) => result.id)).toEqual(["survey-2"]);
  });
});
