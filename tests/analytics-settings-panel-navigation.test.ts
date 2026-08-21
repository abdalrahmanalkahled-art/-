import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("تنظيم إعدادات التحليلات", () => {
  it("يعرض بطاقات الوصول ونوافذ فرعية لكل مجموعة إعدادات دون حذف الخيارات", () => {
    const source = readFileSync("components/analytics-settings-sheet.tsx", "utf8");
    expect(source).toContain('title="المخطط"');
    expect(source).toContain('title="منهجية التقرير"');
    expect(source).toContain('title="حدود القرار"');
    expect(source).toContain('title="مؤشرات القرار"');
    expect(source).toContain('title="مصفوفة المنطقة والمنتج"');
    expect(source).toContain('title="محتوى التقرير"');
    expect(source).toContain("function PanelModal");
    expect(source).toContain("حفظ الإعدادات");
  });
});
