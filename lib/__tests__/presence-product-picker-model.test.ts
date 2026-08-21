import { describe, expect, it } from "vitest";

import { filterPresenceProducts } from "../presence-product-picker-model";

describe("اختيار منتج مخطط التواجد", () => {
  const products = [
    { id: "1", name: "مسحوق غسيل مدار" },
    { id: "2", name: "سائل جلي مدار" },
    { id: "3", name: "مبيض منافس" },
  ];

  it("يعرض جميع المنتجات عند فتح النافذة دون بحث", () => {
    expect(filterPresenceProducts(products, "")).toHaveLength(3);
  });

  it("يبحث في الاسم العربي مع تجاهل الفراغات المحيطة", () => {
    expect(filterPresenceProducts(products, "  جلي ")).toEqual([{ id: "2", name: "سائل جلي مدار" }]);
    expect(filterPresenceProducts(products, "غير موجود")).toEqual([]);
  });
});
