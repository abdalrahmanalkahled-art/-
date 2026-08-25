import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  createFileAsync: vi.fn(),
  copyAsync: vi.fn(),
  getInfoAsync: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: mocks.getItem, setItem: mocks.setItem } }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-file-system/legacy", () => ({
  StorageAccessFramework: {
    createFileAsync: mocks.createFileAsync,
    copyAsync: mocks.copyAsync,
    readDirectoryAsync: vi.fn(),
    makeDirectoryAsync: vi.fn(),
  },
  getInfoAsync: mocks.getInfoAsync,
}));

import { restoreMarketingManagerFileFromUri } from "../marketing-manager-storage";

describe("استعادة ملفات marketing manager", () => {
  afterEach(() => vi.clearAllMocks());

  it("ينسخ الملف المحلي إلى SAF ويحدّث سجل المرجع من دون Base64", async () => {
    mocks.getItem
      .mockResolvedValueOnce(JSON.stringify({ rootUri: "content://root", mediaUri: "content://media", templatesUri: "content://templates", brandingUri: "content://branding", backupsUri: "content://backups", selectedAt: "2026-08-25" }))
      .mockResolvedValueOnce("[]");
    mocks.createFileAsync.mockResolvedValue("content://media/restored-photo");
    mocks.copyAsync.mockResolvedValue(undefined);
    mocks.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, size: 42 });

    await expect(restoreMarketingManagerFileFromUri("media/photo.jpg", "file:///documents/source.jpg"))
      .resolves.toBe("content://media/restored-photo");

    expect(mocks.copyAsync).toHaveBeenCalledWith({ from: "file:///documents/source.jpg", to: "content://media/restored-photo" });
    expect(mocks.setItem).toHaveBeenCalledWith(expect.any(String), expect.stringContaining("media/photo.jpg"));
  });
});
