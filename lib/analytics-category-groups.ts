import type { AdvancedSurveyAnalytics } from "./advanced-analytics";
import type { CategoryAggregation } from "./analytics-settings-model";

export interface AnalyticsCategoryGroup {
  category: string;
  analytics: AdvancedSurveyAnalytics;
  averagePresence: number;
  companyAveragePresence?: number;
  competitorAveragePresence?: number;
}

function categoryName(value?: string): string {
  return value?.trim() || "بدون تصنيف";
}

function averageBySource(products: AdvancedSurveyAnalytics["points"][number]["products"], type: "company" | "competitor", aggregation: CategoryAggregation): number | undefined {
  const sourceProducts = products.filter((product) => product.type === type && product.sampleSize > 0);
  if (!sourceProducts.length) return undefined;
  if (aggregation === "weightedBySample") {
    const totals = sourceProducts.reduce((current, product) => ({ present: current.present + product.presentCount, sample: current.sample + product.sampleSize }), { present: 0, sample: 0 });
    return totals.sample ? Math.round((totals.present / totals.sample) * 100) : undefined;
  }
  return Math.round(sourceProducts.reduce((sum, product) => sum + product.presencePercentage, 0) / sourceProducts.length);
}

/** يعيد أسماء الأصناف وفق أول ظهور لها في قالب الاستبيان، ثم يحافظ على ترتيب أي أصناف إضافية. */
export function orderAnalyticsCategories(categories: readonly string[], templateCategoryOrder: readonly string[] = []): string[] {
  const uniqueCategories = Array.from(new Set(categories));
  const originalOrder = new Map(uniqueCategories.map((category, index) => [category, index]));
  const templateOrder = new Map(templateCategoryOrder.map((category, index) => [category, index]));
  return [...uniqueCategories].sort((first, second) => {
    const firstPosition = templateOrder.get(first);
    const secondPosition = templateOrder.get(second);
    if (firstPosition !== undefined && secondPosition !== undefined) return firstPosition - secondPosition;
    if (firstPosition !== undefined) return -1;
    if (secondPosition !== undefined) return 1;
    return (originalOrder.get(first) || 0) - (originalOrder.get(second) || 0);
  });
}

/**
 * يفصل منحنيات التواجد إلى مجموعات أصناف، ويعيد حساب المتوسط داخل كل صنف.
 * يحتفظ بالترتيب الزمني للدورات حتى تعرض المخططات المنفصلة الاتجاه نفسه.
 */
export function groupAnalyticsByCategory(analytics: AdvancedSurveyAnalytics, aggregation: CategoryAggregation = "equalProducts", templateCategoryOrder: readonly string[] = []): AnalyticsCategoryGroup[] {
  const categories = orderAnalyticsCategories(analytics.points.flatMap((point) => point.products.map((product) => categoryName(product.category))), templateCategoryOrder);
  return categories.map((category) => {
    const points = analytics.points.map((point) => ({
      ...point,
      products: point.products.filter((product) => categoryName(product.category) === category),
    })).filter((point) => point.products.length > 0);
    const values = points.flatMap((point) => point.products.map((product) => product.presencePercentage));
    const categoryProducts = points.flatMap((point) => point.products);
    const weighted = categoryProducts.reduce((totals, product) => ({ present: totals.present + product.presentCount, sample: totals.sample + product.sampleSize }), { present: 0, sample: 0 });
    const averagePresence = aggregation === "weightedBySample" && weighted.sample ? Math.round((weighted.present / weighted.sample) * 100) : values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    return {
      category,
      averagePresence,
      companyAveragePresence: averageBySource(categoryProducts, "company", aggregation),
      competitorAveragePresence: averageBySource(categoryProducts, "competitor", aggregation),
      analytics: {
        ...analytics,
        points,
        productOptions: analytics.productOptions.filter((product) => categoryName(product.category) === category),
        averagePresence,
      },
    };
  });
}
