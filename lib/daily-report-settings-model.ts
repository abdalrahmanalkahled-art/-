export type DailyReportStoreInfoPosition = "beforePhotos" | "afterPhotos";

export interface DailyReportSettings {
  includeExecutiveSummary: boolean;
  includeMetrics: boolean;
  includeBrandPresenceSummary: boolean;
  includeStoreDetails: boolean;
  includeEvents: boolean;
  storeInfoPosition: DailyReportStoreInfoPosition;
  includeSurveyMeta: boolean;
  includeProductTable: boolean;
  includeQuestionAnswers: boolean;
  includeNotes: boolean;
}

export const DEFAULT_DAILY_REPORT_SETTINGS: DailyReportSettings = {
  includeExecutiveSummary: true,
  includeMetrics: true,
  includeBrandPresenceSummary: false,
  includeStoreDetails: true,
  includeEvents: true,
  storeInfoPosition: "afterPhotos",
  includeSurveyMeta: true,
  includeProductTable: true,
  includeQuestionAnswers: true,
  includeNotes: true,
};

export const DAILY_REPORT_SECTION_KEYS = [
  "includeExecutiveSummary",
  "includeMetrics",
  "includeBrandPresenceSummary",
  "includeStoreDetails",
  "includeEvents",
] as const;

export function normalizeDailyReportSettings(value: unknown): DailyReportSettings {
  const saved = value && typeof value === "object" ? value as Partial<DailyReportSettings> : {};
  const bool = <K extends keyof DailyReportSettings>(key: K, fallback: boolean) => typeof saved[key] === "boolean" ? saved[key] : fallback;

  return {
    includeExecutiveSummary: bool("includeExecutiveSummary", true),
    includeMetrics: bool("includeMetrics", true),
    includeBrandPresenceSummary: bool("includeBrandPresenceSummary", false),
    includeStoreDetails: bool("includeStoreDetails", true),
    includeEvents: bool("includeEvents", true),
    storeInfoPosition: saved.storeInfoPosition === "beforePhotos" ? "beforePhotos" : "afterPhotos",
    includeSurveyMeta: bool("includeSurveyMeta", true),
    includeProductTable: bool("includeProductTable", true),
    includeQuestionAnswers: bool("includeQuestionAnswers", true),
    includeNotes: bool("includeNotes", true),
  };
}
