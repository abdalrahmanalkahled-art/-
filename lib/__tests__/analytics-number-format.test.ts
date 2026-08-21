import { describe, expect, it } from "vitest";

import { formatAnalyticsNumber, toWesternDigits } from "../analytics-number-format";

describe("تنسيق أرقام التحليلات", () => {
  it("يعرض الأرقام بصيغة غربية حتى عند ورودها ضمن نص عربي", () => {
    expect(formatAnalyticsNumber(1234567)).toBe("1,234,567");
    expect(toWesternDigits("١٢٣ و ۴۵۶")).toBe("123 و 456");
  });
});
