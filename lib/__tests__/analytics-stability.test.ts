import { describe, expect, it } from "vitest";

import { useAnalytics } from "../analytics";

describe("واجهة التحليلات", () => {
  it("تعيد مرجعاً ثابتاً حتى لا تعيد تأثيرات الشاشات التحميل عند كل عملية رسم", () => {
    const firstReference = useAnalytics();
    const secondReference = useAnalytics();

    expect(secondReference).toBe(firstReference);
    expect(secondReference.track).toBe(firstReference.track);
    expect(secondReference.trackPageView).toBe(firstReference.trackPageView);
  });
});
