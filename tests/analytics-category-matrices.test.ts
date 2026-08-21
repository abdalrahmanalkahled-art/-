import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("مصفوفات الأصناف", () => {
  it("يحفظ الأصناف المختارة ويعرض لكل صنف مصفوفة مستقلة دون استبدال المصفوفة العامة", () => {
    const settings = readFileSync("lib/analytics-settings-model.ts", "utf8");
    const settingsSheet = readFileSync("components/analytics-settings-sheet.tsx", "utf8");
    const module = readFileSync("components/modules/advanced-analytics-module.tsx", "utf8");
    expect(settings).toContain("categoryMatricesEnabled");
    expect(settings).toContain("categoryMatrixCategoryNames");
    expect(settingsSheet).toContain("إظهار مصفوفات أصناف مستقلة");
    expect(module).toContain("const categoryMatrices");
    expect(module).toContain("مصفوفة الصنف:");
    expect(module).toContain("settings.regionMatrix.categoryMatricesEnabled ? categoryMatrices.map");
    expect(module).toContain(": <AnalyticsRegionMatrix matrix={regionMatrix}");
  });
});
