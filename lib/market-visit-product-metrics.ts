import type { SurveyResult } from "./types/survey-types";

export interface MarketVisitProductMetric {
  productId: string;
  productName: string;
  presentCount: number;
  sampleSize: number;
  presencePercentage: number;
}

export interface MarketVisitProductMetricOption { id: string; name: string; category?: string; }

/** يحسب وجود المنتج من الصفوف التي شملها الاستبيان فعلياً، لا من كامل محلات الدورة. */
export function calculateMarketVisitProductMetrics(results: SurveyResult[], productIds: string[]): MarketVisitProductMetric[] {
  return productIds.map((productId) => {
    const rows = results.flatMap((result) => result.data.filter((item) => item.productId === productId));
    const presentCount = rows.filter((item) => item.present).length;
    return {
      productId,
      productName: rows[0]?.productName || "منتج غير متاح",
      presentCount,
      sampleSize: rows.length,
      presencePercentage: rows.length ? Math.round((presentCount / rows.length) * 100) : 0,
    };
  });
}

/** يبني وسوماً مرقمة ثابتة يضعها المستخدم أينما يريد في قالب PowerPoint. */
export function marketVisitProductMetricTags(metrics: MarketVisitProductMetric[]): Array<{ tag: string; title: string; description: string }> {
  return metrics.flatMap((metric, index) => {
    const slot = index + 1;
    return [
      { tag: `{{اسم_منتج_${slot}}}`, title: `اسم المنتج ${slot}`, description: metric.productName },
      { tag: `{{نسبة_تواجد_منتج_${slot}}}`, title: `نسبة تواجد المنتج ${slot}`, description: `${metric.presencePercentage}% من عينة ${metric.sampleSize} محل.` },
      { tag: `{{محلات_موجود_منتج_${slot}}}`, title: `محلات المنتج ${slot}`, description: `${metric.presentCount} محل سجّل المنتج موجوداً.` },
      { tag: `{{عينة_منتج_${slot}}}`, title: `عينة المنتج ${slot}`, description: `${metric.sampleSize} نتيجة شملت المنتج.` },
    ];
  });
}

export function marketVisitProductMetricValues(metrics: MarketVisitProductMetric[]): Record<string, string> {
  return metrics.reduce<Record<string, string>>((values, metric, index) => {
    const slot = index + 1;
    values[`{{اسم_منتج_${slot}}}`] = metric.sampleSize ? metric.productName : "غير متاح";
    values[`{{نسبة_تواجد_منتج_${slot}}}`] = metric.sampleSize ? `${metric.presencePercentage}%` : "غير متاح";
    values[`{{محلات_موجود_منتج_${slot}}}`] = metric.sampleSize ? String(metric.presentCount) : "غير متاح";
    values[`{{عينة_منتج_${slot}}}`] = metric.sampleSize ? String(metric.sampleSize) : "غير متاح";
    return values;
  }, {});
}
