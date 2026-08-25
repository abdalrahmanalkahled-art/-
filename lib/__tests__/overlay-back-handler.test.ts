import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ BackHandler: { addEventListener: vi.fn() } }));
vi.mock("expo-router", () => ({ useFocusEffect: vi.fn(), useNavigation: vi.fn() }));

import { closeTopOverlay } from "../use-overlay-back-handler";

describe("ترتيب رجوع الواجهات العائمة", () => {
  it("يغلق أعلى واجهة فقط ولا ينفذ ما تحتها", () => {
    const top = vi.fn(() => true);
    const selection = vi.fn(() => true);
    expect(closeTopOverlay([top, selection])).toBe(true);
    expect(top).toHaveBeenCalledOnce();
    expect(selection).not.toHaveBeenCalled();
  });

  it("يسمح بالرجوع الطبيعي عندما لا توجد نافذة أو حالة تحديد", () => {
    expect(closeTopOverlay([() => false, () => false])).toBe(false);
  });
});
