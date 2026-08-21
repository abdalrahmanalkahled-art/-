import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("الشعار الموحد لتقارير PDF", () => {
  it("يستخدم مصدر الشعار المحفوظ في إعدادات الاستبيانات والدورات", () => {
    const source = projectFile("lib/pdf-report-logo.ts");
    expect(source).toContain("loadAnalyticsSettings");
    expect(source).toContain("logoUriToDataUri");
  });

  it("يطبقه على مصادر PDF الرئيسية", () => {
    ["lib/tab-report-exporter.ts", "lib/daily-report-exporter.ts", "lib/expense-report-exporter.ts", "lib/warehouse-report-exporter.ts", "lib/signage-report-exporter.ts"].forEach((path) => {
      expect(projectFile(path)).toContain("loadSharedPdfReportLogo");
      expect(projectFile(path)).toContain("pdfLogoMarkup");
    });
  });
});
