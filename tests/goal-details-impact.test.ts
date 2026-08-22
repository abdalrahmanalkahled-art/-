import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { getGoalImpactMetrics } from "../lib/goal-impact-metrics";

const goalDetails = readFileSync(resolve(process.cwd(), "app/goal-details.tsx"), "utf8");
const events = readFileSync(resolve(process.cwd(), "app/(tabs)/events.tsx"), "utf8");
const animatedCard = readFileSync(resolve(process.cwd(), "components/animated-card.tsx"), "utf8");

describe("مؤشرات أثر الفعاليات في تفاصيل الهدف", () => {
  it("يجمع الهدايا والحضور ويحسب المناطق الفريدة مع بديل الموقع", () => {
    expect(getGoalImpactMetrics([
      { giftsDistributed: 12, attendeesCount: 40, region: "دمشق" },
      { giftsDistributed: "8", attendeesCount: "25", region: "دمشق" },
      { giftsDistributed: -3, attendeesCount: null, location: "حلب" },
      { giftsDistributed: "غير صالح", attendeesCount: 5, region: " " },
    ])).toEqual({ totalGifts: 20, totalBeneficiaries: 70, coveredRegionCount: 2 });
  });

  it("يعرض مؤشرات الأثر والمناطق ولا يعرض قسم المهام في تفاصيل الهدف", () => {
    expect(goalDetails).toContain('label="إجمالي الهدايا"');
    expect(goalDetails).toContain('label="إجمالي المستفيدين"');
    expect(goalDetails).toContain('label="مناطق مغطاة"');
    expect(goalDetails).not.toContain('>المهام<');
  });

  it("يفتح تفاصيل الفعالية المرتبطة ويستقبل معرّفها في شاشة الفعاليات", () => {
    expect(goalDetails).toContain('pathname: "/(tabs)/events", params: { eventId: event.id }');
    expect(events).toContain("useLocalSearchParams<{ eventId?: string }>()");
    expect(events).toContain("setShowEventDetails(true)");
  });

  it("يدعم الضغط المطوّل في البطاقة المتحركة المستخدمة للأهداف", () => {
    expect(animatedCard).toContain("onLongPress?: () => void;");
    expect(animatedCard).toContain("onLongPress={onLongPress}");
  });
});
