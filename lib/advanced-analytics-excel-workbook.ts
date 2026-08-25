import * as XLSX from "xlsx-js-style";
import type { AnalyticsReportTable, AnalyticsSettings } from "./analytics-settings-model";
import type { AnalyticsReportData } from "./advanced-analytics-report";
import type { RegionMatrixData } from "./analytics-region-matrix";

function prepareSheet(sheet: XLSX.WorkSheet, widths: number[]): XLSX.WorkSheet {
  (sheet as XLSX.WorkSheet & { "!dir"?: string })["!dir"] = "rtl";
  sheet["!cols"] = widths.map((width) => ({ wch: width }));
  return sheet;
}

function buildStudiedStoresSheet(report: AnalyticsReportData): XLSX.WorkSheet {
  const productHeaders = Array.from(new Set(report.studiedStores.flatMap((row) => Object.keys(row.حالات_المواد))));
  const headers = ["اسم المحل", "التصنيف", "المنطقة", "تاريخ الزيارة", "موضع الزيارة", "رقم التواصل", "المواد المدروسة", ...productHeaders, "الملاحظات"];
  const rows = report.studiedStores.map((row) => [row["اسم المحل"], row.التصنيف, row.المنطقة, row["تاريخ الزيارة"], row["موضع الزيارة"] || "—", row["رقم التواصل"], row["المواد المدروسة"], ...productHeaders.map((product) => row.حالات_المواد[product] || "غير مدروس"), row.الملاحظات]);
  const sheet = prepareSheet(XLSX.utils.aoa_to_sheet([headers, ...rows]), headers.map((header) => header === "الملاحظات" || header === "المواد المدروسة" ? 28 : 18));
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: Math.max(rows.length, 1) } }) };
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  return sheet;
}

function matrixTone(value: number, low: number, high: number): { fill: string; color: string } {
  if (value < low) return { fill: "FEE2E2", color: "B91C1C" };
  if (value >= high) return { fill: "DCFCE7", color: "15803D" };
  return { fill: "FEF3C7", color: "B45309" };
}

