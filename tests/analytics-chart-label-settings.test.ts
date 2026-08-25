import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/analytics-settings-sheet.tsx"), "utf8");
const chartSource = readFileSync(resolve(process.cwd(), "components/analytics-tracking-chart.tsx"), "utf8");

describe("تفاصيل مخطط الأعمدة في إعدادات التحليلات", () => {
  it("يعرض تحكمين مستقلين لأسماء المنتجات والنسب", () => {
    expect(source).toContain("تفاصيل مخطط الأعمدة");
    expect(source).toContain('label="إظهار النسب"');
    expect(source).toContain('label="إظهار أسماء المنتجات"');
    expect(source).toContain("showChartValues");
    expect(source).toContain("showChartProductNames");
    expect(source).toContain("حجم خط التسميات");
    expect(source).toContain("تدوير أسماء المنتجات الطويلة");
    expect(source).toContain("chartLabelSize");
    expect(source).toContain("rotateProductNames");
  });

  it("يربط النسبة بقمة العمود والاسم بأسفله ويبدأ السحب بعد ثمانية أعمدة", () => {
    expect(chartSource).toContain("MAX_BARS_BEFORE_HORIZONTAL_SCROLL = 8");
    expect(chartSource).toContain("SCROLLABLE_BAR_GAP = 12");
    expect(chartSource).toContain("yAt(value) - 5");
    expect(chartSource).toContain("rotate(-45");
    expect(chartSource).toContain("toWesternDigits(product.productName)");
  });

  it("يعرض تلميحاً للقيمة الدقيقة عند لمس العمود أو المرور فوقه", () => {
    expect(chartSource).toContain('import { useEffect, useRef, useState } from "react";');
    expect(chartSource).not.toContain('Text, useState, useWindowDimensions');
    expect(chartSource).toContain("onBarInteraction: setTooltip");
    expect(chartSource).toContain("onBarInteraction={onBarInteraction}");
    expect(chartSource).toContain("onMouseEnter");
    expect(chartSource).toContain("event.stopPropagation?.(); onBarInteraction(tooltip);");
    expect(chartSource).toContain("الدورة:");
    expect(chartSource).toContain("styles.tooltip");
    expect(chartSource).toContain("<Pressable onPress={dismissTooltip}");
    expect(chartSource).toContain("Animated.timing(tooltipOpacity");
    expect(chartSource).toContain("backgroundColor: colors.surface");
  });
});
