import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_EXPENSE_REPORT_SETTINGS,
  normalizeExpenseReportSettings,
  type ExpenseReportSettings,
} from "./expense-report-settings-model";

const EXPENSE_REPORT_SETTINGS_KEY = "madar_expense_report_settings";

export async function loadExpenseReportSettings(): Promise<ExpenseReportSettings> {
  try {
    const raw = await AsyncStorage.getItem(EXPENSE_REPORT_SETTINGS_KEY);
    return raw ? normalizeExpenseReportSettings(JSON.parse(raw)) : { ...DEFAULT_EXPENSE_REPORT_SETTINGS };
  } catch {
    return { ...DEFAULT_EXPENSE_REPORT_SETTINGS };
  }
}

export async function saveExpenseReportSettings(settings: ExpenseReportSettings): Promise<ExpenseReportSettings> {
  const normalized = normalizeExpenseReportSettings(settings);
  await AsyncStorage.setItem(EXPENSE_REPORT_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}
