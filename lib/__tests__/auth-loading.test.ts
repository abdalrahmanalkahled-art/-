import { describe, expect, it } from "vitest";
import {
  AUTH_CHECK_TIMEOUT_MS,
  shouldShowLoading,
  withTimeout,
} from "../auth-loading";

describe("withTimeout", () => {
  it("يعيد قيمة الوعد عند اكتماله قبل المهلة", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 100, "fallback")).resolves.toBe("ok");
  });

  it("يعيد القيمة البديلة عند تجاوز المهلة", async () => {
    const delayed = new Promise<string>((resolve) => {
      setTimeout(() => resolve("late"), AUTH_CHECK_TIMEOUT_MS + 50);
    });

    await expect(withTimeout(delayed, 10, "fallback")).resolves.toBe("fallback");
  });

  it("يعيد القيمة البديلة عند رفض الوعد", async () => {
    await expect(
      withTimeout(Promise.reject(new Error("storage unavailable")), 100, null),
    ).resolves.toBeNull();
  });

  it("لا يعرض غطاء التحميل في معاينة الويب", () => {
    expect(shouldShowLoading("web", true, false)).toBe(false);
  });

  it("يعرض غطاء التحميل على الهاتف قبل انتهاء التحقق", () => {
    expect(shouldShowLoading("android", true, false)).toBe(true);
    expect(shouldShowLoading("ios", true, true)).toBe(false);
  });
});
