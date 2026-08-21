export type ExpenseReportCategoryMode = "all" | "selected";

export interface ExpenseReportSettings {
  categoryMode: ExpenseReportCategoryMode;
  selectedCategoryIds: string[];
  dateRangeMode: "all" | "selected";
  startDate?: string;
  endDate?: string;
  includeSummary: boolean;
  includeCategoryBreakdown: boolean;
  includeNotes: boolean;
}

export const DEFAULT_EXPENSE_REPORT_SETTINGS: ExpenseReportSettings = {
  categoryMode: "all",
  selectedCategoryIds: [],
  dateRangeMode: "all",
  startDate: undefined,
  endDate: undefined,
  includeSummary: true,
  includeCategoryBreakdown: true,
  includeNotes: true,
};

export function normalizeExpenseReportSettings(value: unknown): ExpenseReportSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_EXPENSE_REPORT_SETTINGS };
  const candidate = value as Partial<ExpenseReportSettings>;
  const selectedCategoryIds = Array.isArray(candidate.selectedCategoryIds)
    ? [...new Set(candidate.selectedCategoryIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0))]
    : [];
  const startDate = typeof candidate.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.startDate) ? candidate.startDate : undefined;
  const endDate = typeof candidate.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.endDate) ? candidate.endDate : undefined;
  const hasValidDateRange = candidate.dateRangeMode === "selected" && Boolean(startDate && endDate && startDate <= endDate);
  return {
    categoryMode: candidate.categoryMode === "selected" && selectedCategoryIds.length > 0 ? "selected" : "all",
    selectedCategoryIds,
    dateRangeMode: hasValidDateRange ? "selected" : "all",
    startDate: hasValidDateRange ? startDate : undefined,
    endDate: hasValidDateRange ? endDate : undefined,
    includeSummary: candidate.includeSummary !== false,
    includeCategoryBreakdown: candidate.includeCategoryBreakdown !== false,
    includeNotes: candidate.includeNotes !== false,
  };
}
