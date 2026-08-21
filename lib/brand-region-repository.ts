import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";

export interface BrandReference {
  id: string;
  name: string;
  createdAt: string;
  isActive: boolean;
}

export interface RegionRating {
  id: string;
  label: string;
  color: string;
  priority: number;
  createdAt: string;
}

export interface RegionReference {
  id: string;
  name: string;
  ratingId: string;
  createdAt: string;
  isActive: boolean;
}

export interface BrandUsage {
  products: number;
  events: number;
  signages: number;
  stands: number;
  shelves: number;
  advertisingVehicles: number;
}

export interface RegionUsage {
  stores: number;
  events: number;
  surveys: number;
}

export interface BrandRegionCatalog {
  brands: BrandReference[];
  regions: RegionReference[];
  ratings: RegionRating[];
}

const LEGACY_BRANDS_KEY = "brands";
const LEGACY_REGIONS_KEY = "store_regions";
const DEFAULT_RATINGS: RegionRating[] = [
  { id: "rating-a", label: "A", color: "#16A34A", priority: 1, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "rating-b", label: "B", color: "#F59E0B", priority: 2, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "rating-c", label: "C", color: "#EF4444", priority: 3, createdAt: "2026-01-01T00:00:00.000Z" },
];

type NamedRecord = { name?: string; brand?: string; brandName?: string; region?: string; storeRegion?: string; brandAllocations?: Array<{ brand?: string }> };

function uniqueNames(values: Array<string | undefined | null>): string[] {
  const seen = new Map<string, string>();
  values.forEach((value) => {
    const name = value?.trim();
    if (name && !seen.has(name.toLocaleLowerCase("ar"))) seen.set(name.toLocaleLowerCase("ar"), name);
  });
  return Array.from(seen.values());
}

