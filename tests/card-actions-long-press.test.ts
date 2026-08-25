import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const actionModal = readFileSync(resolve(process.cwd(), "components/card-action-modal.tsx"), "utf8");
const stores = readFileSync(resolve(process.cwd(), "app/(tabs)/stores.tsx"), "utf8");
const surveys = readFileSync(resolve(process.cwd(), "app/(tabs)/surveys.tsx"), "utf8");
const events = readFileSync(resolve(process.cwd(), "app/(tabs)/events.tsx"), "utf8");
const tools = readFileSync(resolve(process.cwd(), "components/warehouse-tools-tab.tsx"), "utf8");
const expenses = readFileSync(resolve(process.cwd(), "components/modules/expenses-module.tsx"), "utf8");
const brandsRegions = readFileSync(resolve(process.cwd(), "components/modules/brands-regions-module.tsx"), "utf8");

describe("إجراءات البطاقات بالضغط المطوّل", () => {
  it("يوفر نافذة عائمة موحدة تدعم التعديل والحذف", () => {
    expect(actionModal).toContain("export function CardActionModal");
    expect(actionModal).toContain("animationType=\"fade\"");
    expect(actionModal).toContain('tone === "danger"');
  });

  it("ينقل المحلات والنتائج والأدوات إلى الضغط المطوّل", () => {
    expect(stores).toContain("onLongPress={() => setStoreActionTarget(item)}");
    expect(surveys).toContain("onLongPress={() => setResultActionTarget(item)}");
    expect(tools).toContain("onLongPress={() => setToolActionTarget(item)}");
    expect(stores).toContain("<CardActionModal");
    expect(surveys).toContain("<CardActionModal");
    expect(tools).toContain("<CardActionModal");
  });

  it("يعمم النمط على الفعاليات والصرفيات أيضاً", () => {
    expect(events).toContain("onLongPress={() => setEventActionTarget(item)}");
    expect(expenses).toContain("onLongPress={() => setExpenseActionTarget(item)}");
    expect(events).toContain("<CardActionModal");
    expect(expenses).toContain("<CardActionModal");
    expect(expenses).toContain('id: "edit", label: "تعديل الصرفية"');
    expect(expenses).toContain("openExpenseEdit(target)");
  });

  it("يعمم النمط على بطاقات الماركات والمناطق والتقييمات", () => {
    expect(brandsRegions).toContain("onLongPress={() => setActionTarget(target)}");
    expect(brandsRegions).toContain("<CardActionModal");
  });
});
