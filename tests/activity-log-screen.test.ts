import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("الوصول إلى سجل النشاط", () => {
  it("يعرض نقطة دخول للسجل من إعدادات التطبيق", () => {
    const settings = source("app/settings.tsx");
    expect(settings).toContain('title="سجل النشاط"');
    expect(settings).toContain('router.push("/activity-log" as any)');
  });

  it("يعرض السجل قائمة قابلة للتحديث مع تأكيد لمسحه", () => {
    const screen = source("app/activity-log.tsx");
    expect(screen).toContain("getAuditLogs");
    expect(screen).toContain("FlatList");
    expect(screen).toContain("مسح سجل النشاط؟");
  });
});
