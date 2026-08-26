import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("شاشة التحميل الافتتاحية", () => {
  const root = process.cwd();
  const loadingScreen = readFileSync(resolve(root, "components/loading-screen.tsx"), "utf8");
  const rootLayout = readFileSync(resolve(root, "app/_layout.tsx"), "utf8");

  it("تستخدم قيماً متحركة مستقرة وتنظف الحركات عند الإخفاء", () => {
    expect(loadingScreen).toContain("useRef(new Animated.Value");
    expect(loadingScreen).toContain("pulse.stop()");
    expect(loadingScreen).toContain("orbit.stop()");
    expect(loadingScreen).toContain("progress.stop()");
  });

  it("تعرض علامة التطبيق ورسالة التهيئة وتصلها بحالة المصادقة", () => {
    expect(loadingScreen).toContain("مساعد التسويق الميداني");
    expect(loadingScreen).toContain("جاري تحميل التطبيق...");
    expect(rootLayout).toContain('<LoadingScreen visible={showLoading}');
  });

  it("يطبق تلاشيًا خفيفًا بين شاشة البدء الأصلية وشاشة التطبيق", () => {
    expect(rootLayout).toContain("SplashScreen.setOptions({ duration: 280, fade: true })");
  });
});
