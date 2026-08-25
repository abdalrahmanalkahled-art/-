import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("فتح الملفات المحفوظة", () => {
  it("يحدد صيغ PDF وExcel وPowerPoint قبل عرض التطبيقات المتوافقة", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/open-file-with-app.ts"), "utf8");
    expect(source).toContain("application/pdf");
    expect(source).toContain("spreadsheetml.sheet");
    expect(source).toContain("presentationml.presentation");
    expect(source).toContain("فتح ${name} باستخدام");
  });
});
