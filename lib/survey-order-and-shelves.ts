import type { SurveyTemplateProduct } from "./types/survey-types";

export function calculateShelfPercentage(occupiedShelves: number, totalShelves: number): number {
  if (!Number.isFinite(totalShelves) || totalShelves <= 0) return 0;
  const safeOccupied = Math.max(0, Math.min(Number.isFinite(occupiedShelves) ? occupiedShelves : 0, totalShelves));
  return Math.round((safeOccupied / totalShelves) * 100);
}

/** يحافظ على ترتيب أول اختيار للمنتج، ويجمع الصنف في موضع أول منتج اختير منه. */
export function orderSurveyProducts(products: SurveyTemplateProduct[]): SurveyTemplateProduct[] {
  const categoryOrder: string[] = [];
  const productsByCategory = new Map<string, SurveyTemplateProduct[]>();
  products.forEach((product) => {
    const category = product.category?.trim() || "بدون تصنيف";
    if (!productsByCategory.has(category)) {
      categoryOrder.push(category);
      productsByCategory.set(category, []);
    }
    productsByCategory.get(category)?.push(product);
  });
  return categoryOrder.flatMap((category) => productsByCategory.get(category) || []);
}

export function normalizeShelfValue(value: string | number | undefined): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
