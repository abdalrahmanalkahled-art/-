import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("تحديثات الفعاليات والخطة والتقارير", () => {
  it("يعتمد نموذج الفعالية نطاق تاريخ ويعرض المسار والحالة المنتهية تلقائياً", () => {
    const events = source("app/(tabs)/events.tsx");
    expect(events).toContain('selectionMode="range"');
    expect(events).toContain("deriveEventPeriod(form.startDate, form.endDate)");
    expect(events).toContain("getEffectiveEventStatus(item)");
    expect(events).toContain("المسار المحتسب تلقائياً");
    expect(events).not.toContain("form.budget");
    expect(events).not.toContain("form.actualCost");
  });

  it("يبني تقرير الخطة من الفعاليات المرتبطة ويشمل إجمالي المستفيدين وإعداداته", () => {
    const goals = source("components/modules/goals-module.tsx");
    expect(goals).toContain("ReportFab module=\"goals\"");
    expect(goals).toContain("includeBeneficiaries");
    expect(goals).toContain("إجمالي الخطة ضمن النطاق");
    expect(goals).toContain("getGoalImpactMetrics");
  });

  it("يفتح بطاقات مركز التقارير وقوالب PowerPoint عبر عارض متوافق", () => {
    expect(source("components/modules/reports-center-module.tsx")).toContain("openFileWithCompatibleApp(report.uri, report.title)");
    expect(source("components/modules/reports-module.tsx")).toContain("openFileWithCompatibleApp(template.uri, template.name)");
  });
});