function readLegacyNames(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function hydrateNames<T extends { name: string; isActive: boolean; createdAt: string; id: string }>(existing: T[], names: string[], prefix: string, defaults: Pick<T, "isActive">): T[] {
  const byName = new Map(existing.map((item) => [item.name.toLocaleLowerCase("ar"), item]));
  const now = new Date().toISOString();
  return uniqueNames([...existing.map((item) => item.name), ...names]).map((name) => byName.get(name.toLocaleLowerCase("ar")) || ({ id: newId(prefix), name, createdAt: now, ...defaults } as T));
}

export async function loadBrandRegionCatalog(): Promise<BrandRegionCatalog> {
  const [storedBrands, storedRegions, storedRatings, legacyBrands, legacyRegions, products, events, signages, stands, shelves, stores, surveys] = await Promise.all([
    getItems<BrandReference>(STORAGE_KEYS.BRANDS),
    getItems<RegionReference>(STORAGE_KEYS.REGIONS),
    getItems<RegionRating>(STORAGE_KEYS.REGION_RATINGS),
    AsyncStorage.getItem(LEGACY_BRANDS_KEY),
    AsyncStorage.getItem(LEGACY_REGIONS_KEY),
    getItems<NamedRecord>(STORAGE_KEYS.PRODUCTS),
    getItems<NamedRecord>(STORAGE_KEYS.EVENTS),
    getItems<NamedRecord>(STORAGE_KEYS.SIGNAGE_BOARDS),
    getItems<NamedRecord>(STORAGE_KEYS.STANDS),
    getItems<NamedRecord>(STORAGE_KEYS.SHELVES),
    getItems<NamedRecord>(STORAGE_KEYS.STORES),
    getItems<NamedRecord>(STORAGE_KEYS.SURVEY_RESULTS),
  ]);
  const ratings = storedRatings.length ? [...storedRatings].sort((a, b) => a.priority - b.priority) : DEFAULT_RATINGS;
  const defaultRatingId = ratings[0]?.id || DEFAULT_RATINGS[0].id;
  const brandNames = uniqueNames([
    ...readLegacyNames(legacyBrands),
    ...products.map((item) => item.brandName),
    ...events.map((item) => item.brandName),
    ...signages.map((item) => item.brand),
    ...stands.map((item) => item.brand),
    ...shelves.flatMap((item) => item.brandAllocations?.map((allocation) => allocation.brand) || []),
  ]);
  const regionNames = uniqueNames([
    ...readLegacyNames(legacyRegions),
    ...stores.map((item) => item.region),
    ...events.map((item) => item.region),
    ...surveys.map((item) => item.storeRegion),
  ]);
  const brands = hydrateNames<BrandReference>(storedBrands, brandNames, "brand", { isActive: true });
  const existingRegions = new Map(storedRegions.map((item) => [item.name.toLocaleLowerCase("ar"), item]));
  const now = new Date().toISOString();
  const regions = uniqueNames([...storedRegions.map((item) => item.name), ...regionNames]).map((name) => {
    const stored = existingRegions.get(name.toLocaleLowerCase("ar"));
    return stored || { id: newId("region"), name, ratingId: defaultRatingId, createdAt: now, isActive: true };
  });
  await Promise.all([
    saveItems(STORAGE_KEYS.BRANDS, brands),
    saveItems(STORAGE_KEYS.REGIONS, regions),
    saveItems(STORAGE_KEYS.REGION_RATINGS, ratings),
    AsyncStorage.setItem(LEGACY_BRANDS_KEY, JSON.stringify(brands.filter((item) => item.isActive).map((item) => item.name))),
    AsyncStorage.setItem(LEGACY_REGIONS_KEY, JSON.stringify(regions.filter((item) => item.isActive).map((item) => item.name))),
  ]);
  return { brands, regions, ratings };
}

export async function saveBrands(brands: BrandReference[]): Promise<void> {
  await Promise.all([
    saveItems(STORAGE_KEYS.BRANDS, brands),
    AsyncStorage.setItem(LEGACY_BRANDS_KEY, JSON.stringify(brands.filter((item) => item.isActive).map((item) => item.name))),
  ]);
}

export async function saveRegions(regions: RegionReference[]): Promise<void> {
  await Promise.all([
    saveItems(STORAGE_KEYS.REGIONS, regions),
    AsyncStorage.setItem(LEGACY_REGIONS_KEY, JSON.stringify(regions.filter((item) => item.isActive).map((item) => item.name))),
  ]);
}

export async function saveRatings(ratings: RegionRating[]): Promise<void> {
  await saveItems(STORAGE_KEYS.REGION_RATINGS, ratings.sort((a, b) => a.priority - b.priority));
}

export async function getBrandUsage(brandName: string): Promise<BrandUsage> {
  const [products, events, signages, stands, shelves, advertisingVehicles] = await Promise.all([
    getItems<NamedRecord>(STORAGE_KEYS.PRODUCTS), getItems<NamedRecord>(STORAGE_KEYS.EVENTS), getItems<NamedRecord>(STORAGE_KEYS.SIGNAGE_BOARDS), getItems<NamedRecord>(STORAGE_KEYS.STANDS), getItems<NamedRecord>(STORAGE_KEYS.SHELVES), getItems<NamedRecord>(STORAGE_KEYS.ADVERTISING_VEHICLES),
  ]);
  return {
    products: products.filter((item) => item.brandName === brandName).length,
    events: events.filter((item) => item.brandName === brandName).length,
    signages: signages.filter((item) => item.brand === brandName).length,
    stands: stands.filter((item) => item.brand === brandName).length,
    shelves: shelves.filter((item) => item.brandAllocations?.some((allocation) => allocation.brand === brandName)).length,
    advertisingVehicles: advertisingVehicles.filter((item) => item.brand === brandName).length,
  };
}

export async function getRegionUsage(regionName: string): Promise<RegionUsage> {
  const [stores, events, surveys] = await Promise.all([
    getItems<NamedRecord>(STORAGE_KEYS.STORES), getItems<NamedRecord>(STORAGE_KEYS.EVENTS), getItems<NamedRecord>(STORAGE_KEYS.SURVEY_RESULTS),
  ]);
  return {
    stores: stores.filter((item) => item.region === regionName).length,
    events: events.filter((item) => item.region === regionName).length,
    surveys: surveys.filter((item) => item.storeRegion === regionName).length,
  };
}
