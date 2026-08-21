import { describe, expect, it } from "vitest";

import { createAdvertisingVehicle, validateAdvertisingVehicleDraft } from "../advertising-vehicles";

const completeDraft = {
  brand: "مدار",
  vehicleNumber: "123456",
  installDate: "2026-08-21",
  images: { right: "right.jpg", left: "left.jpg", front: "front.jpg", back: "back.jpg" },
};

describe("السيارات المعلنة", () => {
  it("ينشئ سجلاً محلياً يحفظ الماركة والرقم والتاريخ وصور الجوانب الأربعة", () => {
    const vehicle = createAdvertisingVehicle(completeDraft);
    expect(vehicle).toMatchObject({ brand: "مدار", vehicleNumber: "123456", installDate: "2026-08-21", images: completeDraft.images, isActive: true });
    expect(vehicle.id).toContain("advertising-vehicle-");
  });

  it("يرفض الحفظ عند غياب أي حقل أساسي أو صورة جانب", () => {
    expect(validateAdvertisingVehicleDraft({ ...completeDraft, brand: "" })).toContain("الماركة");
    expect(validateAdvertisingVehicleDraft({ ...completeDraft, vehicleNumber: "" })).toContain("رقم السيارة");
    expect(validateAdvertisingVehicleDraft({ ...completeDraft, images: { ...completeDraft.images, front: "" } })).toContain("الأمامية");
    expect(validateAdvertisingVehicleDraft(completeDraft)).toBeNull();
  });
});
