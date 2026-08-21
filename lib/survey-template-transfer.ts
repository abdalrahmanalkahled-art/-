import type { Product, Question, SurveyTemplate, SurveyTemplateProduct } from "@/lib/types/survey-types";

export const SURVEY_TEMPLATE_EXPORT_TYPE = "madar-survey-template";
export const SURVEY_TEMPLATE_EXPORT_VERSION = 1;

type StoredProduct = Product & { categoryId?: string; createdAt?: string };
type ProductCategory = { id: string; name: string; createdAt: string };
type ExportedSurveyTemplate = Omit<SurveyTemplate, "id" | "createdAt" | "imageUri" | "products"> & { products: Array<Omit<SurveyTemplateProduct, "productId">> };

export interface SurveyTemplateExportPayload {
  type: typeof SURVEY_TEMPLATE_EXPORT_TYPE;
  version: typeof SURVEY_TEMPLATE_EXPORT_VERSION;
  exportedAt: string;
  template: ExportedSurveyTemplate;
  products: Array<Omit<StoredProduct, "id" | "categoryId" | "createdAt">>;
}

export interface SurveyTemplateImportPreview {
  templateName: string;
  productCount: number;
  questionCount: number;
  missingCategoryCount: number;
  missingProductCount: number;
  templateAlreadyExists: boolean;
}

export interface SurveyTemplateImportPlan extends SurveyTemplateImportPreview {
  payload: SurveyTemplateExportPayload;
  missingCategories: string[];
  missingProducts: Array<Omit<StoredProduct, "id" | "categoryId" | "createdAt">>;
}

export interface SurveyTemplateImportOutcome {
  templates: SurveyTemplate[];
  products: StoredProduct[];
  categories: ProductCategory[];
  addedTemplate: boolean;
  addedCategories: number;
  addedProducts: number;
  templateName: string;
}

/** يعيد بناء فهرس الأصناف من المنتجات القائمة قبل الاستيراد، مع إصلاح معرّفات الأصناف اليتيمة القديمة. */
export function reconcileProductCategories(products: StoredProduct[], categories: ProductCategory[], now = new Date()): { products: StoredProduct[]; categories: ProductCategory[] } {
  const categoryByName = new Map(categories.map((category) => [key(category.name), category]));
  const nextCategories = [...categories];
  products.forEach((product, index) => {
    const categoryName = product.categoryName?.trim() || "بدون تصنيف";
    const categoryKey = key(categoryName);
    if (!categoryByName.has(categoryKey)) {
      const category = { id: product.categoryId || createId("category", now, index), name: categoryName, createdAt: now.toISOString() };
      categoryByName.set(categoryKey, category);
      nextCategories.push(category);
    }
  });
  const normalizedProducts = products.map((product) => {
    const categoryName = product.categoryName?.trim() || "بدون تصنيف";
    const category = categoryByName.get(key(categoryName));
    return category && (product.categoryId !== category.id || product.categoryName !== category.name) ? { ...product, categoryId: category.id, categoryName: category.name } : product;
  });
  return { products: normalizedProducts, categories: nextCategories };
}

export function createSurveyTemplateExport(template: SurveyTemplate, products: StoredProduct[]): SurveyTemplateExportPayload {
  const productById = new Map(products.map((product) => [product.id, product]));
  const exportedProducts = template.products.map((item) => {
    const product = productById.get(item.productId);
    return {
      name: product?.name || item.productName,
      categoryName: product?.categoryName || item.category || "بدون تصنيف",
      type: product?.type || item.type,
      brandName: product?.brandName,
      competitorName: product?.competitorName || item.competitorName,
    };
  });
  return {
    type: SURVEY_TEMPLATE_EXPORT_TYPE,
    version: SURVEY_TEMPLATE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    template: {
      name: template.name,
      products: template.products.map(({ productId: _productId, ...product }) => product),
      showShelfPercentage: template.showShelfPercentage,
      showProductPrice: template.showProductPrice,
      allowStorePhoto: template.allowStorePhoto,
      questions: template.questions,
      hasNotes: template.hasNotes,
    },
    products: exportedProducts,
  };
}

