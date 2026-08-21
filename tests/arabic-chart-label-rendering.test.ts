import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/analytics-tracking-chart.tsx"), "utf8");

describe("تسميات العربية في مخططات التطبيق", () => {
  it("يعرض تسمية المنتج في المخطط الأفقي عبر نص React Native المتصل", () => {
    expect(source).toContain("horizontalLabels");
    expect(source).toContain("horizontalLabel");
    expect(source).toContain('pointerEvents="none"');
    expect(source).toContain("left: 0");
  });

  it("لا يرسم اسم المنتج كنص SVG داخل الأعمدة الشاقولية", () => {
    const barSection = source.slice(source.indexOf("function BarChart"), source.indexOf("function HorizontalBarChart"));
    expect(barSection).not.toContain("productName).slice");
    expect(source).toContain("showNativeProductLabels");
    expect(source).toContain("productAxisLabel");
  });
});
