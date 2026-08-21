import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { Alert, Platform } from "react-native";

import type { ExpenseReportSettings } from "./expense-report-settings-model";
import type { ExpenseReportData } from "./expense-report-data";
import { ensureDirectoryExists, sanitizeFilename } from "./export-sanitizer";
import { recordGeneratedReport } from "./report-history";
import { loadSharedPdfReportLogo, pdfLogoMarkup } from "./pdf-report-logo";

function escapeHtml(value: unknown): string {
  return String(value ?? "—").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function money(value: number): string {
  return `${value.toLocaleString("ar-SY")} ل.س`;
}

function reportHtml(data: ExpenseReportData, settings: ExpenseReportSettings, logoMarkup = ""): string {
  const detailColumns = settings.includeNotes
    ? ["التاريخ", "العنوان", "التصنيف", "المبلغ", "الملاحظات"]
    : ["التاريخ", "العنوان", "التصنيف", "المبلغ"];
  const detailRows = data.expenses.map((expense) => {
    const category = data.categoryTotals.find((item) => item.id === expense.category)?.label ?? "تصنيف غير معروف";
    const row = [expense.expenseDate, expense.title, category, money(expense.amount), ...(settings.includeNotes ? [expense.notes || "—"] : [])];
    return `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
  }).join("") || `<tr><td colspan="${detailColumns.length}">لا توجد صرفيات وفق التصنيفات المختارة.</td></tr>`;
  const breakdown = settings.includeCategoryBreakdown
    ? `<section><h2>ملخص حسب التصنيف</h2><table><thead><tr><th>التصنيف</th><th>عدد الصرفيات</th><th>الإجمالي</th></tr></thead><tbody>${data.categoryTotals.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${item.count.toLocaleString("ar-SY")}</td><td>${money(item.amount)}</td></tr>`).join("") || "<tr><td colspan=\"3\">لا توجد بيانات</td></tr>"}</tbody></table></section>`
    : "";
  const summary = settings.includeSummary
    ? `<section class="summary"><div><strong>${money(data.totalAmount)}</strong><span>إجمالي الصرفيات</span></div><div><strong>${data.expenses.length.toLocaleString("ar-SY")}</strong><span>عدد الصرفيات</span></div><div><strong>${data.categoryTotals.length.toLocaleString("ar-SY")}</strong><span>تصنيفات مشمولة</span></div></section>`
    : "";
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#172033;font-size:10px}.report-head{display:flex;gap:12px;align-items:center}.shared-report-logo{width:48px;height:48px;object-fit:contain;border-radius:10px}h1{color:#1A56DB;font-size:24px;margin:0 0 5px}h2{font-size:14px;color:#1A56DB;margin:20px 0 8px}.meta{color:#64748b;margin:0 0 15px}.scope{background:#eef4ff;border-right:4px solid #1A56DB;padding:9px 10px;margin-bottom:14px;border-radius:5px}.summary{display:flex;gap:8px;margin-bottom:14px}.summary div{flex:1;background:#f7faff;border:1px solid #dce7f8;border-radius:8px;padding:10px;text-align:center}.summary strong{display:block;font-size:14px;color:#172033}.summary span{display:block;color:#64748b;margin-top:4px}table{width:100%;border-collapse:collapse}th{background:#1A56DB;color:#fff;font-weight:bold}th,td{padding:8px;border-bottom:1px solid #e1e8f2;text-align:right;vertical-align:top}tr:nth-child(even){background:#f8fbff}@media print{tr{break-inside:avoid}}</style></head><body><header class="report-head">${logoMarkup}<div><h1>تقرير الصرفيات</h1><p class="meta">تاريخ الإنشاء: ${new Date().toLocaleString("ar-SY")}</p></div></header><p class="scope"><strong>التصنيفات المشمولة:</strong> ${escapeHtml(data.categoryScopeLabel)}<br/><strong>الفترة الزمنية:</strong> ${escapeHtml(data.dateScopeLabel)}</p>${summary}${breakdown}<section><h2>تفاصيل الصرفيات</h2><table><thead><tr>${detailColumns.map((column) => `<th>${column}</th>`).join("")}</tr></thead><tbody>${detailRows}</tbody></table></section></body></html>`;
}

function worksheet(rows: Record<string, unknown>[], columns: string[]): XLSX.WorkSheet {
  const sheet = XLSX.utils.json_to_sheet(rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? "—"]))), { header: columns });
  (sheet as XLSX.WorkSheet & { "!dir"?: string })["!dir"] = "rtl";
  sheet["!cols"] = columns.map((column) => ({ wch: Math.max(15, Math.min(32, column.length + 12)) }));
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: columns.length - 1, r: Math.max(rows.length, 1) } }) };
  return sheet;
}

