import type { SurveyCycle, SurveyResult, SurveyTemplate } from "./types/survey-types";

type CycleMutation = {
  cycles: SurveyCycle[];
  results: SurveyResult[];
};

export type CloseSurveyCycleResult = CycleMutation & {
  didClose: boolean;
  cycle?: SurveyCycle;
  reason?: "no-results";
};

export interface SurveyCycleSummary {
  resultCount: number;
  storeCount: number;
  averagePresencePercentage: number;
}

function dateOnly(value: string): string {
  return value.split("T")[0] || value;
}

function sortResultsByDate(results: SurveyResult[]): SurveyResult[] {
  return [...results].sort((left, right) => {
    const bySurveyDate = dateOnly(left.surveyDate).localeCompare(dateOnly(right.surveyDate));
    return bySurveyDate || left.createdAt.localeCompare(right.createdAt);
  });
}

/** يرتب الدورات الأحدث أولاً مع أولوية لوقت الإغلاق الفعلي. */
export function sortSurveyCyclesNewestFirst(cycles: SurveyCycle[]): SurveyCycle[] {
  return [...cycles].sort((left, right) => {
    const leftDate = left.closedAt || left.endDate || left.startDate || left.createdAt;
    const rightDate = right.closedAt || right.endDate || right.startDate || right.createdAt;
    return rightDate.localeCompare(leftDate);
  });
}

