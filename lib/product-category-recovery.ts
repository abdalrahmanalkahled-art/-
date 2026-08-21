export interface StoredProductCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface CategorizedProduct {
  categoryId?: string;
  categoryName?: string;
  createdAt?: string;
}

export const DEFAULT_PRODUCT_CATEGORIES = [
  { id: "powder", name: "مسحوق" },
  { id: "liquid", name: "سائل جلي" },
  { id: "perfume", name: "معطر" },
  { id: "disinfectant", name: "معقم" },
  { id: "other", name: "أخرى" },
] as const;

export function createDefaultProductCategories(createdAt = new Date().toISOString()): StoredProductCategory[] {
  return DEFAULT_PRODUCT_CATEGORIES.map((category) => ({ ...category, createdAt }));
}

export function getProductCategoryId(product: CategorizedProduct): string {
  if (product.categoryId?.trim()) return product.categoryId;
  const normalizedName = product.categoryName?.trim().replace(/\s+/g, " ");
  return normalizedName ? `recovered:${normalizedName}` : "recovered:uncategorized";
}

/**
 * يحافظ على قابلية عرض المنتج إذا جاءت نسخة قديمة بلا سجل التصنيف المقابل.
 * لا يغير المنتج نفسه؛ بل يضيف قسماً مرئياً مستنتجاً من categoryName المخزن معه.
 */
export function getVisibleProductCategories(
  storedCategories: StoredProductCategory[],
  products: CategorizedProduct[],
): StoredProductCategory[] {
  const categories = new Map(storedCategories.map((category) => [category.id, category]));
  products.forEach((product) => {
    const categoryId = getProductCategoryId(product);
    if (!categories.has(categoryId)) {
      categories.set(categoryId, {
        id: categoryId,
        name: product.categoryName?.trim() || "تصنيف مستعاد",
        createdAt: product.createdAt || new Date().toISOString(),
      });
    }
  });
  return [...categories.values()];
}
