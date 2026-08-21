import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ترتيب أقسام محتوى تقرير التحليلات", () => {
  it("يعرض أقسام التقرير بسحب وإفلات ويحفظ ترتيبها للتصدير فقط", () => {
    const sheet = readFileSync("components/analytics-settings-sheet.tsx", "utf8");
    const model = readFileSync("lib/analytics-settings-model.ts", "utf8");
    expect(sheet).toContain("keyboard-arrow-up");
    expect(sheet).toContain("استخدم السهمين بجانب كل قسم");
    expect(sheet).toContain("reportSectionOrder");
    expect(model).toContain("normalizeReportSectionOrder");
  });
});
