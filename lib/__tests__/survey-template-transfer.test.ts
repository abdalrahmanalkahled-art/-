import { describe, expect, it } from "vitest";

import { applySurveyTemplateImport, createSurveyTemplateExport, createSurveyTemplateImportPlan, parseSurveyTemplateExport, reconcileProductCategories } from "../survey-template-transfer";

const template = {
  id: "template-old",
  name: "دراسة مسحوق",
  createdAt: "2026-08-18T00:00:00.000Z",
  showShelfPercentage: true,
  showProductPrice: true,
  allowStorePhoto: true,
  products: [
    { productId: "product-a", productName: "مسحوق مدار", type: "company" as const, category: "مساحيق" },
    { productId: "product-b", productName: "مسحوق منافس", type: "competitor" as const, category: "مساحيق", competitorName: "شركة منافسة" },
  ],
  questions: [{ id: "q1", text: "هل المنتج ظاهر؟", options: ["نعم", "لا"], allowMultiple: false }],
};

const products = [
  { id: "product-a", name: "مسحوق مدار", categoryId: "cat-a", categoryName: "مساحيق", type: "company" as const, brandName: "مدار", createdAt: "2026-08-18T00:00:00.000Z" },
  { id: "product-b", name: "مسحوق منافس", categoryId: "cat-a", categoryName: "مساحيق", type: "competitor" as const, competitorName: "شركة منافسة", createdAt: "2026-08-18T00:00:00.000Z" },
];

describe("نقل قالب الاستبيان", () => {
  it("يصدر قالباً مستقلاً بلا المعرفات المحلية ثم يقرأه من JSON", () => {
    const exported = createSurveyTemplateExport(template, products);
    const parsed = parseSurveyTemplateExport(JSON.stringify(exported));
    expect(parsed.template.name).toBe("دراسة مسحوق");
    expect(parsed.template.products[0]).not.toHaveProperty("productId");
    expect(parsed.products).toHaveLength(2);
    expect(parsed.template.questions?.[0].text).toBe("هل المنتج ظاهر؟");
  });

  it("يضيف فقط الفئة والمنتج الناقصين وينشئ قالباً جديداً بمعرفات محلية", () => {
    const payload = createSurveyTemplateExport(template, products);
    const existingProducts = [products[0]];
    const categories = [{ id: "cat-a", name: "مساحيق", createdAt: "2026-08-18T00:00:00.000Z" }];
    const plan = createSurveyTemplateImportPlan(payload, [], existingProducts, categories);
    const outcome = applySurveyTemplateImport(plan, [], existingProducts, categories, new Date("2026-08-19T00:00:00.000Z"));
    expect(plan.missingCategoryCount).toBe(0);
    expect(plan.missingProductCount).toBe(1);
    expect(outcome.addedTemplate).toBe(true);
    expect(outcome.addedProducts).toBe(1);
    expect(outcome.templates[0].products.map((item) => item.productId)).toEqual(expect.arrayContaining(["product-a", "product_1787097600000_0"]));
  });

  it("لا يكرر قالباً مطابقاً ولا أصنافه ومنتجاته عند استيراد الملف مرة ثانية", () => {
    const payload = createSurveyTemplateExport(template, products);
    const categories = [{ id: "cat-a", name: "مساحيق", createdAt: "2026-08-18T00:00:00.000Z" }];
    const plan = createSurveyTemplateImportPlan(payload, [template], products, categories);
    const outcome = applySurveyTemplateImport(plan, [template], products, categories, new Date("2026-08-19T00:00:00.000Z"));
    expect(plan.templateAlreadyExists).toBe(true);
    expect(plan.missingProductCount).toBe(0);
    expect(outcome.addedTemplate).toBe(false);
    expect(outcome.addedCategories).toBe(0);
    expect(outcome.addedProducts).toBe(0);
  });

  it("يحافظ على المنتجات القائمة ويصلح معرف الصنف اليتيم كي تبقى ظاهرة في صفحة المنتجات", () => {
    const currentProducts = [...products, { id: "product-legacy", name: "منتج قديم", categoryId: "category-deleted", categoryName: "مساحيق", type: "company" as const, createdAt: "2026-08-18T00:00:00.000Z" }];
    const categories = [{ id: "cat-a", name: "مساحيق", createdAt: "2026-08-18T00:00:00.000Z" }];
    const reconciled = reconcileProductCategories(currentProducts, categories, new Date("2026-08-19T00:00:00.000Z"));
    expect(reconciled.products).toHaveLength(3);
    expect(reconciled.products.find((product) => product.id === "product-legacy")?.categoryId).toBe("cat-a");
    expect(reconciled.categories).toEqual(categories);
  });

  it("يرفض ملفاً غير صادر من مساعد التسويق الميداني", () => {
    expect(() => parseSurveyTemplateExport(JSON.stringify({ type: "unknown", version: 1 }))).toThrow("ليس قالب استبيان");
  });
});
