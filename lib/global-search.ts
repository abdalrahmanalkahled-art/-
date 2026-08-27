import { getReportHistory } from "./report-history";
import { getItems, getItemsForKeys, saveItems, STORAGE_KEYS } from "./storage";
import type { PermissionModule } from "./user-permissions-model";

export type SearchCategory = "field" | "planning" | "management" | "reports";
export type SearchMoreModule = "warehouse" | "expenses" | "goals" | "signage" | "reports" | "products" | "brands_regions" | "analytics";

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: SearchCategory;
  permission: PermissionModule;
  moduleLabel: string;
  icon: "storefront" | "event" | "assignment" | "inventory" | "receipt" | "campaign" | "inventory-2" | "map" | "assessment" | "quiz";
  searchText: string;
  destination: { type: "route"; pathname: "/store-detail" | "/(tabs)/events" | "/(tabs)/surveys" } | { type: "more"; module: SearchMoreModule };
}

type RecordValue = Record<string, unknown>;
type PermissionAvailability = Partial<Record<PermissionModule, boolean>>;

function asText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

function field(record: RecordValue, keys: string[]): string {
  for (const key of keys) {
    const value = asText(record[key]).trim();
    if (value) return value;
  }
  return "";
}

function joinFields(record: RecordValue, keys: string[]): string {
  return keys.map((key) => asText(record[key]).trim()).filter(Boolean).join(" · ");
}

/** توحيد حروف العربية ومسافات البحث حتى تتسامح النتائج مع أكثر صيغ الإدخال شيوعاً. */
export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("ar")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\s+/g, " ")
    .trim();
}

function addRecords(
  target: GlobalSearchResult[],
  records: RecordValue[],
  config: Omit<GlobalSearchResult, "id" | "title" | "subtitle" | "searchText"> & { source: string; title: (record: RecordValue) => string; subtitle: (record: RecordValue) => string; keywords: (record: RecordValue) => string },
): void {
  records.forEach((record, index) => {
    const title = config.title(record) || "سجل بلا اسم";
    const subtitle = config.subtitle(record) || config.moduleLabel;
    target.push({
      id: `${config.source}:${field(record, ["id", "uuid"]) || index}`,
      title,
      subtitle,
      category: config.category,
      permission: config.permission,
      moduleLabel: config.moduleLabel,
      icon: config.icon,
      destination: config.destination,
      searchText: normalizeSearchText(`${title} ${subtitle} ${config.keywords(record)}`),
    });
  });
}

const SEARCH_STORAGE_KEYS = [
  STORAGE_KEYS.STORES, STORAGE_KEYS.EVENTS, STORAGE_KEYS.SURVEY_CYCLES, STORAGE_KEYS.SURVEY_TEMPLATES, STORAGE_KEYS.MARKETING_GOALS,
  STORAGE_KEYS.WAREHOUSE_ITEMS, STORAGE_KEYS.WAREHOUSE_TOOLS, STORAGE_KEYS.EXPENSES, STORAGE_KEYS.SIGNAGE_BOARDS, STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS,
  STORAGE_KEYS.STANDS, STORAGE_KEYS.SHELVES, STORAGE_KEYS.ADVERTISING_VEHICLES, STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.COMPANY_PRODUCTS,
  STORAGE_KEYS.COMPETITOR_PRODUCTS, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS,
] as const;

