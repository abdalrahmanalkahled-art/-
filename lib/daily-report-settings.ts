import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_DAILY_REPORT_SETTINGS, normalizeDailyReportSettings, type DailyReportSettings } from "./daily-report-settings-model";

const DAILY_REPORT_SETTINGS_STORAGE_KEY = "madar_daily_report_settings_v1";

export async function loadDailyReportSettings(): Promise<DailyReportSettings> {
  try {
    return normalizeDailyReportSettings(JSON.parse((await AsyncStorage.getItem(DAILY_REPORT_SETTINGS_STORAGE_KEY)) || "null"));
  } catch {
    return { ...DEFAULT_DAILY_REPORT_SETTINGS };
  }
}

export async function saveDailyReportSettings(value: DailyReportSettings): Promise<DailyReportSettings> {
  const normalized = normalizeDailyReportSettings(value);
  await AsyncStorage.setItem(DAILY_REPORT_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