function buildRegionMatrixSheet(matrix: RegionMatrixData | undefined, settings?: Pick<AnalyticsSettings, "regionMatrix">): XLSX.WorkSheet | null {
  if (!matrix?.regions.length || !matrix.products.length) return null;
  const low = settings?.regionMatrix.lowThreshold ?? 40;
  const high = settings?.regionMatrix.highThreshold ?? 70;
  const headers = ["المنطقة", ...matrix.products.map((product) => product.name)];
  const lookup = new Map(matrix.cells.map((cell) => [`${cell.region}::${cell.productId}`, cell]));
  const rows = matrix.regions.map((region) => [region, ...matrix.products.map((product) => {
    const cell = lookup.get(`${region}::${product.id}`);
    return cell ? `${cell.value}%${settings?.regionMatrix.showSampleSize === false ? "" : ` · ${cell.sampleSize} رصد`}` : "—";
  })]);
  const sheet = prepareSheet(XLSX.utils.aoa_to_sheet([headers, ...rows]), [22, ...matrix.products.map(() => 19)]);
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: Math.max(rows.length, 1) } }) };
  sheet["!freeze"] = { xSplit: 1, ySplit: 1 };
  headers.forEach((_, column) => {
    const ref = XLSX.utils.encode_cell({ c: column, r: 0 });
    if (sheet[ref]) sheet[ref].s = { fill: { fgColor: { rgb: "1F5EB8" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
  });
  matrix.regions.forEach((region, rowIndex) => {
    const row = rowIndex + 1;
    const regionRef = XLSX.utils.encode_cell({ c: 0, r: row });
    if (sheet[regionRef]) sheet[regionRef].s = { fill: { fgColor: { rgb: "F1F5F9" } }, font: { bold: true, color: { rgb: "172033" } }, alignment: { horizontal: "right", vertical: "center" } };
    matrix.products.forEach((product, productIndex) => {
      const ref = XLSX.utils.encode_cell({ c: productIndex + 1, r: row });
      const cell = lookup.get(`${region}::${product.id}`);
      if (!sheet[ref] || !cell) return;
      const tone = matrixTone(cell.value, low, high);
      sheet[ref].s = { fill: { fgColor: { rgb: tone.fill } }, font: { bold: true, color: { rgb: tone.color } }, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
    });
  });
  sheet["!rows"] = [{ hpt: 26 }, ...matrix.regions.map(() => ({ hpt: 34 }))];
  return sheet;
}

function appendUniqueSheet(workbook: XLSX.WorkBook, sheet: XLSX.WorkSheet, preferredName: string): void {
  const cleaned = preferredName.replace(/[\\/:?*\[\]]/g, " ").trim() || "مصفوفة";
  let name = cleaned.slice(0, 31);
  let index = 2;
  while (workbook.SheetNames.includes(name)) {
    const suffix = ` (${index})`;
    name = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

export function buildAdvancedAnalyticsWorkbook(report: AnalyticsReportData, settings?: Pick<AnalyticsSettings, "reportTables" | "regionMatrix" | "reportSectionOrder">): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  const overviewRows = [
    [report.title, ""],
    ["تاريخ الإنشاء", report.generatedAt],
    ["نوع التحليل", report.scope.analysisName],
    ["الاستبيان", report.scope.templateName],
    ["الدورة", report.scope.cycleName],
    ["الماركة", report.scope.brandName],
    ["المنطقة", report.scope.regionName],
    ["المحل", report.scope.storeName],
    ["غرض التقرير", report.scope.reportPurpose || "تنفيذي"],
    ["طريقة القياس", report.scope.presenceBasis || "زيارات ميدانية"],
    ["مرجع المقارنة", report.scope.comparisonReference || "الدورة السابقة"],
    [],
    ["المؤشر", "القيمة"],
    ...report.summary.map((item) => [item.label, item.value]),
  ];
  const overview = prepareSheet(XLSX.utils.aoa_to_sheet(overviewRows), [26, 28]);
  overview["!freeze"] = { xSplit: 0, ySplit: 10 };
  XLSX.utils.book_append_sheet(workbook, overview, "ملخص التحليل");

  const appendSections: Record<AnalyticsReportTable, () => void> = {
    productDetails: () => { if (settings?.reportTables.productDetails === false) return; const details = prepareSheet(XLSX.utils.json_to_sheet(report.cycleRows, { header: ["الدورة", "تاريخ البداية", "تاريخ النهاية", "الصنف", "المنتج", "نسبة التواجد", "عدد مرات التواجد", "إجمالي الرصد", "متوسط نسبة الظهور", "متوسط السعر"] }), [27, 16, 16, 18, 25, 15, 18, 16, 18, 16]); details["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 9, r: Math.max(report.cycleRows.length, 1) } }) }; details["!freeze"] = { xSplit: 0, ySplit: 1 }; XLSX.utils.book_append_sheet(workbook, details, "الدورات والمنتجات"); if (report.categorySourceAverages.length) { const averages = prepareSheet(XLSX.utils.json_to_sheet(report.categorySourceAverages, { header: ["الصنف", "متوسط منتجاتنا", "متوسط المنافسين", "طريقة الحساب"] }), [24, 21, 21, 18]); averages["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 3, r: report.categorySourceAverages.length } }) }; averages["!freeze"] = { xSplit: 0, ySplit: 1 }; XLSX.utils.book_append_sheet(workbook, averages, "متوسطات الأصناف"); } },
    studiedStores: () => { if (settings?.reportTables.studiedStores !== false && report.studiedStores.length) XLSX.utils.book_append_sheet(workbook, buildStudiedStoresSheet(report), "المحلات المدروسة"); },
    marketing: () => { if (settings?.reportTables.marketing !== false && report.marketingRows.length) { const marketing = prepareSheet(XLSX.utils.json_to_sheet(report.marketingRows, { header: ["البند", "الإجمالي"] }), [34, 22]); XLSX.utils.book_append_sheet(workbook, marketing, "ملخص تسويقي"); if (report.marketingEvents.length) XLSX.utils.book_append_sheet(workbook, prepareSheet(XLSX.utils.json_to_sheet(report.marketingEvents, { header: ["الفعالية", "الحالة", "التاريخ", "المنطقة", "الماركة", "المستفيدون", "الهدايا", "الهدف"] }), [26, 16, 16, 18, 18, 14, 14, 24]), "الفعاليات"); if (report.marketingGoals.length) XLSX.utils.book_append_sheet(workbook, prepareSheet(XLSX.utils.json_to_sheet(report.marketingGoals, { header: ["الهدف", "الماركة", "الحالة", "الفترة", "المؤشر", "الإنجاز", "عدد الفعاليات المرتبطة"] }), [28, 18, 16, 16, 26, 14, 20]), "الأهداف المرتبطة"); if (report.marketingSignages.length) XLSX.utils.book_append_sheet(workbook, prepareSheet(XLSX.utils.json_to_sheet(report.marketingSignages, { header: ["اللوحة", "النوع", "الماركة", "المنطقة", "الموقع", "الحالة", "نهاية العقد"] }), [28, 18, 18, 18, 26, 15, 18]), "اللوحات"); if (report.marketingStands.length) XLSX.utils.book_append_sheet(workbook, prepareSheet(XLSX.utils.json_to_sheet(report.marketingStands, { header: ["الستاند", "الماركة", "المحل", "الحالة", "تاريخ التركيب", "سجل الصيانة"] }), [28, 18, 24, 18, 18, 18]), "الستاندات"); } },
    decisionIndicators: () => { if (settings?.reportTables.decisionIndicators !== false && report.decisionIndicators.length) { const indicators = prepareSheet(XLSX.utils.json_to_sheet(report.decisionIndicators, { header: ["label", "value", "detail"] }), [25, 18, 42]); XLSX.utils.book_append_sheet(workbook, indicators, "مؤشرات القرار"); } },
    dataWarnings: () => { if (settings?.reportTables.dataWarnings !== false && report.dataWarnings.length) { const warnings = prepareSheet(XLSX.utils.aoa_to_sheet([["تنبيهات جودة البيانات"], ...report.dataWarnings.map((warning) => [warning])]), [74]); XLSX.utils.book_append_sheet(workbook, warnings, "تنبيهات البيانات"); } },
    regionMatrix: () => { if (settings?.reportTables.regionMatrix !== false) { const matrix = buildRegionMatrixSheet(report.regionMatrix, settings); if (matrix) appendUniqueSheet(workbook, matrix, "مصفوفة المناطق"); (report.categoryMatrices || []).forEach((item) => { const categoryMatrix = buildRegionMatrixSheet(item.matrix, settings); if (categoryMatrix) appendUniqueSheet(workbook, categoryMatrix, `مصفوفة ${item.category}`); }); } },
  };
  const order: AnalyticsReportTable[] = settings?.reportSectionOrder?.length ? settings.reportSectionOrder : ["productDetails", "studiedStores", "marketing", "decisionIndicators", "dataWarnings", "regionMatrix"];
  order.forEach((section) => appendSections[section]());
  return workbook;
}

export function createAdvancedAnalyticsWorkbookBase64(report: AnalyticsReportData, settings?: Pick<AnalyticsSettings, "reportTables" | "regionMatrix" | "reportSectionOrder">): string {
  return XLSX.write(buildAdvancedAnalyticsWorkbook(report, settings), { bookType: "xlsx", type: "base64", compression: true }) as string;
}
