import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(), setItem: vi.fn() } }));
vi.mock("expo-file-system/legacy", () => ({ StorageAccessFramework: {} }));
vi.mock("expo-intent-launcher", () => ({ startActivityAsync: vi.fn() }));
vi.mock("expo-sharing", () => ({ isAvailableAsync: vi.fn(), shareAsync: vi.fn() }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));

import { buildEventMediaFilename, buildEventVideoFilename, getEventMediaMimeType, getMediaExtension, getVideoExtension } from "../event-video-storage";

describe("حفظ فيديوهات الفعاليات", () => {
  it("يحتفظ بامتداد الفيديو الأصلي عند توفره", () => {
    expect(getVideoExtension("file:///tmp/clip.mov", "زيارة_المعرض.mov")).toBe("mov");
    expect(getVideoExtension("file:///tmp/clip.webm?token=1")).toBe("webm");
  });

  it("يستخدم امتداد mp4 آمناً عندما لا يقدّم المصدر امتداداً", () => {
    expect(getVideoExtension("content://media/video/42")).toBe("mp4");
  });

  it("ينشئ اسماً فريداً ومنظماً يتضمن معرّف الفعالية", () => {
    vi.spyOn(Date, "now").mockReturnValue(1720000000000);
    expect(buildEventVideoFilename("event-9", "file:///clip.mp4", "توثيق.mp4")).toBe("event_event-9_1720000000000.mp4");
    vi.restoreAllMocks();
  });

  it("يستخدم امتداداً آمناً للصور وينشئ اسماً منظماً لها", () => {
    vi.spyOn(Date, "now").mockReturnValue(1720000000000);
    expect(getMediaExtension("content://media/image/42", null, "image")).toBe("jpg");
    expect(buildEventMediaFilename("event-9", "file:///photo.png", "image", "توثيق.png")).toBe("event_event-9_1720000000000.png");
    expect(getEventMediaMimeType("png", "image")).toBe("image/png");
    vi.restoreAllMocks();
  });
});
