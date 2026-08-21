import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const screen = readFileSync(resolve(process.cwd(), "app/app-reset.tsx"), "utf8");
const settings = readFileSync(resolve(process.cwd(), "app/settings.tsx"), "utf8");

describe("واجهة تهيئة التطبيق", () => {
  it("تطلب كلمة المرور وتعرض تحذير التبعيات قبل التهيئة", () => {
    expect(screen).toContain("verifyLocalUserPassword");
    expect(screen).toContain("secureTextEntry");
    expect(screen).toContain("يحذف تبعيات مرتبطة");
    expect(screen).toContain("لن تُحذف النسخ الاحتياطية المحلية");
  });

  it("تظهر أسفل إدارة النسخ الاحتياطية في الإعدادات", () => {
    expect(settings).toContain('router.push("/app-reset" as any)');
    expect(settings.indexOf("إدارة النسخ الاحتياطية")).toBeLessThan(settings.indexOf("تهيئة التطبيق"));
  });
});
