import { describe, expect, it } from "vitest";

import { DEFAULT_PDF_CUSTOMIZATION } from "../app-settings-model";
import { normalizePdfCustomization } from "../app-settings";
import { applyPdfReportTemplate } from "../pdf-report-templates";

describe("تخصيص قالب PDF الافتراضي", () => {
  it("لا يغير القالب التنفيذي عندما تبقى جميع التخصيصات افتراضية", () => {
    const html = "<html><head></head><body><table><tr><th>العنوان</th></tr></table></body></html>";
    expect(applyPdfReportTemplate(html, "executive", "تقرير", DEFAULT_PDF_CUSTOMIZATION)).toBe(html);
  });

  it("يطبق التخصيص فقط عند اختيار نمط أو لون بديل", () => {
    const html = "<html><head></head><body><div class=\"chart-wrap\"></div><table><tr><th>العنوان</th></tr></table></body></html>";
    const customized = applyPdfReportTemplate(html, "executive", "تقرير", { tableStyle: "outlined", tableColor: "teal", chartAccent: "violet", chartAppearance: "soft" });
    expect(customized).toContain("#0F766E");
    expect(customized).toContain("#7C3AED");
    expect(customized).toContain("border:1px solid");
  });

  it("يعيد القيم غير المعروفة إلى المظهر الافتراضي", () => {
    expect(normalizePdfCustomization({ tableStyle: "غير معروف" as any, chartAccent: "غير معروف" as any })).toEqual(DEFAULT_PDF_CUSTOMIZATION);
  });
});
