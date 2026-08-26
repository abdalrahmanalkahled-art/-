import { describe, expect, it } from "vitest";

import { DEFAULT_DAILY_REPORT_SETTINGS, normalizeDailyReportSettings } from "../daily-report-settings-model";

describe("إعدادات التقرير اليومي", () => {
  it("يعيد الإعدادات الافتراضية مع وضع معلومات الاستبيان تحت الصور كما في التقرير السابق", () => {
    expect(normalizeDailyReportSettings(undefined)).toEqual(DEFAULT_DAILY_REPORT_SETTINGS);
    expect(DEFAULT_DAILY_REPORT_SETTINGS.storeInfoPosition).toBe("afterPhotos");
  });

  it("يحفظ خيارات الأقسام وتفاصيل المحل الآمنة ويصحح القيم غير المعروفة", () => {
    const normalized = normalizeDailyReportSettings({
      includeMetrics: false,
      includeBrandPresenceSummary: true,
      includeStoreDetails: true,
      includeProductTable: false,
      includeNotes: false,
      storeInfoPosition: "beforePhotos",
    });

    expect(normalized).toMatchObject({
      includeMetrics: false,
      includeBrandPresenceSummary: true,
      includeStoreDetails: true,
      includeProductTable: false,
      includeNotes: false,
      storeInfoPosition: "beforePhotos",
    });
    expect(normalizeDailyReportSettings({ storeInfoPosition: "unknown" })).toMatchObject({ storeInfoPosition: "afterPhotos" });
  });
});
