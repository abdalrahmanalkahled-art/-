import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("صفحات أدوات التنفيذ الميداني", () => {
  it("يحوّل لوحة التنفيذ إلى بطاقات دخول مستقلة", () => {
    const source = read("components/modules/field-intelligence-module.tsx");
    expect(source).toContain('<EntryCard title="مقارنة قبل وبعد"');
    expect(source).toContain('<EntryCard title="رصد المنافسين"');
    expect(source).toContain('<EntryCard title="جودة التنفيذ"');
    expect(source).toContain('router.push("/field/comparisons")');
    expect(source).toContain('router.push("/field/observations")');
    expect(source).toContain('router.push("/field/assessments")');
    expect(source).not.toContain('<Section title="مقارنة قبل وبعد"');
    expect(source).not.toContain('<Section title="رصد المنافسين"');
    expect(source).not.toContain('<Section title="جودة التنفيذ"');
  });

  it("يوفر مسارات القوائم والتفاصيل الثلاثة", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/field/comparisons.tsx"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "app/field/comparisons/[id].tsx"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "app/field/observations.tsx"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "app/field/observations/[id].tsx"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "app/field/assessments.tsx"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "app/field/assessments/[id].tsx"))).toBe(true);
  });

  it("يدعم الرصد الضغط القصير للتفاصيل والطويل للإجراءات والتحرير والحذف المؤكد", () => {
    const source = read("app/field/observations.tsx");
    expect(source).toContain("FieldRecordCard");
    expect(source).toContain("onLongPress");
    expect(source).toContain("CardActionModal");
    expect(source).toContain("تعديل الرصد");
    expect(source).toContain("ConfirmDialog");
    expect(source).toContain("حذف الرصد نهائياً");
    expect(source).toContain("removeCompetitorObservationImages");
    expect(source).toContain("STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS");
  });

  it("يدعم تقييم الجودة الضغط القصير للتفاصيل والطويل للتعديل والحذف المؤكد", () => {
    const source = read("app/field/assessments.tsx");
    expect(source).toContain("FieldRecordCard");
    expect(source).toContain("onLongPress");
    expect(source).toContain("CardActionModal");
    expect(source).toContain("تعديل التقييم");
    expect(source).toContain("ConfirmDialog");
    expect(source).toContain("حذف التقييم نهائياً");
    expect(source).toContain("STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS");
    expect(read("components/field-intelligence/assessment-editor-modal.tsx")).toContain("assessmentScore(quality)");
  });

  it("يبقي المقارنة مشتقة للعرض فقط بلا إجراءات CRUD", () => {
    const listSource = read("app/field/comparisons.tsx");
    const detailSource = read("app/field/comparisons/[id].tsx");
    expect(listSource).toContain("newestComparison");
    expect(listSource).toContain("مشتقة من نتائج الاستبيانات");
    expect(listSource).not.toContain("CardActionModal");
    expect(listSource).not.toContain("ConfirmDialog");
    expect(detailSource).toContain("beforeRatio");
    expect(detailSource).toContain("afterRatio");
    expect(detailSource).toContain("STORAGE_KEYS.SURVEY_RESULTS");
  });

  it("يقيد حذف صور الرصد بمجلده الدائم ويجعله idempotent", () => {
    const source = read("lib/competitor-observation-media.ts");
    expect(source).toContain("removeCompetitorObservationImages");
    expect(source).toContain("resolveCompetitorObservationImageUri");
    expect(source).toContain("isCompetitorObservationMediaUri");
    expect(source).toContain("idempotent: true");
    expect(read("app/field/observations/[id].tsx")).toContain("resolveCompetitorObservationImageUri");
  });
});
