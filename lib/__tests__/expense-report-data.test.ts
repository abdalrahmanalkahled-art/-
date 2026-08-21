import { describe, expect, it } from "vitest";

import { buildExpenseReportData } from "../expense-report-data";
import { DEFAULT_EXPENSE_REPORT_SETTINGS, normalizeExpenseReportSettings } from "../expense-report-settings-model";

const categories = [
  { id: "field", label: "ميدانية" },
  { id: "transport", label: "نقل" },
  { id: "media", label: "إعلان" },
];

const expenses = [
  { id: "1", title: "وقود", amount: 20000, category: "transport", expenseDate: "2026-08-10", notes: "زيارة منطقة الشام" },
  { id: "2", title: "إعلان", amount: 45000, category: "media", expenseDate: "2026-08-12", notes: "لوحة" },
  { id: "3", title: "ضيافة", amount: 15000, category: "field", expenseDate: "2026-08-11", notes: "" },
];

describe("إعدادات وبيانات تقرير الصرفيات", () => {
  it("يُبقي كل التصنيفات عند عدم وجود اختيار صالح", () => {
    expect(normalizeExpenseReportSettings({ categoryMode: "selected", selectedCategoryIds: [] })).toMatchObject({
      categoryMode: "all",
      selectedCategoryIds: [],
      includeSummary: true,
    });
  });

  it("يُزيل التصنيفات المكررة وغير النصية عند تطبيع الإعدادات", () => {
    expect(normalizeExpenseReportSettings({ categoryMode: "selected", selectedCategoryIds: ["media", "media", 4, ""] })).toMatchObject({
      categoryMode: "selected",
      selectedCategoryIds: ["media"],
    });
  });

  it("يُنشئ تقريراً متعدد التصنيفات مع إجماليات وترتيب زمني تنازلي", () => {
    const report = buildExpenseReportData(expenses, categories, {
      ...DEFAULT_EXPENSE_REPORT_SETTINGS,
      categoryMode: "selected",
      selectedCategoryIds: ["transport", "media"],
    });
    expect(report.expenses.map((item) => item.id)).toEqual(["2", "1"]);
    expect(report.totalAmount).toBe(65000);
    expect(report.categoryScopeLabel).toBe("إعلان، نقل");
    expect(report.categoryTotals).toEqual([
      { id: "media", label: "إعلان", count: 1, amount: 45000 },
      { id: "transport", label: "نقل", count: 1, amount: 20000 },
    ]);
  });

  it("يتضمن جميع الصرفيات عند اعتماد نطاق كل التصنيفات", () => {
    const report = buildExpenseReportData(expenses, categories, DEFAULT_EXPENSE_REPORT_SETTINGS);
    expect(report.expenses).toHaveLength(3);
    expect(report.totalAmount).toBe(80000);
    expect(report.categoryScopeLabel).toBe("كل التصنيفات");
  });

  it("يحصر التقرير ضمن فترة التاريخ المختارة بشكل شامل لطرفي الفترة", () => {
    const report = buildExpenseReportData(expenses, categories, {
      ...DEFAULT_EXPENSE_REPORT_SETTINGS,
      dateRangeMode: "selected",
      startDate: "2026-08-11",
      endDate: "2026-08-12",
    });
    expect(report.expenses.map((item) => item.id)).toEqual(["2", "3"]);
    expect(report.totalAmount).toBe(60000);
    expect(report.dateScopeLabel).toBe("من 2026-08-11 إلى 2026-08-12");
  });
});
