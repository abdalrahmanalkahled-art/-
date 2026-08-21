import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

export type ReportType = "CSV" | "JSON" | "PDF" | "XLSX" | "PPTX";

export interface ReportRecord {
  id: string;
  title: string;
  type: ReportType;
  date: string;
  uri: string;
  size?: number;
}

export const REPORTS_STORAGE_KEY = "@madar_reports_history_v1";

export async function getReportHistory(): Promise<ReportRecord[]> {
  const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function recordGeneratedReport(report: Omit<ReportRecord, "id" | "date">): Promise<void> {
  const history = await getReportHistory();
  const record: ReportRecord = {
    ...report,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    date: new Date().toLocaleString("ar-SA"),
  };
  await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify([record, ...history].slice(0, 100)));
}

export async function removeReportRecord(id: string): Promise<void> {
  const history = await getReportHistory();
  await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(history.filter((report) => report.id !== id)));
}

export async function removeReportRecords(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const selected = new Set(ids);
  const history = await getReportHistory();
  const removedReports = history.filter((report) => selected.has(report.id));
  await Promise.all(removedReports.map(async (report) => {
    try {
      const info = await FileSystem.getInfoAsync(report.uri);
      if (info.exists) await FileSystem.deleteAsync(report.uri, { idempotent: true });
    } catch {
      // حذف السجل يستمر حتى إن كانت الملفات القديمة غير متاحة على الجهاز.
    }
  }));
  await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(history.filter((report) => !selected.has(report.id))));
}
