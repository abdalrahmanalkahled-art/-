import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getItemsForKeys: vi.fn(), getItems: vi.fn(), saveItems: vi.fn(), getReportHistory: vi.fn() }));
vi.mock("../storage", () => ({
  getItemsForKeys: mocks.getItemsForKeys,
  getItems: mocks.getItems,
  saveItems: mocks.saveItems,
  STORAGE_KEYS: {
    STORES: "stores", EVENTS: "events", SURVEY_CYCLES: "survey_cycles", SURVEY_TEMPLATES: "survey_templates", MARKETING_GOALS: "goals",
    WAREHOUSE_ITEMS: "warehouse_items", WAREHOUSE_TOOLS: "warehouse_tools", EXPENSES: "expenses", SIGNAGE_BOARDS: "boards", ROAD_SIGNAGE_CONTRACTS: "contracts", STANDS: "stands", SHELVES: "shelves", ADVERTISING_VEHICLES: "vehicles", PRODUCTS: "products", COMPANY_PRODUCTS: "company_products", COMPETITOR_PRODUCTS: "competitor_products", BRANDS: "brands", REGIONS: "regions",
  },
}));
vi.mock("../report-history", () => ({ getReportHistory: mocks.getReportHistory }));

import { loadGlobalSearchIndex, normalizeSearchText, searchGlobalIndex } from "../global-search";

describe("البحث الموحد المحلي", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItemsForKeys.mockResolvedValue({ stores: [{ id: "store-1", name: "أحمد للتجارة", region: "حلب" }], events: [{ id: "event-1", title: "فعالية إطلاق", region: "حلب" }] });
    mocks.getItems.mockResolvedValue([]);
    mocks.getReportHistory.mockResolvedValue([]);
  });

  it("يوحد أشكال العربية والأرقام عند تطبيع الاستعلام", () => {
    expect(normalizeSearchText("  أَحْمَد ١٢ ")).toBe("احمد 12");
  });

  it("يفهرس النتائج المسموح بها ويجد الاسم حتى مع اختلاف الهمزة", async () => {
    const index = await loadGlobalSearchIndex({ stores: true, events: true, surveys: false, goals: false, warehouse: false, expenses: false, signage: false, products: false, reports: false });
    const matches = searchGlobalIndex(index, "احمد");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ title: "أحمد للتجارة", permission: "stores", destination: { type: "route", pathname: "/store-detail" } });
  });

  it("لا يضيف مصادر الوحدة المخفية إلى الفهرس", async () => {
    const index = await loadGlobalSearchIndex({ stores: false, events: true, surveys: false, goals: false, warehouse: false, expenses: false, signage: false, products: false, reports: false });
    expect(index.some((result) => result.permission === "stores")).toBe(false);
    expect(index.some((result) => result.permission === "events")).toBe(true);
  });

  it("لا ينفذ بحثاً قبل إدخال حرفين ويطبق الفئة المحددة", async () => {
    const index = await loadGlobalSearchIndex({ stores: true, events: true, surveys: false, goals: false, warehouse: false, expenses: false, signage: false, products: false, reports: false });
    expect(searchGlobalIndex(index, "أ")).toEqual([]);
    expect(searchGlobalIndex(index, "حلب", "field")).toHaveLength(2);
  });
});
