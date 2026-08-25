import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/modules/warehouse-module.tsx"), "utf8");

describe("نافذة إجراءات مواد المستودع", () => {
  it("تستخدم النافذة المشتركة نفسها المعتمدة لبطاقات الأدوات", () => {
    expect(source).toContain('import { CardActionModal } from "@/components/card-action-modal";');
    expect(source).toContain("<CardActionModal");
    expect(source).toContain('label: "تعديل المادة"');
    expect(source).toContain('label: "حذف المادة وسجلها"');
    expect(source).not.toContain("styles.actionSheet");
  });
});
