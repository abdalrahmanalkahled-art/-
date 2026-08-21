import { beforeEach, describe, expect, it, vi } from "vitest";

const { getItems } = vi.hoisted(() => ({ getItems: vi.fn() }));

vi.mock("../storage", () => ({
  getItems,
  STORAGE_KEYS: { MARKETING_GOALS: "madar_marketing_goals" },
}));

import { getEventGoalTitle, loadEventGoals } from "../event-goal-loader";

describe("تحميل أهداف الفعاليات", () => {
  beforeEach(() => {
    getItems.mockReset();
  });

  it("يعيد جميع أهداف الخطة التسويقية المحفوظة لاختيار هدف الفعالية", async () => {
    const goals = [
      { id: "goal-1", title: "زيادة التواجد", kpi: "نسبة التواجد", completionPercentage: 40 },
      { id: "goal-2", title: "توسيع التغطية", kpi: "محلات جديدة", completionPercentage: 25 },
    ];
    getItems.mockResolvedValue(goals);

    await expect(loadEventGoals()).resolves.toEqual(goals);
    expect(getItems).toHaveBeenCalledWith("madar_marketing_goals");
  });

  it("يعيد قائمة فارغة عندما لا توجد أهداف محفوظة", async () => {
    getItems.mockResolvedValue([]);

    await expect(loadEventGoals()).resolves.toEqual([]);
  });

  it("يعيد عنوان الهدف بدلاً من معرّفه الداخلي لعرض تفاصيل الفعالية", () => {
    const goals = [{ id: "goal-42", title: "زيادة التواجد", kpi: "نسبة التواجد" }];

    expect(getEventGoalTitle(goals, "goal-42")).toBe("زيادة التواجد");
    expect(getEventGoalTitle(goals, "missing-goal")).toBeUndefined();
    expect(getEventGoalTitle(goals)).toBeUndefined();
  });
});
