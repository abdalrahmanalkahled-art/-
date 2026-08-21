import { describe, expect, it } from "vitest";

import { calculateMarketVisitProductMetrics, marketVisitProductMetricTags, marketVisitProductMetricValues } from "../market-visit-product-metrics";

describe("مؤشرات منتجات تقرير زيارة السوق", () => {
  const results: any[] = [
    { data: [{ productId: "p1", productName: "منتج ألف", present: true }, { productId: "p2", productName: "منتج باء", present: false }] },
    { data: [{ productId: "p1", productName: "منتج ألف", present: false }] },
  ];

  it("يحسب التواجد من نتائج شملت المنتج فقط", () => {
    expect(calculateMarketVisitProductMetrics(results, ["p1", "p2"])).toEqual([
      expect.objectContaining({ productId: "p1", presentCount: 1, sampleSize: 2, presencePercentage: 50 }),
      expect.objectContaining({ productId: "p2", presentCount: 0, sampleSize: 1, presencePercentage: 0 }),
    ]);
  });

  it("ينشئ وسوماً مرقمة ويعرض غير متاح عند غياب المنتج من الدورة", () => {
    const metrics = calculateMarketVisitProductMetrics(results, ["p1", "unknown"]);
    expect(marketVisitProductMetricTags(metrics).map((item) => item.tag)).toContain("{{نسبة_تواجد_منتج_2}}");
    expect(marketVisitProductMetricValues(metrics)["{{نسبة_تواجد_منتج_2}}"]).toBe("غير متاح");
  });
});
