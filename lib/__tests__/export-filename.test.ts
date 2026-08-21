import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "../export-filename";

describe("sanitizeFilename", () => {
  it("يعقم التاريخ العربي الذي يحتوي على شرطات مائلة", () => {
    expect(sanitizeFilename("المحلات_10/8/2026", "csv")).toBe("المحلات_10_8_2026.csv");
  });

  it("يمنع رموز المسار الأخرى ويحافظ على امتداد واحد", () => {
    expect(sanitizeFilename("تقرير: فعاليات?.json", ".json")).toBe("تقرير_فعاليات_.json");
  });
});
