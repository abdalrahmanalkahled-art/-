export interface ShelfBrandAllocation {
  brand: string;
  shelfCount: number;
}

export interface ShelfInstallation {
  id: string;
  storeId: string;
  storeName: string;
  region?: string;
  installDate: string;
  imageUri?: string;
  brandAllocations: ShelfBrandAllocation[];
  notes: string;
  isActive: boolean;
  createdAt: string;
}

export interface ShelfInstallationDraft {
  storeId: string;
  storeName: string;
  region?: string;
  installDate: string;
  imageUri?: string;
  brandAllocations: ShelfBrandAllocation[];
  notes: string;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase("ar");

export function validateShelfInstallationDraft(draft: ShelfInstallationDraft): string | null {
  if (!draft.storeId || !draft.storeName.trim()) return "اختر المحل أولاً.";
  if (!draft.installDate) return "حدد تاريخ تركيب الأرفف.";
  if (!draft.brandAllocations.length) return "أدخل عدد الماركات المركبة أولاً.";
  const seen = new Set<string>();
  for (const allocation of draft.brandAllocations) {
    if (!allocation.brand.trim()) return "اختر الماركة لكل صف من الأرفف.";
    if (!Number.isInteger(allocation.shelfCount) || allocation.shelfCount < 1) return "أدخل عدد أرفف صحيحاً لكل ماركة.";
    const key = normalize(allocation.brand);
    if (seen.has(key)) return "لا يمكن تكرار الماركة نفسها ضمن التركيب الواحد.";
    seen.add(key);
  }
  return null;
}

export function createShelfInstallation(draft: ShelfInstallationDraft, now = new Date().toISOString()): ShelfInstallation {
  const error = validateShelfInstallationDraft(draft);
  if (error) throw new Error(error);
  return {
    id: `shelf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    storeId: draft.storeId,
    storeName: draft.storeName.trim(),
    region: draft.region?.trim() || undefined,
    installDate: draft.installDate,
    imageUri: draft.imageUri?.trim() || undefined,
    brandAllocations: draft.brandAllocations.map((allocation) => ({ brand: allocation.brand.trim(), shelfCount: allocation.shelfCount })),
    notes: draft.notes.trim(),
    isActive: true,
    createdAt: now,
  };
}