/** يبني فهرساً نصياً صغيراً في الذاكرة عند فتح البحث، من دون فهرسة الصور أو إجابات الاستبيان التفصيلية. */
export async function loadGlobalSearchIndex(available: PermissionAvailability): Promise<GlobalSearchResult[]> {
  const results: GlobalSearchResult[] = [];
  const allowed = (module: PermissionModule) => available[module] !== false;
  const dataByKey = await getItemsForKeys<RecordValue>([...SEARCH_STORAGE_KEYS]);
  const records = (key: string) => dataByKey[key] || [];

  if (allowed("stores")) {
    addRecords(results, records(STORAGE_KEYS.STORES), {
      source: "store", category: "field", permission: "stores", moduleLabel: "المحلات", icon: "storefront", destination: { type: "route", pathname: "/store-detail" },
      title: (item) => field(item, ["name", "storeName", "title"]), subtitle: (item) => joinFields(item, ["region", "category", "address"]), keywords: (item) => joinFields(item, ["name", "region", "category", "address", "contactName", "phone", "notes"]),
    });
  }
  if (allowed("events")) {
    addRecords(results, records(STORAGE_KEYS.EVENTS), {
      source: "event", category: "field", permission: "events", moduleLabel: "الفعاليات", icon: "event", destination: { type: "route", pathname: "/(tabs)/events" },
      title: (item) => field(item, ["title", "name"]), subtitle: (item) => joinFields(item, ["region", "status", "startDate"]), keywords: (item) => joinFields(item, ["title", "name", "region", "status", "startDate", "endDate", "description"]),
    });
  }
  if (allowed("surveys")) {
    addRecords(results, records(STORAGE_KEYS.SURVEY_CYCLES), {
      source: "survey-cycle", category: "field", permission: "surveys", moduleLabel: "دورات الاستبيان", icon: "quiz", destination: { type: "route", pathname: "/(tabs)/surveys" },
      title: (item) => field(item, ["name", "title", "cycleName"]), subtitle: (item) => joinFields(item, ["status", "startDate", "endDate"]), keywords: (item) => joinFields(item, ["name", "title", "cycleName", "status", "startDate", "endDate"]),
    });
    addRecords(results, records(STORAGE_KEYS.SURVEY_TEMPLATES), {
      source: "survey-template", category: "field", permission: "surveys", moduleLabel: "قوالب الاستبيان", icon: "quiz", destination: { type: "route", pathname: "/(tabs)/surveys" },
      title: (item) => field(item, ["name", "title"]), subtitle: (item) => "قالب استبيان", keywords: (item) => joinFields(item, ["name", "title", "description"]),
    });
  }
  if (allowed("goals")) {
    addRecords(results, records(STORAGE_KEYS.MARKETING_GOALS), {
      source: "goal", category: "planning", permission: "goals", moduleLabel: "الخطة التسويقية", icon: "assignment", destination: { type: "more", module: "goals" },
      title: (item) => field(item, ["title", "name"]), subtitle: (item) => joinFields(item, ["status", "startDate", "endDate"]), keywords: (item) => joinFields(item, ["title", "name", "status", "startDate", "endDate", "description"]),
    });
  }
  if (allowed("warehouse")) {
    addRecords(results, records(STORAGE_KEYS.WAREHOUSE_ITEMS), {
      source: "warehouse-item", category: "management", permission: "warehouse", moduleLabel: "المستودع", icon: "inventory", destination: { type: "more", module: "warehouse" },
      title: (item) => field(item, ["name", "title"]), subtitle: (item) => joinFields(item, ["category", "unit", "quantity"]), keywords: (item) => joinFields(item, ["name", "title", "category", "unit", "quantity", "notes"]),
    });
    addRecords(results, records(STORAGE_KEYS.WAREHOUSE_TOOLS), {
      source: "warehouse-tool", category: "management", permission: "warehouse", moduleLabel: "أدوات المستودع", icon: "inventory", destination: { type: "more", module: "warehouse" },
      title: (item) => field(item, ["name", "title"]), subtitle: (item) => joinFields(item, ["category", "status"]), keywords: (item) => joinFields(item, ["name", "title", "category", "status", "notes"]),
    });
  }
  if (allowed("expenses")) {
    addRecords(results, records(STORAGE_KEYS.EXPENSES), {
      source: "expense", category: "management", permission: "expenses", moduleLabel: "الصرفيات", icon: "receipt", destination: { type: "more", module: "expenses" },
      title: (item) => field(item, ["title", "name", "description"]), subtitle: (item) => joinFields(item, ["category", "date", "amount"]), keywords: (item) => joinFields(item, ["title", "name", "description", "category", "date", "amount"]),
    });
  }
  if (allowed("signage")) {
    const signageSources: { key: string; source: string; label: string; icon: GlobalSearchResult["icon"] }[] = [
      { key: STORAGE_KEYS.SIGNAGE_BOARDS, source: "board", label: "اللوحات والستاندات", icon: "campaign" },
      { key: STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, source: "contract", label: "عقود اللوحات", icon: "campaign" },
      { key: STORAGE_KEYS.STANDS, source: "stand", label: "الستاندات", icon: "campaign" },
      { key: STORAGE_KEYS.SHELVES, source: "shelf", label: "الأرفف", icon: "campaign" },
      { key: STORAGE_KEYS.ADVERTISING_VEHICLES, source: "vehicle", label: "السيارات المعلنة", icon: "campaign" },
    ];
    for (const source of signageSources) addRecords(results, records(source.key), {
      source: source.source, category: "management", permission: "signage", moduleLabel: source.label, icon: source.icon, destination: { type: "more", module: "signage" },
      title: (item) => field(item, ["name", "title", "location"]), subtitle: (item) => joinFields(item, ["region", "brand", "status"]), keywords: (item) => joinFields(item, ["name", "title", "location", "region", "brand", "status", "type"]),
    });
  }
  if (allowed("products")) {
    const productSources: { key: string; source: string; label: string }[] = [
      { key: STORAGE_KEYS.PRODUCTS, source: "product", label: "المنتجات" },
      { key: STORAGE_KEYS.COMPANY_PRODUCTS, source: "company-product", label: "منتجات الشركة" },
      { key: STORAGE_KEYS.COMPETITOR_PRODUCTS, source: "competitor-product", label: "منتجات المنافسين" },
      { key: STORAGE_KEYS.BRANDS, source: "brand", label: "الماركات" },
      { key: STORAGE_KEYS.REGIONS, source: "region", label: "المناطق" },
    ];
    for (const source of productSources) addRecords(results, records(source.key), {
      source: source.source, category: "management", permission: "products", moduleLabel: source.label, icon: source.source === "region" ? "map" : "inventory-2", destination: { type: "more", module: source.source === "brand" || source.source === "region" ? "brands_regions" : "products" },
      title: (item) => field(item, ["name", "title"]), subtitle: (item) => joinFields(item, ["brand", "category", "competitor"]), keywords: (item) => joinFields(item, ["name", "title", "brand", "category", "competitor", "description"]),
    });
  }
  if (allowed("reports")) {
    const reports = await getReportHistory();
    reports.forEach((report) => results.push({
      id: `report:${report.id}`, title: report.title, subtitle: `${report.type} · ${report.date}`, category: "reports", permission: "reports", moduleLabel: "التقارير", icon: "assessment", destination: { type: "more", module: "reports" }, searchText: normalizeSearchText(`${report.title} ${report.type} ${report.date}`),
    }));
  }
  return results;
}

export function searchGlobalIndex(index: GlobalSearchResult[], query: string, category: SearchCategory | "all" = "all", limit = 30): GlobalSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];
  return index.filter((result) => (category === "all" || result.category === category) && result.searchText.includes(normalizedQuery)).slice(0, limit);
}

export async function getRecentSearches(): Promise<RecentSearch[]> { return getItems<RecentSearch>(STORAGE_KEYS.SEARCH_RECENTS); }

export async function recordRecentSearch(query: string): Promise<RecentSearch[]> {
  const normalized = query.trim();
  if (normalizeSearchText(normalized).length < 2) return getRecentSearches();
  const previous = await getRecentSearches();
  const next = [{ query: normalized, usedAt: new Date().toISOString() }, ...previous.filter((item) => normalizeSearchText(item.query) !== normalizeSearchText(normalized))].slice(0, 5);
  await saveItems(STORAGE_KEYS.SEARCH_RECENTS, next);
  return next;
}

export interface RecentSearch { query: string; usedAt: string; }
