import { beforeEach, describe, expect, it, vi } from "vitest";

const expoImagePicker = vi.hoisted(() => ({
  launchImageLibraryAsync: vi.fn(),
  launchCameraAsync: vi.fn(),
  requestCameraPermissionsAsync: vi.fn(),
}));

vi.mock("expo-image-picker", () => ({
  MediaTypeOptions: {
    Images: "images",
    Videos: "videos",
    All: "all",
  },
  ...expoImagePicker,
}));

import { launchCamera, launchImageLibrary } from "../media-picker";

describe("media picker compatibility wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يعيد إلغاء الاختيار بدون محاولة قراءة أصل غير موجود", async () => {
    expoImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
    const callback = vi.fn();

    await launchImageLibrary({ mediaType: "photo" }, callback);

    expect(callback).toHaveBeenCalledWith({ didCancel: true });
    expect(expoImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: "images" }),
    );
  });

  it("يحوّل بيانات الوسيط إلى الشكل الموحد الذي تستخدمه الشاشات", async () => {
    expoImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///event.mp4",
          mimeType: "video/mp4",
          fileName: "event.mp4",
          fileSize: 100,
          width: 640,
          height: 480,
          duration: 2500,
        },
      ],
    });
    const callback = vi.fn();

    await launchImageLibrary({ mediaType: "mixed", quality: 0.8 }, callback);

    expect(callback).toHaveBeenCalledWith({
      assets: [
        expect.objectContaining({
          uri: "file:///event.mp4",
          type: "video",
          fileName: "event.mp4",
        }),
      ],
    });
  });

  it("لا يفتح الكاميرا عندما يرفض المستخدم الإذن", async () => {
    expoImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    const callback = vi.fn();

    await launchCamera({ mediaType: "photo" }, callback);

    expect(callback).toHaveBeenCalledWith({ errorCode: "permission_denied" });
    expect(expoImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });
});
