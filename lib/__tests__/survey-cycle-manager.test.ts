import { describe, expect, it } from "vitest";
import {
  addResultToActiveSurveyCycle,
  buildSurveyCycleName,
  closeActiveSurveyCycle,
  getSurveyCycleMetricsById,
  getActiveSurveyCycleResults,
  getSurveyCycleSummary,
  isStoreUsedInActiveSurveyCycle,
  sortSurveyCyclesNewestFirst,
} from "../survey-cycle-manager";
import type { SurveyResult, SurveyTemplate } from "../types/survey-types";

const template: SurveyTemplate = {
  id: "template-1",
  name: "دراسة مسحوق",
  createdAt: "2026-03-01T08:00:00.000Z",
  products: [],
};

function makeResult(id: string, storeId: string, surveyDate: string): SurveyResult {
  return {
    id,
    templateId: template.id,
    templateName: template.name,
    storeId,
    storeName: `محل ${storeId}`,
    storeRegion: "دمشق",
    surveyDate,
    data: [],
    createdAt: `${surveyDate}T08:00:00.000Z`,
  };
}

describe("دورات الاستبيان الزمنية", () => {
  it("يرتب الدورات المغلقة من الأحدث إلى الأقدم", () => {
    const sorted = sortSurveyCyclesNewestFirst([
      { id: "old", templateId: "template-1", templateName: "دراسة مسحوق", name: "قديمة", startDate: "2026-07-01", endDate: "2026-07-03", createdAt: "2026-07-01T10:00:00.000Z", closedAt: "2026-07-03T10:00:00.000Z", resultIds: [] },
      { id: "new", templateId: "template-1", templateName: "دراسة مسحوق", name: "حديثة", startDate: "2026-08-01", endDate: "2026-08-03", createdAt: "2026-08-01T10:00:00.000Z", closedAt: "2026-08-03T10:00:00.000Z", resultIds: [] },
    ]);

    expect(sorted.map((cycle) => cycle.id)).toEqual(["new", "old"]);
  });

  it("يستخدم وقت الإغلاق الفعلي عند تطابق تاريخ نهاية دورتين في سجل الاستبيانات", () => {
    const sorted = sortSurveyCyclesNewestFirst([
      { id: "closed-morning", templateId: "template-1", templateName: "دراسة مسحوق", name: "صباحية", startDate: "2026-08-01", endDate: "2026-08-03", createdAt: "2026-08-01T10:00:00.000Z", closedAt: "2026-08-04T08:00:00.000Z", resultIds: [] },
      { id: "closed-evening", templateId: "template-1", templateName: "دراسة مسحوق", name: "مسائية", startDate: "2026-08-01", endDate: "2026-08-03", createdAt: "2026-08-01T10:00:00.000Z", closedAt: "2026-08-04T18:00:00.000Z", resultIds: [] },
    ]);

    expect(sorted.map((cycle) => cycle.id)).toEqual(["closed-evening", "closed-morning"]);
  });

  it("يفهرس ملخصات الدورات والوسائط في مرور واحد مع احترام الصورة القديمة والجديدة", () => {
    const first = {
      ...makeResult("result-1", "store-1", "2026-03-18"),
      cycleId: "cycle-a",
      data: [
        { productId: "p-1", productName: "منتج 1", present: true },
        { productId: "p-2", productName: "منتج 2", present: false },
      ],
      storePhotoUris: ["file://one.jpg", "file://two.jpg"],
    };
    const second = {
      ...makeResult("result-2", "store-1", "2026-03-19"),
      cycleId: "cycle-a",
      data: [{ productId: "p-3", productName: "منتج 3", present: true }],
      storePhotoUri: "file://legacy.jpg",
    };
    const otherCycle = {
      ...makeResult("result-3", "store-2", "2026-03-20"),
      cycleId: "cycle-b",
      data: [],
    };

    const metrics = getSurveyCycleMetricsById([first, second, otherCycle]);

    expect(metrics.get("cycle-a")).toEqual({
      summary: { resultCount: 2, storeCount: 1, averagePresencePercentage: 67 },
      mediaCount: 3,
    });
    expect(metrics.get("cycle-b")).toEqual({
      summary: { resultCount: 1, storeCount: 1, averagePresencePercentage: 0 },
      mediaCount: 0,
    });
  });

  it("يعتبر النتائج القديمة غير الموسومة دورة نشطة واحدة ويمنع تكرار المحل فيها", () => {
    const results = [makeResult("result-1", "store-1", "2026-03-18")];

    expect(getActiveSurveyCycleResults(template.id, results, [])).toHaveLength(1);
    expect(isStoreUsedInActiveSurveyCycle(template.id, "store-1", results, [])).toBe(true);
    expect(isStoreUsedInActiveSurveyCycle(template.id, "store-2", results, [])).toBe(false);
  });

  it("يربط النتيجة الجديدة بدورة نشطة واحدة ويحتفظ بأول وآخر تاريخ", () => {
    const firstResult = makeResult("result-1", "store-1", "2026-03-18");
    const secondResult = makeResult("result-2", "store-2", "2026-04-16");
    const mutation = addResultToActiveSurveyCycle(template, secondResult, [firstResult], []);

    expect(mutation.cycles).toHaveLength(1);
    expect(mutation.cycles[0]).toMatchObject({
      templateId: template.id,
      startDate: "2026-03-18",
      endDate: "2026-04-16",
      resultIds: ["result-1", "result-2"],
    });
    expect(mutation.results.every((result) => result.cycleId === mutation.cycles[0].id)).toBe(true);
  });

  it("يغلق الدورة باسم الفترة الزمنية ويحفظ الاسم المؤرشف في كل نتيجة", () => {
    const firstResult = makeResult("result-1", "store-1", "2026-03-18");
    const secondResult = makeResult("result-2", "store-2", "2026-04-16");
    const active = addResultToActiveSurveyCycle(template, secondResult, [firstResult], []);
    const closed = closeActiveSurveyCycle(template, active.results, active.cycles, "2026-04-20T12:00:00.000Z");

    expect(closed.didClose).toBe(true);
    expect(closed.cycle?.name).toBe("دراسة مسحوق 18-3 – 16-4");
    expect(closed.results.every((result) => result.cycleName === "دراسة مسحوق 18-3 – 16-4")).toBe(true);
    expect(closed.cycle?.closedAt).toBe("2026-04-20T12:00:00.000Z");
  });

  it("يعرض تاريخاً واحداً إذا بدأت وانتهت الدورة في اليوم نفسه", () => {
    expect(buildSurveyCycleName(template.name, "2026-03-18", "2026-03-18")).toBe("دراسة مسحوق 18-3");
  });

  it("يسمح للمحل نفسه في دورة جديدة بعد إغلاق السابقة", () => {
    const first = addResultToActiveSurveyCycle(template, makeResult("result-1", "store-1", "2026-03-18"), [], []);
    const closed = closeActiveSurveyCycle(template, first.results, first.cycles, "2026-03-18T12:00:00.000Z");
    const next = addResultToActiveSurveyCycle(template, makeResult("result-2", "store-1", "2026-04-16"), closed.results, closed.cycles);

    expect(isStoreUsedInActiveSurveyCycle(template.id, "store-1", closed.results, closed.cycles)).toBe(false);
    expect(next.cycles).toHaveLength(2);
    expect(next.cycles.find((cycle) => !cycle.closedAt)?.resultIds).toEqual(["result-2"]);
  });

  it("لا يغلق دورة عندما لا توجد نتائج قابلة للأرشفة", () => {
    const outcome = closeActiveSurveyCycle(template, [], [], "2026-03-18T12:00:00.000Z");

    expect(outcome).toMatchObject({ didClose: false, reason: "no-results" });
  });

  it("يلخّص الدورة المختارة بعدد المحلات ومتوسط التواجد", () => {
    const results = [
      { ...makeResult("result-1", "store-1", "2026-03-18"), cycleId: "cycle-1", data: [{ productId: "p-1", productName: "منتج 1", present: true, shelfPercentage: 50 }, { productId: "p-2", productName: "منتج 2", present: false, shelfPercentage: 0 }] },
      { ...makeResult("result-2", "store-2", "2026-03-19"), cycleId: "cycle-1", data: [{ productId: "p-1", productName: "منتج 1", present: true, shelfPercentage: 60 }] },
      { ...makeResult("result-3", "store-3", "2026-03-20"), cycleId: "cycle-2", data: [{ productId: "p-1", productName: "منتج 1", present: false, shelfPercentage: 0 }] },
    ];

    expect(getSurveyCycleSummary("cycle-1", results)).toEqual({
      resultCount: 2,
      storeCount: 2,
      averagePresencePercentage: 67,
    });
  });
});
