import JSZip from "jszip";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildAdvancedAnalyticsPptx } from "@/lib/advanced-analytics-pptx-exporter";
import type { AnalyticsReportData } from "@/lib/advanced-analytics-report";
import { buildMarketingPlanPptx } from "@/lib/marketing-plan-pptx-exporter";
import { limitPptxMediaCandidates, writePptxBase64 } from "@/lib/pptx-report-kit";
import { createDefaultPptxReportSettings } from "@/lib/pptx-report-settings";

const ANALYTICS_SECTIONS = ["overview", "presence", "categories", "decisions", "marketing", "productDetails", "details"].map((key) => ({ key, label: key, description: key }));
const PLAN_SECTIONS = ["overview", "progress", "events", "impact", "details"].map((key) => ({ key, label: key, description: key }));

const analyticsReport: AnalyticsReportData = {
  title: "تحليلات تجريبية", generatedAt: "2026-08-25", scope: { analysisName: "تحليل الاستبيانات", templateName: "استبيان", cycleName: "دورة 1", brandName: "ماركة أ", regionName: "دمشق", storeName: "كل المحلات" },
  summary: [{ label: "المحلات", value: "12" }, { label: "متوسط منتجاتنا", value: "75%" }],
  cycleRows: [{ الدورة: "دورة 1", "تاريخ البداية": "2026-08-01", "تاريخ النهاية": "2026-08-05", الصنف: "مشروبات", المنتج: "منتج أ", "نسبة التواجد": "75%", "عدد مرات التواجد": 9, "إجمالي الرصد": 12 }],
  marketingRows: [{ البند: "إجمالي المستفيدين", الإجمالي: "120" }],
  marketingEvents: [{ الفعالية: "فعالية تجريبية", الحالة: "مكتملة", التاريخ: "2026-08-03", المنطقة: "دمشق", الماركة: "ماركة أ", المستفيدون: "120", الهدايا: "80", الهدف: "هدف أ" }],
  marketingGoals: [{ الهدف: "هدف أ", الماركة: "ماركة أ", الحالة: "في المسار", الفترة: "شهري", المؤشر: "حضور", الإنجاز: "60%", "عدد الفعاليات المرتبطة": "1" }],
  marketingSignages: [], marketingStands: [], studiedStores: [], decisionIndicators: [{ label: "تغطية المحلات", value: "80%", detail: "12 من 15 محل" }], dataWarnings: [], categorySourceAverages: [{ الصنف: "مشروبات", "متوسط منتجاتنا": "75%", "متوسط المنافسين": "55%", "طريقة الحساب": "متوسط متساوٍ" }],
};

describe("تصدير PowerPoint المحلي", () => {
  it("ينشئ عرض تحليلات 16:9 يحتوي على شرائح وانتقال تلاشي تلقائي", async () => {
    const settings = createDefaultPptxReportSettings("عرض التحليلات", ANALYTICS_SECTIONS);
    const base64 = await writePptxBase64(buildAdvancedAnalyticsPptx(analyticsReport, settings), true, 8);
    const zip = await JSZip.loadAsync(base64, { base64: true });
    const presentation = await zip.file("ppt/presentation.xml")?.async("string");
    const cover = await zip.file("ppt/slides/slide1.xml")?.async("string");
    expect(presentation).toContain('cx="12192000"');
    expect(presentation).toContain('cy="6858000"');
    expect(Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).length).toBeGreaterThan(4);
    expect(cover).toContain('<p:transition');
    expect(cover).toContain('<p:fade/>');
    const root = await mkdtemp(join(tmpdir(), "madar-pptx-report-"));
    const outputPath = join(root, "analytics.pptx");
    const reopenedDirectory = join(root, "reopened");
    try {
      await mkdir(reopenedDirectory);
      await writeFile(outputPath, Buffer.from(base64, "base64"));
      execFileSync("libreoffice", ["--headless", "--convert-to", "pptx", "--outdir", reopenedDirectory, outputPath], { timeout: 20000, stdio: "pipe" });
      expect(existsSync(join(reopenedDirectory, "analytics.pptx"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 30000);

  it("ينشئ عرض الخطة 16:9 بالمؤشرات والفعاليات المرتبطة", async () => {
    const settings = createDefaultPptxReportSettings("عرض الخطة", PLAN_SECTIONS);
    const base64 = await writePptxBase64(buildMarketingPlanPptx([{ id: "goal-1", title: "رفع التغطية", brandName: "ماركة أ", description: "هدف", period: "monthly", startDate: "2026-08-01", endDate: "2026-08-31", kpi: "عدد الحضور", targetValue: 200, currentValue: 120, completionPercentage: 60, status: "on_track" }], [{ id: "event-1", title: "فعالية تجريبية", eventDate: "2026-08-03", region: "دمشق", status: "completed", attendeesCount: 120, giftsDistributed: 80, goalId: "goal-1" }], settings), true, 5);
    const zip = await JSZip.loadAsync(base64, { base64: true });
    const content = await Promise.all(Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).map((path) => zip.file(path)?.async("string")));
    expect(content.join("\n")).toContain("رفع التغطية");
    expect(content.join("\n")).toContain("فعالية تجريبية");
    expect(content.some((slide) => slide?.includes('<p:transition'))).toBe(true);
  }, 30000);

  it("يقسم تفاصيل صنف يضم عشرين منتجاً إلى شرائح متتابعة من دون إدراج المحلات", async () => {
    const report: AnalyticsReportData = { ...analyticsReport, marketingRows: [], marketingEvents: [], marketingGoals: [], cycleRows: Array.from({ length: 20 }, (_, index) => ({ الدورة: "دورة 1", "تاريخ البداية": "2026-08-01", "تاريخ النهاية": "2026-08-05", الصنف: "المشروبات", المنتج: `منتج ${index + 1}`, "نسبة التواجد": `${40 + index}%`, "عدد مرات التواجد": 4 + index, "إجمالي الرصد": 20 })) };
    const settings = createDefaultPptxReportSettings("تفاصيل الأصناف", ANALYTICS_SECTIONS);
    const base64 = await writePptxBase64(buildAdvancedAnalyticsPptx(report, settings), false, 8);
    const zip = await JSZip.loadAsync(base64, { base64: true });
    const slides = await Promise.all(Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).map((path) => zip.file(path)?.async("string")));
    const content = slides.join("\n");
    expect(slides.length).toBeGreaterThanOrEqual(9);
    expect(content).toContain("منتج 1");
    expect(content).toContain("منتج 20");
    expect(content).not.toContain("محل تجريبي");
  }, 30000);

  it("يحافظ خيار جميع الصور على كل الوسائط الفريدة بدلاً من قصها إلى حد ثابت", () => {
    const media = Array.from({ length: 12 }, (_, index) => ({ uri: `file:///photo-${index}.jpg`, title: `محل ${index}` }));
    expect(limitPptxMediaCandidates(media, "all")).toHaveLength(12);
    expect(limitPptxMediaCandidates(media, 6)).toHaveLength(6);
  });
});
