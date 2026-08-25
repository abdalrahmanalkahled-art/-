import { describe, expect, it } from "vitest";

import { synchronizeActiveCycleResultsWithTemplate } from "../survey-template-sync";

describe("مزامنة قالب الاستبيان مع الدورة النشطة", () => {
  it("يضيف المنتجات الجديدة ويحذف الملغاة في نتائج الدورة الحالية فقط", () => {
    const template = {
      id: "template-1",
      name: "استبيان محدث",
      createdAt: "2026-08-01",
      products: [
        { productId: "p-1", productName: "منتج محدّث", type: "company" as const },
        { productId: "p-2", productName: "منتج جديد", type: "company" as const },
      ],
      showShelfPercentage: true,
      showProductPrice: false,
    };
    const results = [
      { id: "active-result", templateId: "template-1", templateName: "قديم", cycleId: "active", storeId: "store-1", storeName: "محل نشط", storeRegion: "دمشق", surveyDate: "2026-08-02", createdAt: "2026-08-02", data: [{ productId: "p-1", productName: "اسم قديم", present: true, shelfPercentage: 40 }, { productId: "removed", productName: "محذوف", present: true, shelfPercentage: 60 }] },
      { id: "closed-result", templateId: "template-1", templateName: "قديم", cycleId: "closed", storeId: "store-2", storeName: "محل مؤرشف", storeRegion: "حلب", surveyDate: "2026-07-02", createdAt: "2026-07-02", data: [{ productId: "removed", productName: "محذوف", present: true, shelfPercentage: 60 }] },
    ];
    const cycles = [
      { id: "active", templateId: "template-1", templateName: "قديم", name: "الدورة الحالية", startDate: "2026-08-01", endDate: "", resultIds: ["active-result"], createdAt: "2026-08-01" },
      { id: "closed", templateId: "template-1", templateName: "قديم", name: "دورة مؤرشفة", startDate: "2026-07-01", endDate: "2026-07-10", resultIds: ["closed-result"], createdAt: "2026-07-01", closedAt: "2026-07-10" },
    ];

    const synchronized = synchronizeActiveCycleResultsWithTemplate(template, results as any, cycles as any);

    expect(synchronized[0].templateName).toBe("استبيان محدث");
    expect(synchronized[0].data).toEqual([
      expect.objectContaining({ productId: "p-1", productName: "منتج محدّث", present: true }),
      expect.objectContaining({ productId: "p-2", productName: "منتج جديد", present: false, shelfPercentage: 0 }),
    ]);
    expect(synchronized[1].data).toEqual([{ productId: "removed", productName: "محذوف", present: true, shelfPercentage: 60 }]);
  });
});
