import type { SurveyCycle, SurveyResult, SurveyTemplate } from "./types/survey-types";

/**
 * يطبق قائمة منتجات القالب المحدثة على نتائج المحلات المسجلة في الدورة النشطة فقط.
 * الدورات المغلقة تبقى لقطة تاريخية لا تتغير عند تعديل القالب لاحقاً.
 */
export function synchronizeActiveCycleResultsWithTemplate(template: SurveyTemplate, results: SurveyResult[], cycles: SurveyCycle[]): SurveyResult[] {
  const activeResultIds = new Set(
    cycles
      .filter((cycle) => cycle.templateId === template.id && !cycle.closedAt)
      .flatMap((cycle) => cycle.resultIds),
  );
  if (!activeResultIds.size) return results;

  return results.map((result) => {
    if (result.templateId !== template.id || !activeResultIds.has(result.id)) return result;
    const existingByProductId = new Map(result.data.map((item) => [item.productId, item]));
    const data = template.products.map((product) => {
      const previous = existingByProductId.get(product.productId);
      return previous
        ? { ...previous, productName: product.productName }
        : {
            productId: product.productId,
            productName: product.productName,
            present: false,
            shelfPercentage: 0,
            shelfOccupied: 0,
            ...(template.showProductPrice ? { price: 0 } : {}),
          };
    });
    return {
      ...result,
      templateName: template.name,
      hasShelfPercentage: template.showShelfPercentage !== false,
      hasProductPrice: Boolean(template.showProductPrice),
      allowStorePhoto: Boolean(template.allowStorePhoto),
      data,
    };
  });
}
