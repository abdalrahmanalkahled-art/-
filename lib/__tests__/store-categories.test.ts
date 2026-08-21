import { describe, expect, it } from "vitest";

import { DEFAULT_STORE_CATEGORIES, getFallbackCategoryId, getManagedCategories } from "../category-management";

describe("تصنيفات المحلات", () => {
  it("يوفر التصنيفات الافتراضية الحالية بشكل قابل للإدارة", () => {
    expect(DEFAULT_STORE_CATEGORIES.map((category) => category.label)).toEqual(["نخبة", "عادي", "ضعيف"]);
    expect(getManagedCategories([], DEFAULT_STORE_CATEGORIES)).toEqual(DEFAULT_STORE_CATEGORIES);
  });

  it("يحدد تصنيفاً بديلاً آمناً عند حذف تصنيف مرتبط بمحلات", () => {
    expect(getFallbackCategoryId(DEFAULT_STORE_CATEGORIES, "regular")).toBe("elite");
  });
});
