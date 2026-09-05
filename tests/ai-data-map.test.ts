import { beforeEach, describe, expect, it, vi } from "vitest";

const { getItemsForKeys } = vi.hoisted(() => ({ getItemsForKeys: vi.fn() }));

vi.mock("@/lib/storage", () => ({
  STORAGE_KEYS: {
    SURVEYS: "surveys",
    SURVEY_TEMPLATES: "survey_templates",
    SURVEY_CYCLES: "survey_cycles",
    SURVEY_RESULTS: "survey_results",
    STORES: "stores",
    STORE_CATEGORIES: "store_categories",
    PRODUCTS: "products",
    COMPANY_PRODUCTS: "company_products",
    COMPETITOR_PRODUCTS: "competitor_products",
    PRODUCT_CATEGORIES: "product_categories",
    BRANDS: "brands",
    REGIONS: "regions",
    EVENTS: "events",
    FIELD_COMPETITOR_OBSERVATIONS: "field_observations",
    FIELD_EXECUTION_ASSESSMENTS: "execution_assessments",
    FIELD_CHECKLIST_RUNS: "checklist_runs",
    MARKETING_GOALS: "goals",
    MARKETING_TASKS: "tasks",
    WAREHOUSE_ITEMS: "warehouse_items",
    WAREHOUSE_MOVEMENTS: "warehouse_movements",
    WAREHOUSE_CATEGORIES: "warehouse_categories",
    WAREHOUSE_TOOLS: "warehouse_tools",
    SIGNAGE_BOARDS: "signage_boards",
    ROAD_SIGNAGE_CONTRACTS: "road_contracts",
    STANDS: "stands",
    SHELVES: "shelves",
    ADVERTISING_VEHICLES: "vehicles",
    COMPETITORS: "competitors",
  },
  getItemsForKeys,
}));

import { buildSmartDataContext } from "@/lib/ai-data-map";

describe("AI data map", () => {
  beforeEach(() => {
    getItemsForKeys.mockImplementation(async (keys: string[]) => Object.fromEntries(keys.map((key) => [key, key === "survey_results" ? [
      {
        id: "result-1",
        storeName: "محل النور",
        surveyDate: "2026-09-04",
        notes: "ملاحظة مهمة",
        data: [
          { productId: "p1", productName: "منتج أ", present: true, comment: "موجود" },
          { productId: "p2", productName: "منتج ب", present: false, comment: "غير موجود" },
        ],
      },
    ] : []])));
  });

  it("selects survey relations automatically and includes derived analytics", async () => {
    const result = await buildSmartDataContext("حلل آخر استبيان والمنتجات والتعليقات", ["field"]);
    const context = JSON.parse(result.context) as Record<string, any>;
    expect(result.domainIds).toContain("surveys");
    expect(context.surveys.survey_results).toHaveLength(1);
    expect(context.surveys.survey_results[0].data[0].comment).toBe("موجود");
    expect(context.surveys.advancedAnalytics.totalSurveys).toBe(1);
    expect(context.surveys.advancedAnalytics.averagePresence).toBe(50);
    expect(context.freshness).toContain("مباشرة");
  });

  it("uses selected scopes when the question has no matching keyword", async () => {
    const result = await buildSmartDataContext("أعطني ملخصاً عاماً", ["warehouse"]);
    expect(result.domainIds).toEqual(["warehouse"]);
  });
});
