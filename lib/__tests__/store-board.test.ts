import { describe, expect, it } from "vitest";

import { getStoreBoardBackBrand, renewStoreBoardBrand, type StoreBoardRecord } from "../store-board";

const board: StoreBoardRecord = {
  id: "store-board-1", type: "store", storeId: "store-1", storeName: "محل النور", region: "دمشق", brand: "مدار", frontBrand: "مدار", backBrand: "الربيع", sides: 2, installDate: "2026-01-10", notes: "", isActive: true, createdAt: "2026-01-10T10:00:00.000Z",
};

describe("لوحة المحل", () => {
  it("يؤرشف الماركة القديمة للوجه الصحيح بين تاريخ تركيبها وتاريخ التجديد", () => {
    const renewed = renewStoreBoardBrand(board, "front", "شام", "2026-08-21");
    expect(renewed.frontBrand).toBe("شام");
    expect(renewed.brand).toBe("شام");
    expect(renewed.brandHistory).toEqual([{ id: expect.any(String), face: "front", brand: "مدار", installedAt: "2026-01-10", archivedAt: "2026-08-21" }]);
  });

  it("يحافظ على ماركة الوجه الآخر ويعيد الماركة الأمامية للعقود القديمة", () => {
    const renewed = renewStoreBoardBrand(board, "back", "سوسن", "2026-08-21");
    expect(renewed.frontBrand).toBe("مدار");
    expect(renewed.backBrand).toBe("سوسن");
    expect(getStoreBoardBackBrand({ brand: "مدار" })).toBe("مدار");
  });
});
