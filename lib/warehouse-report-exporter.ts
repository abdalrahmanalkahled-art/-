import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import * as ImageManipulator from "expo-image-manipulator";
import { Alert, Platform } from "react-native";

import type { WarehouseReportData } from "./warehouse-report-data";
import type { WarehouseReportSettings } from "./warehouse-report-settings-model";
import { conditionMeta } from "./warehouse-tools";
import { ensureDirectoryExists, sanitizeFilename } from "./export-sanitizer";
import { recordGeneratedReport } from "./report-history";
import { loadSharedPdfReportLogo, pdfLogoMarkup } from "./pdf-report-logo";

function escapeHtml(value: unknown): string {
  return String(value ?? "—").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}
function table(columns: string[], rows: unknown[][]): string {
  return `<table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}">لا توجد بيانات ضمن الخيارات المختارة.</td></tr>`}</tbody></table>`;
}
function imageCell(uri: string | undefined, includeImages: boolean): string {
  if (!includeImages || !uri) return "—";
  return `<img src="${escapeHtml(uri)}" alt="صورة الأداة" />`;
}

async function embeddedToolImage(uri: string | undefined, settings: WarehouseReportSettings): Promise<string> {
  if (!settings.includeImages || !uri) return "—";
  try {
    const resized = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: settings.imageMaxWidth ?? 900 } }], { compress: settings.imageQuality ?? 0.72, format: ImageManipulator.SaveFormat.JPEG });
    const base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: FileSystem.EncodingType.Base64 });
    return imageCell(`data:image/jpeg;base64,${base64}`, true);
  } catch {
    return imageCell(uri, true);
  }
}
const MATERIAL_FIELDS = { name: "المادة", category: "الفئة", currentQuantity: "المتوفر", minimumQuantity: "الحد الأدنى", unit: "الوحدة", status: "الحالة", description: "الوصف" } as const;
const TOOL_FIELDS = { name: "الأداة", quantity: "الكمية", brands: "الماركات", condition: "الحالة" } as const;
const MOVEMENT_FIELDS = { movementDate: "التاريخ", itemName: "المادة", movementType: "النوع", quantity: "الكمية", notes: "الملاحظات" } as const;
function selected(columns: readonly string[], fields: Record<string, string>, row: Record<string, unknown>) { return { columns: columns.map((column) => fields[column]), row: Object.fromEntries(columns.map((column) => [fields[column], row[column] ?? "—"])) }; }
async function reportHtml(data: WarehouseReportData, settings: WarehouseReportSettings, logoMarkup = ""): Promise<string> {
  const summary = [
    settings.includeMaterials ? `<div><strong>${data.materials.length}</strong><span>مواد</span></div>` : "",
    settings.includeTools ? `<div><strong>${data.tools.length}</strong><span>أدوات</span></div>` : "",
    settings.includeMovements ? `<div><strong>${data.movements.length}</strong><span>حركات</span></div>` : "",
  ].join("");
  const materials = settings.includeMaterials ? `<section><h2>المواد</h2>${table(selected(settings.materialColumns, MATERIAL_FIELDS, {}).columns, data.materials.map((item) => settings.materialColumns.map((column) => escapeHtml({ name: item.name, category: item.categoryLabel, currentQuantity: item.currentQuantity, minimumQuantity: item.minimumQuantity, unit: item.unit, status: item.status, description: item.description || "—" }[column]))))}</section>` : "";
  const tools = settings.includeTools ? `<section><h2>الأدوات</h2>${table([...selected(settings.toolColumns, TOOL_FIELDS, {}).columns, ...(settings.includeImages ? ["الصورة"] : [])], await Promise.all(data.tools.map(async (tool) => [...settings.toolColumns.map((column) => escapeHtml({ name: tool.name, quantity: tool.quantity, brands: tool.brandNames.join("، ") || "—", condition: conditionMeta(tool.condition).label }[column])), ...(settings.includeImages ? [await embeddedToolImage(tool.imageUri, settings)] : [])])))}</section>` : "";
  const movements = settings.includeMovements ? `<section><h2>سجل الحركة</h2>${table(selected(settings.movementColumns, MOVEMENT_FIELDS, {}).columns, data.movements.map((movement) => settings.movementColumns.map((column) => escapeHtml({ movementDate: movement.movementDate, itemName: movement.itemName, movementType: movement.movementType === "in" ? "إدخال" : "إخراج", quantity: movement.quantity, notes: movement.notes || "—" }[column]))))}</section>` : "";
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#172033;font-size:10px}.report-head{display:flex;gap:12px;align-items:center}.shared-report-logo{width:48px;height:48px;object-fit:contain;border-radius:10px}h1{font-size:24px;color:#1A56DB;margin:0 0 5px}h2{font-size:15px;color:#1A56DB;margin:20px 0 8px}.meta{color:#64748b;margin:0 0 14px}.summary{display:flex;gap:8px;margin:12px 0 15px}.summary div{flex:1;background:#f7faff;border:1px solid #dce7f8;padding:9px;text-align:center}.summary strong{display:block;font-size:15px}.summary span{display:block;color:#64748b;margin-top:3px}table{width:100%;border-collapse:collapse}th{background:#1A56DB;color:#fff}th,td{padding:7px;border-bottom:1px solid #e1e8f2;text-align:right;vertical-align:top}tr:nth-child(even){background:#f8fbff}img{width:62px;height:48px;object-fit:cover;border:1px solid #dce7f8}@media print{tr{break-inside:avoid}}</style></head><body><header class="report-head">${logoMarkup}<div><h1>تقرير المستودع</h1><p class="meta">تاريخ الإنشاء: ${escapeHtml(data.generatedAt)}</p></div></header><div class="summary">${summary}</div>${materials}${tools}${movements}</body></html>`;
}
function sheet(rows: Record<string, unknown>[], columns: string[]): XLSX.WorkSheet {
  const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? "—"]))), { header: columns });
  (worksheet as XLSX.WorkSheet & { "!dir"?: string })["!dir"] = "rtl";
  worksheet["!cols"] = columns.map((column) => ({ wch: Math.max(14, Math.min(32, column.length + 11)) }));
  worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: columns.length - 1, r: Math.max(rows.length, 1) } }) };
  return worksheet;
}
function workbookBase64(data: WarehouseReportData, settings: WarehouseReportSettings): string {
  const workbook = XLSX.utils.book_new(); workbook.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(workbook, sheet([{ "البند": "تاريخ الإنشاء", "القيمة": data.generatedAt }, { "البند": "المواد المرفقة", "القيمة": data.materials.length }, { "البند": "الأدوات المرفقة", "القيمة": data.tools.length }, { "البند": "الحركات المرفقة", "القيمة": data.movements.length }, { "البند": "إدراج الصور", "القيمة": settings.includeImages ? "نعم" : "لا" }], ["البند", "القيمة"]), "ملخص");
  if (settings.includeMaterials) { const columns = selected(settings.materialColumns, MATERIAL_FIELDS, {}).columns; XLSX.utils.book_append_sheet(workbook, sheet(data.materials.map((item) => selected(settings.materialColumns, MATERIAL_FIELDS, { name: item.name, category: item.categoryLabel, currentQuantity: item.currentQuantity, minimumQuantity: item.minimumQuantity, unit: item.unit, status: item.status, description: item.description || "—" }).row), columns), "المواد"); }
  if (settings.includeTools) { const columns = [...selected(settings.toolColumns, TOOL_FIELDS, {}).columns, ...(settings.includeImages ? ["الصورة المرفقة"] : [])]; XLSX.utils.book_append_sheet(workbook, sheet(data.tools.map((tool) => ({ ...selected(settings.toolColumns, TOOL_FIELDS, { name: tool.name, quantity: tool.quantity, brands: tool.brandNames.join("، ") || "—", condition: conditionMeta(tool.condition).label }).row, ...(settings.includeImages ? { "الصورة المرفقة": tool.imageUri ? "نعم" : "لا" } : {}) })), columns), "الأدوات"); }
  if (settings.includeMovements) { const columns = selected(settings.movementColumns, MOVEMENT_FIELDS, {}).columns; XLSX.utils.book_append_sheet(workbook, sheet(data.movements.map((movement) => selected(settings.movementColumns, MOVEMENT_FIELDS, { movementDate: movement.movementDate, itemName: movement.itemName, movementType: movement.movementType === "in" ? "إدخال" : "إخراج", quantity: movement.quantity, notes: movement.notes || "—" }).row), columns), "الحركة"); }
  return XLSX.write(workbook, { bookType: "xlsx", type: "base64", compression: true }) as string;
}
async function destination(extension: "pdf" | "xlsx") { if (!FileSystem.documentDirectory) throw new Error("تعذر الوصول إلى مجلد المستندات"); const directory = `${FileSystem.documentDirectory}reports/`; if (!(await ensureDirectoryExists(directory))) throw new Error("تعذر إنشاء مجلد التقارير"); const filename = sanitizeFilename(`تقرير_المستودع_${Date.now()}`, extension); return { uri: `${directory}${filename}`, filename }; }
async function shareAndRecord(uri: string, filename: string, type: "PDF" | "XLSX") { const info = await FileSystem.getInfoAsync(uri); if (!info.exists || info.isDirectory || !info.size) throw new Error("لم يتم اعتماد ملف التقرير"); await recordGeneratedReport({ title: filename, type, uri, size: info.size }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: type === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: "مشاركة تقرير المستودع" }); else Alert.alert("تم الحفظ", `حُفظ التقرير داخل مجلد التقارير بالتطبيق:\n${filename}`); }
export async function exportWarehouseReport(format: "pdf" | "excel", data: WarehouseReportData, settings: WarehouseReportSettings): Promise<void> { if (!data.materials.length && !data.tools.length && !data.movements.length) { Alert.alert("تنبيه", "لا توجد بيانات ضمن خيارات التقرير المختارة."); return; } if (Platform.OS === "web") { Alert.alert("التصدير من الويب", "تصدير تقارير المستودع متاح في تطبيق الهاتف."); return; } try { if (format === "pdf") { const generated = await Print.printToFileAsync({ html: await reportHtml(data, settings, pdfLogoMarkup(await loadSharedPdfReportLogo())) }); const { uri, filename } = await destination("pdf"); await FileSystem.copyAsync({ from: generated.uri, to: uri }); await shareAndRecord(uri, filename, "PDF"); } else { const { uri, filename } = await destination("xlsx"); await FileSystem.writeAsStringAsync(uri, workbookBase64(data, settings), { encoding: FileSystem.EncodingType.Base64 }); await shareAndRecord(uri, filename, "XLSX"); } } catch (error) { Alert.alert(`فشل تصدير ${format === "pdf" ? "PDF" : "Excel"}`, error instanceof Error ? error.message : "خطأ غير معروف"); } }
