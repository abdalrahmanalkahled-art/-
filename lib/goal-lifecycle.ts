export type GoalPeriod = "monthly" | "quarterly" | "semiannual" | "annual";
export type StoredGoalStatus = "on_track" | "delayed" | "completed" | "cancelled";
export type EffectiveGoalStatus = StoredGoalStatus | "expired";

export interface GoalTimeline {
  startDate?: string;
  endDate?: string;
  status?: StoredGoalStatus;
}

function dateAtNoon(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** يشتق مسار الهدف من نطاقه الزمني المحدد، من دون حاجة لاختيار يدوي. */
export function deriveGoalPeriod(startDate: string, endDate: string): GoalPeriod {
  const start = dateAtNoon(startDate);
  const end = dateAtNoon(endDate);
  if (!start || !end || end < start) return "monthly";
  const calendarMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
  if (calendarMonths <= 1) return "monthly";
  if (calendarMonths <= 3) return "quarterly";
  if (calendarMonths <= 6) return "semiannual";
  return "annual";
}

/** يعرض الهدف منتهياً تلقائياً بعد تاريخ نهايته، مع إبقاء الحالات النهائية اليدوية كما هي. */
export function getEffectiveGoalStatus(goal: GoalTimeline, now = new Date()): EffectiveGoalStatus {
  const stored = goal.status || "on_track";
  if (stored === "completed" || stored === "cancelled") return stored;
  const end = dateAtNoon(goal.endDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return end && end < today ? "expired" : stored;
}

export function goalPeriodLabel(period: GoalPeriod): string {
  return ({ monthly: "شهري", quarterly: "ربع سنوي", semiannual: "نصف سنوي", annual: "سنوي" })[period];
}
