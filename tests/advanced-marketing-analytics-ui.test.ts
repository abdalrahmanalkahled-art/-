import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const moduleSource = readFileSync(join(process.cwd(), "components/modules/advanced-analytics-module.tsx"), "utf8");

describe("بطاقات التحليلات التسويقية المتقدمة", () => {
  it("تعرض مؤشرات الفعاليات والأهداف والأصول دون أسعار", () => {
    expect(moduleSource).toContain('"المستفيدون"');
    expect(moduleSource).toContain('"الهدايا"');
    expect(moduleSource).toContain('"فعاليات مكتملة"');
    expect(moduleSource).toContain('"ستاندات تحتاج متابعة"');
    expect(moduleSource).toContain('"الأهداف"');
    expect(moduleSource).not.toContain('label="إجمالي الميزانية"');
    expect(moduleSource).not.toContain('label="التكلفة الفعلية"');
    expect(moduleSource).not.toContain('label="تكلفة الفعاليات"');
  });
});
