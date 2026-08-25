import { describe, expect, it } from "vitest";

import { deriveGoalPeriod, getEffectiveGoalStatus } from "../goal-lifecycle";

describe("مسار وحالة الهدف الزمنية", () => {
  it("يشتق المسار من نطاق هدف الخطة", () => {
    expect(deriveGoalPeriod("2026-03-01", "2026-03-31")).toBe("monthly");
    expect(deriveGoalPeriod("2026-01-01", "2026-03-31")).toBe("quarterly");
    expect(deriveGoalPeriod("2026-01-01", "2026-06-30")).toBe("semiannual");
    expect(deriveGoalPeriod("2026-01-01", "2026-12-31")).toBe("annual");
  });

  it("يعتبر الهدف غير النهائي منتهياً بعد نهاية مدته", () => {
    const now = new Date("2026-08-10T12:00:00");
    expect(getEffectiveGoalStatus({ startDate: "2026-07-01", endDate: "2026-07-31", status: "on_track" }, now)).toBe("expired");
    expect(getEffectiveGoalStatus({ endDate: "2026-07-31", status: "completed" }, now)).toBe("completed");
    expect(getEffectiveGoalStatus({ endDate: "2026-07-31", status: "cancelled" }, now)).toBe("cancelled");
  });
});
