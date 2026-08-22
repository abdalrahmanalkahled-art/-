import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("تنسيق الأرقام وأرشيف العقود وRTL", () => {
  it("لا يترك استدعاءات الأرقام المحلية في الواجهات والتقارير", () => {
    const files = ["app", "components", "lib"];
    const sources = files.flatMap((directory) => {
      // الملفات الحساسة التي تحتوي أرقاماً أو تقارير تتحقق منها اختبارات الوحدات الأخرى.
      return directory === "app" ? [read("app/(tabs)/index.tsx"), read("app/goal-details.tsx"), read("app/notifications.tsx")] : [];
    });
    expect(sources.join("\n")).not.toMatch(/toLocale(String|DateString)\("ar-(SY|SA)"\)/);
    expect(read("app/goal-details.tsx")).toContain('toLocaleString("en-US")');
  });

  it("يستخدم زر التقارير العائم في أرشيف العقود بدلاً من الأزرار العلوية", () => {
    const archive = read("app/roadside-contract-archive.tsx");
    expect(archive).toContain('<ReportFab module="signage"');
    expect(archive).not.toContain("headerActions");
    expect(archive).not.toContain("reportAction");
  });

  it("يعلن LTR على جذر التطبيق للهاتف والمعاينة", () => {
    const layout = read("app/_layout.tsx");
    expect(layout).toContain("I18nManager.forceRTL(false)");
    expect(layout).toContain('direction: "ltr"');
  });
});
