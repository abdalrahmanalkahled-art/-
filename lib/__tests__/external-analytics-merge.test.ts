import { describe, expect, it } from "vitest";

import { createCombinedExternalAnalyticsDataset } from "../external-analytics-merge";

function makePackage(name: string, productId: string, latestResultId: string, oldResultId: string) {
  return {
    name,
    dataset: {
      template: { id: `template-${name}`, name: `استبيان ${name}`, createdAt: "2026-01-01", products: [{ productId, productName: "مسحوق مدار", type: "company" as const, category: "مساحيق" }] },
      products: [{ id: productId, name: "مسحوق مدار", categoryName: "مساحيق", type: "company" as const, brandName: "مدار" }],
      cycles: [
        { id: `old-${name}`, templateId: `template-${name}`, templateName: `استبيان ${name}`, name: "دورة قديمة", startDate: "2026-01-01", endDate: "2026-01-02", resultIds: [oldResultId], createdAt: "2026-01-01" },
        { id: `latest-${name}`, templateId: `template-${name}`, templateName: `استبيان ${name}`, name: "دورة أخيرة", startDate: "2026-02-01", endDate: "2026-02-02", resultIds: [latestResultId], createdAt: "2026-02-01" },
      ],
      stores: [{ id: `store-${name}`, name: `محل ${name}`, region: "المنطقة الأصلية", isActive: true }],
      results: [
        { id: oldResultId, templateId: `template-${name}`, templateName: `استبيان ${name}`, cycleId: `old-${name}`, storeId: `store-${name}`, storeName: `محل ${name}`, storeRegion: "المنطقة الأصلية", surveyDate: "2026-01-02", createdAt: "2026-01-02", data: [{ productId, productName: "مسحوق مدار", present: false, shelfPercentage: 0 }] },
        { id: latestResultId, templateId: `template-${name}`, templateName: `استبيان ${name}`, cycleId: `latest-${name}`, storeId: `store-${name}`, storeName: `محل ${name}`, storeRegion: "المنطقة الأصلية", surveyDate: "2026-02-02", createdAt: "2026-02-02", data: [{ productId, productName: "مسحوق مدار", present: true, shelfPercentage: 0 }] },
      ],
    },
  };
}

describe("التحليل الموحّد للاستبيانات المحفوظة", () => {
  it("يأخذ آخر دورة فقط ويحوّل اسم كل حزمة إلى منطقة مستقلة", () => {
    const dataset = createCombinedExternalAnalyticsDataset([makePackage("دمشق", "p-1", "latest-1", "old-1"), makePackage("حلب", "p-2", "latest-2", "old-2")]);

    expect(dataset.cycles).toHaveLength(1);
    expect(dataset.results.map((item) => item.id)).toEqual(["combined-result-1", "combined-result-2"]);
    expect(dataset.stores.map((store) => store.region)).toEqual(["دمشق", "حلب"]);
    expect(dataset.stores.map((store) => store.name)).toEqual(["محل دمشق", "محل حلب"]);
    expect(dataset.results.every((item) => item.data[0].present)).toBe(true);
  });

  it("يدمج المنتجات المتطابقة بعد تنظيف الاسم والمرجع", () => {
    const dataset = createCombinedExternalAnalyticsDataset([makePackage("دمشق", "p-1", "latest-1", "old-1"), makePackage("حلب", "p-2", "latest-2", "old-2")]);

    expect(dataset.products).toHaveLength(1);
    expect(dataset.template.products).toHaveLength(1);
    expect(new Set(dataset.results.map((item) => item.data[0].productId)).size).toBe(1);
  });
});
