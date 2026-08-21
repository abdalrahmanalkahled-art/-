import { describe, expect, it } from "vitest";

import { buildWarehouseReportData } from "../warehouse-report-data";
import { DEFAULT_WAREHOUSE_REPORT_SETTINGS } from "../warehouse-report-settings-model";

describe("warehouse report data", () => {
  it("includes only the user-selected warehouse sections", () => {
    const report = buildWarehouseReportData({ materials: [{ id: "i1", name: "مادة", category: "c1", unit: "قطعة", currentQuantity: 2, minimumQuantity: 3 }], tools: [{ id: "t1", name: "أداة", quantity: 1, brandMode: "single", brandNames: [], condition: "new", isActive: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" }], movements: [{ id: "m1", itemId: "i1", itemName: "مادة", movementType: "in", quantity: 2, movementDate: "2026-01-01" }], categories: [{ id: "c1", label: "فئة" }] }, { ...DEFAULT_WAREHOUSE_REPORT_SETTINGS, includeMaterials: false, includeTools: true, includeMovements: false });
    expect(report.materials).toEqual([]);
    expect(report.tools).toHaveLength(1);
    expect(report.movements).toEqual([]);
  });
});