function workbookBase64(data: ExpenseReportData, settings: ExpenseReportSettings): string {
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  const overviewRows = [
    { "البند": "التصنيفات المشمولة", "القيمة": data.categoryScopeLabel },
    { "البند": "الفترة الزمنية", "القيمة": data.dateScopeLabel },
    { "البند": "إجمالي الصرفيات", "القيمة": money(data.totalAmount) },
    { "البند": "عدد الصرفيات", "القيمة": data.expenses.length },
    { "البند": "عدد التصنيفات", "القيمة": data.categoryTotals.length },
    { "البند": "تاريخ الإنشاء", "القيمة": new Date().toLocaleString("ar-SY") },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet(overviewRows, ["البند", "القيمة"]), "ملخص");
  if (settings.includeCategoryBreakdown) {
    XLSX.utils.book_append_sheet(workbook, worksheet(data.categoryTotals.map((item) => ({ "التصنيف": item.label, "عدد الصرفيات": item.count, "إجمالي المبلغ": item.amount })), ["التصنيف", "عدد الصرفيات", "إجمالي المبلغ"]), "حسب التصنيف");
  }
  const detailColumns = settings.includeNotes
    ? ["التاريخ", "العنوان", "التصنيف", "المبلغ", "الملاحظات"]
    : ["التاريخ", "العنوان", "التصنيف", "المبلغ"];
  XLSX.utils.book_append_sheet(workbook, worksheet(data.expenses.map((expense) => ({
    "التاريخ": expense.expenseDate,
    "العنوان": expense.title,
    "التصنيف": data.categoryTotals.find((item) => item.id === expense.category)?.label ?? "تصنيف غير معروف",
    "المبلغ": expense.amount,
    ...(settings.includeNotes ? { "الملاحظات": expense.notes || "—" } : {}),
  })), detailColumns), "تفاصيل الصرفيات");
  return XLSX.write(workbook, { bookType: "xlsx", type: "base64", compression: true }) as string;
}

async function destination(extension: "pdf" | "xlsx") {
  if (!FileSystem.documentDirectory) throw new Error("لم يتمكن التطبيق من الوصول إلى مجلد المستندات");
  const directory = `${FileSystem.documentDirectory}reports/`;
  if (!(await ensureDirectoryExists(directory))) throw new Error("تعذر إنشاء مجلد التقارير");
  const filename = sanitizeFilename(`تقرير_الصرفيات_${Date.now()}`, extension);
  return { uri: `${directory}${filename}`, filename };
}

async function shareAndRecord(uri: string, filename: string, type: "PDF" | "XLSX") {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory || !info.size) throw new Error("لم يتم اعتماد ملف التقرير");
  await recordGeneratedReport({ title: filename, type, uri, size: info.size });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: type === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "مشاركة تقرير الصرفيات",
    });
  } else {
    Alert.alert("تم الحفظ", `حُفظ التقرير داخل مجلد التقارير بالتطبيق:\n${filename}`);
  }
}

export async function exportExpenseReport(format: "pdf" | "excel", data: ExpenseReportData, settings: ExpenseReportSettings): Promise<void> {
  if (!data.expenses.length) {
    Alert.alert("تنبيه", "لا توجد صرفيات ضمن التصنيفات والفترة المختارة.");
    return;
  }
  if (Platform.OS === "web") {
    Alert.alert("التصدير من الويب", "تصدير تقارير الصرفيات متاح في تطبيق الهاتف.");
    return;
  }
  try {
    if (format === "pdf") {
      const generated = await Print.printToFileAsync({ html: reportHtml(data, settings, pdfLogoMarkup(await loadSharedPdfReportLogo())) });
      const { uri, filename } = await destination("pdf");
      await FileSystem.copyAsync({ from: generated.uri, to: uri });
      await shareAndRecord(uri, filename, "PDF");
      return;
    }
    const { uri, filename } = await destination("xlsx");
    await FileSystem.writeAsStringAsync(uri, workbookBase64(data, settings), { encoding: FileSystem.EncodingType.Base64 });
    await shareAndRecord(uri, filename, "XLSX");
  } catch (error) {
    Alert.alert(`فشل تصدير ${format === "pdf" ? "PDF" : "Excel"}`, error instanceof Error ? error.message : "خطأ غير معروف");
  }
}
