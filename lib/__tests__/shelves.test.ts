import { describe, expect, it } from "vitest";
import { createShelfInstallation, validateShelfInstallationDraft } from "../shelves";

const base = {
  storeId: "store-1",
  storeName: "محل الاختبار",
  region: "دمشق",
  installDate: "2026-08-21",
  imageUri: "file://shelf-photo.jpg",
  brandAllocations: [{ brand: "مدار", shelfCount: 3 }],
  notes: "",
};

describe("تركيبات الأرفف", () => {
  it("ينشئ تركيب أرفف يجمع عدد الأرفف لكل ماركة دون حالة", () => {
    const record = createShelfInstallation(base, "2026-08-21T09:00:00.000Z");
    expect(record.brandAllocations).toEqual([{ brand: "مدار", shelfCount: 3 }]);
    expect(record.imageUri).toBe("file://shelf-photo.jpg");
    expect(record.isActive).toBe(true);
    expect("condition" in record).toBe(false);
  });

  it("يرفض الماركات المكررة وعدد الأرفف غير الصحيح", () => {
    expect(validateShelfInstallationDraft({ ...base, brandAllocations: [{ brand: "مدار", shelfCount: 2 }, { brand: "  مدار ", shelfCount: 1 }] })).toContain("تكرار");
    expect(validateShelfInstallationDraft({ ...base, brandAllocations: [{ brand: "مدار", shelfCount: 0 }] })).toContain("عدد أرفف");
  });
});
