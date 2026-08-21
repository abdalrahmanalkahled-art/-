export function canOpenSignageImage(imageUri?: string): boolean {
  return Boolean(imageUri && imageUri.trim());
}

export interface SignageDetailsRecord {
  type: "store" | "road" | "wall" | "island";
  brand?: string;
}

export interface StandDetailsRecord {
  condition: "good" | "damaged" | "needs_repair";
  brand?: string;
}

export function buildSignageDetailsStats(signages: SignageDetailsRecord[]) {
  const byBrand: Record<string, number> = {};
  for (const signage of signages) {
    if (signage.brand) byBrand[signage.brand] = (byBrand[signage.brand] ?? 0) + 1;
  }
  return {
    total: signages.length,
    byType: {
      store: signages.filter((item) => item.type === "store").length,
      road: signages.filter((item) => item.type === "road").length,
      wall: signages.filter((item) => item.type === "wall").length,
      island: signages.filter((item) => item.type === "island").length,
    },
    byBrand,
  };
}

export function buildStandDetailsStats(stands: StandDetailsRecord[]) {
  const byBrand: Record<string, number> = {};
  for (const stand of stands) {
    if (stand.brand) byBrand[stand.brand] = (byBrand[stand.brand] ?? 0) + 1;
  }
  return {
    total: stands.length,
    byCondition: {
      good: stands.filter((item) => item.condition === "good").length,
      damaged: stands.filter((item) => item.condition === "damaged").length,
      needs_repair: stands.filter((item) => item.condition === "needs_repair").length,
    },
    byBrand,
    needsMaintenance: stands.filter((item) => item.condition !== "good").length,
  };
}
