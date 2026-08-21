import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const moreSource = readFileSync(resolve(process.cwd(), "app/(tabs)/more.tsx"), "utf8");
const tabsSource = readFileSync(resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");

describe("أداء انتقالات التنقل", () => {
  it("يستخدم محرك الحركة الأصلي عند تمدد بطاقة المزيد", () => {
    expect(moreSource).toContain("useNativeDriver: true");
    expect(moreSource).toContain("scaleX: expansion.interpolate");
    expect(moreSource).toContain("scaleY: expansion.interpolate");
    expect(moreSource).toContain("duration: 220");
    expect(moreSource).toContain('<Animated.View pointerEvents="none"');
    expect(moreSource).toContain('<View pointerEvents="none" style={[styles.expandingHero');
  });

  it("يبقي التبويبات التي زارها المستخدم جاهزة للعودة إليها", () => {
    expect(tabsSource).toContain("detachInactiveScreens={false}");
    expect(tabsSource).toContain("freezeOnBlur: true");
    expect(tabsSource).toContain("config: { duration: 220");
  });
});
