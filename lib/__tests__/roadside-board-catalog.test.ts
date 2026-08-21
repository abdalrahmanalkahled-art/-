import { describe, expect, it } from "vitest";

import { DEFAULT_ROADSIDE_BOARD_CATALOG, removeRoadsideBoardCatalogOption, updateRoadsideBoardCatalog } from "../roadside-board-catalog";

describe("كتالوج اللوحات الطرقية", () => {
  it("يوفر أنواع اللوحات وتقييمات A B C الافتراضية", () => {
    expect(DEFAULT_ROADSIDE_BOARD_CATALOG.types.map((item) => item.label)).toEqual(["فلكس عادي", "لوحة ضوئية", "فلكس عاكس للضوء"]);
    expect(DEFAULT_ROADSIDE_BOARD_CATALOG.ratings.map((item) => item.label)).toEqual(["A", "B", "C"]);
  });

  it("يعدل ويحذف خيارات الكتالوج دون تكرار الأسماء", () => {
    const updated = updateRoadsideBoardCatalog(DEFAULT_ROADSIDE_BOARD_CATALOG, "ratings", { id: "road-rating-b", label: "ممتاز" });
    expect(updated.ratings.map((item) => item.label)).toContain("ممتاز");
    expect(removeRoadsideBoardCatalogOption(updated, "ratings", "road-rating-c").ratings.map((item) => item.label)).not.toContain("C");
  });
});
