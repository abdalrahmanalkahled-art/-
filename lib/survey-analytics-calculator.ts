export interface SurveyResult {
  id: string;
  templateId: string;
  templateName: string;
  storeId: string;
  storeName: string;
  storeRegion: string;
  surveyDate: string;
  data: ProductObservation[];
  questions?: SurveyQuestionAnswer[];
  notes?: string;
  noteType?: "positive" | "negative" | "complaint" | "suggestion" | "recommendation";
  createdAt: string;
}

export interface ProductObservation {
  productId: string;
  productName: string;
  present: boolean;
  shelfPercentage?: number;
}

interface SurveyQuestionAnswer { questionId: string; question: string; answer: string; }

export interface Product {
  id: string;
  name: string;
  categoryName: string;
  type: "company" | "competitor";
  competitorName?: string;
}

export interface AnalyticsData {
  categoryAnalysis: CategoryAnalysis[];
  storeAnalysis: StoreAnalysis[];
  overallStats: OverallStats;
  topProductsByRegion: RegionTopProduct[];
}

interface ProductAnalytics { name: string; presencePercentage: number; avgShelfPercentage: number; visitCount: number; }
interface CompetitorAnalytics extends ProductAnalytics { competitorName: string; }
interface CategoryAnalysis { categoryName: string; companyProducts: ProductAnalytics[]; competitorProducts: CompetitorAnalytics[]; }
interface StoreAnalysis { storeId: string; storeName: string; storeRegion: string; visitCount: number; lastVisitDate: string; overallPresencePercentage: number; presenceTrend: "up" | "down" | "stable"; presenceHistory: PresenceHistoryPoint[]; }
interface PresenceHistoryPoint { date: string; percentage: number; }
interface OverallStats { totalSurveys: number; totalStores: number; avgPresence: number; companyAvgPresence: number; competitorAvgPresence: number; }
interface RegionTopProduct { region: string; topProduct: { productId: string; productName: string; presencePercentage: number; type: "company" | "competitor" }; }

interface ProductSeed { name: string; competitorName?: string; data: ProductObservation[]; }
interface CategorySeed { company: Map<string, ProductSeed>; competitors: Map<string, ProductSeed>; }
interface StoreSeed { storeId: string; storeName: string; storeRegion: string; surveys: SurveyResult[]; }

const percentageFor = (items: ProductObservation[]) => items.length ? Math.round((items.filter((item) => item.present).length / items.length) * 100) : 0;
const averageShelfFor = (items: ProductObservation[]) => items.length ? Math.round(items.reduce((total, item) => total + (item.present ? (item.shelfPercentage || 0) : 0), 0) / items.length) : 0;
const average = (values: number[]) => values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0;

export function calculateSurveyAnalytics(surveys: SurveyResult[], products: Product[]): AnalyticsData {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const categoryMap = new Map<string, CategorySeed>();

  for (const product of products) {
    const category = categoryMap.get(product.categoryName) ?? { company: new Map(), competitors: new Map() };
    categoryMap.set(product.categoryName, category);
    const seed: ProductSeed = { name: product.name, competitorName: product.competitorName, data: [] };
    if (product.type === "company") category.company.set(product.id, seed);
    else category.competitors.set(product.id, seed);
  }

  for (const survey of surveys) {
    for (const observation of survey.data) {
      const product = productsById.get(observation.productId);
      const category = product ? categoryMap.get(product.categoryName) : undefined;
      const seed = product?.type === "company" ? category?.company.get(product.id) : category?.competitors.get(product?.id ?? "");
      seed?.data.push(observation);
    }
  }

  const categoryAnalysis = Array.from(categoryMap.entries()).map(([categoryName, category]) => ({
    categoryName,
    companyProducts: Array.from(category.company.values()).map((seed) => ({ name: seed.name, presencePercentage: percentageFor(seed.data), avgShelfPercentage: averageShelfFor(seed.data), visitCount: seed.data.length })),
    competitorProducts: Array.from(category.competitors.values()).map((seed) => ({ name: seed.name, competitorName: seed.competitorName ?? "", presencePercentage: percentageFor(seed.data), avgShelfPercentage: averageShelfFor(seed.data), visitCount: seed.data.length })),
  }));

  const storeMap = new Map<string, StoreSeed>();
  for (const survey of surveys) {
    const store = storeMap.get(survey.storeId) ?? { storeId: survey.storeId, storeName: survey.storeName, storeRegion: survey.storeRegion, surveys: [] };
    store.surveys.push(survey);
    storeMap.set(survey.storeId, store);
  }

  const storeAnalysis = Array.from(storeMap.values()).map((store) => {
    const sortedSurveys = [...store.surveys].sort((left, right) => new Date(left.surveyDate).getTime() - new Date(right.surveyDate).getTime());
    const presenceHistory = sortedSurveys.map((survey) => ({ date: survey.surveyDate, percentage: percentageFor(survey.data) }));
    const latestPercentage = presenceHistory.at(-1)?.percentage ?? 0;
    const previousPercentage = presenceHistory.at(-2)?.percentage ?? latestPercentage;
    return { storeId: store.storeId, storeName: store.storeName, storeRegion: store.storeRegion, visitCount: store.surveys.length, lastVisitDate: sortedSurveys.at(-1)?.surveyDate ?? "", overallPresencePercentage: latestPercentage, presenceTrend: latestPercentage > previousPercentage ? "up" as const : latestPercentage < previousPercentage ? "down" as const : "stable" as const, presenceHistory };
  });

  const regionProducts = new Map<string, Map<string, { present: number; total: number; type: Product["type"] }>>();
  for (const survey of surveys) {
    const region = regionProducts.get(survey.storeRegion) ?? new Map();
    regionProducts.set(survey.storeRegion, region);
    for (const observation of survey.data) {
      const product = productsById.get(observation.productId);
      if (!product) continue;
      const stats = region.get(product.id) ?? { present: 0, total: 0, type: product.type };
      if (observation.present) stats.present += 1;
      stats.total += 1;
      region.set(product.id, stats);
    }
  }

  const topProductsByRegion = Array.from(regionProducts.entries()).map(([region, productMap]) => {
    const top = Array.from(productMap.entries()).reduce<{ productId: string; productName: string; presencePercentage: number; type: Product["type"] } | null>((current, [productId, stats]) => {
      const product = productsById.get(productId);
      const presencePercentage = stats.total ? Math.round((stats.present / stats.total) * 100) : 0;
      return product && (!current || presencePercentage > current.presencePercentage) ? { productId, productName: product.name, presencePercentage, type: product.type } : current;
    }, null);
    return { region, topProduct: top ?? { productId: "", productName: "", presencePercentage: 0, type: "company" as const } };
  });

  const overallPresence = surveys.map((survey) => percentageFor(survey.data));
  const companyPresence = surveys.map((survey) => percentageFor(survey.data.filter((item) => productsById.get(item.productId)?.type === "company")));
  const competitorPresence = surveys.map((survey) => percentageFor(survey.data.filter((item) => productsById.get(item.productId)?.type === "competitor")));

  return { categoryAnalysis, storeAnalysis, topProductsByRegion, overallStats: { totalSurveys: surveys.length, totalStores: storeMap.size, avgPresence: average(overallPresence), companyAvgPresence: average(companyPresence), competitorAvgPresence: average(competitorPresence) } };
}
