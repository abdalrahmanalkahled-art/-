import { describe, expect, it } from "vitest";

import {
  getSurveyProductCategories,
  toggleSurveyCategory,
  toggleSurveyProductSelection,
} from "../survey-template-selection";
import type { Product } from "../types/survey-types";

const products: Product[] = [
  { id: "company-1", name: "منتج مدار", categoryName: "منظفات", type: "company" },
  { id: "competitor-1", name: "منتج منافس", categoryName: "منظفات", type: "competitor", competitorName: "منافس" },
  { id: "company-2", name: "معطر مدار", categoryName: "معطرات", type: "company" },
];

describe("تدفق اختيار منتجات قالب الاستبيان", () => {
  it("يعرض كل تصنيف مرة واحدة وبترتيب ظهور المنتجات", () => {
    expect(getSurveyProductCategories(products)).toEqual(["منظفات", "معطرات"]);
  });

  it("يفتح ويغلق التصنيف من دون تعديل الحالة السابقة", () => {
    const initial = new Set<string>();
    const expanded = toggleSurveyCategory(initial, "منظفات");
    const collapsed = toggleSurveyCategory(expanded, "منظفات");

    expect(initial.size).toBe(0);
    expect(expanded.has("منظفات")).toBe(true);
    expect(collapsed.has("منظفات")).toBe(false);
  });

  it("يختار المنتج ثم يلغي اختياره من دون فقدان المنتجات الأخرى", () => {
    const initial = new Map<string, boolean>([["company-1", true]]);
    const afterSelection = toggleSurveyProductSelection(initial, "competitor-1");
    const afterRemoval = toggleSurveyProductSelection(afterSelection, "company-1");

    expect(initial.has("competitor-1")).toBe(false);
    expect(afterSelection.has("company-1")).toBe(true);
    expect(afterSelection.has("competitor-1")).toBe(true);
    expect(afterRemoval.has("company-1")).toBe(false);
    expect(afterRemoval.has("competitor-1")).toBe(true);
  });
});
