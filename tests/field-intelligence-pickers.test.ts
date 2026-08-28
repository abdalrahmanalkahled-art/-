import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { FieldChecklistRun } from "@/lib/field-marketing-model";

describe("منتقيات أدوات التنفيذ الميداني", () => {
  it("يستخدم قوائم قابلة للبحث للمنافس والمحل والمنطقة وللنطاق المتعدد", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "components/modules/field-intelligence-module.tsx"), "utf8");
    expect(source).toContain('openPicker("competitor")');
    expect(source).toContain('openPicker("store")');
    expect(source).toContain('openPicker("region")');
    expect(source).toContain('openPicker(scope === "stores" ? "checklistStores" : "checklistRegions")');
    expect(source).toContain("setQuery");
    expect(source).toContain("setTargets");
    expect(source).toContain("FieldActionMenu");
    expect(source).toContain("إضافة رصد منافس");
    expect(source).toContain("تقييم جودة التنفيذ");
    expect(source).toContain("تشغيل قالب ميداني");
  });

  it("يحتفظ بنطاق القالب وأسماء العناصر المتعددة مع نص السجل المتوافق", () => {
    const run: FieldChecklistRun = { id: "run-1", templateId: "visit", templateName: "زيارة", subjectName: "محل أ، محل ب", scope: "stores", subjectNames: ["محل أ", "محل ب"], completedItemIds: ["visit:0"], createdAt: "2026-08-28T00:00:00.000Z" };
    expect(run.scope).toBe("stores");
    expect(run.subjectNames).toEqual(["محل أ", "محل ب"]);
    expect(run.subjectName).toContain("محل أ");
  });
});
