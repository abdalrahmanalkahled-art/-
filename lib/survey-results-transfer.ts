import type { Product, Store, SurveyCycle, SurveyNoteType, SurveyResult, SurveyTemplate } from "@/lib/types/survey-types";

export const SURVEY_RESULTS_EXPORT_TYPE = "madar-survey-results";
export const SURVEY_RESULTS_EXPORT_VERSION = 1;

export interface SurveyResultsExportPayload {
  type: typeof SURVEY_RESULTS_EXPORT_TYPE;
  version: typeof SURVEY_RESULTS_EXPORT_VERSION;
  exportedAt: string;
  template: Pick<SurveyTemplate, "id" | "name" | "products" | "showShelfPercentage" | "showProductPrice" | "hasNotes">;
  products: Product[];
  /** قائمة المحلات والمناطق تظهر صراحة في ملف التصدير إلى جانب تفاصيل كل نتيجة. */
  stores: Array<Pick<Store, "id" | "name" | "region">>;
  cycles: SurveyCycle[];
  results: SurveyResult[];
}

export interface ExternalAnalyticsDataset {
  template: SurveyTemplate;
  products: Product[];
  cycles: SurveyCycle[];
  results: SurveyResult[];
  stores: Array<{ id: string; name: string; region: string; isActive: boolean }>;
}

export function createSurveyResultsExport(template: SurveyTemplate, products: Product[], cycles: SurveyCycle[], results: SurveyResult[], cycleId: string | "all"): SurveyResultsExportPayload {
  const selectedCycles = cycles.filter((cycle) => cycle.templateId === template.id && (cycleId === "all" || cycle.id === cycleId));
  const selectedCycleIds = new Set(selectedCycles.map((cycle) => cycle.id));
  const selectedResults = results.filter((result) => result.templateId === template.id && (cycleId === "all" || selectedCycleIds.has(result.cycleId || "")));
  if (!selectedResults.length) throw new Error("لا توجد نتائج ضمن الاستبيان والدورة المحددين للتصدير.");
  const templateProductIds = new Set(template.products.map((item) => item.productId));
  const exportedProducts = products.filter((product) => templateProductIds.has(product.id));
  return {
    type: SURVEY_RESULTS_EXPORT_TYPE,
    version: SURVEY_RESULTS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    template: {
      id: template.id,
      name: template.name,
      products: template.products,
      showShelfPercentage: template.showShelfPercentage,
      showProductPrice: template.showProductPrice,
      hasNotes: template.hasNotes,
    },
    products: exportedProducts,
    stores: buildExportStores(selectedResults),
    cycles: selectedCycles,
    results: selectedResults,
  };
}

export function parseSurveyResultsExport(value: string): SurveyResultsExportPayload {
  let raw: unknown;
  try { raw = JSON.parse(value); } catch { throw new Error("الملف ليس JSON صالحاً."); }
  if (!isRecord(raw) || raw.type !== SURVEY_RESULTS_EXPORT_TYPE || raw.version !== SURVEY_RESULTS_EXPORT_VERSION) throw new Error("الملف ليس تصديراً لنتائج استبيان من تطبيق مدير تسويق مدار أو أن نسخته غير مدعومة.");
  if (!isRecord(raw.template) || !nonEmptyString(raw.template.id) || !nonEmptyString(raw.template.name) || !Array.isArray(raw.template.products)) throw new Error("ملف النتائج لا يحتوي على لقطة استبيان صالحة.");
  if (!Array.isArray(raw.products) || !Array.isArray(raw.cycles) || !Array.isArray(raw.results) || !raw.results.length) throw new Error("ملف النتائج لا يحتوي على منتجات أو دورات أو نتائج صالحة.");
  const products = raw.products.map(parseProduct).filter(Boolean) as Product[];
  const templateProducts = raw.template.products.map(parseTemplateProduct).filter(Boolean) as SurveyTemplate["products"];
  const results = raw.results.map(parseResult).filter(Boolean) as SurveyResult[];
  const cycles = raw.cycles.map(parseCycle).filter(Boolean) as SurveyCycle[];
  if (!products.length || !templateProducts.length || !results.length) throw new Error("ملف النتائج غير مكتمل أو لا يحتوي على بيانات قابلة للتحليل.");
  return {
    type: SURVEY_RESULTS_EXPORT_TYPE,
    version: SURVEY_RESULTS_EXPORT_VERSION,
    exportedAt: nonEmptyString(raw.exportedAt) ? raw.exportedAt : new Date().toISOString(),
    template: { id: raw.template.id.trim(), name: raw.template.name.trim(), products: templateProducts, showShelfPercentage: Boolean(raw.template.showShelfPercentage), showProductPrice: Boolean(raw.template.showProductPrice), hasNotes: Boolean(raw.template.hasNotes) },
    products,
    stores: Array.isArray(raw.stores) ? raw.stores.map(parseExportStore).filter(Boolean) as Array<Pick<Store, "id" | "name" | "region">> : buildExportStores(results),
    cycles,
    results,
  };
}

