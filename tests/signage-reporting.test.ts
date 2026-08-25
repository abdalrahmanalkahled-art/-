import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildSignageReportData } from "../lib/signage-report-data";
import { roadsideContractsToReportBoards } from "../lib/roadside-contract-report";
import { normalizeSignageReportSettings } from "../lib/signage-report-settings-model";
import { orderBoardsForReport } from "../lib/signage-report-layout";

const moduleSource = readFileSync(resolve(process.cwd(), "components/modules/signage-module.tsx"), "utf8");
const detailsSource = readFileSync(resolve(process.cwd(), "components/signage/signage-details-tab.tsx"), "utf8");
const settingsSource = readFileSync(resolve(process.cwd(), "components/signage-report-settings-sheet.tsx"), "utf8");
const exporterSource = readFileSync(resolve(process.cwd(), "lib/signage-report-exporter.ts"), "utf8");
const pdfMediaSource = readFileSync(resolve(process.cwd(), "lib/pdf-media.ts"), "utf8");
const archiveSource = readFileSync(resolve(process.cwd(), "app/roadside-contract-archive.tsx"), "utf8");
const storageManagerSource = readFileSync(resolve(process.cwd(), "lib/storage-space-manager.ts"), "utf8");
const storageDetailSource = readFileSync(resolve(process.cwd(), "lib/storage-detail-manager.ts"), "utf8");
const storageScreenSource = readFileSync(resolve(process.cwd(), "app/storage-details/[bucket].tsx"), "utf8");
const successModalSource = readFileSync(resolve(process.cwd(), "components/success-modal.tsx"), "utf8");

