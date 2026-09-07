import { describe, expect, it } from "vitest";

import { normalizeDashboardSettings } from "../dashboard-settings-model";

describe("تخصيص الشاشة الرئيسية", () => {
  it("يحفظ الخيارات الصالحة فقط ويستبعد القيم المكررة أو غير المعروفة", () => {
    expect(normalizeDashboardSettings({
      enabledSections: ["metrics", "charts", "metrics", "غير معروف"],
      enabledCharts: ["activity", "نشاط"],
    })).toEqual({ enabledSections: ["metrics", "charts"], enabledCharts: ["activity"], enabledQuickActions: ["survey", "event", "store"], presenceProductId: undefined });
  });

  it("يعيد التخطيط الافتراضي عند فتح إعدادات قديمة لا تحوي تخصيص الرئيسية", () => {
    const settings = normalizeDashboardSettings({});
    expect(settings.enabledSections).toContain("dailyFocus");
    expect(settings.enabledCharts).toEqual(["presence", "activity"]);
    expect(settings.enabledQuickActions).toEqual(["survey", "event", "store"]);
  });
});
