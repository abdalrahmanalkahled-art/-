import type { SignageReportBoard } from "./signage-report-data";

/** يضع اللوحات ذات الوجه الواحد أولاً مع الحفاظ على ترتيب كل فئة كما أُدخلت. */
export function orderBoardsForReport(boards: SignageReportBoard[]): SignageReportBoard[] {
  return [...boards].sort((left, right) => Number(left.sides === 2) - Number(right.sides === 2));
}
