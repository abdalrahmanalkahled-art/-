import { describe, expect, it } from "vitest";

import { DEFAULT_WAREHOUSE_REPORT_SETTINGS, normalizeWarehouseReportSettings } from "../warehouse-report-settings-model";

describe("warehouse report settings", () => {
  it("keeps all report sections enabled by default", () => {
    expect(normalizeWarehouseReportSettings(undefined)).toEqual(DEFAULT_WAREHOUSE_REPORT_SETTINGS);
  });

  it("keeps one section enabled if a malformed preference disables all sections", () => {
    expect(normalizeWarehouseReportSettings({ includeMaterials: false, includeTools: false, includeMovements: false, includeImages: false })).toEqual({ includeMaterials: true, includeTools: false, includeMovements: false, includeImages: false, materialColumns: ["name", "category", "currentQuantity", "minimumQuantity", "unit", "status", "description"], toolColumns: ["name", "quantity", "brands", "condition"], movementColumns: ["movementDate", "itemName", "movementType", "quantity", "notes"] });
  });

  it("keeps only valid selected material columns", () => {
    expect(normalizeWarehouseReportSettings({ materialColumns: ["name", "currentQuantity", "unknown"] }).materialColumns).toEqual(["name", "currentQuantity"]);
  });
});
