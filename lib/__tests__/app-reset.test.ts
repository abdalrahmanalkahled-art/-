import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: { multiRemove: vi.fn() } }));
vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///app/documents/", getInfoAsync: vi.fn(), deleteAsync: vi.fn() }));
vi.mock("../backup-restore-history", () => ({ LAST_RESTORE_HISTORY_KEY: "@madar_last_restore_history_v1" }));
vi.mock("../full-backup", () => ({ BACKUP_DATA_KEYS: ["madar_stores", "madar_events", "@madar_analytics_settings", "madar_managed_users"] }));
vi.mock("../storage", () => ({
  STORAGE_KEYS: {
    STORES: "madar_stores", STORE_CATEGORIES: "madar_store_categories", STORE_VISITS: "madar_store_visits", SURVEYS: "madar_surveys", SURVEY_TEMPLATES: "madar_survey_templates", SURVEY_CYCLES: "madar_survey_cycles", SURVEY_RESULTS: "madar_survey_results", EXTERNAL_ANALYTICS_PACKAGES: "madar_external_analytics_packages", EVENTS: "madar_events", WAREHOUSE_ITEMS: "madar_warehouse_items", WAREHOUSE_MOVEMENTS: "madar_warehouse_movements", WAREHOUSE_CATEGORIES: "madar_warehouse_categories", WAREHOUSE_TOOLS: "madar_warehouse_tools", EXPENSES: "madar_expenses", EXPENSE_CATEGORIES: "madar_expense_categories", BUDGETS: "madar_budgets", MARKETING_GOALS: "madar_marketing_goals", MARKETING_TASKS: "madar_marketing_tasks", SIGNAGE_BOARDS: "madar_signage_boards", ROAD_SIGNAGE_CONTRACTS: "madar_road_signage_contracts", STANDS: "madar_stands", PRODUCTS: "madar_products", COMPANY_PRODUCTS: "madar_company_products", COMPETITOR_PRODUCTS: "madar_competitor_products", PRODUCT_CATEGORIES: "madar_product_categories", COMPETITORS: "madar_competitors", BRANDS: "madar_brands", REGIONS: "madar_regions", REGION_RATINGS: "madar_region_ratings", MARKET_VISIT_REPORT_TEMPLATES: "madar_market_visit_report_templates", MARKET_VISIT_REPORT_SETTINGS: "madar_market_visit_report_settings",
  },
}));

import { getAppResetScope } from "../app-reset";

describe("تهيئة التطبيق", () => {
  it("تحافظ على النسخ الاحتياطية عند التهيئة الكاملة", () => {
    const scope = getAppResetScope("all");
    expect(scope.directories).not.toContain("backups/");
    expect(scope.keys).toContain("madar_stores");
    expect(scope.keys).toContain("app_session_token");
  });

  it("يحذف تهيئة المنتجات الاستبيانات التابعة لتجنب المراجع اليتيمة", () => {
    const scope = getAppResetScope("products");
    expect(scope.keys).toContain("madar_products");
    expect(scope.keys).toContain("madar_survey_results");
    expect(scope.warning).toContain("الاستبيان");
  });

  it("يعرض تحذيراً صريحاً للتهيئة التي تحذف بيانات تابعة", () => {
    expect(getAppResetScope("stores").warning).toContain("نتائج الاستبيانات");
    expect(getAppResetScope("goals").warning).toContain("الفعاليات");
  });
});
