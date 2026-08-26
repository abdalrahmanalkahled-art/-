import { describe, expect, it } from "vitest";

import { hasUnsavedFormChanges, snapshotFormState } from "../form-state";

describe("حالة مسودات النماذج", () => {
  it("لا يطلب تأكيد الإغلاق عندما تطابق الحقول خط الأساس", () => {
    const form = { title: "", region: "", media: [] as string[] };
    expect(hasUnsavedFormChanges(snapshotFormState(form), form)).toBe(false);
  });

  it("يكتشف تغير النصوص والاختيارات قبل إغلاق النموذج", () => {
    const initial = { title: "فعالية", region: "دمشق", media: [] as string[] };
    expect(hasUnsavedFormChanges(snapshotFormState(initial), { ...initial, region: "حلب" })).toBe(true);
  });
});
