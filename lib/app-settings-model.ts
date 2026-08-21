import type { NotificationPreferences } from "./notifications-model";
import type { DashboardSettings } from "./dashboard-settings-model";

export type PdfTemplateId = "executive";
export type PdfTableStyle = "default" | "zebra" | "outlined";
export type PdfColorPreset = "default" | "blue" | "teal" | "violet" | "amber" | "slate";
export type PdfChartAppearance = "default" | "soft" | "minimal";

export interface PdfCustomization {
  tableStyle: PdfTableStyle;
  tableColor: PdfColorPreset;
  chartAccent: PdfColorPreset;
  chartAppearance: PdfChartAppearance;
}

export const DEFAULT_PDF_CUSTOMIZATION: PdfCustomization = {
  tableStyle: "default",
  tableColor: "default",
  chartAccent: "default",
  chartAppearance: "default",
};

export interface AppSettings {
  pdfTemplate: PdfTemplateId;
  pdfCustomization: PdfCustomization;
  compactDashboard: boolean;
  notificationPreferences: NotificationPreferences;
  roadsideContractReminderDays: 15 | 30 | 60;
  dashboard: DashboardSettings;
}

export const APP_SETTINGS_STORAGE_KEY = "@madar_app_settings_v1";

export const PDF_TEMPLATES: { id: PdfTemplateId; title: string; description: string }[] = [
  { id: "executive", title: "القالب التنفيذي", description: "القالب التحليلي الكامل الحالي، وهو الافتراضي." },
];
