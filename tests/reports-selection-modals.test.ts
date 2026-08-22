import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "components/modules/reports-module.tsx"), "utf8");

describe("نوافذ اختيار تقارير زيارة السوق", () => {
  it("يعرض القالب والدورة داخل نافذتين عائمتين موحدتين", () => {
    expect(source).toContain('<FloatingModal visible={panel === "templates"}');
    expect(source).toContain('<FloatingModal visible={panel === "cycles"}');
    expect(source).toContain("اختيار قالب PowerPoint");
    expect(source).toContain("اختيار دورة الاستبيان");
    expect(source).toContain("selectionList");
    expect(source).not.toContain("function SelectionModal");
  });
});
