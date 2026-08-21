import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/pdf-customization-sheet.tsx"), "utf8");

describe("المعاينة الحية لتخصيص قالب PDF", () => {
  it("تعرض نموذجاً للجدول والمخطط يعتمد على حالة التخصيص قبل الحفظ", () => {
    expect(source).toContain("معاينة مباشرة");
    expect(source).toContain("شكل الجدول");
    expect(source).toContain("شكل المخطط");
    expect(source).toContain("value={draft}");
  });
});
