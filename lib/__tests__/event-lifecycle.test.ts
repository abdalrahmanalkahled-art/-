import { describe, expect, it } from "vitest";

import { deriveEventPeriod, eventEndDate, eventStartDate, getEffectiveEventStatus } from "../event-lifecycle";

describe("دورة حياة الفعالية", () => {
  it("يشتق المسار من الفترة التي اختارها المستخدم", () => {
    expect(deriveEventPeriod("2026-03-01", "2026-03-31")).toBe("monthly");
    expect(deriveEventPeriod("2026-01-01", "2026-03-31")).toBe("quarterly");
    expect(deriveEventPeriod("2026-01-01", "2026-06-30")).toBe("semiannual");
    expect(deriveEventPeriod("2026-01-01", "2026-12-31")).toBe("annual");
  });

  it("يعتمد تاريخ الفعالية القديم كتاريخ بداية ونهاية متوافقين", () => {
    expect(eventStartDate({ eventDate: "2026-04-12" })).toBe("2026-04-12");
    expect(eventEndDate({ eventDate: "2026-04-12" })).toBe("2026-04-12");
  });

  it("يعرض الفعالية منتهية تلقائياً عند تجاوز النهاية مع إبقاء الإلغاء والإكمال كما هما", () => {
    const now = new Date("2026-08-25T12:00:00");
    expect(getEffectiveEventStatus({ startDate: "2026-07-01", endDate: "2026-07-31", status: "ongoing" }, now)).toBe("expired");
    expect(getEffectiveEventStatus({ endDate: "2026-07-31", status: "completed" }, now)).toBe("completed");
    expect(getEffectiveEventStatus({ endDate: "2026-07-31", status: "cancelled" }, now)).toBe("cancelled");
  });
});
