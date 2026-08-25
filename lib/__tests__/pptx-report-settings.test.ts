import { describe, expect, it } from "vitest";

import { createDefaultPptxReportSettings, normalizePptxReportSettings } from "@/lib/pptx-report-settings";

describe("إعدادات PowerPoint للوسائط", () => {
  it("يحفظ خيار جميع الوسائط وترتيب الحقول المفعلة في بطاقة صورة الدورة", () => {
    const fallback = createDefaultPptxReportSettings("تحليلات", [{ key: "productDetails", label: "تفاصيل", description: "تفاصيل" }]);
    const settings = normalizePptxReportSettings({ mediaLimit: "all", mediaCardFields: { storeName: true, region: false, category: true }, mediaCardOrder: ["category", "storeName", "region"] }, fallback);

    expect(settings.mediaLimit).toBe("all");
    expect(settings.mediaCardFields).toEqual({ storeName: true, region: false, category: true });
    expect(settings.mediaCardOrder).toEqual(["category", "storeName", "region"]);
  });
});
