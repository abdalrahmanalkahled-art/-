import { describe, expect, it } from "vitest";
import { buildDashboardExpenseTrend } from "@/lib/dashboard-expense-trend";

describe("اتجاه صرفيات اللوحة الرئيسية", () => {
  it("يجمع الصرفيات الظاهرة في مرور واحد ويهمل الأشهر خارج النطاق", () => {
    const months = [new Date(2026, 0, 1), new Date(2026, 1, 1), new Date(2026, 2, 1)];
    const trend = buildDashboardExpenseTrend([
      { amount: 10, expenseDate: "2026-01-05" },
      { amount: "25.5", createdAt: "2026-01-31T10:00:00.000Z" },
      { amount: 7, expenseDate: "2026-02-01" },
      { amount: 99, expenseDate: "2025-12-30" },
    ], months, (month) => String(month.getMonth() + 1), "#123456");

    expect(trend).toEqual([
      { label: "1", value: 35.5, color: "#123456" },
      { label: "2", value: 7, color: "#123456" },
      { label: "3", value: 0, color: "#123456" },
    ]);
  });
});
