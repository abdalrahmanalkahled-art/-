export interface ManagedCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  createdAt: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: ManagedCategory[] = [
  { id: "transport", label: "تنقل", icon: "directions-car", color: "#3B82F6", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "travel", label: "سفر", icon: "flight", color: "#7C3AED", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "events", label: "فعاليات", icon: "event", color: "#DC2626", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "repair", label: "إصلاح أعطال", icon: "build", color: "#F59E0B", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "printing", label: "طباعة", icon: "print", color: "#0E9F6E", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "gifts", label: "هدايا", icon: "card-giftcard", color: "#EC4899", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "other", label: "أخرى", icon: "more-horiz", color: "#6B7280", createdAt: "2026-01-01T00:00:00.000Z" },
];

export const DEFAULT_WAREHOUSE_CATEGORIES: ManagedCategory[] = [
  { id: "gifts", label: "هدايا", icon: "card-giftcard", color: "#DC2626", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "stands", label: "ستاندات", icon: "view-agenda", color: "#7C3AED", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "boards", label: "لوحات", icon: "crop-landscape", color: "#1A56DB", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "promotional", label: "دعائية", icon: "campaign", color: "#0E9F6E", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "other", label: "أخرى", icon: "category", color: "#6B7280", createdAt: "2026-01-01T00:00:00.000Z" },
];

export const DEFAULT_STORE_CATEGORIES: ManagedCategory[] = [
  { id: "elite", label: "نخبة", icon: "workspace-premium", color: "#2563EB", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "regular", label: "عادي", icon: "store", color: "#F59E0B", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "weak", label: "ضعيف", icon: "trending-down", color: "#DC2626", createdAt: "2026-01-01T00:00:00.000Z" },
];

export const CATEGORY_ICON_OPTIONS = [
  "category", "inventory-2", "redeem", "card-giftcard", "view-agenda", "crop-landscape",
  "campaign", "store", "local-shipping", "build", "print", "event", "palette", "devices",
  "cleaning-services", "soap", "sanitizer", "local-drink", "kitchen", "science", "medical-services",
  "brush", "format-paint", "construction", "restaurant", "more-horiz",
] as const;

export function getManagedCategories(stored: ManagedCategory[], defaults: ManagedCategory[]): ManagedCategory[] {
  return stored.length > 0 ? stored : defaults;
}

export function getFallbackCategoryId(categories: ManagedCategory[], removedId: string): string | null {
  return categories.find((category) => category.id !== removedId)?.id ?? null;
}