export function parseSurveyTemplateExport(value: string): SurveyTemplateExportPayload {
  let raw: unknown;
  try { raw = JSON.parse(value); } catch { throw new Error("الملف ليس JSON صالحاً."); }
  if (!isRecord(raw) || raw.type !== SURVEY_TEMPLATE_EXPORT_TYPE || raw.version !== SURVEY_TEMPLATE_EXPORT_VERSION) throw new Error("الملف ليس قالب استبيان صادر من تطبيق مدير تسويق مدار أو أن نسخته غير مدعومة.");
  if (!isRecord(raw.template) || !nonEmptyString(raw.template.name) || !Array.isArray(raw.template.products) || !Array.isArray(raw.products)) throw new Error("ملف الاستبيان غير مكتمل أو لا يحتوي على منتجات صالحة.");
  const templateProducts = raw.template.products.map((item) => parseTemplateProduct(item)).filter(Boolean) as Omit<SurveyTemplateProduct, "productId">[];
  const products = raw.products.map((item) => parseProduct(item)).filter(Boolean) as SurveyTemplateExportPayload["products"];
  if (!templateProducts.length || !products.length) throw new Error("لا يحتوي ملف الاستبيان على منتجات قابلة للاستيراد.");
  const questions = Array.isArray(raw.template.questions) ? raw.template.questions.map(parseQuestion).filter(Boolean) as Question[] : undefined;
  return {
    type: SURVEY_TEMPLATE_EXPORT_TYPE,
    version: SURVEY_TEMPLATE_EXPORT_VERSION,
    exportedAt: nonEmptyString(raw.exportedAt) ? raw.exportedAt : new Date().toISOString(),
    template: {
      name: raw.template.name.trim(),
      products: templateProducts,
      showShelfPercentage: Boolean(raw.template.showShelfPercentage),
      showProductPrice: Boolean(raw.template.showProductPrice),
      allowStorePhoto: Boolean(raw.template.allowStorePhoto),
      hasNotes: Boolean(raw.template.hasNotes),
      questions: questions?.length ? questions : undefined,
    },
    products,
  };
}

export function createSurveyTemplateImportPlan(payload: SurveyTemplateExportPayload, templates: SurveyTemplate[], products: StoredProduct[], categories: ProductCategory[]): SurveyTemplateImportPlan {
  const knownCategories = new Set(categories.map((category) => key(category.name)));
  const missingCategories = unique(payload.products.map((product) => product.categoryName).filter((name) => !knownCategories.has(key(name))));
  const knownProducts = new Set(products.map(productIdentity));
  const missingProducts = payload.products.filter((product) => !knownProducts.has(productIdentity(product)));
  const templateAlreadyExists = templates.some((template) => templatesMatch(template, payload.template));
  return {
    payload,
    templateName: payload.template.name,
    productCount: payload.template.products.length,
    questionCount: payload.template.questions?.length || 0,
    missingCategoryCount: missingCategories.length,
    missingProductCount: missingProducts.length,
    templateAlreadyExists,
    missingCategories,
    missingProducts,
  };
}

export function applySurveyTemplateImport(plan: SurveyTemplateImportPlan, templates: SurveyTemplate[], products: StoredProduct[], categories: ProductCategory[], now = new Date()): SurveyTemplateImportOutcome {
  const createdAt = now.toISOString();
  const newCategories = plan.missingCategories.map((name, index) => ({ id: createId("category", now, index), name, createdAt }));
  const allCategories = [...categories, ...newCategories];
  const categoryByName = new Map(allCategories.map((category) => [key(category.name), category]));
  const newProducts = plan.missingProducts.map((product, index) => ({
    ...product,
    id: createId("product", now, index),
    categoryId: categoryByName.get(key(product.categoryName))?.id,
    createdAt,
  }));
  const allProducts = [...products, ...newProducts];
  const templateProductMap = new Map(allProducts.map((product) => [templateProductIdentity(product), product]));
  const template = plan.templateAlreadyExists ? null : {
    id: createId("template", now, templates.length),
    name: uniqueTemplateName(plan.payload.template.name, templates),
    createdAt,
    products: plan.payload.template.products.map((item) => {
      const product = templateProductMap.get(templateProductIdentity({ name: item.productName, categoryName: item.category || "بدون تصنيف", type: item.type, competitorName: item.competitorName }));
      return { productId: product?.id || createId("product", now, 0), productName: item.productName, type: item.type, competitorName: item.competitorName, category: item.category || "بدون تصنيف" };
    }),
    showShelfPercentage: plan.payload.template.showShelfPercentage,
    showProductPrice: plan.payload.template.showProductPrice,
    allowStorePhoto: plan.payload.template.allowStorePhoto,
    hasNotes: plan.payload.template.hasNotes,
    questions: plan.payload.template.questions,
  } satisfies SurveyTemplate;
  return {
    templates: template ? [...templates, template] : templates,
    products: allProducts,
    categories: allCategories,
    addedTemplate: Boolean(template),
    addedCategories: newCategories.length,
    addedProducts: newProducts.length,
    templateName: template?.name || plan.payload.template.name,
  };
}

