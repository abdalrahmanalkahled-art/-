import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const moduleSource = readFileSync(resolve(process.cwd(), "components/modules/advanced-analytics-module.tsx"), "utf8");
const matrixSource = readFileSync(resolve(process.cwd(), "components/analytics-region-matrix.tsx"), "utf8");
const settingsSource = readFileSync(resolve(process.cwd(), "components/analytics-settings-sheet.tsx"), "utf8");

describe("واجهة مصفوفة المنطقة والمنتج", () => {
  it("تعرض المصفوفة في التحليلات مع تفاصيل خلية وإعدادات مخصصة", () => {
    expect(moduleSource).toContain("AnalyticsRegionMatrix");
    expect(moduleSource).toContain("regionMatrix.enabled");
    expect(matrixSource).toContain("تفاصيل تقاطع المنطقة والمنتج");
    expect(matrixSource).toContain("مصفوفة المنطقة × المنتج");
    expect(matrixSource).toContain("فلاتر المصفوفة والتقرير");
    expect(matrixSource).toContain("onToggleRegion");
    expect(matrixSource).toContain("onToggleProduct");
    expect(settingsSource).toContain("مصفوفة المنطقة والمنتج");
    expect(settingsSource).toContain("مقياس اللون");
  });
});
