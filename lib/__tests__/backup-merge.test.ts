import { describe, expect, it, vi } from "vitest";

vi.mock("../storage", () => ({
  STORAGE_KEYS: {
    STORES: "madar_stores",
    STORE_VISITS: "madar_store_visits",
    SURVEYS: "madar_surveys",
    SURVEY_TEMPLATES: "madar_survey_templates",
    SURVEY_CYCLES: "madar_survey_cycles",
    SURVEY_RESULTS: "madar_survey_results",
    EVENTS: "madar_events",
    WAREHOUSE_ITEMS: "madar_warehouse_items",
    WAREHOUSE_MOVEMENTS: "madar_warehouse_movements",
    WAREHOUSE_CATEGORIES: "madar_warehouse_categories",
    WAREHOUSE_TOOLS: "madar_warehouse_tools",
    STORE_CATEGORIES: "madar_store_categories",
    EXPENSES: "madar_expenses",
    EXPENSE_CATEGORIES: "madar_expense_categories",
    BUDGETS: "madar_budgets",
    MARKETING_GOALS: "madar_marketing_goals",
    MARKETING_TASKS: "madar_marketing_tasks",
    SIGNAGE_BOARDS: "madar_signage_boards",
    STANDS: "madar_stands",
    COMPANY_PRODUCTS: "madar_company_products",
    COMPETITOR_PRODUCTS: "madar_competitor_products",
    PRODUCTS: "madar_products",
    PRODUCT_CATEGORIES: "madar_product_categories",
    COMPETITORS: "madar_competitors",
    BRANDS: "madar_brands",
    REGIONS: "madar_regions",
    REGION_RATINGS: "madar_region_ratings",
    MARKET_VISIT_REPORT_TEMPLATES: "madar_market_visit_report_templates",
    MARKET_VISIT_REPORT_SETTINGS: "madar_market_visit_report_settings",
    EXTERNAL_ANALYTICS_PACKAGES: "madar_external_analytics_packages",
  },
}));

import { mergeBackupData, normalizeNameForMerge } from "../backup-merge";

describe("دمج النسخ الاحتياطية بالاسم", () => {
  it("ينظف الفروق الشكلية في الاسم العربي قبل المطابقة", () => {
    expect(normalizeNameForMerge("  مُنظّفات   الأمل  ")).toBe(normalizeNameForMerge("منظفات الامل"));
  });

  it("يحدّث العنصر المتطابق بالاسم ولا يكرر السجل ويحافظ على معرفه المحلي", () => {
    const result = mergeBackupData(
      { madar_stores: JSON.stringify([{ id: "local-store", name: "متجر الأمل", region: "القديمة", phone: "111" }]) },
      { madar_stores: JSON.stringify([{ id: "backup-store", name: " متجر  الامل ", region: "الجديدة", phone: "222" }]) },
    );

    expect(JSON.parse(result.data.madar_stores)).toEqual([{ id: "local-store", name: " متجر  الامل ", region: "الجديدة", phone: "222" }]);
    expect(result.preview).toMatchObject({ added: 0, updated: 1, retained: 0 });
  });

  it("يبقي العناصر المحلية التي لا تظهر في النسخة ويضيف العناصر الجديدة", () => {
    const result = mergeBackupData(
      { madar_products: JSON.stringify([{ id: "p-1", name: "سائل جلي" }, { id: "p-2", name: "منظف أرضيات" }]) },
      { madar_products: JSON.stringify([{ id: "remote-1", name: "سائل جلي", active: true }, { id: "remote-3", name: "صابون" }]) },
    );

    expect(JSON.parse(result.data.madar_products)).toEqual([
      { id: "p-1", name: "سائل جلي", active: true },
      { id: "p-2", name: "منظف أرضيات" },
      { id: "remote-3", name: "صابون" },
    ]);
    expect(result.preview).toMatchObject({ added: 1, updated: 1, retained: 1 });
  });

  it("يطابق نتيجة الاستبيان داخل الاستبيان والدورة والمحل والتاريخ ويعيد ربط معرّفات المنتجات", () => {
    const result = mergeBackupData(
      {
        madar_products: JSON.stringify([{ id: "product-local", name: "سائل جلي" }]),
        madar_survey_results: JSON.stringify([{ id: "result-local", templateName: "استبيان السوق", cycleName: "دورة آب", storeName: "محل الهدى", surveyDate: "2026-08-20", data: [{ productId: "product-local", present: false }] }]),
      },
      {
        madar_products: JSON.stringify([{ id: "product-backup", name: "سائل جلي" }]),
        madar_survey_results: JSON.stringify([{ id: "result-backup", templateName: "استبيان السوق", cycleName: "دورة آب", storeName: "محل الهدى", surveyDate: "2026-08-20", data: [{ productId: "product-backup", present: true }] }]),
      },
    );

    expect(JSON.parse(result.data.madar_survey_results)).toEqual([
      { id: "result-local", templateName: "استبيان السوق", cycleName: "دورة آب", storeName: "محل الهدى", surveyDate: "2026-08-20", data: [{ productId: "product-local", present: true }] },
    ]);
  });

  it("يستثني إعدادات التطبيق المحلية دائماً من الكتابة فوق", () => {
    const result = mergeBackupData(
      { "@madar_theme_preference_v1": JSON.stringify("dark"), "@madar_analytics_settings": JSON.stringify({ chart: "line" }) },
      { "@madar_theme_preference_v1": JSON.stringify("light"), "@madar_analytics_settings": JSON.stringify({ chart: "bar" }) },
    );

    expect(result.data).toEqual({});
    expect(result.preview.preservedSettings).toBe(2);
  });
});
