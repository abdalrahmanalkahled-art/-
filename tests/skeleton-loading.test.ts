import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const skeleton = readFileSync(resolve(process.cwd(), "components/ui/skeleton-loading.tsx"), "utf8");

describe("حالات التحميل الهيكلية", () => {
  it("يوفر هياكل موحّدة للقوائم والصفحات والنماذج", () => {
    expect(skeleton).toContain("export function SkeletonList");
    expect(skeleton).toContain("export function SkeletonPage");
    expect(skeleton).toContain("export function SkeletonForm");
  });

  it("يستخدم حركة شفافية خفيفة مدعومة أصلياً ويحترم ألوان الهوية", () => {
    expect(skeleton).toContain("useColors()");
    expect(skeleton).toContain("Animated.loop");
    expect(skeleton).toContain("useNativeDriver: true");
    expect(skeleton).toContain("accessibilityLabel=\"جارٍ تحميل البيانات\"");
  });

  it("يدعم غلاف النموذج العائم إظهار نموذج هيكلي أثناء تجهيز البيانات", () => {
    const modal = readFileSync(resolve(process.cwd(), "components/floating-form-modal.tsx"), "utf8");
    const surveyModal = readFileSync(resolve(process.cwd(), "components/surveys/survey-page-sheet-modal.tsx"), "utf8");
    expect(modal).toContain("isLoading?: boolean");
    expect(modal).toContain("isLoading ? <SkeletonForm /> : children");
    expect(surveyModal).toContain("isLoading={isLoading}");
  });

  it("يربط هيكل التحميل بصفحات السجلات ووحدات صفحة المزيد ذات التحميل المحلي", () => {
    const files = [
      "app/(tabs)/index.tsx",
      "app/(tabs)/stores.tsx",
      "app/(tabs)/events.tsx",
      "app/(tabs)/surveys.tsx",
      "components/modules/warehouse-module.tsx",
      "components/modules/expenses-module.tsx",
      "components/modules/products-module.tsx",
      "components/modules/goals-module.tsx",
      "components/modules/brands-regions-module.tsx",
      "components/modules/signage-module.tsx",
    ];
    files.forEach((path) => {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");
      expect(source).toContain("isInitialLoading");
      expect(source).toMatch(/SkeletonPage|SkeletonList/);
    });
  });
});
