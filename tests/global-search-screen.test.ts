import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("بطاقة البحث الموحد", () => {
  it("تظهر أعلى تبويبات المزيد وتفتح شاشة البحث", () => {
    const more = source("app/(tabs)/more.tsx");
    expect(more).toContain("بحث في التطبيق");
    expect(more).toContain('router.push("/search" as any)');
    expect(more).not.toContain(">الوحدات<");
  });

  it("تعرض الشاشة حقل بحث وشرائح فلترة وحداً للنتائج", () => {
    const screen = source("app/search.tsx");
    const model = source("lib/global-search.ts");
    expect(screen).toContain("ابحث في المحلات والفعاليات والمنتجات");
    expect(screen).toContain("searchGlobalIndex");
    expect(model).toContain("limit = 30");
  });
});
