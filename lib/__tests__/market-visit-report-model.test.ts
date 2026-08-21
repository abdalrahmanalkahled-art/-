import { describe, expect, it } from "vitest";

import { DEFAULT_MARKET_VISIT_REPORT_ORDER, getMarketVisitCycleResults, MARKET_VISIT_TEMPLATE_TAGS, normalizeMarketVisitPriorityOptions, pruneMarketVisitOrder, sortMarketVisitStores } from "../market-visit-report-model";

describe("نموذج تقارير زيارة السوق", () => {
  it("يوفر وسوماً قابلة للنسخ لبيانات المحل والصور والملاحظات ووسم التكرار للوضع المتقدم", () => {
    const tags = MARKET_VISIT_TEMPLATE_TAGS.map((item) => item.tag);
    expect(tags).toEqual(expect.arrayContaining(["{{اسم_المحل}}", "{{صورة_المحل}}", "{{ملاحظات_الاستبيان}}", "{{تكرار_محل}}"]));
  });

  it("يجمع كل نتائج الدورة سواء كانت مرتبطة بمعرف الدورة أو بقائمة resultIds القديمة", () => {
    const results = getMarketVisitCycleResults({ id: "cycle-a", resultIds: ["legacy-result"] }, [
      { id: "current-result", cycleId: "cycle-a" },
      { id: "legacy-result" },
      { id: "other-result", cycleId: "cycle-b" },
    ]);
    expect(results.map((result) => result.id)).toEqual(["current-result", "legacy-result"]);
  });

  it("يرتب المحلات وفق أولوية التصنيف ثم المنطقة التي يحددها المستخدم", () => {
    const ordered = sortMarketVisitStores([
      { id: "1", storeName: "محل ب", category: "عادي", region: "الشمال", surveyDate: "2026-03-02" },
      { id: "2", storeName: "محل أ", category: "نخبة", region: "الوسط", surveyDate: "2026-03-03" },
      { id: "3", storeName: "محل ج", category: "نخبة", region: "الشمال", surveyDate: "2026-03-01" },
    ], { primary: "category", categoryPriority: ["نخبة"], regionPriority: ["الشمال"] });

    expect(ordered.map((item) => item.id)).toEqual(["3", "2", "1"]);
  });

  it("يعتمد ملء مساحة الصورة كإعداد افتراضي ويمكن أن يحافظ الفرز على بيانات التقرير الإضافية", () => {
    const ordered = sortMarketVisitStores([{ id: "1", storeName: "محل", category: "نخبة", region: "الوسط", surveyDate: "2026-03-01", notes: "ملاحظة", images: [] }], DEFAULT_MARKET_VISIT_REPORT_ORDER);
    expect(DEFAULT_MARKET_VISIT_REPORT_ORDER.imageFit).toBe("fill");
    expect(ordered[0].notes).toBe("ملاحظة");
  });

  it("يزيل أولويات المناطق والتصنيفات المحذوفة كي يبدأ الترقيم من الأولوية الأولى", () => {
    const cleaned = pruneMarketVisitOrder({ primary: "category", categoryPriority: ["محذوف", "نخبة"], regionPriority: ["قديمة", "الشمال"], imageFit: "fill", imageCompression: "original" }, ["نخبة", "عادي"], ["الشمال"]);
    expect(cleaned.categoryPriority).toEqual(["نخبة"]);
    expect(cleaned.regionPriority).toEqual(["الشمال"]);
    expect(cleaned.imageCompression).toBe("original");
  });

  it("يضيف خيارات الأولوية الجديدة ويزيل التكرارات والفراغات قبل عرضها", () => {
    expect(normalizeMarketVisitPriorityOptions(["نخبة", " ", "دمشق", "نخبة", "دمشق "])).toEqual(["نخبة", "دمشق"]);
  });
});
