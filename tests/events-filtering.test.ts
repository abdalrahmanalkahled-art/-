import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("فعاليات: الترتيب وفلترة الماركة", () => {
  const source = read("app/(tabs)/events.tsx");
  const goalsSource = read("components/modules/goals-module.tsx");

  it("يرتب القائمة تنازلياً وفق تاريخ الفعالية لا وقت الإضافة", () => {
    expect(source).toContain("eventDateValue(b.eventDate) - eventDateValue(a.eventDate)");
    expect(source).not.toContain("new Date(b.createdAt)");
  });

  it("يستخدم شرائح الفلترة الموحدة للماركات ويلغي فلترة الحالة في القائمة", () => {
    expect(source).toContain("MoreModuleFilterChips");
    expect(source).toContain("filterBrand");
    expect(source).toContain("brandName");
    expect(source).toContain("كل الماركات");
    expect(source).not.toContain("filterStatus === opt.value");
  });

  it("يعيد خفض KPI للهدف عند حذف فعالية مكتملة مرتبطة به", () => {
    expect(source).toContain('removedEvent?.status === "completed" && removedEvent.goalId');
    expect(source).toContain("Number(goal.currentValue || 0) - 1");
    expect(source).toContain("completionPercentage");
    expect(source).toContain("STORAGE_KEYS.MARKETING_GOALS");
  });

  it("يعيد تحميل الأهداف عند العودة إلى شاشة الخطة", () => {
    expect(goalsSource).toContain("useFocusEffect");
    expect(goalsSource).toContain("void loadData();");
  });
});
