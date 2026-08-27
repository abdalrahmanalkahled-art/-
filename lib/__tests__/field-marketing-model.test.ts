import { describe, expect, it } from "vitest";
import { assessmentScore, buildCoverageGaps, buildFieldPriorities, clampScore, newestComparison } from "../field-marketing-model";

describe("أدوات التسويق الميداني", () => {
  it("يضبط درجات التقييم ويحسب متوسط جودة التنفيذ", () => {
    expect(clampScore(7)).toBe(5);
    expect(clampScore(0)).toBe(1);
    expect(assessmentScore({ visibility: 5, brandAlignment: 4, materialCondition: 3 })).toBe(4);
  });

  it("يكشف فجوة تغطية عندما لا توجد زيارة حديثة لمنطقة نشطة", () => {
    const gaps = buildCoverageGaps([{ region: "حلب" }, { region: "حلب" }, { region: "دمشق" }], [{ storeRegion: "حلب", surveyDate: "2026-08-20" }], new Date("2026-08-27"));
    expect(gaps).toContainEqual(expect.objectContaining({ region: "دمشق", status: "gap", activeStores: 1 }));
    expect(gaps).toContainEqual(expect.objectContaining({ region: "حلب", status: "covered", recentVisits: 1 }));
  });

  it("يبني أولوية واضحة لفجوة التغطية والتقييم المنخفض", () => {
    const priorities = buildFieldPriorities({ overdueTasks: [], upcomingEvents: [], coverageGaps: [{ region: "حمص", activeStores: 2, recentVisits: 0, status: "gap" }], lowQualityAssessments: [{ id: "quality-1", subjectType: "store", subjectName: "محل الورد", score: 2, visibility: 2, brandAlignment: 2, materialCondition: 2, createdAt: "2026-08-27" }] });
    expect(priorities.map((item) => item.id)).toEqual(["coverage:حمص", "quality:quality-1"]);
  });

  it("يقارن آخر زيارتين للمحل حسب نسبة التواجد", () => {
    const comparisons = newestComparison([{ storeName: "الصفوة", storeRegion: "حلب", surveyDate: "2026-08-10", data: [{ present: false }, { present: false }] }, { storeName: "الصفوة", storeRegion: "حلب", surveyDate: "2026-08-20", data: [{ present: true }, { present: false }] }]);
    expect(comparisons).toEqual([expect.objectContaining({ storeName: "الصفوة", difference: 50 })]);
  });
});
