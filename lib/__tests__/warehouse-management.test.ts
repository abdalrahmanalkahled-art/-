import { describe, expect, it } from "vitest";

import { removeWarehouseItemAndMovements } from "../warehouse-management";

describe("حذف مادة المستودع", () => {
  it("يحذف المادة وكل حركاتها المرتبطة دون التأثير في المواد الأخرى", () => {
    const outcome = removeWarehouseItemAndMovements(
      [{ id: "a", name: "الأولى" }, { id: "b", name: "الثانية" }],
      [{ id: "m1", itemId: "a" }, { id: "m2", itemId: "b" }, { id: "m3", itemId: "a" }],
      "a",
    );
    expect(outcome.items).toEqual([{ id: "b", name: "الثانية" }]);
    expect(outcome.movements).toEqual([{ id: "m2", itemId: "b" }]);
  });
});
