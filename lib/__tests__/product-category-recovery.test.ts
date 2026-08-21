import { describe, expect, it } from "vitest";
import { createDefaultProductCategories, getProductCategoryId, getVisibleProductCategories } from "../product-category-recovery";

describe("استعادة عرض المنتجات بعد النسخ الاحتياطية", () => {
  it("يثبت الأصناف الافتراضية بمعرفاتها المتوقعة", () => {
    expect(createDefaultProductCategories("2026-08-22T00:00:00.000Z")).toContainEqual({ id: "powder", name: "مسحوق", createdAt: "2026-08-22T00:00:00.000Z" });
  });

  it("يعرض المنتج تحت تصنيف مستنتج عندما تغيب سجلات الأصناف من النسخة", () => {
    const products = [{ id: "product-1", categoryId: "custom-category", categoryName: "منظفات مركزة", createdAt: "2026-08-22T00:00:00.000Z" }];
    const categories = getVisibleProductCategories([], products);

    expect(categories).toContainEqual({ id: "custom-category", name: "منظفات مركزة", createdAt: "2026-08-22T00:00:00.000Z" });
    expect(getProductCategoryId(products[0])).toBe("custom-category");
  });
});
