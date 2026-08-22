export interface GoalImpactEvent {
  attendeesCount?: number | string | null;
  giftsDistributed?: number | string | null;
  region?: string | null;
  location?: string | null;
}

function toNonNegativeNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function getGoalImpactMetrics(events: GoalImpactEvent[]) {
  const coveredRegions = new Set<string>();
  let totalGifts = 0;
  let totalBeneficiaries = 0;

  for (const event of events) {
    totalGifts += toNonNegativeNumber(event.giftsDistributed);
    totalBeneficiaries += toNonNegativeNumber(event.attendeesCount);

    const area = (event.region || event.location || "").trim();
    if (area) coveredRegions.add(area);
  }

  return {
    totalGifts,
    totalBeneficiaries,
    coveredRegionCount: coveredRegions.size,
  };
}
