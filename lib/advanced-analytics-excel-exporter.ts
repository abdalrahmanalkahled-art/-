import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

import type { AnalyticsSettings } from "./analytics-settings";
import type { AnalyticsReportData } from "./advanced-analytics-report";
import { createAdvancedAnalyticsWorkbookBase64 } from "./advanced-analytics-excel-workbook";
import { ensureDirectoryExists, sanitizeFilename } from "./export-sanitizer";
import { recordGeneratedReport } from "./report-history";

const REPORTS_DIRECTORY = "reports/";

export async function exportAdvancedAnalyticsExcel(report: AnalyticsReportData, settings?: AnalyticsSettings): Promise<void> {
  if (!report.cycleRows.length && !report.marketingRows.length && !report.studiedStores.length) {
    Alert.alert("تنبيه", "لا توجد نتائج تحليل ضمن المرشحات المحددة لتصديرها.");
    return;
  }
  if (Platform.OS === "web") {
    Alert.alert("التصدير من الويب", "تصدير Excel متاح في تطبيق الهاتف لضمان حفظ الملف العربي بشكل صحيح.");
    return;
  }
  try {
    if (!FileSystem.documentDirectory) throw new Error("لم يتمكن التطبيق من الوصول إلى مجلد المستندات");
    const directory = `${FileSystem.documentDirectory}${REPORTS_DIRECTORY}`;
    if (!(await ensureDirectoryExists(directory))) throw new Error("تعذر إنشاء مجلد التقارير");
    const safeFilename = sanitizeFilename(`${report.title}_${Date.now()}`, "xlsx");
    const uri = `${directory}${safeFilename}`;
    await FileSystem.writeAsStringAsync(uri, createAdvancedAnalyticsWorkbookBase64(report, settings), { encoding: FileSystem.EncodingType.Base64 });
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory || !info.size) throw new Error("تم إيقاف العملية لأن ملف Excel الناتج فارغ");
    await recordGeneratedReport({ title: safeFilename, type: "XLSX", uri, size: info.size });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", UTI: "org.openxmlformats.spreadsheetml.sheet", dialogTitle: "مشاركة تحليل Excel" });
    } else {
      Alert.alert("تم الحفظ", `حُفظ تقرير Excel داخل مجلد التقارير بالتطبيق:\n${safeFilename}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    Alert.alert("فشل تصدير Excel", `${message}\n\nلم يتم اعتماد ملف فارغ أو غير مكتمل.`);
  }
}
