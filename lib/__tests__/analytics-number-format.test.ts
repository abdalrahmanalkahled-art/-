import { describe, expect, it } from "vitest";

import { formatAnalyticsNumber, formatArabicDate, toWesternDigits } from "../analytics-number-format";

describe("تنسيق أرقام التحليلات", () => {
  it("يعرض الأرقام بصيغة غربية حتى عند ورودها ضمن نص عربي", () => {
    expect(formatAnalyticsNumber(1234567)).toBe("1,234,567");
    expect(toWesternDigits("١٢٣ و ۴۵۶")).toBe("123 و 456");
  });

  it("يحافظ على أسماء الشهور العربية ويعرض أرقام التاريخ بصيغة غربية", () => {
    const formatted = formatArabicDate("2026-08-22", { year: "numeric", month: "long", day: "numeric" });
    expect(formatted).toContain("2026");
    expect(formatted).not.toMatch(/[٠-٩۰-۹]/);
  });
});
