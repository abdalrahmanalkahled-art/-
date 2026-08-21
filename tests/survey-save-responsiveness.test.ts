import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "app/(tabs)/surveys.tsx"), "utf8");
const createTemplateFlow = source.slice(source.indexOf("const handleCreateTemplate"), source.indexOf("const handleStartSurvey"));
const saveSurveyFlow = source.slice(source.indexOf("const handleSaveSurvey"), source.indexOf("const handleEditTemplate"));

describe("استجابة حفظ الاستبيانات", () => {
  it("يغلق نموذج إنشاء الاستبيان فور تأكيد الحفظ دون انتظار رسالة النجاح", () => {
    expect(createTemplateFlow).toContain('setShowCreateModal(false)');
    expect(createTemplateFlow).not.toContain("2500");
    expect(createTemplateFlow).toContain("void loadData()");
  });

  it("يغلق نموذج الزيارة فور الحفظ ولا يحجب الواجهة بحفظ الملاحظات الثانوي", () => {
    expect(saveSurveyFlow).toContain('setShowUseModal(false)');
    expect(saveSurveyFlow).toContain("void (async () =>");
    expect(saveSurveyFlow).not.toContain("2500");
  });
});
