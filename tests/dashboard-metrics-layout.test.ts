import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(resolve(process.cwd(), "app/(tabs)/index.tsx"), "utf8");

describe("تخطيط بطاقة بيانات العمل", () => {
  it("يعرض المؤشرات في شبكة هاتفية من عمودين مع مساحة لمس وقراءة كافيتين", () => {
    expect(dashboardSource).toContain('metricPanel: { flexDirection: "row", flexWrap: "wrap"');
    expect(dashboardSource).toContain('metricPanel: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8');
    expect(dashboardSource).toContain('metric: { flexBasis: "47%", flexGrow: 0, minHeight: 72');
    expect(dashboardSource).toContain('metricIcon: { width: 34, height: 34');
    expect(dashboardSource).toContain('metricValue: { fontSize: 19, lineHeight: 22');
    expect(dashboardSource).toContain('metricVisual: { alignItems: "center", gap: 2 }');
    expect(dashboardSource).toContain('value.toLocaleString("en-US")');
  });
});
