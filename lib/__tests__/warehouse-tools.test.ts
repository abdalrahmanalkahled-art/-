import { describe, expect, it } from "vitest";

import { conditionMeta, validateWarehouseTool } from "../warehouse-tools";

describe("أدوات المستودع", () => {
  it("يرفض ربط ماركات أكثر من عدد قطع الأداة", () => {
    expect(validateWarehouseTool({ name: "ستاند", quantity: 2, brandMode: "multiple", brandNames: ["مدار", "المنافس أ", "المنافس ب"] })).toContain("عدد الماركات");
  });

  it("يفرض اختيار ماركة واحدة في نمط الماركة الواحدة", () => {
    expect(validateWarehouseTool({ name: "مضخة", quantity: 1, brandMode: "single", brandNames: ["مدار", "المنافس"] })).toContain("ماركة واحدة");
    expect(validateWarehouseTool({ name: "مضخة", quantity: 1, brandMode: "single", brandNames: ["مدار"] })).toBeNull();
  });

  it("يعرض بيانات الحالة العربية المناسبة", () => {
    expect(conditionMeta("new").label).toBe("جديدة");
    expect(conditionMeta("good").label).toBe("جيدة");
    expect(conditionMeta("needs_repair").label).toBe("بحاجة إصلاح");
  });
});
