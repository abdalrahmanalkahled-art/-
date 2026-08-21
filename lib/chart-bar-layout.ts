export interface DynamicBarLayout {
  totalBars: number;
  gap: number;
  barWidth: number;
}

export function getDynamicBarLayout(availableWidth: number, groupCount: number, seriesCount: number): DynamicBarLayout {
  const safeGroups = Math.max(groupCount, 1);
  const safeSeries = Math.max(seriesCount, 1);
  const totalBars = safeGroups * safeSeries;
  const safeWidth = Math.max(1, availableWidth);
  const preferredBarWidth = 16;
  const maximumFittingWidth = Math.max(1, safeWidth * 0.85 / totalBars);
  const barWidth = Math.min(preferredBarWidth, maximumFittingWidth);
  const gap = Math.max(0, (safeWidth - totalBars * barWidth) / (totalBars + 1));
  return { totalBars, gap, barWidth };
}
