import { describe, expect, it, vi } from "vitest";

import { getNextFabMenuOpen, runFabItemAction } from "../fab-menu-state";

describe("FAB menu interactions", () => {
  it("يفتح ويغلق القائمة عند وجود عناصر", () => {
    expect(getNextFabMenuOpen(false, 2)).toBe(true);
    expect(getNextFabMenuOpen(true, 2)).toBe(false);
  });

  it("ينفذ إجراء العنصر فوراً بعد إغلاق القائمة", () => {
    const calls: string[] = [];
    const closeMenu = vi.fn(() => calls.push("close"));
    const action = vi.fn(() => calls.push("action"));

    runFabItemAction(closeMenu, action);

    expect(closeMenu).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
    expect(calls).toEqual(["close", "action"]);
  });
});
