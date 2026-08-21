import { describe, expect, it } from "vitest";

import { calculateMarketingAnalytics } from "../marketing-analytics";

describe("تحليل الفعاليات واللوحات والستاندات", () => {
  const stores = [
    { id: "store-damascus", region: "دمشق", isActive: true },
    { id: "store-aleppo", region: "حلب", isActive: true },
  ];

  it("يربط منطقة الستاند بالمحل ويستبعد غير النشط ويحسب الميزانية الرقمية فقط", () => {
    const result = calculateMarketingAnalytics(
      [{ id: "event-1", brandName: "مدار", region: "دمشق", budget: 450 }, { id: "event-2", brandName: "مدار", region: "دمشق", budget: "غير معروف" }],
      [{ id: "board-1", brand: "مدار", region: "دمشق", isActive: true }, { id: "board-2", brand: "مدار", region: "دمشق", isActive: false }],
      [{ id: "stand-1", brand: "مدار", storeId: "store-damascus", isActive: true, condition: "good" }, { id: "stand-2", brand: "مدار", storeId: "store-damascus", isActive: true, condition: "damaged" }, { id: "stand-3", brand: "مدار", storeId: "store-aleppo", isActive: true, condition: "good" }],
      stores,
      { brandName: "مدار", regionName: "دمشق" },
    );

    expect(result.totalBudget).toBe(450);
    expect(result.activeSignages).toBe(1);
    expect(result.stands.map((stand) => stand.id)).toEqual(["stand-1", "stand-2"]);
    expect(result.activeStands).toBe(1);
  });

  it("يطبق فلتر المحل على اللوحات والستاندات المرتبطة به", () => {
    const result = calculateMarketingAnalytics(
      [],
      [{ id: "board-1", storeId: "store-damascus", isActive: true }, { id: "board-2", storeId: "store-aleppo", isActive: true }],
      [{ id: "stand-1", storeId: "store-damascus", isActive: true, condition: "good" }],
      stores,
      { storeId: "store-damascus" },
    );

    expect(result.signages.map((signage) => signage.id)).toEqual(["board-1"]);
    expect(result.activeStands).toBe(1);
  });

  it("يدعم اختيار أكثر من ماركة ومنطقة ويحسب تكلفة الفعاليات وتقدم الأهداف المرتبطة", () => {
    const result = calculateMarketingAnalytics(
      [
        { id: "event-1", brandName: "مدار", region: "دمشق", budget: 450, actualCost: 300 },
        { id: "event-2", brandName: "الندى", region: "حلب", budget: 120, cost: 90 },
        { id: "event-3", brandName: "منافس", region: "دمشق", budget: 999, actualCost: 999 },
      ],
      [],
      [],
      stores,
      { brandNames: ["مدار", "الندى"], regionNames: ["دمشق", "حلب"] },
      [
        { id: "goal-1", brandName: "مدار", currentValue: 25, targetValue: 50 },
        { id: "goal-2", brandName: "الندى", currentValue: 30, targetValue: 50 },
        { id: "goal-3", brandName: "منافس", currentValue: 100, targetValue: 100 },
      ],
    );

    expect(result.events.map((event) => event.id)).toEqual(["event-1", "event-2"]);
    expect(result.totalBudget).toBe(570);
    expect(result.totalCost).toBe(390);
    expect(result.goals.map((goal) => goal.id)).toEqual(["goal-1", "goal-2"]);
    expect(result.goalProgress).toBe(55);
  });
});
