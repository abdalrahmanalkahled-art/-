import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const surveysSource = readFileSync(resolve(process.cwd(), "app/(tabs)/surveys.tsx"), "utf8");
const questionModalSource = readFileSync(resolve(process.cwd(), "components/surveys/add-question-modal.tsx"), "utf8");
const floatingModalSource = readFileSync(resolve(process.cwd(), "components/floating-form-modal.tsx"), "utf8");

describe("نافذة إضافة سؤال الاستبيان", () => {
  it("تستخدم النافذة العائمة المركزية بدلاً من نافذة صفحة كاملة", () => {
    expect(surveysSource).toContain("<AddQuestionModal");
    expect(questionModalSource).toContain("FloatingFormModal visible={visible}");
    expect(surveysSource).not.toContain("<Modal\n        visible={showAddQuestion}");
  });

  it("يبقي حقول السؤال وخياراته وحفظه داخل النافذة الجديدة", () => {
    expect(questionModalSource).toContain("نص السؤال");
    expect(questionModalSource).toContain("إضافة خيار");
    expect(questionModalSource).toContain("السماح بإجابات متعددة");
    expect(surveysSource).toContain("تم إضافة السؤال بنجاح");
  });

  it("يعرض نافذة السؤال بارتفاع ثابت أقصر مع تمرير الخيارات داخلياً", () => {
    expect(questionModalSource).toContain("compactHeight");
    expect(questionModalSource).toContain('keyboardShouldPersistTaps="always"');
    expect(floatingModalSource).toContain("compactDialog");
    expect(floatingModalSource).toContain('height: "72%"');
  });
});
