import { describe, expect, it } from "vitest";

import { calculateAnalyticsDecisionMetrics, sortAnalyticsProducts } from "../analytics-decision-metrics";
import type { AdvancedSurveyAnalytics } from "../advanced-analytics";
import type { Store, SurveyResult } from "../types/survey-types";

const analytics: AdvancedSurveyAnalytics = {
  points: [
    { cycleId: "c1", cycleName: "دورة 1", startDate: "2026-01-01", endDate: "2026-01-02", surveyCount: 2, storeCount: 2, products: [{ productId: "p1", productName: "ألف", color: "#000", presencePercentage: 80, presentCount: 8, sampleSize: 10, type: "company" }, { productId: "p2", productName: "باء", color: "#111", presencePercentage: 70, presentCount: 7, sampleSize: 10, type: "company" }] },
    { cycleId: "c2", cycleName: "دورة 2", startDate: "2026-02-01", endDate: "2026-02-02", surveyCount: 2, storeCount: 2, products: [{ productId: "p1", productName: "ألف", color: "#000", presencePercentage: 40, presentCount: 4, sampleSize: 10, type: "company" }, { productId: "p2", productName: "باء", color: "#111", presencePercentage: 90, presentCount: 9, sampleSize: 10, type: "company" }] },
  ],
  productOptions: [{ id: "p1", name: "ألف", type: "company" }, { id: "p2", name: "باء", type: "company" }], totalSurveys: 2, totalStores: 2, averagePresence: 65, notes: [], noteCounts: { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 },
};
const stores: Store[] = [{ id: "s1", name: "محل 1", region: "دمشق", isActive: true }, { id: "s2", name: "محل 2", region: "دمشق", isActive: true }, { id: "s3", name: "محل 3", region: "دمشق", isActive: true }];
const results: SurveyResult[] = [
  { id: "r1", templateId: "t1", templateName: "دراسة", storeId: "s1", storeName: "محل 1", storeRegion: "دمشق", surveyDate: "2026-02-01", createdAt: "2026-02-01", data: [{ productId: "p1", productName: "ألف", present: true, shelfPercentage: 0 }, { productId: "p2", productName: "باء", present: true, shelfPercentage: 0 }] },
  { id: "r2", templateId: "t1", templateName: "دراسة", storeId: "s2", storeName: "محل 2", storeRegion: "دمشق", surveyDate: "2026-02-02", createdAt: "2026-02-02", data: [{ productId: "p1", productName: "ألف", present: false, shelfPercentage: 0 }, { productId: "p2", productName: "باء", present: true, shelfPercentage: 0 }] },
];

describe("مؤشرات القرار للتحليلات", () => {
  it("يحسب التغطية والتغير وفرص التحسين من نطاق حقيقي", () => {
    const metrics = calculateAnalyticsDecisionMetrics(analytics, results, stores, { regionName: "دمشق" }, { lowSampleThreshold: 5, strongSampleThreshold: 8, opportunityThreshold: 50, comparisonReference: "previousCycle", enabledIndicators: { cycleChange: true, uniqueStorePresence: true, surveyCoverage: true, opportunityList: true, sampleConfidence: true } });
    expect(metrics.surveyCoverage).toMatchObject({ eligibleStores: 3, surveyedStores: 2, percentage: 67 });
    expect(metrics.cycleChanges.find((item) => item.productId === "p1")?.change).toBe(-40);
    expect(metrics.opportunities.map((item) => item.productId)).toEqual(["p1"]);
    expect(metrics.uniqueStorePresence.find((item) => item.productId === "p1")?.presencePercentage).toBe(50);
  });

  it("يرتب المنتجات حسب أكبر تراجع دون تغيير بيانات الدورات", () => {
    const sorted = sortAnalyticsProducts(analytics, "largestDecline");
    expect(sorted.points[0].products.map((item) => item.productId)).toEqual(["p1", "p2"]);
    expect(sorted.points).toHaveLength(2);
  });
});
