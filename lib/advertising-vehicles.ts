export const ADVERTISING_VEHICLE_SIDES = [
  { id: "right", label: "الجهة اليمنى", icon: "directions-car" as const },
  { id: "left", label: "الجهة اليسرى", icon: "directions-car" as const },
  { id: "front", label: "الجهة الأمامية", icon: "front-hand" as const },
  { id: "back", label: "الجهة الخلفية", icon: "directions-car" as const },
] as const;

export type AdvertisingVehicleSide = typeof ADVERTISING_VEHICLE_SIDES[number]["id"];
export type AdvertisingVehicleImages = Record<AdvertisingVehicleSide, string>;

export interface AdvertisingVehicle {
  id: string;
  brand: string;
  vehicleNumber: string;
  installDate: string;
  images: AdvertisingVehicleImages;
  isActive: boolean;
  createdAt: string;
}

export interface AdvertisingVehicleDraft {
  brand: string;
  vehicleNumber: string;
  installDate: string;
  images: AdvertisingVehicleImages;
}

export function createAdvertisingVehicle(draft: AdvertisingVehicleDraft): AdvertisingVehicle {
  return {
    id: `advertising-vehicle-${Date.now()}`,
    brand: draft.brand.trim(),
    vehicleNumber: draft.vehicleNumber.trim(),
    installDate: draft.installDate,
    images: { ...draft.images },
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

export function validateAdvertisingVehicleDraft(draft: Partial<AdvertisingVehicleDraft>): string | null {
  if (!draft.brand?.trim()) return "اختر الماركة المرتبطة بالسيارة.";
  if (!draft.vehicleNumber?.trim()) return "أدخل رقم السيارة.";
  if (!draft.installDate) return "حدد تاريخ التركيب.";
  const missing = ADVERTISING_VEHICLE_SIDES.find((side) => !draft.images?.[side.id]);
  if (missing) return `أضف صورة ${missing.label}.`;
  return null;
}
