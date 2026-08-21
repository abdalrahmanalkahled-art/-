import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(resolve(process.cwd(), "app/(tabs)/index.tsx"), "utf8");

describe("استقرار عرض الشاشة الرئيسية", () => {
  it("لا يترك نصاً شاردًا بين مكونات JSX داخل بطاقة النشاطات", () => {
    const activitySection = dashboardSource.split('if (id === "activity"')[1]?.split("return null;")[0] ?? "";
    expect(activitySection).not.toMatch(/\/>\s+<View/);
    expect(activitySection).toContain('<SectionHeader title="آخر النشاطات" icon="history" /><View');
  });
});
