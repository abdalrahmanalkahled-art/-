import type { ExpenseReportSettings } from "./expense-report-settings-model";

export interface ExpenseReportExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseDate: string;
  notes?: string;
}

export interface ExpenseReportCategory {
  id: string;
  label: string;
}

export interface ExpenseCategoryTotal {
  id: string;
  label: string;
  count: number;
  amount: number;
}

export interface ExpenseReportData {
  expenses: ExpenseReportExpense[];
  categoryTotals: ExpenseCategoryTotal[];
  totalAmount: number;
  categoryScopeLabel: string;
  dateScopeLabel: string;
}

export function buildExpenseReportData(
  expenses: ExpenseReportExpense[],
  categories: ExpenseReportCategory[],
  settings: ExpenseReportSettings,
): ExpenseReportData {
  const categoryMap = new Map(categories.map((category) => [category.id, category.label]));
  const selectedIds = new Set(settings.selectedCategoryIds);
  const filtered = expenses
    .filter((expense) => settings.categoryMode === "all" || selectedIds.has(expense.category))
    .filter((expense) => settings.dateRangeMode !== "selected" || !settings.startDate || !settings.endDate || (expense.expenseDate >= settings.startDate && expense.expenseDate <= settings.endDate))
    .sort((a, b) => String(b.expenseDate).localeCompare(String(a.expenseDate)) || b.amount - a.amount);
  const categoryTotals = [...filtered.reduce((totals, expense) => {
    const current = totals.get(expense.category) ?? {
      id: expense.category,
      label: categoryMap.get(expense.category) ?? "تصنيف غير معروف",
      count: 0,
      amount: 0,
    };
    current.count += 1;
    current.amount += Number(expense.amount) || 0;
    totals.set(expense.category, current);
    return totals;
  }, new Map<string, ExpenseCategoryTotal>()).values()].sort((a, b) => b.amount - a.amount);
  const categoryScopeLabel = settings.categoryMode === "all"
    ? "كل التصنيفات"
    : categoryTotals.map((category) => category.label).join("، ") || "تصنيفات مختارة";
  const dateScopeLabel = settings.dateRangeMode === "selected" && settings.startDate && settings.endDate
    ? settings.startDate === settings.endDate ? `بتاريخ ${settings.startDate}` : `من ${settings.startDate} إلى ${settings.endDate}`
    : "كل التواريخ";
  return {
    expenses: filtered,
    categoryTotals,
    totalAmount: filtered.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    categoryScopeLabel,
    dateScopeLabel,
  };
}
