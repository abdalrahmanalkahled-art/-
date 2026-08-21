import AsyncStorage from "@react-native-async-storage/async-storage";

import { APP_SETTINGS_STORAGE_KEY, DEFAULT_PDF_CUSTOMIZATION, type AppSettings, type PdfChartAppearance, type PdfColorPreset, type PdfCustomization, type PdfTableStyle, type PdfTemplateId } from "./app-settings-model";
import { DEFAULT_DASHBOARD_SETTINGS, normalizeDashboardSettings } from "./dashboard-settings-model";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./notifications-model";

const DEFAULT_APP_SETTINGS: AppSettings = {
  pdfTemplate: "executive",
  pdfCustomization: { ...DEFAULT_PDF_CUSTOMIZATION },
  compactDashboard: false,
  notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  roadsideContractReminderDays: 30,
  dashboard: { ...DEFAULT_DASHBOARD_SETTINGS, enabledSections: [...DEFAULT_DASHBOARD_SETTINGS.enabledSections], enabledCharts: [...DEFAULT_DASHBOARD_SETTINGS.enabledCharts] },
};

const TEMPLATE_IDS: PdfTemplateId[] = ["executive"];
const TABLE_STYLES: PdfTableStyle[] = ["default", "zebra", "outlined"];
const COLOR_PRESETS: PdfColorPreset[] = ["default", "blue", "teal", "violet", "amber", "slate"];
const CHART_APPEARANCES: PdfChartAppearance[] = ["default", "soft", "minimal"];

export function normalizePdfCustomization(value: Partial<PdfCustomization> | undefined): PdfCustomization {
  return {
    tableStyle: TABLE_STYLES.includes(value?.tableStyle as PdfTableStyle) ? value!.tableStyle as PdfTableStyle : "default",
    tableColor: COLOR_PRESETS.includes(value?.tableColor as PdfColorPreset) ? value!.tableColor as PdfColorPreset : "default",
    chartAccent: COLOR_PRESETS.includes(value?.chartAccent as PdfColorPreset) ? value!.chartAccent as PdfColorPreset : "default",
    chartAppearance: CHART_APPEARANCES.includes(value?.chartAppearance as PdfChartAppearance) ? value!.chartAppearance as PdfChartAppearance : "default",
  };
}

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS, pdfCustomization: { ...DEFAULT_PDF_CUSTOMIZATION }, notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES }, dashboard: normalizeDashboardSettings(undefined) };
    const saved = JSON.parse(raw) as Partial<AppSettings>;
    return {
      pdfTemplate: TEMPLATE_IDS.includes(saved.pdfTemplate as PdfTemplateId) ? saved.pdfTemplate as PdfTemplateId : "executive",
      pdfCustomization: normalizePdfCustomization(saved.pdfCustomization),
      compactDashboard: saved.compactDashboard === true,
      notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(saved.notificationPreferences || {}) },
      roadsideContractReminderDays: [15, 30, 60].includes(saved.roadsideContractReminderDays as number) ? saved.roadsideContractReminderDays as 15 | 30 | 60 : 30,
      dashboard: normalizeDashboardSettings(saved.dashboard),
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS, pdfCustomization: { ...DEFAULT_PDF_CUSTOMIZATION }, notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES }, dashboard: normalizeDashboardSettings(undefined) };
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
