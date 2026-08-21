import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/analytics-settings-sheet.tsx"), "utf8");

describe("تفاصيل مخطط الأعمدة في إعدادات التحليلات", () => {
  it("يعرض تحكمين مستقلين لأسماء المنتجات والنسب", () => {
    expect(source).toContain("تفاصيل مخطط الأعمدة");
    expect(source).toContain('label="إظهار النسب"');
    expect(source).toContain('label="إظهار أسماء المنتجات"');
    expect(source).toContain("showChartValues");
    expect(source).toContain("showChartProductNames");
    expect(source).toContain("حجم خط التسميات");
    expect(source).toContain("تدوير أسماء المنتجات الطويلة");
    expect(source).toContain("chartLabelSize");
    expect(source).toContain("rotateProductNames");
  });
});
