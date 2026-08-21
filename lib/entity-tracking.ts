import type { AdvancedSurveyAnalytics, CycleProductPresence, TrackingNote } from "./advanced-analytics";
import type { MarketingAnalyticsSummary } from "./marketing-analytics";

export type TrackingEntityKind = "brand" | "store";

export interface TrackingProductMetric {
  productId: string;
  productName: string;
  brandName?: string;
  category: string;
  type: "company" | "competitor";
  presencePercentage: number;
  presentCount: number;
  sampleSize: number;
}

export interface EntityTrackingProfile {
  kind: TrackingEntityKind;
  name: string;
  productMetrics: TrackingProductMetric[];
  primaryProducts: TrackingProductMetric[];
  competingProducts: TrackingProductMetric[];
  notes: TrackingNote[];
  noteCounts: AdvancedSurveyAnalytics["noteCounts"];
  totalSurveys: number;
  totalStores: number;
  averagePresence: number;
  events: MarketingAnalyticsSummary["events"];
  signages: MarketingAnalyticsSummary["signages"];
  stands: MarketingAnalyticsSummary["stands"];
  goals: MarketingAnalyticsSummary["goals"];
  goalProgress?: number;
  totalEventCost: number;
}

function aggregateProducts(products: CycleProductPresence[]): TrackingProductMetric[] {
  const grouped = new Map<string, CycleProductPresence & { present: number; sample: number }>();
  products.forEach((product) => {
    const existing = grouped.get(product.productId);
    if (existing) {
      existing.present += product.presentCount;
      existing.sample += product.sampleSize;
      return;
    }
    grouped.set(product.productId, { ...product, present: product.presentCount, sample: product.sampleSize });
  });
  return [...grouped.values()].map((product) => ({
    productId: product.productId,
    productName: product.productName,
    brandName: product.brandName,
    category: product.category || "غير مصنف",
    type: product.type,
    presencePercentage: product.sample ? Math.round((product.present / product.sample) * 100) : 0,
    presentCount: product.present,
    sampleSize: product.sample,
  })).sort((left, right) => right.presencePercentage - left.presencePercentage || left.productName.localeCompare(right.productName, "ar"));
}

function profileBase(kind: TrackingEntityKind, name: string, analytics: AdvancedSurveyAnalytics, marketing: MarketingAnalyticsSummary, productMetrics: TrackingProductMetric[], primaryProducts: TrackingProductMetric[], competingProducts: TrackingProductMetric[]): EntityTrackingProfile {
  return {
    kind,
    name,
    productMetrics,
    primaryProducts,
    competingProducts,
    notes: analytics.notes,
    noteCounts: analytics.noteCounts,
    totalSurveys: analytics.totalSurveys,
    totalStores: analytics.totalStores,
    averagePresence: analytics.averagePresence,
    events: marketing.events,
    signages: marketing.signages,
    stands: marketing.stands,
    goals: marketing.goals,
    goalProgress: marketing.goalProgress,
    totalEventCost: marketing.totalCost,
  };
}

/** يبني ملف ماركة ويقارن منتجاتها بالماركات الأخرى ضمن أصنافها نفسها. */
export function buildBrandTrackingProfile(brandName: string, analytics: AdvancedSurveyAnalytics, marketing: MarketingAnalyticsSummary): EntityTrackingProfile {
  const allMetrics = aggregateProducts(analytics.points.flatMap((point) => point.products));
  const primaryProducts = allMetrics.filter((product) => product.brandName === brandName);
  const relatedCategories = new Set(primaryProducts.map((product) => product.category));
  const competingProducts = allMetrics.filter((product) => product.brandName !== brandName && relatedCategories.has(product.category));
  const productMetrics = [...primaryProducts, ...competingProducts];
  return profileBase("brand", brandName, analytics, marketing, productMetrics, primaryProducts, competingProducts);
}

/** يبني ملف محل من نتائج زياراته فقط ويقسم المنتجات إلى منتجاتنا والمنافسين. */
export function buildStoreTrackingProfile(storeName: string, analytics: AdvancedSurveyAnalytics, marketing: MarketingAnalyticsSummary): EntityTrackingProfile {
  const productMetrics = aggregateProducts(analytics.points.flatMap((point) => point.products));
  const primaryProducts = productMetrics.filter((product) => product.type === "company");
  const competingProducts = productMetrics.filter((product) => product.type === "competitor");
  return profileBase("store", storeName, analytics, marketing, productMetrics, primaryProducts, competingProducts);
}
