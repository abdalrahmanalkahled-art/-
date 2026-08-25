export type WarehouseMovementUnit = "package" | "piece";

export interface WarehousePackageQuantity {
  currentQuantity: number;
  piecesPerPackage?: number;
  packageCount?: number;
}

function positiveWholeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** تعيد عدد قطع الطرد مع توافق تلقائي للمواد القديمة المخزنة بالقطعة. */
export function getPiecesPerPackage(item: Pick<WarehousePackageQuantity, "piecesPerPackage">): number {
  return positiveWholeNumber(item.piecesPerPackage, 1);
}

/** تحتفظ currentQuantity دائماً بإجمالي القطع كي لا تتعطل السجلات القديمة. */
export function calculatePackagePieces(packageCount: unknown, piecesPerPackage: unknown): number {
  return positiveWholeNumber(packageCount, 0) * positiveWholeNumber(piecesPerPackage, 0);
}

export function calculateMovementPieces(quantity: unknown, unit: WarehouseMovementUnit, item: Pick<WarehousePackageQuantity, "piecesPerPackage">): number {
  const enteredQuantity = positiveWholeNumber(quantity, 0);
  return unit === "package" ? enteredQuantity * getPiecesPerPackage(item) : enteredQuantity;
}

export function formatWarehouseQuantity(totalPieces: unknown, item: Pick<WarehousePackageQuantity, "piecesPerPackage">): string {
  const pieces = Math.max(0, Math.floor(Number(totalPieces) || 0));
  const piecesPerPackage = getPiecesPerPackage(item);
  if (piecesPerPackage <= 1) return `${pieces} قطعة`;
  const packages = Math.floor(pieces / piecesPerPackage);
  const loosePieces = pieces % piecesPerPackage;
  return loosePieces ? `${packages} طرد و ${loosePieces} قطعة` : `${packages} طرد`;
}

export function formatMovementQuantity(movement: { quantity: number; movementUnit?: WarehouseMovementUnit; enteredQuantity?: number }, item?: Pick<WarehousePackageQuantity, "piecesPerPackage">): string {
  const unit = movement.movementUnit;
  if (unit) {
    const entered = positiveWholeNumber(movement.enteredQuantity, unit === "package" && item ? Math.floor(movement.quantity / getPiecesPerPackage(item)) : movement.quantity);
    return `${entered} ${unit === "package" ? "طرد" : "قطعة"}`;
  }
  return item ? formatWarehouseQuantity(movement.quantity, item) : `${Math.max(0, Math.floor(movement.quantity || 0))} قطعة`;
}
