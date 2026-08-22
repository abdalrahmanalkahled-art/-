import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { describe, expect, it } from "vitest";

import { buildMarketVisitPptx } from "../market-visit-pptx";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQmAAAAABJRU5ErkJggg==";

async function realTemplateBase64() {
  const presentation = new PptxGenJS();
  presentation.layout = "LAYOUT_WIDE";
  presentation.author = "اختبار مساعد التسويق الميداني";
  presentation.addSlide().addText("تقرير زيارة السوق — {{اسم_الدورة}}", { x: 0.8, y: 0.8, w: 10, h: 0.5, fontSize: 26, rtlMode: true });
  const visit = presentation.addSlide();
  visit.addText("{{اسم_المحل}}", { x: 7.2, y: 0.5, w: 5, h: 0.45, fontSize: 22, rtlMode: true });
  visit.addText("{{تصنيف_المحل}} — {{منطقة_المحل}}", { x: 7.2, y: 1.1, w: 5, h: 0.35, fontSize: 14, rtlMode: true });
  visit.addText("{{ملاحظات_الاستبيان}}", { x: 7.2, y: 1.65, w: 5, h: 1.2, fontSize: 12, rtlMode: true, breakLine: false });
  visit.addText("{{صورة_المحل}}", { x: 0.8, y: 1.1, w: 5.8, h: 3.6, fontSize: 12, align: "center" });
  presentation.addSlide().addText("تم الإنشاء في {{تاريخ_التقرير}}", { x: 0.8, y: 4.8, w: 10, h: 0.5, fontSize: 18, rtlMode: true });
  const content = await presentation.write({ outputType: "arraybuffer" });
  return Buffer.from(content as ArrayBuffer).toString("base64");
}

describe("توافق PowerPoint الفعلي لتقرير زيارة السوق", () => {
  it("يفتح المحرر الملف ويعيد حفظه مع صورة ثنائية مضمنة وعلاقات صالحة", async () => {
    const root = await mkdtemp(join(tmpdir(), "madar-pptx-"));
    const reopenedDirectory = join(root, "reopened");
    const outputPath = join(root, "market-visit-report.pptx");
    await mkdir(reopenedDirectory);
    try {
      const result = await buildMarketVisitPptx({
        templateBase64: await realTemplateBase64(),
        cycleName: "دورة اختبار",
        generatedAt: "2026-08-18",
        visits: [{ storeName: "محل تجريبي", category: "نخبة", region: "دمشق", notes: "ملاحظة واضحة دون رمز خفي\u200f", images: [{ base64: PNG, extension: "png" }] }],
      });
      await writeFile(outputPath, Buffer.from(result, "base64"));
      const outputZip = await JSZip.loadAsync(await readFile(outputPath));
      expect(await outputZip.file("ppt/media/market-visit-1.png")?.async("base64")).toBe(PNG);
      expect(await outputZip.file("ppt/slides/_rels/slide2.xml.rels")?.async("string")).toContain("relationships/image");

      execFileSync("libreoffice", ["--headless", "--convert-to", "pptx", "--outdir", reopenedDirectory, outputPath], { timeout: 20000, stdio: "pipe" });
      const reopenedPath = join(reopenedDirectory, "market-visit-report.pptx");
      expect(existsSync(reopenedPath)).toBe(true);
      const reopenedZip = await JSZip.loadAsync(await readFile(reopenedPath));
      expect(await reopenedZip.file("ppt/presentation.xml")?.async("string")).toContain("p:sldIdLst");
      const mediaFiles = Object.keys(reopenedZip.files).filter((path) => path.startsWith("ppt/media/"));
      expect(mediaFiles.length).toBeGreaterThan(0);
      expect((await reopenedZip.file(mediaFiles[0])?.async("uint8array"))?.length).toBeGreaterThan(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 30000);
});
