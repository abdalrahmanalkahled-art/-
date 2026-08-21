import { describe, expect, it } from "vitest";

import { createExternalAnalyticsDataset, createSurveyResultsExport, parseSurveyResultsExport } from "../survey-results-transfer";

const template = { id: "template-1", name: "دراسة الربيع", createdAt: "2026-01-01T00:00:00.000Z", products: [{ productId: "product-1", productName: "مسحوق مدار", type: "company" as const, category: "مساحيق" }] };
const products = [{ id: "product-1", name: "مسحوق مدار", categoryName: "مساحيق", type: "company" as const, brandName: "مدار" }];
const cycles = [{ id: "cycle-1", templateId: "template-1", templateName: "دراسة الربيع", name: "دورة الربيع", startDate: "2026-01-02", endDate: "2026-01-03", resultIds: ["result-1"], createdAt: "2026-01-02" }];
const results = [{ id: "result-1", templateId: "template-1", templateName: "دراسة الربيع", cycleId: "cycle-1", storeId: "store-real", storeName: "محل الندى", storeRegion: "دمشق", surveyDate: "2026-01-03", createdAt: "2026-01-03", data: [{ productId: "product-1", productName: "مسحوق مدار", present: true, shelfPercentage: 0 }] }];

describe("تصدير نتائج الاستبيان والتحليل الخارجي", () => {
  it("يصدر فقط نتائج الدورة المختارة مع لقطة التحليل اللازمة", () => {
    const payload = createSurveyResultsExport(template, products, cycles, results, "cycle-1");
    expect(payload.type).toBe("madar-survey-results");
    expect(payload.results).toHaveLength(1);
    expect(payload.cycles.map((cycle) => cycle.id)).toEqual(["cycle-1"]);
    expect(payload.products).toEqual(products);
    expect(payload.stores).toEqual([{ id: "store-real", name: "محل الندى", region: "دمشق" }]);
    expect(JSON.stringify(payload)).toContain("محل الندى");
    expect(JSON.stringify(payload)).toContain("دمشق");
  });

  it("يرفض الملف غير المتوافق قبل حفظ أي حزمة", () => {
    expect(() => parseSurveyResultsExport(JSON.stringify({ type: "invalid", version: 1 }))).toThrow("الملف ليس تصديراً لنتائج استبيان");
    expect(() => parseSurveyResultsExport("not-json")).toThrow("الملف ليس JSON صالحاً");
  });

  it("يحتفظ بأسماء المحلات والمناطق في جلسة التحليل الخارجي المعزولة", () => {
    const payload = createSurveyResultsExport(template, products, cycles, results, "all");
    const dataset = createExternalAnalyticsDataset(payload);
    expect(dataset.stores).toEqual([{ id: "external-store-1", name: "محل الندى", region: "دمشق", isActive: true }]);
    expect(dataset.results[0]).toMatchObject({ storeId: "external-store-1", storeName: "محل الندى", storeRegion: "دمشق", templateId: "external-template", cycleId: "external-cycle-1" });
    expect(dataset.stores.some((store) => store.id === "store-1")).toBe(false);
    expect(JSON.stringify(dataset)).toContain("دمشق");
  });
});
