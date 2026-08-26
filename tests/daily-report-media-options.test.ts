import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dailyReportScreen = readFileSync(resolve(process.cwd(), "app/daily-report.tsx"), "utf8");
const dailyExporter = readFileSync(resolve(process.cwd(), "lib/daily-report-exporter.ts"), "utf8");
const dailyReportSettings = readFileSync(resolve(process.cwd(), "components/daily-report-settings-sheet.tsx"), "utf8");
const storePhotosEditor = readFileSync(resolve(process.cwd(), "components/surveys/store-photos-editor.tsx"), "utf8");

describe("وسائط التقرير اليومي وصور الاستبيان", () => {
  it("يتيح تضمين الوسائط أو استبعادها قبل التصدير", () => {
    expect(dailyReportScreen).toContain("includeMedia");
    expect(dailyReportScreen).toContain("بلا وسائط");
    expect(dailyReportScreen).toContain("يتضمن الوسائط");
    expect(dailyExporter).toContain("DailyReportExportOptions");
    expect(dailyExporter).toContain("options.includeMedia !== false");
    expect(dailyReportSettings).toContain("إعداد وسائط المحلات يبقى منفصلاً كما هو");
  });

  it("يعرض صورتين للمحل جنباً إلى جنب داخل التقرير", () => {
    expect(dailyExporter).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(dailyExporter).toContain('height:180px;margin:0;object-fit:cover');
  });

  it("يفصل إعدادات المحتوى ونسب الماركات عن خيار الوسائط الحالي", () => {
    expect(dailyReportScreen).toContain("المحتوى وطريقة العرض");
    expect(dailyReportSettings).toContain("نسب الماركات");
    expect(dailyExporter).toContain("brandPresenceHtml");
    expect(dailyExporter).toContain("settings.includeProductTable");
    expect(dailyExporter).toContain("settings.includeQuestionAnswers");
  });

  it("يفتح الصور للمشاهدة والتحرير من دون تفعيل داخلي أو نافذة اختيار تلقائية", () => {
    expect(storePhotosEditor).toContain("activePhotoIndex");
    expect(storePhotosEditor).toContain("معاينة وتحرير");
    expect(storePhotosEditor).toContain("ImageManipulator.manipulateAsync");
    expect(storePhotosEditor).toContain(">إضافة صور المحل</Text>");
    expect(storePhotosEditor).not.toContain("useEffect");
    expect(storePhotosEditor).not.toContain("storePhotoEnabled");
  });
});
