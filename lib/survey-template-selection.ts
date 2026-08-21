import type { Product } from "@/lib/types/survey-types";

export function getSurveyProductCategories(products: Product[]): string[] {
  return Array.from(new Set(products.map((product) => product.categoryName)));
}

export function toggleSurveyCategory(expandedCategories: Set<string>, category: string): Set<string> {
  const next = new Set(expandedCategories);
  if (next.has(category)) {
    next.delete(category);
  } else {
    next.add(category);
  }
  return next;
}

export function toggleSurveyProductSelection(selectedProducts: Map<string, boolean>, productId: string): Map<string, boolean> {
  const next = new Map(selectedProducts);
  if (next.has(productId)) {
    next.delete(productId);
  } else {
    next.set(productId, true);
  }
  return next;
}
