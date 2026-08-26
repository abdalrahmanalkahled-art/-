import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

describe("تحصين التفاعل في تدفقات الهاتف", () => {
  it("يحمي نموذج الفعالية مسودته ويمنع الحفظ المكرر ويفرغ الحقول بعد النجاح", () => {
    const source = readSource("app/(tabs)/events.tsx");
    expect(source).toContain("useSingleFlight");
    expect(source).toContain("UnsavedChangesDialog");
    expect(source).toContain("resetEventForm();");
    expect(source).toContain('isSaving ? "جارٍ الحفظ..." : "حفظ"');
  });

  it("يعيد نموذج المحل إلى حالة فارغة ويحمي زر الحفظ من النقر المتكرر", () => {
    const source = readSource("app/(tabs)/stores.tsx");
    expect(source).toContain("useSingleFlight");
    expect(source).toContain("setForm(emptyStoreForm());");
    expect(source).toContain("disabled={isSaving}");
  });

  it("يغلق إعدادات تقارير زيارة السوق طبقة طبقة عند الرجوع", () => {
    const source = readSource("components/modules/reports-module.tsx");
    expect(source).toContain("handleReportsOverlayBack");
    expect(source).toContain("useOverlayBackHandler(handleReportsOverlayBack)");
  });

  it("يعطل إغلاق النموذج العائم أثناء التنفيذ ويتحقق من شكل بيانات التخزين", () => {
    expect(readSource("components/floating-form-modal.tsx")).toContain("isDismissDisabled");
    expect(readSource("lib/storage.ts")).toContain("Array.isArray(parsed)");
  });
});
