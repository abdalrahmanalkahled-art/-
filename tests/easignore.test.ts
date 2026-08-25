import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("EAS upload context", () => {
  const root = process.cwd();
  const rules = readFileSync(resolve(root, ".easignore"), "utf8");

  it("يستبعد الملفات غير المطلوبة للبناء", () => {
    expect(rules).toContain("docs/");
    expect(rules).toContain("presentation-assets/");
    expect(rules).toContain("tests/");
    expect(rules).toContain("*.bak");
    expect(rules).toContain("node_modules/");
  });

  it("يبقي مدخلات التطبيق والأصول المطلوبة موجودة في المشروع", () => {
    [
      "app.config.ts",
      "package.json",
      "pnpm-lock.yaml",
      "app",
      "components",
      "lib",
      "assets/images/icon.png",
      "assets/images/splash-icon.png",
    ].forEach((entry) => expect(existsSync(resolve(root, entry))).toBe(true));
  });
});