/** يحوّل التصدير إلى مجموعة تحليل معزولة من دون إضافتها إلى قائمة محلات التطبيق. */
export function createExternalAnalyticsDataset(payload: SurveyResultsExportPayload): ExternalAnalyticsDataset {
  const storeMap = new Map<string, { id: string; name: string; region: string; isActive: boolean }>();
  const tokenFor = (storeId: string, name: string, region: string) => {
    if (!storeMap.has(storeId)) {
      const index = storeMap.size + 1;
      storeMap.set(storeId, { id: `external-store-${index}`, name: name.trim() || `محل غير مسمى ${index}`, region: region.trim() || "منطقة غير مسماة", isActive: true });
    }
    return storeMap.get(storeId)!;
  };
  const results = payload.results.map((result, index) => {
    const store = tokenFor(result.storeId || `store-${index}`, result.storeName, result.storeRegion);
    return {
      ...result,
      id: `external-result-${index + 1}`,
      storeId: store.id,
      storeName: store.name,
      storeRegion: store.region,
      storePhotoUri: undefined,
      storePhotoUris: undefined,
      imageUri: undefined,
      questionAnswers: undefined,
    };
  });
  const template: SurveyTemplate = { ...payload.template, id: "external-template", createdAt: payload.exportedAt };
  const cycles = payload.cycles.map((cycle, index) => ({ ...cycle, id: `external-cycle-${index + 1}`, templateId: template.id, resultIds: [] }));
  const cycleMap = new Map(payload.cycles.map((cycle, index) => [cycle.id, cycles[index].id]));
  const sanitizedResults = results.map((result) => ({ ...result, templateId: template.id, cycleId: result.cycleId ? cycleMap.get(result.cycleId) : undefined }));
  return { template, products: payload.products, cycles, results: sanitizedResults, stores: [...storeMap.values()] };
}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function nonEmptyString(value: unknown): value is string { return typeof value === "string" && Boolean(value.trim()); }
function noteType(value: unknown): SurveyNoteType | undefined { return value === "positive" || value === "negative" || value === "complaint" || value === "suggestion" || value === "recommendation" ? value : undefined; }
function parseProduct(value: unknown): Product | null { if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name) || !nonEmptyString(value.categoryName) || (value.type !== "company" && value.type !== "competitor")) return null; return { id: value.id.trim(), name: value.name.trim(), categoryName: value.categoryName.trim(), type: value.type, ...(nonEmptyString(value.brandName) ? { brandName: value.brandName.trim() } : {}), ...(nonEmptyString(value.competitorName) ? { competitorName: value.competitorName.trim() } : {}) }; }
function parseTemplateProduct(value: unknown): SurveyTemplate["products"][number] | null { if (!isRecord(value) || !nonEmptyString(value.productId) || !nonEmptyString(value.productName) || (value.type !== "company" && value.type !== "competitor")) return null; return { productId: value.productId.trim(), productName: value.productName.trim(), type: value.type, ...(nonEmptyString(value.category) ? { category: value.category.trim() } : {}), ...(nonEmptyString(value.competitorName) ? { competitorName: value.competitorName.trim() } : {}) }; }
function parseCycle(value: unknown): SurveyCycle | null { if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.templateId) || !nonEmptyString(value.templateName) || !nonEmptyString(value.name) || !nonEmptyString(value.startDate) || !nonEmptyString(value.endDate) || !Array.isArray(value.resultIds) || !nonEmptyString(value.createdAt)) return null; return { id: value.id.trim(), templateId: value.templateId.trim(), templateName: value.templateName.trim(), name: value.name.trim(), startDate: value.startDate, endDate: value.endDate, resultIds: value.resultIds.filter(nonEmptyString), createdAt: value.createdAt, ...(nonEmptyString(value.closedAt) ? { closedAt: value.closedAt } : {}) }; }
function parseExportStore(value: unknown): Pick<Store, "id" | "name" | "region"> | null { if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name) || !nonEmptyString(value.region)) return null; return { id: value.id.trim(), name: value.name.trim(), region: value.region.trim() }; }
function parseResult(value: unknown): SurveyResult | null { if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.templateId) || !nonEmptyString(value.templateName) || !nonEmptyString(value.storeId) || !nonEmptyString(value.storeName) || !nonEmptyString(value.storeRegion) || !nonEmptyString(value.surveyDate) || !nonEmptyString(value.createdAt) || !Array.isArray(value.data)) return null; const data = value.data.map(parseResultData).filter(Boolean) as SurveyResult["data"]; if (!data.length) return null; return { id: value.id.trim(), templateId: value.templateId.trim(), templateName: value.templateName.trim(), storeId: value.storeId.trim(), storeName: value.storeName.trim(), storeRegion: value.storeRegion.trim(), surveyDate: value.surveyDate, createdAt: value.createdAt, data, ...(nonEmptyString(value.cycleId) ? { cycleId: value.cycleId.trim() } : {}), ...(nonEmptyString(value.cycleName) ? { cycleName: value.cycleName.trim() } : {}), ...(typeof value.hasShelfPercentage === "boolean" ? { hasShelfPercentage: value.hasShelfPercentage } : {}), ...(typeof value.hasProductPrice === "boolean" ? { hasProductPrice: value.hasProductPrice } : {}), ...(typeof value.totalShelves === "number" ? { totalShelves: value.totalShelves } : {}), ...(nonEmptyString(value.notes) ? { notes: value.notes.trim() } : {}), ...(noteType(value.noteType) ? { noteType: noteType(value.noteType) } : {}) }; }
function parseResultData(value: unknown): SurveyResult["data"][number] | null { if (!isRecord(value) || !nonEmptyString(value.productId) || !nonEmptyString(value.productName) || typeof value.present !== "boolean" || typeof value.shelfPercentage !== "number") return null; return { productId: value.productId.trim(), productName: value.productName.trim(), present: value.present, shelfPercentage: value.shelfPercentage, ...(typeof value.shelfOccupied === "number" ? { shelfOccupied: value.shelfOccupied } : {}), ...(typeof value.price === "number" ? { price: value.price } : {}) }; }
function buildExportStores(results: SurveyResult[]): Array<Pick<Store, "id" | "name" | "region">> { const stores = new Map<string, Pick<Store, "id" | "name" | "region">>(); results.forEach((result) => { if (!stores.has(result.storeId)) stores.set(result.storeId, { id: result.storeId, name: result.storeName, region: result.storeRegion }); }); return [...stores.values()]; }
