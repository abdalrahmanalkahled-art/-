import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("لوحة المفاتيح في النماذج العائمة", () => {
  it("يبقي معالجة لوحة المفاتيح داخل FloatingFormModal", () => {
    const modal = source("components/floating-form-modal.tsx");
    expect(modal).toContain("KeyboardAvoidingView");
    expect(modal).toContain("getKeyboardAvoidingBehavior");
    expect(modal).toContain("styles.keyboard");
  });

  it("لا يضيف طبقة تجنب لوحة المفاتيح ثانية في وحدات المزيد الأساسية", () => {
    [
      "app/(tabs)/more.tsx",
      "components/modules/products-module.tsx",
      "components/modules/warehouse-module.tsx",
      "components/modules/expenses-module.tsx",
      "components/modules/goals-module.tsx",
    ].forEach((path) => expect(source(path)).not.toContain("KeyboardAvoidingView"));
  });

  it("يجعل نافذة الملف الشخصي قابلة للتمرير ويحافظ على تذييل الحفظ", () => {
    const profile = source("components/profile-settings-modal.tsx");
    expect(profile).toContain("contentContainerStyle={styles.dialogContent}");
    expect(profile).toContain("styles.saveFooter");
    expect(profile).toContain('maxHeight: "88%"');
  });
});
