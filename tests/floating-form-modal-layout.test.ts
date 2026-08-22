import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const modalSource = readFileSync(resolve(process.cwd(), "components/floating-form-modal.tsx"), "utf8");
const surveySheetSource = readFileSync(resolve(process.cwd(), "components/surveys/survey-page-sheet-modal.tsx"), "utf8");

describe("الغلاف الآمن للنماذج العائمة", () => {
  it("يضع للنماذج الكبيرة ارتفاعاً محدوداً وهوامش رأسية بدل ملء الشاشة", () => {
    expect(modalSource).toContain('paddingVertical: DESIGN.spacing.xl');
    expect(modalSource).toContain('height: "88%"');
    expect(modalSource).toContain('maxHeight: "88%"');
    expect(modalSource).toContain('alignItems: "center"');
    expect(modalSource).not.toContain('dialog: { flex: 1, maxHeight: "100%"');
  });

  it("يحافظ على ارتفاع النموذج المختصر ويضيف المساحة السفلية الآمنة للاستبيانات", () => {
    expect(modalSource).toContain('height: "72%"');
    expect(surveySheetSource).toContain('edges={["top", "bottom", "left", "right"]}');
  });
});
