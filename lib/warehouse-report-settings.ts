import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_WAREHOUSE_REPORT_SETTINGS, normalizeWarehouseReportSettings, type WarehouseReportSettings } from "./warehouse-report-settings-model";

const WAREHOUSE_REPORT_SETTINGS_KEY = "madar_warehouse_report_settings";

export async function loadWarehouseReportSettings(): Promise<WarehouseReportSettings> {
  try {
    const raw = await AsyncStorage.getItem(WAREHOUSE_REPORT_SETTINGS_KEY);
    return raw ? normalizeWarehouseReportSettings(JSON.parse(raw)) : { ...DEFAULT_WAREHOUSE_REPORT_SETTINGS };
  } catch {
    return { ...DEFAULT_WAREHOUSE_REPORT_SETTINGS };
  }
}

export async function saveWarehouseReportSettings(value: WarehouseReportSettings): Promise<WarehouseReportSettings> {
  const settings = normalizeWarehouseReportSettings(value);
  await AsyncStorage.setItem(WAREHOUSE_REPORT_SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}
