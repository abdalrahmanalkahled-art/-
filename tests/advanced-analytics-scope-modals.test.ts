import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const moduleSource = readFileSync(resolve(process.cwd(), "components/modules/advanced-analytics-module.tsx"), "utf8");
const productScopeSource = readFileSync(resolve(process.cwd(), "components/analytics-product-scope-modal.tsx"), "utf8");

describe("نطاق التحليل ونطاق المنتجات", () => {
  it("يحوّل نطاق التحليل ونطاق المنتجات إلى نوافذ عائمة", () => {
    expect(moduleSource).toContain("showScope");
    expect(moduleSource).toContain("AnalyticsScopeModal");
    expect(moduleSource).toContain("showProductScope");
    expect(moduleSource).toContain("AnalyticsProductScopeModal");
  });

  it("يفصل منتجاتنا ومنتجات المنافسين ويتيح تحديد الصنف كاملاً", () => {
    expect(productScopeSource).toContain("منتجاتنا");
    expect(productScopeSource).toContain("منتجات المنافسين");
    expect(productScopeSource).toContain("تحديد الصنف");
    expect(productScopeSource).toContain("SectionList");
    expect(productScopeSource).toContain("openedCategories");
    expect(productScopeSource).toContain("اضغط لعرض المنتجات");
  });

  it("يفتح خيارات نطاق التحليل ضمن نوافذ مركزية", () => {
    expect(moduleSource).toContain("CenteredSelectionModal");
    expect(moduleSource).toContain("maxHeight: \"84%\"");
  });

  it("يقدم تتبعاً مستقلاً للماركة أو المحل وتحليلاً موسعاً للفعاليات واللوحات", () => {
    expect(moduleSource).toContain("تتبع ماركة أو محل");
    expect(moduleSource).toContain("TrackingModeSelector");
    expect(moduleSource).toContain("TrackingProfilePanel");
    expect(moduleSource).toContain("MarketingAssetsOverview");
    expect(moduleSource).toContain("ملف متابعة ماركة");
    expect(moduleSource).toContain("الفعاليات والأصول المرتبطة");
  });
});
