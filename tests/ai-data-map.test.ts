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
    getItemsForKeys.mockImplementation(async (keys: string[]) => Object.fromEntries(keys.map((key) => {
      if (key === "survey_results") return [key, [{ id: "result-1", storeName: "محل النور", surveyDate: "2026-09-04", notes: "ملاحظة مهمة", data: [{ productId: "p1", productName: "منتج أ", present: true, comment: "موجود" }, { productId: "p2", productName: "منتج ب", present: false, comment: "غير موجود" }] }]];
      if (key === "goals") return [key, [{ id: "goal-1", title: "رفع التغطية", description: "هدف تفصيلي", brandName: "ماركة أ", startDate: "2026-09-01", endDate: "2026-09-30", kpi: "عدد الفعاليات", targetValue: 10, currentValue: 4, completionPercentage: 40, status: "on_track", tasks: [{ id: "task-1", title: "زيارة المحلات", status: "pending", dueDate: "2026-09-10" }], createdAt: "2026-09-01T00:00:00Z" }]];
      if (key === "events") return [key, [{ id: "event-1", title: "فعالية النور", goalId: "goal-1", eventDate: "2026-09-05", region: "الرياض", detailedAddress: "العنوان التفصيلي", brandName: "ماركة أ", status: "completed", attendeesCount: 25, giftsDistributed: 10, notes: "ملاحظات الفعالية", mediaUris: ["media://1"], createdAt: "2026-09-05T00:00:00Z" }]];
      return [key, []];
    })));
  });

  it("selects survey relations automatically and includes derived analytics", async () => {
    const result = await buildSmartDataContext("حلل آخر استبيان والمنتجات والتعليقات", ["field"]);
    const context = JSON.parse(result.context) as Record<string, any>;
    expect(result.domainIds).toContain("surveys");
    expect(context.surveys["نتائج الاستبيانات"]).toHaveLength(1);
    expect(context.surveys["نتائج الاستبيانات"][0]["نتائج المنتجات"][0]["التعليق"]).toBe("موجود");
    expect(context.surveys["التحليلات المتقدمة"].totalSurveys).toBe(1);
    expect(context.surveys["التحليلات المتقدمة"].averagePresence).toBe(50);
    expect(context.freshness).toContain("مباشرة");
  });

  it("includes goal tasks and related event details", async () => {
    const result = await buildSmartDataContext("ما تفاصيل هدف رفع التغطية والفعالية المرتبطة به؟", ["all"]);
    const context = JSON.parse(result.context) as Record<string, any>;
    expect(context.plan["الأهداف التسويقية"][0]["المهام"][0]["العنوان"]).toBe("زيارة المحلات");
    expect(context.plan["الفعاليات المرتبطة"][0]["العنوان التفصيلي"]).toBe("العنوان التفصيلي");
    expect(context.plan["الفعاليات المرتبطة"][0]["وسائط الفعالية"]).toEqual(["media://1"]);
    expect(result.context).not.toContain("\"goalId\"");
    expect(result.context).not.toContain("\"eventDate\"");
  });

  it("uses selected scopes when the question has no matching keyword", async () => {
    const result = await buildSmartDataContext("أعطني ملخصاً عاماً", ["warehouse"]);
    expect(result.domainIds).toEqual(["warehouse"]);
  });
});
