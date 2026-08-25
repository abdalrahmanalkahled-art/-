import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { Alert, Platform } from "react-native";

import type { WarehouseReportData } from "./warehouse-report-data";
import type { WarehouseReportSettings } from "./warehouse-report-settings-model";
import { conditionMeta } from "./warehouse-tools";
import { ensureDirectoryExists, sanitizeFilename } from "./export-sanitizer";
import { recordGeneratedReport } from "./report-history";
import { loadSharedPdfReportLogo, pdfLogoMarkup } from "./pdf-report-logo";
import { pdfExportErrorMessage, preparePdfImageDataUri } from "./pdf-media";

function escapeHtml(value: unknown): string {
  return String(value ?? "—").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}
function table(columns: string[], rows: unknown[][]): string {
  return `<table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}">لا توجد بيانات ضمن الخيارات المختارة.</td></tr>`}</tbody></table>`;
}
function imageCell(uri: string | undefined, includeImages: boolean, inlineStyle = ""): string {
  if (!includeImages || !uri) return "—";
  return `<img src="${escapeHtml(uri)}" alt="صورة الأداة"${inlineStyle ? ` style="${inlineStyle}"` : ""} />`;
}

function toolImageProfile(settings: WarehouseReportSettings) {
  if (settings.toolDisplayMode !== "cards") return { width: settings.imageMaxWidth ?? 900, quality: settings.imageQuality ?? 0.72 };
  if (settings.toolImageCompression === "original") return { width: 1600, quality: 0.95 };
  if (settings.toolImageCompression === "compact") return { width: 720, quality: 0.55 };
  return { width: 1200, quality: 0.72 };
}

async function embeddedToolImage(uri: string | undefined, settings: WarehouseReportSettings, inlineStyle = ""): Promise<string> {
  if (!settings.includeImages || !uri) return "—";
  try {
    const profile = toolImageProfile(settings);
    return imageCell(await preparePdfImageDataUri(uri, { ...profile, prefix: "warehouse-report" }), true, inlineStyle);
  } catch {
    return "—";
  }
}
const MATERIAL_FIELDS = { name: "المادة", category: "الفئة", currentQuantity: "المتوفر", minimumQuantity: "الحد الأدنى", unit: "الوحدة", status: "الحالة", description: "الوصف" } as const;
const TOOL_FIELDS = { name: "الأداة", quantity: "الكمية", brands: "الماركات", condition: "الحالة" } as const;
const MOVEMENT_FIELDS = { movementDate: "التاريخ", itemName: "المادة", movementType: "النوع", quantity: "الكمية", notes: "الملاحظات" } as const;
function selected(columns: readonly string[], fields: Record<string, string>, row: Record<string, unknown>) { return { columns: columns.map((column) => fields[column]), row: Object.fromEntries(columns.map((column) => [fields[column], row[column] ?? "—"])) }; }

function toolCardImageStyle(settings: WarehouseReportSettings): string {
  const size = settings.toolImageSize ?? "medium";
  const dimensions = size === "small" ? "width:88px;height:72px;" : size === "large" ? "width:100%;height:188px;" : "width:100%;height:124px;";
  const fit = settings.toolImageFit === "width" ? "object-fit:contain;height:auto;max-height:188px;background:#f8fafc;" : settings.toolImageFit === "height" ? "object-fit:contain;width:auto;max-width:100%;" : "object-fit:cover;";
  return `${dimensions}${fit}display:block;margin:0 auto 9px;border:1px solid #dce7f8;border-radius:9px;`;
}

