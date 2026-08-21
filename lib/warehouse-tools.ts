export type WarehouseToolCondition = "new" | "good" | "needs_repair";
export type WarehouseToolBrandMode = "single" | "multiple";

export interface WarehouseTool {
  id: string;
  name: string;
  quantity: number;
  brandMode: WarehouseToolBrandMode;
  brandNames: string[];
  imageUri?: string;
  condition: WarehouseToolCondition;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export function validateWarehouseTool(input: Pick<WarehouseTool, "name" | "quantity" | "brandMode" | "brandNames">): string | null {
  if (!input.name.trim()) return "أدخل اسم الأداة.";
  if (!Number.isInteger(input.quantity) || input.quantity < 1) return "أدخل عدداً صحيحاً من قطع الأداة.";
  if (!input.brandNames.length) return "اختر الماركة المرتبطة بالأداة.";
  if (input.brandMode === "single" && input.brandNames.length !== 1) return "حدد ماركة واحدة لهذه الأداة.";
  if (input.brandMode === "multiple" && input.brandNames.length > input.quantity) return "لا يمكن أن يتجاوز عدد الماركات المحددة عدد قطع الأداة.";
  return null;
}

export function conditionMeta(condition: WarehouseToolCondition) {
  if (condition === "new") return { label: "جديدة", icon: "auto-awesome" as const, color: "#2563EB" };
  if (condition === "needs_repair") return { label: "بحاجة إصلاح", icon: "build" as const, color: "#DC2626" };
  return { label: "جيدة", icon: "verified" as const, color: "#16A34A" };
}
