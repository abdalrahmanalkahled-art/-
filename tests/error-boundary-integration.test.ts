import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rootLayout = readFileSync(resolve(process.cwd(), "app/_layout.tsx"), "utf8");
const errorBoundary = readFileSync(resolve(process.cwd(), "components/error-boundary.tsx"), "utf8");
const alertProvider = readFileSync(resolve(process.cwd(), "components/app-alert-provider.tsx"), "utf8");

describe("مسارات الاستقرار الشاملة", () => {
  it("يربط حد الأعطال بجذر التطبيق ويعيد المستخدم إلى التبويبات الحالية", () => {
    expect(rootLayout).toContain('import { ErrorBoundary } from "@/components/error-boundary"');
    expect(rootLayout).toMatch(/<ErrorBoundary>[\s\S]*<AppAlertProvider>/);
    expect(errorBoundary).toContain("router.replace('/(tabs)')");
    expect(errorBoundary).not.toContain("useAppStore");
  });

  it("يحافظ على اعتراض التنبيهات دون استخدام any غير آمن", () => {
    expect(alertProvider).toContain("type AlertHandler = typeof Alert.alert");
    expect(alertProvider).toContain("Alert.alert = managedAlert");
    expect(alertProvider).not.toContain("Alert as any");
  });
});
