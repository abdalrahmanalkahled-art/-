import AsyncStorage from "@react-native-async-storage/async-storage";

const ROAD_SIGNAGE_CATALOG_STORAGE_KEY = "madar_road_signage_catalog";

export type RoadsideBoardCatalogKind = "types" | "ratings";
export interface RoadsideBoardCatalogOption { id: string; label: string; }
export interface RoadsideBoardCatalog { types: RoadsideBoardCatalogOption[]; ratings: RoadsideBoardCatalogOption[]; }

export const DEFAULT_ROADSIDE_BOARD_CATALOG: RoadsideBoardCatalog = {
  types: ["فلكس عادي", "لوحة ضوئية", "فلكس عاكس للضوء"].map((label, index) => ({ id: `road-type-${index + 1}`, label })),
  ratings: ["A", "B", "C"].map((label) => ({ id: `road-rating-${label.toLowerCase()}`, label })),
};

function normalizeOptions(value: unknown, fallback: RoadsideBoardCatalogOption[]): RoadsideBoardCatalogOption[] {
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));
  const used = new Set<string>();
  return value.flatMap((entry, index) => {
    const label = typeof entry === "string" ? entry.trim() : entry && typeof entry === "object" && "label" in entry && typeof (entry as { label?: unknown }).label === "string" ? (entry as { label: string }).label.trim() : "";
    if (!label || used.has(label.toLocaleLowerCase("ar"))) return [];
    used.add(label.toLocaleLowerCase("ar"));
    const candidateId = entry && typeof entry === "object" && "id" in entry && typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id : `road-catalog-${index + 1}`;
    return [{ id: candidateId, label }];
  });
}

export async function loadRoadsideBoardCatalog(): Promise<RoadsideBoardCatalog> {
  try {
    const raw = await AsyncStorage.getItem(ROAD_SIGNAGE_CATALOG_STORAGE_KEY);
    if (!raw) return { types: DEFAULT_ROADSIDE_BOARD_CATALOG.types.map((item) => ({ ...item })), ratings: DEFAULT_ROADSIDE_BOARD_CATALOG.ratings.map((item) => ({ ...item })) };
    const parsed = JSON.parse(raw) as Partial<RoadsideBoardCatalog>;
    return { types: normalizeOptions(parsed.types, DEFAULT_ROADSIDE_BOARD_CATALOG.types), ratings: normalizeOptions(parsed.ratings, DEFAULT_ROADSIDE_BOARD_CATALOG.ratings) };
  } catch { return { types: DEFAULT_ROADSIDE_BOARD_CATALOG.types.map((item) => ({ ...item })), ratings: DEFAULT_ROADSIDE_BOARD_CATALOG.ratings.map((item) => ({ ...item })) }; }
}

export async function saveRoadsideBoardCatalog(catalog: RoadsideBoardCatalog): Promise<void> { await AsyncStorage.setItem(ROAD_SIGNAGE_CATALOG_STORAGE_KEY, JSON.stringify(catalog)); }

export function updateRoadsideBoardCatalog(catalog: RoadsideBoardCatalog, kind: RoadsideBoardCatalogKind, option: RoadsideBoardCatalogOption): RoadsideBoardCatalog {
  const label = option.label.trim(); if (!label) throw new Error("أدخل اسماً صحيحاً.");
  const entries = catalog[kind];
  if (entries.some((item) => item.id !== option.id && item.label.toLocaleLowerCase("ar") === label.toLocaleLowerCase("ar"))) throw new Error("يوجد خيار بالاسم نفسه.");
  const next = entries.some((item) => item.id === option.id) ? entries.map((item) => item.id === option.id ? { ...option, label } : item) : [...entries, { ...option, label }];
  return { ...catalog, [kind]: next };
}

export function removeRoadsideBoardCatalogOption(catalog: RoadsideBoardCatalog, kind: RoadsideBoardCatalogKind, id: string): RoadsideBoardCatalog { return { ...catalog, [kind]: catalog[kind].filter((item) => item.id !== id) }; }
