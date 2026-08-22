import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("هوية التطبيق والملف الشخصي", () => {
  it("يستخدم اسم مساعد التسويق الميداني في تكوين Expo والدخول", () => {
    expect(read("app.config.ts")).toContain('appName: "مساعد التسويق الميداني"');
    expect(read("app/login.tsx")).toContain('useState("admin")');
    expect(read("app/login.tsx")).toContain('useState("123")');
  });

  it("يضع إدارة الملف الشخصي أول إعداد ولا يعرض إدارة المستخدمين من الشاشة", () => {
    const settings = read("app/settings.tsx");
    expect(settings.indexOf('title="إدارة الملف الشخصي"')).toBeGreaterThan(settings.indexOf('>الملف الشخصي</Text>'));
    expect(settings).not.toContain('title="إدارة المستخدمين"');
    expect(read("app/(tabs)/more.tsx")).not.toContain('<Text style={[styles.sectionTitle, { color: colors.foreground }]}>الإعدادات</Text>');
  });
});
