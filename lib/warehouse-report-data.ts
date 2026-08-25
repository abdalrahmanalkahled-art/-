import type { WarehouseTool } from "./warehouse-tools";
import type { WarehouseReportSettings } from "./warehouse-report-settings-model";
import { formatMovementQuantity, formatWarehouseQuantity, type WarehouseMovementUnit } from "./warehouse-quantity";

export interface WarehouseReportMaterial { id: string; name: string; category: string; unit: string; currentQuantity: number; minimumQuantity: number; packageCount?: number; piecesPerPackage?: number; description?: string; }
export interface WarehouseReportMovement { id: string; itemId: string; itemName: string; movementType: "in" | "out"; quantity: number; movementUnit?: WarehouseMovementUnit; enteredQuantity?: number; notes?: string; movementDate: string; }
export interface WarehouseCategoryRef { id: string; label: string; }

export interface WarehouseReportData {
  materials: Array<WarehouseReportMaterial & { categoryLabel: string; status: string; currentQuantityLabel: string; minimumQuantityLabel: string }>;
  tools: WarehouseTool[];
  movements: Array<WarehouseReportMovement & { quantityLabel: string }>;
  generatedAt: string;
}

export function buildWarehouseReportData(source: { materials: WarehouseReportMaterial[]; tools: WarehouseTool[]; movements: WarehouseReportMovement[]; categories: WarehouseCategoryRef[] }, settings: WarehouseReportSettings): WarehouseReportData {
  const categoryLabel = (id: string) => source.categories.find((category) => category.id === id)?.label ?? "فئة غير معروفة";
  return {
    materials: settings.includeMaterials ? source.materials.map((item) => ({ ...item, categoryLabel: categoryLabel(item.category), status: item.currentQuantity <= item.minimumQuantity ? "مخزون منخفض" : "متاح", currentQuantityLabel: formatWarehouseQuantity(item.currentQuantity, item), minimumQuantityLabel: formatWarehouseQuantity(item.minimumQuantity, item) })) : [],
    tools: settings.includeTools ? source.tools.filter((tool) => tool.isActive) : [],
    movements: settings.includeMovements ? [...source.movements].sort((a, b) => b.movementDate.localeCompare(a.movementDate)).map((movement) => ({ ...movement, quantityLabel: formatMovementQuantity(movement, source.materials.find((item) => item.id === movement.itemId)) })) : [],
    generatedAt: new Date().toLocaleString("en-US"),
  };
}
