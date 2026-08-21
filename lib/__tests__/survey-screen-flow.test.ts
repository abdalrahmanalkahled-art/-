import { beforeEach, describe, expect, it, vi } from "vitest";

const { getItems } = vi.hoisted(() => ({ getItems: vi.fn() }));

vi.mock("../storage", () => ({
  getItems,
  STORAGE_KEYS: {
    SURVEY_TEMPLATES: "madar_survey_templates",
    SURVEY_RESULTS: "madar_survey_results",
    SURVEY_CYCLES: "madar_survey_cycles",
    STORES: "madar_stores",
    PRODUCTS: "madar_products",
  },
}));

import { loadSurveyScreenData } from "../survey-storage";

describe("تدفق تحميل شاشة الاستبيانات", () => {
  beforeEach(() => {
    getItems.mockReset();
  });

  it("يحمّل القوالب والنتائج والمنتجات ويعرض المحلات الفعالة فقط بترتيب الأحدث", async () => {
    getItems
      .mockResolvedValueOnce([
        { id: "old-template", name: "قديم", createdAt: "2026-01-01T00:00:00.000Z", products: [] },
        { id: "new-template", name: "جديد", createdAt: "2026-02-01T00:00:00.000Z", products: [] },
      ])
      .mockResolvedValueOnce([
        { id: "old-result", templateId: "old-template", templateName: "قديم", storeId: "store-1", storeName: "محل فعال", storeRegion: "دمشق", surveyDate: "2026-01-01", data: [], createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "new-result", templateId: "new-template", templateName: "جديد", storeId: "store-1", storeName: "محل فعال", storeRegion: "دمشق", surveyDate: "2026-02-01", data: [], createdAt: "2026-02-01T00:00:00.000Z" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "store-1", name: "محل فعال", region: "دمشق", isActive: true },
        { id: "store-2", name: "محل غير فعال", region: "حلب", isActive: false },
      ])
      .mockResolvedValueOnce([{ id: "product-1", name: "منتج مدار", categoryName: "منظفات", type: "company" }]);

    const data = await loadSurveyScreenData();

    expect(data.templates.map((template) => template.id)).toEqual(["new-template", "old-template"]);
    expect(data.results.map((result) => result.id)).toEqual(["new-result", "old-result"]);
    expect(data.stores.map((store) => store.id)).toEqual(["store-1"]);
    expect(data.products).toHaveLength(1);
    expect(data.cycles).toEqual([]);
    expect(getItems).toHaveBeenCalledTimes(5);
  });

  it("يبقي المحل الذي لا يملك علامة تعطيل ظاهرة ضمن خيارات تعبئة الاستبيان", async () => {
    getItems
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "store-1", name: "محل قائم", region: "حمص", isActive: true }, { id: "store-2", name: "محل قديم", region: "حماة" }])
      .mockResolvedValueOnce([]);

    const data = await loadSurveyScreenData();

    expect(data.stores.map((store) => store.id)).toEqual(["store-1", "store-2"]);
  });
});
