import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const chartSource = readFileSync(resolve(process.cwd(), "components/analytics-tracking-chart.tsx"), "utf8");
const moduleSource = readFileSync(resolve(process.cwd(), "components/modules/advanced-analytics-module.tsx"), "utf8");

describe("محور مخطط الدورة الواحدة", () => {
  it("يحوّل المحور إلى المنتجات عند اختيار دورة محددة", () => {
    expect(moduleSource).toContain('selectedSingleCycle={cycleId !== "all"}');
    expect(chartSource).toContain("const usesProductAxis = selectedSingleCycle && analytics.points.length === 1");
    expect(chartSource).toContain("المحور الأفقي: المنتجات · المحور العمودي: نسبة التواجد");
    expect(chartSource).toContain("ProductAxisSeriesChart");
  });

  it("يبقي تسمية محور الدورات لحالة جميع الدورات", () => {
    expect(chartSource).toContain("المحور الأفقي: الدورات · المحور العمودي: نسبة التواجد");
  });
});
