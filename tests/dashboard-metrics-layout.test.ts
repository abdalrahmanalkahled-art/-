import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(resolve(process.cwd(), "app/(tabs)/index.tsx"), "utf8");

describe("تخطيط بطاقة بيانات العمل", () => {
  it("يعرض المؤشرات في شبكة هاتفية من عمودين مع مساحة لمس وقراءة كافيتين", () => {
    expect(dashboardSource).toContain('metricPanel: { flexDirection: "row", flexWrap: "wrap"');
    expect(dashboardSource).toContain('metricPanel: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10');
    expect(dashboardSource).toContain('metric: { flexBasis: "47%", flexGrow: 0, minHeight: 78');
    expect(dashboardSource).toContain('metricIcon: { width: 36, height: 36');
    expect(dashboardSource).toContain('metricValue: { fontSize: 20, lineHeight: 24');
    expect(dashboardSource).toContain('metricVisual: { flexDirection: "row", alignItems: "center", gap: 8 }');
    expect(dashboardSource).toContain('value.toLocaleString("en-US")');
  });
});
