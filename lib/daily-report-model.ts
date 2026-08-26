export interface DailyReportDateRange {
  startDate: string;
  endDate: string;
}

export interface DailyReportSummary {
  storesVisited: number;
  surveyResults: number;
  regionsVisited: string[];
  eventsCount: number;
  photosCount: number;
}

export interface DailyReportBrandPresence {
  brandName: string;
  presentCount: number;
  totalCount: number;
  percentage: number;
}

export function toDateOnly(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function isWithinDateRange(value: string, range: DailyReportDateRange): boolean {
  const date = toDateOnly(value);
  return date >= range.startDate && date <= range.endDate;
}
