import { describe, expect, it } from "vitest";

import { DEFAULT_EXPENSE_CATEGORIES, getFallbackCategoryId, getManagedCategories } from "../category-management";

describe("إدارة التصنيفات المحلية", () => {
  it("يُظهر التصنيفات الافتراضية عند غياب أي تصنيف محفوظ", () => {
    expect(getManagedCategories([], DEFAULT_EXPENSE_CATEGORIES)).toEqual(DEFAULT_EXPENSE_CATEGORIES);
  });

  it("يُبقي التصنيفات التي خصصها المستخدم ويعيد مادة الفئة المحذوفة إلى تصنيف متبقٍ", () => {
    const categories = [
      { id: "custom", label: "مخصص", icon: "category", color: "#000", createdAt: "now" },
      { id: "other", label: "أخرى", icon: "more-horiz", color: "#111", createdAt: "now" },
    ];
    expect(getManagedCategories(categories, DEFAULT_EXPENSE_CATEGORIES)).toEqual(categories);
    expect(getFallbackCategoryId(categories, "custom")).toBe("other");
    expect(getFallbackCategoryId([{ ...categories[0] }], "custom")).toBeNull();
  });
});
