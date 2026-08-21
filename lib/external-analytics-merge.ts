import type { Product, Store, SurveyCycle, SurveyResult, SurveyTemplate } from "@/lib/types/survey-types";
import type { ExternalAnalyticsDataset } from "@/lib/survey-results-transfer";

export interface SavedAnalyticsDatasetInput {
  name: string;
  dataset: ExternalAnalyticsDataset;
}

/** يبني جلسة تحليل للعرض فقط من آخر دورة لكل حزمة، دون حفظها أو تغيير بيانات التطبيق. */
export function createCombinedExternalAnalyticsDataset(packages: SavedAnalyticsDatasetInput[]): ExternalAnalyticsDataset {
  const now = new Date().toISOString();
  const templateId = "combined-external-template";
  const cycleId = "combined-external-latest-cycles";
  const productByKey = new Map<string, Product>();
  const templateProducts: SurveyTemplate["products"] = [];
  const stores: Store[] = [];
  const results: SurveyResult[] = [];

  packages.forEach((saved, packageIndex) => {
    const latestCycle = [...saved.dataset.cycles].sort((left, right) => cycleTimestamp(right) - cycleTimestamp(left))[0];
    if (!latestCycle) return;
    const sourceProducts = new Map(saved.dataset.products.map((product) => [product.id, product]));
    const sourceTemplateProducts = new Map(saved.dataset.template.products.map((product) => [product.productId, product]));
    const sourceStores = new Map(saved.dataset.stores.map((store) => [store.id, store]));
    const sourceStoreIds = new Map<string, string>();
    const cycleResults = saved.dataset.results.filter((result) => result.cycleId === latestCycle.id);

    cycleResults.forEach((sourceResult, resultIndex) => {
      const sourceStoreKey = sourceResult.storeId || `result-${resultIndex}`;
      let mergedStoreId = sourceStoreIds.get(sourceStoreKey);
      if (!mergedStoreId) {
        mergedStoreId = `combined-store-${packageIndex + 1}-${sourceStoreIds.size + 1}`;
        sourceStoreIds.set(sourceStoreKey, mergedStoreId);
        const sourceStore = sourceStores.get(sourceResult.storeId);
        stores.push({ id: mergedStoreId, name: sourceResult.storeName.trim() || sourceStore?.name.trim() || `محل غير مسمى ${packageIndex + 1}-${sourceStoreIds.size}`, region: saved.name, isActive: true });
      }

      const data = sourceResult.data.map((entry) => {
        const sourceProduct = sourceProducts.get(entry.productId);
        const templateProduct = sourceTemplateProducts.get(entry.productId);
        const name = sourceProduct?.name || entry.productName;
        const categoryName = sourceProduct?.categoryName || templateProduct?.category || "بدون تصنيف";
        const type = sourceProduct?.type || templateProduct?.type || "company";
        const brandName = sourceProduct?.brandName || sourceProduct?.competitorName || templateProduct?.competitorName || "";
        const key = [type, normalizeName(categoryName), normalizeName(brandName), normalizeName(name)].join("|");
        let mergedProduct = productByKey.get(key);
        if (!mergedProduct) {
          mergedProduct = { id: `combined-product-${productByKey.size + 1}`, name, categoryName, type, ...(brandName ? type === "company" ? { brandName } : { competitorName: brandName } : {}) };
          productByKey.set(key, mergedProduct);
          templateProducts.push({ productId: mergedProduct.id, productName: mergedProduct.name, type: mergedProduct.type, category: mergedProduct.categoryName, ...(mergedProduct.competitorName ? { competitorName: mergedProduct.competitorName } : {}) });
        }
        return { ...entry, productId: mergedProduct.id, productName: mergedProduct.name };
      });

      if (!data.length) return;
      results.push({ ...sourceResult, id: `combined-result-${results.length + 1}`, templateId, templateName: "تحليل الاستبيانات المحفوظة", cycleId, cycleName: "آخر دورة لكل استبيان محفوظ", storeId: mergedStoreId, storeName: stores.find((store) => store.id === mergedStoreId)?.name || "محل غير مسمى", storeRegion: saved.name, data });
    });
  });

  if (!results.length || !productByKey.size) throw new Error("لا توجد نتائج ضمن آخر دورة للاستبيانات المحفوظة.");
  const cycle: SurveyCycle = { id: cycleId, templateId, templateName: "تحليل الاستبيانات المحفوظة", name: "آخر دورة لكل استبيان محفوظ", startDate: now, endDate: now, resultIds: results.map((result) => result.id), createdAt: now };
  const template: SurveyTemplate = { id: templateId, name: "تحليل الاستبيانات المحفوظة", products: templateProducts, createdAt: now };
  return { template, products: [...productByKey.values()], cycles: [cycle], results, stores };
}

function cycleTimestamp(cycle: SurveyCycle): number { const value = Date.parse(cycle.endDate || cycle.createdAt); return Number.isNaN(value) ? 0 : value; }
function normalizeName(value: string): string { return value.trim().toLocaleLowerCase("ar").replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/\s+/g, " "); }
