import { describe, expect, it, vi } from "vitest";
import { needsSignageMediaPersistence } from "@/lib/signage-media-storage";

vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file://documents/",
}));

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

describe("حارس ترحيل وسائط اللوحات", () => {
  it("يتجاوز الملف المحفوظ في مجلد وسائط اللوحات", () => {
    expect(needsSignageMediaPersistence("file://documents/signage-media/board_1.jpg")).toBe(false);
  });

  it("يرحل المسارات الخارجية والملفات القديمة غير المُدارة", () => {
    expect(needsSignageMediaPersistence("content://media/board.jpg")).toBe(true);
    expect(needsSignageMediaPersistence("file://cache/board.jpg")).toBe(true);
  });
});