describe("تقارير اللوحات والأعمال الإعلانية", () => {
  it("يطبع الإعدادات القديمة ويحوّل حجم الصورة المدمج إلى الحجم الصغير الجديد", () => {
    expect(normalizeSignageReportSettings({ reportScope: "works", imageSize: "compact", includeImages: false, region: "دمشق", brand: "مدار" })).toMatchObject({ reportScope: "works", imageSize: "small", includeImages: false, region: "دمشق", brand: "مدار", includeStands: true });
  });

  it("يبني نطاق التقرير دون تكاليف ويطبق الفترة والفلاتر على الأصول المناسبة", () => {
    const settings = normalizeSignageReportSettings({ reportScope: "boards", dateRangeMode: "selected", startDate: "2026-08-10", endDate: "2026-08-20", region: "دمشق", brand: "مدار" });
    const report = buildSignageReportData([{ id: "b-in", type: "road", brand: "مدار", region: "دمشق", installDate: "2026-08-15" }, { id: "b-out", type: "wall", brand: "مدار", region: "دمشق", installDate: "2026-08-25" }], [{ id: "s1", condition: "good", brand: "مدار", region: "دمشق", installDate: "2026-08-15" }], settings);
    expect(report.signages.map((item) => item.id)).toEqual(["b-in"]);
    expect(report.stands.map((item) => item.id)).toEqual(["s1"]);
    expect(JSON.stringify(report)).not.toContain("cost");
  });

  it("يحافظ على بيانات الأرفف والسيارات عند بناء تقرير الأعمال", () => {
    const report = buildSignageReportData([], [{ id: "s1", brand: "مدار", region: "دمشق", condition: "good", installDate: "2026-08-19" }], normalizeSignageReportSettings({ reportScope: "works", region: "دمشق", brand: "مدار" }), { shelves: [{ id: "sh1", storeName: "متجر", region: "دمشق", installDate: "2026-08-19", brandAllocations: [{ brand: "مدار", shelfCount: 3 }] }], vehicles: [{ id: "v1", brand: "مدار", vehicleNumber: "123", installDate: "2026-08-19", images: { right: "r", left: "l", front: "f", back: "b" } }] });
    expect(report.shelves).toHaveLength(1);
    expect(report.vehicles).toHaveLength(0);
    expect(report.shelvesByBrand).toEqual({ "مدار": 3 });
  });

  it("يطبّق فلتر عقد محدد على تقرير اللوحات ويعرض اسمه ضمن نطاق التقرير", () => {
    const settings = normalizeSignageReportSettings({ reportScope: "boards", contractId: "contract-1", contractName: "عقد الشركة الأولى" });
    const report = buildSignageReportData([{ id: "board-1", contractId: "contract-1", type: "road", installDate: "2026-08-19" }, { id: "board-2", contractId: "contract-2", type: "road", installDate: "2026-08-19" }, { id: "store-board", type: "store", installDate: "2026-08-19" }], [], settings);
    expect(report.signages.map((item) => item.id)).toEqual(["board-1"]);
    expect(report.filterScopeLabel).toContain("عقد الشركة الأولى");
  });

  it("يرتب اللوحات ذات الوجه الواحد أولاً ويجعل اللوحات ذات الوجهين بعرض صف كامل ضمن الشبكة", () => {
    const ordered = orderBoardsForReport([{ id: "two", type: "road", sides: 2, installDate: "2026-08-21" }, { id: "one", type: "road", sides: 1, installDate: "2026-08-21" }, { id: "one-default", type: "road", installDate: "2026-08-21" }]);
    expect(ordered.map((board) => board.id)).toEqual(["one", "one-default", "two"]);
    expect(exporterSource).toContain("two-sided-board");
    expect(exporterSource).toContain("grid-column:1 / -1");
  });

  it("يدعم اختيار عدة عقود ويحتفظ بإعدادات إخفاء التواريخ وبطاقات الأعمال الإعلانية", () => {
    const settings = normalizeSignageReportSettings({ reportScope: "boards", contractIds: ["contract-1", "contract-2"], contractNames: ["العقد الأول", "العقد الثاني"], includeDates: false, standCardLayout: "full", imageFit: "height" });
    const report = buildSignageReportData([{ id: "board-1", contractId: "contract-1", type: "road", installDate: "2026-08-19" }, { id: "board-2", contractId: "contract-2", type: "road", installDate: "2026-08-19" }, { id: "board-3", contractId: "contract-3", type: "road", installDate: "2026-08-19" }], [], settings);
    expect(settings).toMatchObject({ contractIds: ["contract-1", "contract-2"], includeDates: false, standCardLayout: "full", imageFit: "height" });
    expect(report.signages.map((item) => item.id)).toEqual(["board-1", "board-2"]);
    expect(report.filterScopeLabel).toContain("العقود: 2");
  });

  it("يحوّل العقود المؤرشفة إلى بطاقات قابلة للتقرير مع الاحتفاظ بالصور والأبعاد والوجهين", () => {
    const boards = roadsideContractsToReportBoards([{ id: "archive-1", name: "عقد مؤرشف", type: "road", totalBoards: 1, ownerCompany: "الشركة", startDate: "2026-01-01", endDate: "2026-02-01", status: "renewed", boards: [{ id: "board-1", contractId: "archive-1", region: "دمشق", brand: "مدار", frontBrand: "مدار", backBrand: "منافس", sides: 2, widthCm: 200, heightCm: 100, frontImageUri: "front", backImageUri: "back", createdAt: "2026-01-01" }], createdAt: "2026-01-01", updatedAt: "2026-02-01" }]);
    expect(boards).toMatchObject([{ contractId: "archive-1", contractName: "عقد مؤرشف", brand: "مدار", backBrand: "منافس", sides: 2, widthCm: 200, heightCm: 100, frontImageUri: "front", backImageUri: "back" }]);
  });

  it("يفصل أزرار وإعدادات تقارير اللوحات عن تقارير الأعمال الإعلانية", () => {
    expect(moduleSource).toContain('setReportSettingsOpen("boards")');
    expect(moduleSource).toContain('setReportSettingsOpen("works")');
    expect(moduleSource).toContain('exportReport("boards", "pdf")');
    expect(moduleSource).toContain('exportReport("works", "pdf")');
    expect(moduleSource).toContain("boardReportSettings");
    expect(moduleSource).toContain("workReportSettings");
  });

  it("يقدّم في صفحة التفاصيل مدخل تقرير مستقل لكل قسم", () => {
    expect(detailsSource).toContain("تقرير اللوحات والعقود");
    expect(detailsSource).toContain("تقرير الأعمال الإعلانية");
    expect(detailsSource).toContain("onExport(section, \"pdf\")");
    expect(detailsSource).toContain("FilterPickerModal");
  });

  it("ينشئ PDF بصيغة بطاقات بصرية ويضمّن الصور الفعلية والعقد ثم اللوحات", () => {
    expect(exporterSource).toContain("contractGroup");
    expect(exporterSource).toContain("boardCard");
    expect(exporterSource).toContain("asset-card");
    expect(exporterSource).toContain("preparePdfData");
    expect(exporterSource).toContain("preparePdfImageDataUri");
    expect(pdfMediaSource).toContain("FileSystem.readAsStringAsync");
    expect(exporterSource).toContain("سيارة معلنة");
    expect(exporterSource).not.toContain("<table>");
  });

  it("يوفر إعدادات تفصيلية للمحتوى وحجم الصور ونوافذ مستقلة لاختيار المنطقة والماركة", () => {
    expect(settingsSource).toContain("بطاقة تفاصيل العقد");
    expect(settingsSource).toContain("المساحة المخصصة للصورة داخل البطاقة");
    expect(settingsSource).toContain('value: "small"');
    expect(settingsSource).toContain('value: "medium"');
    expect(settingsSource).toContain('value: "large"');
    expect(settingsSource).toContain("اختيار منطقة التقرير");
    expect(settingsSource).toContain("اختيار ماركة التقرير");
    expect(settingsSource).toContain("FilterSelector");
  });

  it("يوفر اختيار العقد وإعداد عرض بطاقة اللوحة وخيار إظهار الشركة المالكة", () => {
    expect(settingsSource).toContain("عقود التقرير");
    expect(settingsSource).toContain("اختيار عقود التقرير");
    expect(settingsSource).toContain("تخطيط بطاقات الأصول");
    expect(settingsSource).toContain("بطاقة واحدة في الصف");
    expect(settingsSource).toContain("اسم الشركة المالكة");
    expect(exporterSource).toContain("cards.one-column");
    expect(exporterSource).toContain("includeOwnerCompany");
  });

  it("يوفر اختيار عقود متعدد وإعدادات تواريخ وملاءمة صور وتخطيط بطاقات الأعمال الإعلانية", () => {
    expect(settingsSource).toContain("اختيار عقود التقرير");
    expect(settingsSource).toContain("كل العقود");
    expect(settingsSource).toContain("تواريخ البطاقات");
    expect(settingsSource).toContain("بطاقة واحدة في الصف");
    expect(settingsSource).toContain("ملاءمة الصورة ضمن المساحة");
    expect(settingsSource).toContain("ملاءمة العرض");
    expect(settingsSource).toContain("ملاءمة الطول");
    expect(settingsSource).toContain("ملاءمة مساحة البطاقة");
    expect(exporterSource).toContain("standCardLayout");
    expect(exporterSource).toContain("fit-width");
    expect(exporterSource).toContain("fit-height");
    expect(exporterSource).toContain("fit-card");
    expect(exporterSource).toContain("includeDates");
  });

  it("يتيح من الأرشيف تصدير PDF وExcel وفتح نفس إعدادات تقرير اللوحات", () => {
    expect(archiveSource).toContain("exportArchiveReport");
    expect(archiveSource).toContain('<ReportFab module="signage"');
    expect(archiveSource).toContain('onExport={(format) => void exportArchiveReport(format)}');
    expect(archiveSource).toContain("SignageReportSettingsSheet");
    expect(archiveSource).toContain("تقرير أرشيف عقود اللوحات");
    expect(archiveSource).toContain("roadsideContractsToReportBoards");
  });

  it("يحفظ نطاق الأرشيف بإعدادات مستقلة ويعامله كمحتوى لوحات لا كأعمال إعلانية", () => {
    expect(normalizeSignageReportSettings({ includeDates: false, contractIds: ["archive-1"] }, "archive")).toMatchObject({ reportScope: "archive", includeDates: false, contractIds: ["archive-1"], includeSignages: true });
    expect(exporterSource).toContain('settings.reportScope !== "works"');
    expect(archiveSource).toContain('loadSignageReportSettings("archive")');
    expect(archiveSource).toContain('reportScope: "archive"');
  });

  it("يفصل مساحة الصورة عن ارتفاع البطاقة ويوفر ضغطاً اختيارياً للصور", () => {
    expect(normalizeSignageReportSettings({ boardCardLayout: "full", imageCompression: "compact" })).toMatchObject({ boardCardLayout: "full", imageCompression: "compact" });
    expect(settingsSource).toContain("جودة وحجم ملف PDF");
    expect(settingsSource).toContain("الجودة الأصلية");
    expect(settingsSource).toContain("ضغط متوازن");
    expect(settingsSource).toContain("ضغط أعلى");
    expect(exporterSource).toContain("frameHeight");
    expect(exporterSource).toContain("max-height:calc(100% - 13px)");
    expect(exporterSource).toContain("preparePdfImageDataUri");
    expect(exporterSource).toContain("imageCompression");
    expect(pdfMediaSource).toContain("ImageManipulator.manipulateAsync");
    expect(pdfMediaSource).toContain("FileSystem.deleteAsync");
  });

  it("يجمع تخطيط البطاقات وملاءمة الصور ومساحة العرض والضغط داخل إعدادات الوسائط", () => {
    expect(settingsSource).toContain("تخطيط بطاقات الأصول");
    expect(settingsSource).toContain("المساحة المخصصة للصورة داخل البطاقة");
    expect(settingsSource).toContain("ملاءمة الصورة ضمن المساحة");
    expect(settingsSource).toContain("جودة وحجم ملف PDF");
    expect(exporterSource).toContain("figureStyle");
    expect(exporterSource).toContain("height:${frameHeight}px");
    expect(exporterSource).toContain("object-fit:contain");
    expect(exporterSource).toContain("padding:0 10px 4px");
    expect(exporterSource).toContain("width:100%;height:auto;object-fit:contain;");
    expect(exporterSource).toContain('settings.imageFit === "height"');
    expect(exporterSource).toContain("${selectedFrame}padding:6px 10px 4px");
    expect(exporterSource).toContain("width:100%;height:100%;object-fit:cover;");
    expect(exporterSource).toContain('settings.imageSize === "large"');
    expect(exporterSource).toContain("aspect-ratio:16 / 9");
  });

  it("يحفظ صور اللوحات والستاندات والأرشيف كوسائط دائمة ويعرضها في إدارة التخزين دون تنظيف تلقائي", () => {
    expect(moduleSource).toContain("persistSignageMediaUri");
    expect(moduleSource).toContain("persistRoadsideDraftMedia");
    expect(archiveSource).toContain("persistSignageMediaUri");
    expect(storageManagerSource).toContain('relative.startsWith("signage-media/")');
    expect(storageManagerSource).not.toContain('"signage-media/",');
    expect(storageDetailSource).toContain("listStorageSignageMedia");
    expect(storageDetailSource).toContain("deleteStorageSignageMedia");
    expect(storageScreenSource).toContain("signageMedia");
    expect(storageScreenSource).toContain("وسائط اللوحات والستاندات");
  });

  it("يوحّد الزر العائم وإعدادات التقرير ونوافذ النجاح مع نمط التحليلات المتقدمة", () => {
    expect(moduleSource).toContain("SignageFab");
    expect(moduleSource).toContain("الأعمال الإعلانية");
    expect(moduleSource).toContain("تقرير اللوحات");
    expect(moduleSource).toContain("إعدادات التقرير");
    expect(settingsSource).toContain("جارٍ الحفظ...");
    expect(settingsSource).toContain('keyboardDismissMode="none"');
    expect(successModalSource).toContain("statusBarTranslucent");
  });
});
