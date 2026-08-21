import { describe, expect, it } from "vitest";

import { buildRegionProductMatrix, getRegionMatrixCell } from "../analytics-region-matrix";
import type { AnalyticsProductOption } from "../advanced-analytics";
import type { AnalyticsRegionMatrixSettings } from "../analytics-settings-model";
import type { SurveyResult } from "../types/survey-types";

const settings: AnalyticsRegionMatrixSettings = { enabled: true, metric: "presence", maxRegions: 8, maxProducts: 8, lowThreshold: 40, highThreshold: 70, sort: "template", showSampleSize: true, categoryMatricesEnabled: false, categoryMatrixCategoryNames: [] };
const products: AnalyticsProductOption[] = [{ id: "p1", name: "صنف ألف", category: "منظفات", type: "company" }, { id: "p2", name: "صنف باء", category: "منظفات", type: "company" }];
const results: SurveyResult[] = [
  { id: "r1", templateId: "t1", templateName: "دراسة", storeId: "s1", storeName: "محل 1", storeRegion: "دمشق", surveyDate: "2026-02-01", createdAt: "2026-02-01", data: [{ productId: "p1", productName: "صنف ألف", present: true, shelfPercentage: 50 }, { productId: "p2", productName: "صنف باء", present: false, shelfPercentage: 0 }] },
  { id: "r2", templateId: "t1", templateName: "دراسة", storeId: "s2", storeName: "محل 2", storeRegion: "دمشق", surveyDate: "2026-02-02", createdAt: "2026-02-02", data: [{ productId: "p1", productName: "صنف ألف", present: false, shelfPercentage: 20 }, { productId: "p2", productName: "صنف باء", present: true, shelfPercentage: 75 }] },
  { id: "r3", templateId: "t1", templateName: "دراسة", storeId: "s3", storeName: "محل 3", storeRegion: "حلب", surveyDate: "2026-02-03", createdAt: "2026-02-03", data: [{ productId: "p1", productName: "صنف ألف", present: true, shelfPercentage: 80 }, { productId: "p2", productName: "صنف باء", present: true, shelfPercentage: 80 }] },
  { id: "r4", templateId: "t1", templateName: "دراسة", storeId: "s1", storeName: "محل 1", storeRegion: "دمشق", surveyDate: "2026-02-04", createdAt: "2026-02-04", data: [{ productId: "p1", productName: "صنف ألف", present: false, shelfPercentage: 0 }, { productId: "p2", productName: "صنف باء", present: true, shelfPercentage: 60 }] },
];

describe("مصفوفة المنطقة والمنتج", () => {
  it("تحسب التواجد وحجم العينة ومتوسط الظهور لكل تقاطع", () => {
    const matrix = buildRegionProductMatrix(results, products, settings);
    expect(getRegionMatrixCell(matrix, "دمشق", "p1")).toMatchObject({ sampleSize: 3, presentCount: 1, presencePercentage: 33, averageShelfPercentage: 23, storeCount: 2 });
    expect(getRegionMatrixCell(matrix, "حلب", "p2")?.presencePercentage).toBe(100);
  });

  it("يعتمد أحدث زيارة لكل محل عند اختيار المحلات الفريدة", () => {
    const matrix = buildRegionProductMatrix(results, products, settings, "uniqueStores");
    expect(getRegionMatrixCell(matrix, "دمشق", "p1")).toMatchObject({ sampleSize: 2, presentCount: 0, presencePercentage: 0 });
  });

  it("يطبق مقياس الظهور وحدود العرض وترتيب الأضعف", () => {
    const matrix = buildRegionProductMatrix(results, products, { ...settings, metric: "shelf", sort: "weakest", maxRegions: 1, maxProducts: 1 });
    expect(matrix.regions).toHaveLength(1);
    expect(matrix.products).toHaveLength(1);
    expect(matrix.metricLabel).toBe("متوسط الظهور");
  });

  it("يعرض المناطق والمنتجات المحددة فقط دون تقييدها بحد كثافة المصفوفة", () => {
    const matrix = buildRegionProductMatrix(results, products, { ...settings, maxRegions: 1, maxProducts: 1 }, "visits", { regionNames: ["دمشق"], productIds: ["p2", "p1"] });
    expect(matrix.regions).toEqual(["دمشق"]);
    expect(matrix.products.map((item) => item.id)).toEqual(["p1", "p2"]);
    expect(matrix.cells.every((item) => item.region === "دمشق" && ["p1", "p2"].includes(item.productId))).toBe(true);
  });
});