async function toolCards(data: WarehouseReportData, settings: WarehouseReportSettings): Promise<string> {
  const grid = settings.toolCardLayout === "full" ? "grid-template-columns:1fr;" : "grid-template-columns:repeat(2,1fr);";
  const cards: string[] = [];
  for (const [index, tool] of data.tools.entries()) {
    const condition = conditionMeta(tool.condition);
    const values: Record<string, string | number> = { name: tool.name, quantity: tool.quantity, brands: tool.brandNames.join("، ") || "—", condition: condition.label };
    const details = settings.toolColumns.map((column) => `<div style="padding:6px;background:#f7faff;border-radius:8px;min-width:0"><span style="display:block;font-size:8px;color:#64748b">${escapeHtml(TOOL_FIELDS[column])}</span><strong style="display:block;font-size:9px;color:#172033;margin-top:2px;word-break:break-word">${escapeHtml(values[column])}</strong></div>`).join("");
    const image = settings.includeImages ? await embeddedToolImage(tool.imageUri, settings, toolCardImageStyle(settings)) : "";
    cards.push(`<article style="border:1px solid #dce7f8;border-radius:15px;padding:10px;background:#fff;break-inside:avoid"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span style="display:flex;align-items:center;justify-content:center;width:25px;height:25px;border-radius:9px;background:#f7faff;color:#1A56DB;font-weight:bold">${index + 1}</span><div style="flex:1"><span style="font-size:8px;color:#1A56DB;font-weight:bold">أداة مستودع</span><h4 style="font-size:12px;color:#172033;margin:2px 0 0">${escapeHtml(tool.name)}</h4></div><span style="font-size:9px;font-weight:bold;color:${condition.color};background:${condition.color}18;padding:5px 7px;border-radius:999px">${escapeHtml(condition.label)}</span></div>${image === "—" ? "" : image}<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:5px">${details}</div></article>`);
  }
  return `<div style="display:grid;${grid}gap:9px">${cards.join("")}</div>`;
}

