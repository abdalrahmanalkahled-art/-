export const WAREHOUSE_MATERIAL_COLUMNS = ["name", "category", "currentQuantity", "minimumQuantity", "unit", "status", "description"] as const;
export const WAREHOUSE_TOOL_COLUMNS = ["name", "quantity", "brands", "condition"] as const;
export const WAREHOUSE_MOVEMENT_COLUMNS = ["movementDate", "itemName", "movementType", "quantity", "notes"] as const;

export type WarehouseMaterialColumn = (typeof WAREHOUSE_MATERIAL_COLUMNS)[number];
export type WarehouseToolColumn = (typeof WAREHOUSE_TOOL_COLUMNS)[number];
export type WarehouseMovementColumn = (typeof WAREHOUSE_MOVEMENT_COLUMNS)[number];

export interface WarehouseReportSettings {
  includeMaterials: boolean;
  includeTools: boolean;
  includeMovements: boolean;
  includeImages: boolean;
  /** الحد الأقصى لعرض صورة الأداة داخل PDF بالبكسل */
  imageMaxWidth?: number;
  /** جودة JPEG من 0.1 إلى 1 */
  imageQuality?: number;
  materialColumns: WarehouseMaterialColumn[];
  toolColumns: WarehouseToolColumn[];
  movementColumns: WarehouseMovementColumn[];
}

export const DEFAULT_WAREHOUSE_REPORT_SETTINGS: WarehouseReportSettings = {
  includeMaterials: true,
  includeTools: true,
  includeMovements: true,
  includeImages: true,
  imageMaxWidth: 900,
  imageQuality: 0.72,
  materialColumns: [...WAREHOUSE_MATERIAL_COLUMNS],
  toolColumns: [...WAREHOUSE_TOOL_COLUMNS],
  movementColumns: [...WAREHOUSE_MOVEMENT_COLUMNS],
};

function allowedColumns<T extends readonly string[]>(value: unknown, allowed: T): T[number][] {
  const selected = Array.isArray(value) ? [...new Set(value.filter((item): item is T[number] => typeof item === "string" && allowed.includes(item as T[number])))] : [];
  return selected.length ? selected : [...allowed];
}

export function normalizeWarehouseReportSettings(value: unknown): WarehouseReportSettings {
  const candidate = value && typeof value === "object" ? value as Partial<WarehouseReportSettings> : {};
  const settings = {
    includeMaterials: candidate.includeMaterials !== false,
    includeTools: candidate.includeTools !== false,
    includeMovements: candidate.includeMovements !== false,
    includeImages: candidate.includeImages !== false,
    imageMaxWidth: typeof candidate.imageMaxWidth === "number" ? Math.min(1600, Math.max(320, Math.round(candidate.imageMaxWidth))) : 900,
    imageQuality: typeof candidate.imageQuality === "number" ? Math.min(1, Math.max(0.35, candidate.imageQuality)) : 0.72,
    materialColumns: allowedColumns(candidate.materialColumns, WAREHOUSE_MATERIAL_COLUMNS),
    toolColumns: allowedColumns(candidate.toolColumns, WAREHOUSE_TOOL_COLUMNS),
    movementColumns: allowedColumns(candidate.movementColumns, WAREHOUSE_MOVEMENT_COLUMNS),
  };
  return settings.includeMaterials || settings.includeTools || settings.includeMovements
    ? settings
    : { ...settings, includeMaterials: true };
}