function templatesMatch(template: SurveyTemplate, imported: SurveyTemplateExportPayload["template"]) {
  if (key(template.name) !== key(imported.name) || template.products.length !== imported.products.length) return false;
  const existing = template.products.map((item) => templateProductIdentity({ name: item.productName, categoryName: item.category || "بدون تصنيف", type: item.type, competitorName: item.competitorName })).sort();
  const incoming = imported.products.map((item) => templateProductIdentity({ name: item.productName, categoryName: item.category || "بدون تصنيف", type: item.type, competitorName: item.competitorName })).sort();
  return existing.every((value, index) => value === incoming[index]);
}

function productIdentity(product: { name: string; categoryName?: string; category?: string; type: "company" | "competitor"; brandName?: string; competitorName?: string }) { return [key(product.name), key(product.categoryName || product.category || "بدون تصنيف"), product.type, key(product.brandName || ""), key(product.competitorName || "")].join("|"); }
function templateProductIdentity(product: { name: string; categoryName?: string; category?: string; type: "company" | "competitor"; competitorName?: string }) { return [key(product.name), key(product.categoryName || product.category || "بدون تصنيف"), product.type, key(product.competitorName || "")].join("|"); }
function uniqueTemplateName(name: string, templates: SurveyTemplate[]) { const used = new Set(templates.map((template) => key(template.name))); if (!used.has(key(name))) return name; let index = 2; while (used.has(key(`${name} (${index})`))) index += 1; return `${name} (${index})`; }
function createId(prefix: string, now: Date, index: number) { return `${prefix}_${now.getTime()}_${index}`; }
function unique(values: string[]) { return [...new Map(values.map((value) => [key(value), value.trim()])).values()]; }
function key(value: string) { return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ar"); }
function nonEmptyString(value: unknown): value is string { return typeof value === "string" && Boolean(value.trim()); }
function isRecord(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function parseTemplateProduct(value: unknown) { if (!isRecord(value) || !nonEmptyString(value.productName) || !nonEmptyString(value.type) || (value.type !== "company" && value.type !== "competitor")) return null; return { productName: value.productName.trim(), type: value.type, competitorName: nonEmptyString(value.competitorName) ? value.competitorName.trim() : undefined, category: nonEmptyString(value.category) ? value.category.trim() : "بدون تصنيف" }; }
function parseProduct(value: unknown) { if (!isRecord(value) || !nonEmptyString(value.name) || !nonEmptyString(value.categoryName) || (value.type !== "company" && value.type !== "competitor")) return null; return { name: value.name.trim(), categoryName: value.categoryName.trim(), type: value.type, brandName: nonEmptyString(value.brandName) ? value.brandName.trim() : undefined, competitorName: nonEmptyString(value.competitorName) ? value.competitorName.trim() : undefined }; }
function parseQuestion(value: unknown) { if (!isRecord(value) || !nonEmptyString(value.text)) return null; return { id: nonEmptyString(value.id) ? value.id : `question_${Date.now()}`, text: value.text.trim(), options: Array.isArray(value.options) ? value.options.filter(nonEmptyString).map((option) => option.trim()) : [], allowMultiple: Boolean(value.allowMultiple) }; }