async function reportHtml(data: WarehouseReportData, settings: WarehouseReportSettings, logoMarkup = ""): Promise<string> {
  const summary = [
    settings.includeMaterials ? `<div><strong>${data.materials.length}</strong><span>مواد</span></div>` : "",
    settings.includeTools ? `<div><strong>${data.tools.length}</strong><span>أدوات</span></div>` : "",
    settings.includeMovements ? `<div><strong>${data.movements.length}</strong><span>حركات</span></div>` : "",
  ].join("");
  const materials = settings.includeMaterials ? `<section><h2>المواد</h2>${table(selected(settings.materialColumns, MATERIAL_FIELDS, {}).columns, data.materials.map((item) => settings.materialColumns.map((column) => escapeHtml({ name: item.name, category: item.categoryLabel, currentQuantity: item.currentQuantityLabel, minimumQuantity: item.minimumQuantityLabel, unit: item.piecesPerPackage && item.piecesPerPackage > 1 ? `طرد (${item.piecesPerPackage} قطعة)` : item.unit, status: item.status, description: item.description || "—" }[column]))))}</section>` : "";
  const toolRows: string[][] = [];
  if (settings.includeTools && settings.toolDisplayMode !== "cards") {
    for (const tool of data.tools) {
      const values = { name: tool.name, quantity: tool.quantity, brands: tool.brandNames.join("، ") || "—", condition: conditionMeta(tool.condition).label };
      const row = settings.toolColumns.map((column) => escapeHtml(values[column]));
      if (settings.includeImages) row.push(await embeddedToolImage(tool.imageUri, settings));
      toolRows.push(row);
    }
  }
  const tools = settings.includeTools ? `<section><h2>الأدوات</h2>${settings.toolDisplayMode === "cards" ? await toolCards(data, settings) : table([...selected(settings.toolColumns, TOOL_FIELDS, {}).columns, ...(settings.includeImages ? ["الصورة"] : [])], toolRows)}</section>` : "";
  const movements = settings.includeMovements ? `<section><h2>سجل الحركة</h2>${table(selected(settings.movementColumns, MOVEMENT_FIELDS, {}).columns, data.movements.map((movement) => settings.movementColumns.map((column) => escapeHtml({ movementDate: movement.movementDate, itemName: movement.itemName, movementType: movement.movementType === "in" ? "إدخال" : "إخراج", quantity: movement.quantityLabel, notes: movement.notes || "—" }[column]))))}</section>` : "";
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
  if (settings.includeMaterials) { const columns = selected(settings.materialColumns, MATERIAL_FIELDS, {}).columns; XLSX.utils.book_append_sheet(workbook, sheet(data.materials.map((item) => selected(settings.materialColumns, MATERIAL_FIELDS, { name: item.name, category: item.categoryLabel, currentQuantity: item.currentQuantityLabel, minimumQuantity: item.minimumQuantityLabel, unit: item.piecesPerPackage && item.piecesPerPackage > 1 ? `طرد (${item.piecesPerPackage} قطعة)` : item.unit, status: item.status, description: item.description || "—" }).row), columns), "المواد"); }
  if (settings.includeTools) { const columns = [...selected(settings.toolColumns, TOOL_FIELDS, {}).columns, ...(settings.includeImages ? ["الصورة المرفقة"] : [])]; XLSX.utils.book_append_sheet(workbook, sheet(data.tools.map((tool) => ({ ...selected(settings.toolColumns, TOOL_FIELDS, { name: tool.name, quantity: tool.quantity, brands: tool.brandNames.join("، ") || "—", condition: conditionMeta(tool.condition).label }).row, ...(settings.includeImages ? { "الصورة المرفقة": tool.imageUri ? "نعم" : "لا" } : {}) })), columns), "الأدوات"); }
  if (settings.includeMovements) { const columns = selected(settings.movementColumns, MOVEMENT_FIELDS, {}).columns; XLSX.utils.book_append_sheet(workbook, sheet(data.movements.map((movement) => selected(settings.movementColumns, MOVEMENT_FIELDS, { movementDate: movement.movementDate, itemName: movement.itemName, movementType: movement.movementType === "in" ? "إدخال" : "إخراج", quantity: movement.quantityLabel, notes: movement.notes || "—" }).row), columns), "الحركة"); }
  return XLSX.write(workbook, { bookType: "xlsx", type: "base64", compression: true }) as string;
}
async function destination(extension: "pdf" | "xlsx") { if (!FileSystem.documentDirectory) throw new Error("تعذر الوصول إلى مجلد المستندات"); const directory = `${FileSystem.documentDirectory}reports/`; if (!(await ensureDirectoryExists(directory))) throw new Error("تعذر إنشاء مجلد التقارير"); const filename = sanitizeFilename(`تقرير_المستودع_${Date.now()}`, extension); return { uri: `${directory}${filename}`, filename }; }
async function shareAndRecord(uri: string, filename: string, type: "PDF" | "XLSX") { const info = await FileSystem.getInfoAsync(uri); if (!info.exists || info.isDirectory || !info.size) throw new Error("لم يتم اعتماد ملف التقرير"); await recordGeneratedReport({ title: filename, type, uri, size: info.size }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: type === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: "مشاركة تقرير المستودع" }); else Alert.alert("تم الحفظ", `حُفظ التقرير داخل مجلد التقارير بالتطبيق:\n${filename}`); }
export async function exportWarehouseReport(format: "pdf" | "excel", data: WarehouseReportData, settings: WarehouseReportSettings): Promise<void> { if (!data.materials.length && !data.tools.length && !data.movements.length) { Alert.alert("تنبيه", "لا توجد بيانات ضمن خيارات التقرير المختارة."); return; } if (Platform.OS === "web") { Alert.alert("التصدير من الويب", "تصدير تقارير المستودع متاح في تطبيق الهاتف."); return; } try { if (format === "pdf") { const generated = await Print.printToFileAsync({ html: await reportHtml(data, settings, pdfLogoMarkup(await loadSharedPdfReportLogo())) }); const { uri, filename } = await destination("pdf"); await FileSystem.copyAsync({ from: generated.uri, to: uri }); await shareAndRecord(uri, filename, "PDF"); } else { const { uri, filename } = await destination("xlsx"); await FileSystem.writeAsStringAsync(uri, workbookBase64(data, settings), { encoding: FileSystem.EncodingType.Base64 }); await shareAndRecord(uri, filename, "XLSX"); } } catch (error) { Alert.alert(`فشل تصدير ${format === "pdf" ? "PDF" : "Excel"}`, format === "pdf" ? pdfExportErrorMessage(error) : error instanceof Error ? error.message : "خطأ غير معروف"); } }
