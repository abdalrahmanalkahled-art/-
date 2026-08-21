import { describe, expect, it } from "vitest";

import { shouldShowProductPrice, shouldShowShelfPercentage } from "../survey-product-fields";

describe("الحقول الاختيارية لمنتج الاستبيان", () => {
  it("يحافظ على نسبة الظهور ظاهرة للقوالب القديمة، ويخفيها عند إلغاء الخيار", () => {
    expect(shouldShowShelfPercentage()).toBe(true);
    expect(shouldShowShelfPercentage(true)).toBe(true);
    expect(shouldShowShelfPercentage(false)).toBe(false);
  });

  it("لا يعرض سعر المنتج إلا عند تفعيل الخيار صراحةً", () => {
    expect(shouldShowProductPrice()).toBe(false);
    expect(shouldShowProductPrice(false)).toBe(false);
    expect(shouldShowProductPrice(true)).toBe(true);
  });
});
