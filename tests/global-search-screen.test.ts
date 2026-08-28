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
    expect(screen).toContain("filtersList: { height: 42, minHeight: 42, maxHeight: 42, flexGrow: 0, flexShrink: 0, marginBottom: 0 }");
    expect(screen).toContain("filter: { height: 34");
    expect(screen).toContain("resultsList: { flex: 1, marginTop: 0 }");
    expect(screen).toContain("results: { padding: 14, paddingTop: 0");
    expect(model).toContain("limit = 30");
  });
});
