export interface MarketingEventRecord {
  id: string;
  title?: string;
  name?: string;
  brandName?: string;
  region?: string;
  storeId?: string;
  eventDate?: string;
  location?: string;
  detailedAddress?: string;
  status?: "planned" | "ongoing" | "completed" | "cancelled";
  attendeesCount?: number | string | null;
  giftsDistributed?: number | string | null;
  rating?: number | string | null;
  goalId?: string;
  budget?: number | string | null;
  actualCost?: number | string | null;
  cost?: number | string | null;
}

export interface MarketingSignageRecord {
  id: string;
  type?: "store" | "road" | "wall" | "island";
  brand?: string;
  frontBrand?: string;
  backBrand?: string;
  region?: string;
  storeId?: string;
  storeName?: string;
  address?: string;
  sides?: 1 | 2;
  widthCm?: number | string;
  heightCm?: number | string;
  boardType?: string;
  rating?: string;
  installDate?: string;
  contractEndDate?: string;
  isActive?: boolean;
}

export interface MarketingStandRecord {
  id: string;
  brand?: string;
  storeId?: string;
  storeName?: string;
  installDate?: string;
  isActive?: boolean;
  condition?: "good" | "damaged" | "needs_repair";
  maintenanceHistory?: Array<{ id?: string; date?: string; type?: string; status?: string }>;
}

export interface MarketingStoreReference {
  id: string;
  region?: string;
  isActive?: boolean;
}

export interface MarketingGoalRecord {
  id: string;
  title?: string;
  brandName?: string;
  description?: string;
  period?: "monthly" | "quarterly" | "annual";
  startDate?: string;
  endDate?: string;
  kpi?: string;
  status?: "on_track" | "delayed" | "completed" | "cancelled";
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
  eventStatusCounts?: Record<"planned" | "ongoing" | "completed" | "cancelled", number>;
  totalAttendees?: number;
  totalGifts?: number;
  averageEventRating?: number;
  coveredRegions?: string[];
  signageTypeCounts?: Record<"store" | "road" | "wall" | "island", number>;
  expiringSignages?: number;
  standsNeedingAttention?: number;
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

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isExpiringSoon(value?: string): boolean {
  const endDate = parseDate(value);
  if (!endDate) return false;
  const difference = endDate.getTime() - Date.now();
  return difference >= 0 && difference <= 30 * 24 * 60 * 60 * 1000;
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
  const linkedGoalIds = new Set(scopedEvents.map((event) => event.goalId).filter((goalId): goalId is string => Boolean(goalId)));
  const scopedGoals = goals.filter((goal) => linkedGoalIds.has(goal.id) || Boolean(selectedBrands && goal.brandName && selectedBrands.has(goal.brandName)));
  const eventStatusCounts = scopedEvents.reduce<Record<"planned" | "ongoing" | "completed" | "cancelled", number>>((counts, event) => {
    const status = event.status || "planned";
    counts[status] += 1;
    return counts;
  }, { planned: 0, ongoing: 0, completed: 0, cancelled: 0 });
  const ratedEvents = scopedEvents.map((event) => numericValue(event.rating)).filter((rating) => rating > 0);
  const signageTypeCounts = scopedSignages.reduce<Record<"store" | "road" | "wall" | "island", number>>((counts, signage) => {
    counts[signage.type || "store"] += 1;
    return counts;
  }, { store: 0, road: 0, wall: 0, island: 0 });
  const coveredRegions = Array.from(new Set([...scopedEvents, ...scopedSignages].map((item) => item.region || (item.storeId ? storesById.get(item.storeId)?.region : undefined)).filter((region): region is string => Boolean(region)))).sort((first, second) => first.localeCompare(second, "ar"));
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
    eventStatusCounts,
    totalAttendees: scopedEvents.reduce((sum, event) => sum + numericValue(event.attendeesCount), 0),
    totalGifts: scopedEvents.reduce((sum, event) => sum + numericValue(event.giftsDistributed), 0),
    averageEventRating: ratedEvents.length ? Math.round((ratedEvents.reduce((sum, rating) => sum + rating, 0) / ratedEvents.length) * 10) / 10 : undefined,
    coveredRegions,
    signageTypeCounts,
    expiringSignages: scopedSignages.filter((signage) => signage.isActive !== false && isExpiringSoon(signage.contractEndDate)).length,
    standsNeedingAttention: scopedStands.filter((stand) => stand.isActive !== false && stand.condition !== "good").length,
  };
}
