export interface DashboardExpenseLike {
  amount?: string | number;
  expenseDate?: string;
  createdAt?: string;
}

export interface DashboardTrendPoint {
  label: string;
  value: number;
  color?: string;
}

function monthKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

/** يجمع الصرفيات مرة واحدة بدلاً من إعادة مسحها لكل شهر ظاهر في اللوحة. */
export function buildDashboardExpenseTrend(
  expenses: DashboardExpenseLike[],
  months: Date[],
  getLabel: (month: Date) => string,
  color: string,
): DashboardTrendPoint[] {
  const totalsByMonth = new Map(months.map((month) => [monthKey(month), 0]));

  expenses.forEach((expense) => {
    const key = String(expense.expenseDate || expense.createdAt || "").slice(0, 7);
    if (!totalsByMonth.has(key)) return;
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + Number(expense.amount || 0));
  });

  return months.map((month) => ({
    label: getLabel(month),
    value: totalsByMonth.get(monthKey(month)) ?? 0,
    color,
  }));
}
