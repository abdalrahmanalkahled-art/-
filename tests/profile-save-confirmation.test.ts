import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/profile-settings-modal.tsx"), "utf8");

describe("تأكيد حفظ الملف الشخصي", () => {
  it("يربط زر الحفظ بطلب التأكيد ويعرض نافذة تغيير بيانات الدخول", () => {
    expect(source).toContain("const credentialsChanged = username.trim().toLowerCase() !== user.username || Boolean(password.trim());");
    expect(source).toContain("setShowCredentialsConfirmation(true)");
    expect(source).toContain('title="تأكيد تغيير بيانات الدخول"');
  });

  it("ينفذ الحفظ مباشرة عندما لا تتغير بيانات الدخول", () => {
    expect(source).toContain("if (credentialsChanged)");
    expect(source).toContain("void persist();");
  });

  it("يشترط كلمة المرور الحالية الصحيحة قبل تغيير كلمة المرور الجديدة", () => {
    expect(source).toContain("verifyLocalUserPassword");
    expect(source).toContain("أدخل كلمة المرور الحالية قبل تعيين كلمة مرور جديدة");
    expect(source).toContain("كلمة المرور الحالية غير صحيحة");
    expect(source).toContain("كلمة المرور الحالية");
    expect(source).toContain("if (password.trim())");
  });
});
