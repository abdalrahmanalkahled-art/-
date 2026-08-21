import { describe, expect, it } from "vitest";

import { getKeyboardAvoidingBehavior } from "../keyboard-layout";

describe("getKeyboardAvoidingBehavior", () => {
  it("uses padding only on iOS", () => {
    expect(getKeyboardAvoidingBehavior("ios")).toBe("padding");
  });

  it("uses padding on Android so the form action bar stays above the keyboard", () => {
    expect(getKeyboardAvoidingBehavior("android")).toBe("padding");
  });
});
