export const DASHBOARD_SECTION_IDS = ["dailyFocus", "metrics", "charts", "alerts", "fieldPriority", "coverage", "quickActions", "goals", "activity"] as const;
export const DASHBOARD_CHART_IDS = ["presence", "activity"] as const;
export const DASHBOARD_QUICK_ACTION_IDS = ["survey", "event", "store", "dailyReport"] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];
export type DashboardChartId = (typeof DASHBOARD_CHART_IDS)[number];
export type DashboardQuickActionId = (typeof DASHBOARD_QUICK_ACTION_IDS)[number];

export interface DashboardSettings {
  enabledSections: DashboardSectionId[];
  enabledCharts: DashboardChartId[];
  enabledQuickActions: DashboardQuickActionId[];
  presenceProductId?: string;
}

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  enabledSections: ["dailyFocus", "metrics", "charts", "alerts", "fieldPriority", "coverage", "quickActions", "goals", "activity"],
  enabledCharts: ["presence", "activity"],
  enabledQuickActions: ["survey", "event", "store", "dailyReport"],
};

function allowedValues<T extends readonly string[]>(values: unknown, allowed: T): T[number][] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is T[number] => typeof value === "string" && allowed.includes(value as T[number])))];
}

export function normalizeDashboardSettings(value: unknown): DashboardSettings {
  const saved = value && typeof value === "object" ? value as Partial<DashboardSettings> : {};
  const enabledSections = allowedValues(saved.enabledSections, DASHBOARD_SECTION_IDS);
  const enabledCharts = allowedValues(saved.enabledCharts, DASHBOARD_CHART_IDS);
  const enabledQuickActions = allowedValues(saved.enabledQuickActions, DASHBOARD_QUICK_ACTION_IDS);

  return {
    enabledSections: enabledSections.length ? enabledSections : [...DEFAULT_DASHBOARD_SETTINGS.enabledSections],
    enabledCharts: enabledCharts.length ? enabledCharts : [...DEFAULT_DASHBOARD_SETTINGS.enabledCharts],
    enabledQuickActions: enabledQuickActions.length ? enabledQuickActions : [...DEFAULT_DASHBOARD_SETTINGS.enabledQuickActions],
    presenceProductId: typeof saved.presenceProductId === "string" ? saved.presenceProductId : undefined,
  };
}
