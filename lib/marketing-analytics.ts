export interface MarketingEventRecord {
  id: string;
  name?: string;
  brandName?: string;
  region?: string;
  storeId?: string;
  budget?: number | string | null;
  actualCost?: number | string | null;
  cost?: number | string | null;
}

export interface MarketingSignageRecord {
  id: string;
  brand?: string;
  region?: string;
  storeId?: string;
  isActive?: boolean;
}

export interface MarketingStandRecord {
  id: string;
  brand?: string;
  storeId?: string;
  isActive?: boolean;
  condition?: "good" | "damaged" | "needs_repair";
}

export interface MarketingStoreReference {
  id: string;
  region?: string;
  isActive?: boolean;
}

export interface MarketingGoalRecord {
  id: string;
  brandName?: string;
  completionPercentage?: number | string | null;
  currentValue?: number | string | null;
  targetValue?: number | string | null;
}

export interface MarketingAnalyticsFilters {
  /** متوافق مع المرشح السابق ذي الاختيار الواحد. */
  brandName?: string;
  /** الماركات المختارة في تبويبة التحليل التسويقي. */
  brandNames?: string[];
  regionName?: string;
  /** المناطق المختارة في تبويبة التحليل التسويقي. */
  regionNames?: string[];
  storeId?: string;
}

export interface MarketingAnalyticsSummary {
  events: MarketingEventRecord[];
  signages: MarketingSignageRecord[];
  stands: MarketingStandRecord[];
  totalBudget: number;
  totalCost: number;
  activeSignages: number;
  activeStands: number;
  goals: MarketingGoalRecord[];
  goalProgress?: number;
}

function selectedValues(singleValue?: string, values?: string[]): Set<string> | null {
  const selected = [...(values || []), singleValue].filter((value): value is string => Boolean(value?.trim()));
  return selected.length ? new Set(selected) : null;
}

function matchesScope(record: { brand?: string; brandName?: string; region?: string; storeId?: string }, filters: MarketingAnalyticsFilters, storesById: Map<string, MarketingStoreReference>): boolean {
  const brand = record.brandName ?? record.brand;
  const inferredRegion = record.region || (record.storeId ? storesById.get(record.storeId)?.region : undefined);
  const selectedBrands = selectedValues(filters.brandName, filters.brandNames);
  const selectedRegions = selectedValues(filters.regionName, filters.regionNames);
  if (selectedBrands && (!brand || !selectedBrands.has(brand))) return false;
  if (selectedRegions && (!inferredRegion || !selectedRegions.has(inferredRegion))) return false;
  if (filters.storeId && record.storeId !== filters.storeId) return false;
  return true;
}

function numericValue(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateGoalProgress(goals: MarketingGoalRecord[]): number | undefined {
  if (!goals.length) return undefined;
  const totals = goals.reduce((accumulator, goal) => ({
    current: accumulator.current + numericValue(goal.currentValue),
    target: accumulator.target + numericValue(goal.targetValue),
  }), { current: 0, target: 0 });
  if (totals.target > 0) return Math.round((totals.current / totals.target) * 100);
  const percentages = goals.map((goal) => numericValue(goal.completionPercentage));
  return Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length);
}

export function calculateMarketingAnalytics(
  events: MarketingEventRecord[],
  signages: MarketingSignageRecord[],
  stands: MarketingStandRecord[],
  stores: MarketingStoreReference[],
  filters: MarketingAnalyticsFilters,
  goals: MarketingGoalRecord[] = [],
): MarketingAnalyticsSummary {
  const storesById = new Map(stores.filter((store) => store.isActive !== false).map((store) => [store.id, store]));
  const selectedBrands = selectedValues(filters.brandName, filters.brandNames);
  const scopedEvents = events.filter((event) => matchesScope(event, filters, storesById));
  const scopedSignages = signages.filter((signage) => matchesScope(signage, filters, storesById));
  const scopedStands = stands.filter((stand) => matchesScope(stand, filters, storesById));
  const scopedGoals = selectedBrands ? goals.filter((goal) => Boolean(goal.brandName && selectedBrands.has(goal.brandName))) : [];
  return {
    events: scopedEvents,
    signages: scopedSignages,
    stands: scopedStands,
    totalBudget: scopedEvents.reduce((sum, event) => sum + numericValue(event.budget), 0),
    totalCost: scopedEvents.reduce((sum, event) => sum + numericValue(event.actualCost ?? event.cost ?? event.budget), 0),
    activeSignages: scopedSignages.filter((signage) => signage.isActive !== false).length,
    activeStands: scopedStands.filter((stand) => stand.isActive !== false && stand.condition === "good").length,
    goals: scopedGoals,
    goalProgress: calculateGoalProgress(scopedGoals),
  };
}
