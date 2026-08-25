import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

import { logoUriToDataUri, type AnalyticsSettings } from "./analytics-settings";
import { loadAppSettings } from "./app-settings";
import type { AdvancedSurveyAnalytics } from "./advanced-analytics";
import type { AnalyticsReportData } from "./advanced-analytics-report";
import { buildAdvancedAnalyticsPdfHtml } from "./advanced-analytics-pdf-template";
import { ensureDirectoryExists, sanitizeFilename } from "./export-sanitizer";
import { recordGeneratedReport } from "./report-history";
import { applyPdfReportTemplate } from "./pdf-report-templates";
import { beginOperationProgress } from "./operation-progress";

const REPORTS_DIRECTORY = "reports/";

async function getDestination(filename: string): Promise<{ uri: string; safeFilename: string }> {
  if (!FileSystem.documentDirectory) throw new Error("لم يتمكن التطبيق من الوصول إلى مجلد المستندات");
  const directory = `${FileSystem.documentDirectory}${REPORTS_DIRECTORY}`;
  if (!(await ensureDirectoryExists(directory))) throw new Error("تعذر إنشاء مجلد التقارير");
  const safeFilename = sanitizeFilename(filename, "pdf");
  return { uri: `${directory}${safeFilename}`, safeFilename };
}

export async function exportAdvancedAnalyticsPdf(report: AnalyticsReportData, analytics: AdvancedSurveyAnalytics, settings?: AnalyticsSettings): Promise<void> {
  if (!report.cycleRows.length && !report.marketingRows.length && !report.studiedStores.length) {
    Alert.alert("تنبيه", "لا توجد نتائج تحليل ضمن المرشحات المحددة لتصديرها.");
    return;
  }
  if (Platform.OS === "web") {
    Alert.alert("التصدير من الويب", "تصدير PDF متاح في تطبيق الهاتف لضمان الملف العربي واتجاهه الصحيح.");
    return;
  }
  const progress = beginOperationProgress({ kind: "export", title: "تصدير التحليلات المتقدمة PDF", steps: ["تجهيز التحليلات والقالب", "إنشاء ملف PDF", "حفظ التقرير والتحقق منه", "فتح المشاركة"] });
  try {
    progress.update({ stepIndex: 0, message: "جارٍ تجهيز التحليلات وقالب التقرير" });
    const logoDataUri = await logoUriToDataUri(settings?.logoUri);
    const baseHtml = buildAdvancedAnalyticsPdfHtml(report, analytics, { chartType: settings?.chartType, chartOrientation: settings?.chartOrientation, horizontalBarMaxItems: settings?.horizontalBarMaxItems, logoDataUri, reportTables: settings?.reportTables, reportSectionOrder: settings?.reportSectionOrder, showChartValues: settings?.showChartValues, showChartProductNames: settings?.showChartProductNames, labelFontSize: settings?.chartLabelSize, rotateProductNames: settings?.rotateProductNames, categoryAggregation: settings?.categoryAggregation, regionMatrix: settings?.regionMatrix });
    const appSettings = await loadAppSettings();
    const html = applyPdfReportTemplate(baseHtml, appSettings.pdfTemplate, "تقرير التحليلات المتقدمة", appSettings.pdfCustomization);
    progress.update({ stepIndex: 1, message: "جارٍ إنشاء ملف PDF" });
    const generated = await Print.printToFileAsync({ html });
    const temporaryInfo = await FileSystem.getInfoAsync(generated.uri);
    if (!temporaryInfo.exists || temporaryInfo.isDirectory || !temporaryInfo.size) throw new Error("تعذر إنشاء ملف PDF صالح");
    progress.update({ stepIndex: 2, message: "جارٍ حفظ التقرير والتحقق من الملف" });
    const { uri, safeFilename } = await getDestination(`${report.title}_${Date.now()}`);
    await FileSystem.copyAsync({ from: generated.uri, to: uri });
    const savedInfo = await FileSystem.getInfoAsync(uri);
    if (!savedInfo.exists || savedInfo.isDirectory || !savedInfo.size) throw new Error("تم إيقاف العملية لأن ملف PDF الناتج فارغ");
    await recordGeneratedReport({ title: safeFilename, type: "PDF", uri, size: savedInfo.size });
    progress.update({ stepIndex: 3, message: "جارٍ فتح خيارات مشاركة التقرير" });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "مشاركة تقرير التحليلات" });
    } else {
      Alert.alert("تم الحفظ", `حُفظ تقرير PDF داخل مجلد التقارير بالتطبيق:\n${safeFilename}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    Alert.alert("فشل تصدير PDF", `${message}\n\nلم يتم اعتماد ملف فارغ أو غير مكتمل.`);
  } finally {
    progress.complete();
  }
}
