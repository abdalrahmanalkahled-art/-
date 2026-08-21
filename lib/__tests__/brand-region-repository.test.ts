import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getItems: vi.fn(),
  saveItems: vi.fn(),
  asyncGetItem: vi.fn(),
  asyncSetItem: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getItems: mocks.getItems,
  saveItems: mocks.saveItems,
  STORAGE_KEYS: {
    BRANDS: "brands", REGIONS: "regions", REGION_RATINGS: "ratings", PRODUCTS: "products", EVENTS: "events", SIGNAGE_BOARDS: "signages", STANDS: "stands", SHELVES: "shelves", ADVERTISING_VEHICLES: "vehicles", STORES: "stores", SURVEY_RESULTS: "results",
  },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: mocks.asyncGetItem, setItem: mocks.asyncSetItem },
}));

import { getBrandUsage, loadBrandRegionCatalog } from "../brand-region-repository";

describe("مرجع الماركات والمناطق", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItems.mockImplementation(async (key: string) => ({
      brands: [], regions: [], ratings: [],
      products: [{ id: "p1", brandName: "مدار" }],
      events: [{ id: "e1", brandName: "مدار", region: "دمشق" }],
      signages: [{ id: "s1", brand: "مدار" }],
      stands: [{ id: "st1", brand: "مدار" }],
      shelves: [{ id: "sh1", brandAllocations: [{ brand: "مدار", shelfCount: 2 }] }],
      vehicles: [{ id: "v1", brand: "مدار" }],
      stores: [{ id: "store1", region: "دمشق" }],
      results: [{ id: "r1", storeRegion: "دمشق" }],
    }[key] || []));
    mocks.asyncGetItem.mockImplementation(async (key: string) => key === "brands" ? JSON.stringify(["ماركة قديمة"]) : key === "store_regions" ? JSON.stringify(["حلب"]) : null);
  });

  it("يرحّل القوائم القديمة والبيانات المرتبطة إلى مرجع موحد مع تقييمات A وB وC", async () => {
    const catalog = await loadBrandRegionCatalog();

    expect(catalog.brands.map((item) => item.name)).toEqual(expect.arrayContaining(["ماركة قديمة", "مدار"]));
    expect(catalog.regions.map((item) => item.name)).toEqual(expect.arrayContaining(["دمشق", "حلب"]));
    expect(catalog.ratings.map((item) => item.label)).toEqual(["A", "B", "C"]);
    expect(mocks.asyncSetItem).toHaveBeenCalledWith("brands", expect.stringContaining("مدار"));
    expect(mocks.asyncSetItem).toHaveBeenCalledWith("store_regions", expect.stringContaining("دمشق"));
  });

  it("يحصي ارتباطات الماركة عبر المنتجات والفعاليات واللوحات والستاندات والأرفف والسيارات", async () => {
    const usage = await getBrandUsage("مدار");

    expect(usage).toEqual({ products: 1, events: 1, signages: 1, stands: 1, shelves: 1, advertisingVehicles: 1 });
  });
});
