import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("توحيد واجهات وحدات صفحة المزيد", () => {
  it("يوفر تبويبات وشرائح فلترة وحالة فارغة موحدة", () => {
    const sharedUi = source("components/more-module-ui.tsx");
    expect(sharedUi).toContain("export function MoreModuleTabs");
    expect(sharedUi).toContain("export function MoreModuleFilterChips");
    expect(sharedUi).toContain("export function MoreModuleEmptyState");
    expect(sharedUi).toContain("activeOpacity={0.78}");
  });

  it("يطبق المكونات المشتركة على المستودع والصرفيات والمنتجات", () => {
    expect(source("components/modules/warehouse-module.tsx")).toContain("<MoreModuleTabs");
    expect(source("components/modules/expenses-module.tsx")).toContain("<MoreModuleFilterChips");
    expect(source("components/modules/products-module.tsx")).toContain("<MoreModuleTabs");
    expect(source("components/modules/brands-regions-module.tsx")).toContain("<MoreModuleTabs");
    expect(source("components/modules/goals-module.tsx")).toContain("<MoreModuleFilterChips");
    ["components/modules/warehouse-module.tsx", "components/modules/expenses-module.tsx", "components/modules/products-module.tsx", "components/modules/brands-regions-module.tsx", "components/modules/goals-module.tsx"].forEach((path) => expect(source(path)).toContain("<MoreModuleEmptyState"));
  });

  it("يبقي رأس صفحة المزيد موحداً ولا يغيّر نموذج اللوحات والستاندات المرجعي", () => {
    expect(source("app/(tabs)/more.tsx")).not.toContain("compact={activeModule === \"products\"}");
    expect(source("components/modules/signage-module.tsx")).toContain("/* Main Modal */");
    const references = source("components/modules/brands-regions-module.tsx");
    expect(references).toContain('input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 }');
    expect(references).toContain('footerButton: { flex: 1, alignItems: "center", borderRadius: 10, borderWidth: 1, paddingVertical: 12 }');
    expect(source("components/modules/products-module.tsx")).toContain('modalFooter: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 0.5');
  });
});
