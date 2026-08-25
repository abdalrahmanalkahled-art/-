import { describe, expect, it } from "vitest";

import { calculateShelfPercentage, normalizeShelfValue, orderSurveyProducts } from "../survey-order-and-shelves";

describe("ترتيب الاستبيان وحساب الرفوف", () => {
  it("يحسب نسبة الظهور من الرفوف المشغولة والإجمالية", () => {
    expect(calculateShelfPercentage(1, 10)).toBe(10);
    expect(calculateShelfPercentage(7, 10)).toBe(70);
    expect(calculateShelfPercentage(12, 10)).toBe(100);
    expect(calculateShelfPercentage(0.5, 10)).toBe(5);
    expect(calculateShelfPercentage(1, 8)).toBe(12.5);
    expect(calculateShelfPercentage(1, 0)).toBe(0);
  });

  it("يحافظ على ترتيب أول صنف ومنتج اختاره المستخدم", () => {
    const products = [
      { productId: "b1", productName: "مسحوق منافس", type: "competitor" as const, category: "مسحوق" },
      { productId: "a1", productName: "منظف شركة", type: "company" as const, category: "منظفات" },
      { productId: "b2", productName: "مسحوق شركة", type: "company" as const, category: "مسحوق" },
      { productId: "a2", productName: "منظف آخر", type: "company" as const, category: "منظفات" },
    ];
    expect(orderSurveyProducts(products).map((product) => product.productId)).toEqual(["b1", "b2", "a1", "a2"]);
  });

  it("ينظف قيم الرفوف السالبة وغير الرقمية", () => {
    expect(normalizeShelfValue("4")).toBe(4);
    expect(normalizeShelfValue("0.5")).toBe(0.5);
    expect(normalizeShelfValue("2,75")).toBe(2.75);
    expect(normalizeShelfValue("-2")).toBe(0);
    expect(normalizeShelfValue("abc")).toBe(0);
  });
});
