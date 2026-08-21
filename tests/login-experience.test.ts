import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const loginSource = readFileSync(resolve(process.cwd(), "app/login.tsx"), "utf8");
const moreSource = readFileSync(resolve(process.cwd(), "app/(tabs)/more.tsx"), "utf8");

describe("تجربة الدخول والخروج", () => {
  it("تدعم إظهار كلمة المرور وخيار تذكرني دون عرض بيانات دخول تجريبية", () => {
    expect(loginSource).toContain('const [showPassword, setShowPassword] = useState(false)');
    expect(loginSource).toContain('const [rememberMe, setRememberMe] = useState(false)');
    expect(loginSource).toContain('secureTextEntry={!showPassword}');
    expect(loginSource).toContain('login(username.trim(), password, rememberMe)');
    expect(loginSource).not.toContain("بيانات الدخول التجريبية");
    expect(loginSource).not.toContain("شركة مدار للمنظفات");
  });

  it("يطلب تأكيداً موحّداً قبل تسجيل الخروج", () => {
    expect(moreSource).toContain('setShowLogoutConfirmation(true)');
    expect(moreSource).toContain('title="تسجيل الخروج"');
    expect(moreSource).toContain('void handleLogout()');
  });
});
