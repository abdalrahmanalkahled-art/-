import { describe, expect, it } from "vitest";

import { getDynamicBarLayout } from "../chart-bar-layout";

describe("توزيع أعمدة المخططات", () => {
  it("يوزع عموداً واحداً في منتصف المخطط", () => {
    const layout = getDynamicBarLayout(600, 1, 1);
    expect(layout.gap * 2 + layout.barWidth).toBeCloseTo(600, 5);
  });

  it("يجعل الفراغات متساوية قبل الأعمدة وبينها وبعدها", () => {
    const layout = getDynamicBarLayout(600, 1, 2);
    expect(layout.gap).toBeGreaterThan(0);
    expect(layout.barWidth).toBeGreaterThan(0);
    expect(layout.gap * 3 + layout.barWidth * 2).toBeCloseTo(600, 5);
  });

  it("يحافظ على عرض ثابت للأعمدة ما دامت المساحة تسمح", () => {
    expect(getDynamicBarLayout(600, 1, 2).barWidth).toBe(getDynamicBarLayout(600, 1, 10).barWidth);
  });
});
