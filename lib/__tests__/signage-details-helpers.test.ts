import { describe, expect, it } from "vitest";

import { buildSignageDetailsStats, buildStandDetailsStats, canOpenSignageImage } from "../signage-details-helpers";

describe("عارض صورة اللوحة والستاند", () => {
  it("يفتح العرض الكامل عند وجود رابط صورة صالح فقط", () => {
    expect(canOpenSignageImage("file:///photo.jpg")).toBe(true);
    expect(canOpenSignageImage("  ")).toBe(false);
    expect(canOpenSignageImage()).toBe(false);
  });

  it("يبني إحصاءات اللوحات والستاندات بعيداً عن واجهة العرض", () => {
    expect(buildSignageDetailsStats([{ type: "store", brand: "مدار" }, { type: "road", brand: "مدار" }]).byBrand).toEqual({ مدار: 2 });
    expect(buildStandDetailsStats([{ condition: "good" }, { condition: "needs_repair", brand: "مدار" }]).needsMaintenance).toBe(1);
  });
});
