export type EventPeriod = "monthly" | "quarterly" | "semiannual" | "annual";
export type StoredEventStatus = "planned" | "ongoing" | "completed" | "cancelled";
export type EffectiveEventStatus = StoredEventStatus | "expired";

export interface EventTimeline {
  eventDate?: string;
  startDate?: string;
  endDate?: string;
  status?: StoredEventStatus;
}

function dateAtNoon(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function eventStartDate(event: Pick<EventTimeline, "eventDate" | "startDate">): string {
  return event.startDate || event.eventDate || "";
}

export function eventEndDate(event: Pick<EventTimeline, "eventDate" | "endDate">): string {
  return event.endDate || event.eventDate || "";
}

/** يصنف المدى بالتقويم: شهر واحد، حتى 3 أشهر، حتى 6 أشهر، ثم سنة أو أكثر. */
export function deriveEventPeriod(startDate: string, endDate: string): EventPeriod {
  const start = dateAtNoon(startDate);
  const end = dateAtNoon(endDate);
  if (!start || !end || end < start) return "monthly";
  const calendarMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
  if (calendarMonths <= 1) return "monthly";
  if (calendarMonths <= 3) return "quarterly";
  if (calendarMonths <= 6) return "semiannual";
  return "annual";
}

/**
 * يحافظ على الحالات النهائية التي حددها المستخدم، ويعتبر أي فعالية غير نهائية منتهية
 * فور تجاوز تاريخ نهايتها محلياً. لا يحتاج ذلك إلى تعديل مخزن أو مهمة خلفية.
 */
export function getEffectiveEventStatus(event: EventTimeline, now = new Date()): EffectiveEventStatus {
  const stored = event.status || "planned";
  if (stored === "completed" || stored === "cancelled") return stored;
  const end = dateAtNoon(eventEndDate(event));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return end && end < today ? "expired" : stored;
}

export function eventPeriodLabel(period: EventPeriod): string {
  return ({ monthly: "شهري", quarterly: "ربع سنوي", semiannual: "نصف سنوي", annual: "سنوي" })[period];
}
