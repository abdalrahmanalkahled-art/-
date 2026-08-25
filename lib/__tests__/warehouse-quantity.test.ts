import { describe, expect, it } from "vitest";

import { calculateMovementPieces, calculatePackagePieces, formatMovementQuantity, formatWarehouseQuantity } from "../warehouse-quantity";

describe("كميات المستودع بالطرود والقطع", () => {
  it("يخزن المخزون كإجمالي قطع ويعرضه كطرود مع القطع المتبقية", () => {
    const item = { currentQuantity: calculatePackagePieces(4, 24), piecesPerPackage: 24 };
    expect(item.currentQuantity).toBe(96);
    expect(formatWarehouseQuantity(53, item)).toBe("2 طرد و 5 قطعة");
    expect(formatWarehouseQuantity(48, item)).toBe("2 طرد");
  });

  it("يحوّل حركة الطرد إلى قطع مع الاحتفاظ بوحدة الإدخال للعرض", () => {
    const item = { currentQuantity: 96, piecesPerPackage: 24 };
    expect(calculateMovementPieces(2, "package", item)).toBe(48);
    expect(calculateMovementPieces(3, "piece", item)).toBe(3);
    expect(formatMovementQuantity({ quantity: 48, movementUnit: "package", enteredQuantity: 2 }, item)).toBe("2 طرد");
  });

  it("يعرض سجل المادة القديم المحفوظ بالقطعة من دون تعطيل", () => {
    expect(formatWarehouseQuantity(7, {})).toBe("7 قطعة");
    expect(formatMovementQuantity({ quantity: 3 }, {})).toBe("3 قطعة");
  });
});