function makeCycleId(): string {
  return `survey-cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatSurveyCycleDate(value: string): string {
  const normalized = dateOnly(value);
  const date = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(date.getTime())) return normalized;
  return `${date.getDate()}-${date.getMonth() + 1}`;
}

export function buildSurveyCycleName(templateName: string, startDate: string, endDate: string): string {
  const startLabel = formatSurveyCycleDate(startDate);
  const endLabel = formatSurveyCycleDate(endDate);
  return startLabel === endLabel
    ? `${templateName} ${startLabel}`
    : `${templateName} ${startLabel} – ${endLabel}`;
}

export function getActiveSurveyCycle(templateId: string, cycles: SurveyCycle[]): SurveyCycle | undefined {
  return cycles.find((cycle) => cycle.templateId === templateId && !cycle.closedAt);
}

/**
 * تعيد نتائج الدورة النشطة. النتائج القديمة غير المعرّفة تُعامل كدورة نشطة واحدة
 * حتى تُغلق أول مرة، ما يحافظ على البيانات السابقة عند ترقية التطبيق.
 */
export function getActiveSurveyCycleResults(
  templateId: string,
  results: SurveyResult[],
  cycles: SurveyCycle[],
): SurveyResult[] {
  const activeCycle = getActiveSurveyCycle(templateId, cycles);
  if (activeCycle) return results.filter((result) => result.cycleId === activeCycle.id);

  const hasKnownCycle = cycles.some((cycle) => cycle.templateId === templateId);
  if (hasKnownCycle) return [];

  return results.filter((result) => result.templateId === templateId && !result.cycleId);
}

export function isStoreUsedInActiveSurveyCycle(
  templateId: string,
  storeId: string,
  results: SurveyResult[],
  cycles: SurveyCycle[],
): boolean {
  return getActiveSurveyCycleResults(templateId, results, cycles).some((result) => result.storeId === storeId);
}

function createActiveCycle(
  template: SurveyTemplate,
  cycleResults: SurveyResult[],
  now: string,
): SurveyCycle {
  const sortedResults = sortResultsByDate(cycleResults);
  const firstDate = sortedResults[0] ? dateOnly(sortedResults[0].surveyDate) : dateOnly(now);
  const lastDate = sortedResults.at(-1) ? dateOnly(sortedResults.at(-1)!.surveyDate) : dateOnly(now);

  return {
    id: makeCycleId(),
    templateId: template.id,
    templateName: template.name,
    name: template.name,
    startDate: firstDate,
    endDate: lastDate,
    resultIds: sortedResults.map((result) => result.id),
    createdAt: now,
  };
}

/** يربط نتيجة جديدة بالدورة النشطة، وينقل النتائج القديمة للدورة الأولى عند الحاجة. */
export function addResultToActiveSurveyCycle(
  template: SurveyTemplate,
  newResult: SurveyResult,
  results: SurveyResult[],
  cycles: SurveyCycle[],
): CycleMutation & { result: SurveyResult } {
  const now = newResult.createdAt;
  const activeResults = getActiveSurveyCycleResults(template.id, results, cycles);
  const activeCycle = getActiveSurveyCycle(template.id, cycles);
  const cycle = activeCycle ?? createActiveCycle(template, [...activeResults, newResult], now);
  const cycleId = cycle.id;
  const allCycleResults = [...activeResults, newResult];
  const sortedCycleResults = sortResultsByDate(allCycleResults);
  const startDate = dateOnly(sortedCycleResults[0]?.surveyDate ?? newResult.surveyDate);
  const endDate = dateOnly(sortedCycleResults.at(-1)?.surveyDate ?? newResult.surveyDate);
  const updatedCycle: SurveyCycle = {
    ...cycle,
    startDate,
    endDate,
    resultIds: sortedCycleResults.map((result) => result.id),
  };
  const updatedResult: SurveyResult = { ...newResult, cycleId, cycleName: undefined };
  const updatedResults = results.map((result) =>
    activeResults.some((activeResult) => activeResult.id === result.id)
      ? { ...result, cycleId, cycleName: undefined }
      : result,
  );
  const updatedCycles = activeCycle
    ? cycles.map((existingCycle) => existingCycle.id === updatedCycle.id ? updatedCycle : existingCycle)
    : [...cycles, updatedCycle];

  return { cycles: updatedCycles, results: [...updatedResults, updatedResult], result: updatedResult };
}

export function closeActiveSurveyCycle(
  template: SurveyTemplate,
  results: SurveyResult[],
  cycles: SurveyCycle[],
  closedAt = new Date().toISOString(),
): CloseSurveyCycleResult {
  const activeResults = getActiveSurveyCycleResults(template.id, results, cycles);
  if (activeResults.length === 0) {
    return { cycles, results, didClose: false, reason: "no-results" };
  }

  const activeCycle = getActiveSurveyCycle(template.id, cycles) ?? createActiveCycle(template, activeResults, closedAt);
  const sortedResults = sortResultsByDate(activeResults);
  const startDate = dateOnly(sortedResults[0]!.surveyDate);
  const endDate = dateOnly(sortedResults.at(-1)!.surveyDate);
  const cycleName = buildSurveyCycleName(template.name, startDate, endDate);
  const closedCycle: SurveyCycle = {
    ...activeCycle,
    templateName: template.name,
    name: cycleName,
    startDate,
    endDate,
    resultIds: sortedResults.map((result) => result.id),
    closedAt,
  };
  const activeResultIds = new Set(activeResults.map((result) => result.id));
  const updatedResults = results.map((result) =>
    activeResultIds.has(result.id)
      ? { ...result, cycleId: closedCycle.id, cycleName }
      : result,
  );
  const updatedCycles = activeCycle.closedAt === undefined && cycles.some((cycle) => cycle.id === activeCycle.id)
    ? cycles.map((cycle) => cycle.id === activeCycle.id ? closedCycle : cycle)
    : [...cycles, closedCycle];

  return { cycles: updatedCycles, results: updatedResults, cycle: closedCycle, didClose: true };
}

export function getSurveyResultDisplayName(result: SurveyResult): string {
  return result.cycleName || result.templateName;
}

export function getSurveyCycleResults(cycleId: string, results: SurveyResult[]): SurveyResult[] {
  return results.filter((result) => result.cycleId === cycleId);
}

/** يلخّص الدورة بأرقام قليلة قابلة للقراءة في بطاقة نتائج خفيفة. */
export function getSurveyCycleSummary(cycleId: string, results: SurveyResult[]): SurveyCycleSummary {
  const cycleResults = getSurveyCycleResults(cycleId, results);
  const storeCount = new Set(cycleResults.map((result) => result.storeId)).size;
  const productRows = cycleResults.flatMap((result) => result.data);
  const presentRows = productRows.filter((product) => product.present).length;

  return {
    resultCount: cycleResults.length,
    storeCount,
    averagePresencePercentage: productRows.length === 0 ? 0 : Math.round((presentRows / productRows.length) * 100),
  };
}
