import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readAsStringAsync: vi.fn(),
  copyAsync: vi.fn(),
  getInfoAsync: vi.fn(),
  deleteAsync: vi.fn(),
  manipulateAsync: vi.fn(),
}));

vi.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { Base64: "base64" },
  StorageAccessFramework: { readAsStringAsync: mocks.readAsStringAsync },
  readAsStringAsync: mocks.readAsStringAsync,
  copyAsync: mocks.copyAsync,
  getInfoAsync: mocks.getInfoAsync,
  deleteAsync: mocks.deleteAsync,
}));
vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: mocks.manipulateAsync,
}));

import { pdfExportErrorMessage, preparePdfImageDataUri } from "../pdf-media";

describe("وسائط تقارير PDF", () => {
  afterEach(() => vi.clearAllMocks());

  it("ينسخ content:// محلياً ثم يضغطه وينظف نسخه المؤقتة دون قراءة الأصل Base64", async () => {
    mocks.getInfoAsync.mockImplementation(async (uri: string) => uri.includes("resized") ? { exists: true, isDirectory: false, size: 1500 } : { exists: true, isDirectory: false, size: 1024 * 1024 });
    mocks.readAsStringAsync.mockResolvedValue("compressed-base64");
    mocks.manipulateAsync.mockResolvedValue({ uri: "file:///cache/resized.jpg" });
    mocks.copyAsync.mockResolvedValue(undefined);
    mocks.deleteAsync.mockResolvedValue(undefined);

    await expect(preparePdfImageDataUri("content://provider/image", { width: 720, quality: 0.55, prefix: "report" }))
      .resolves.toBe("data:image/jpeg;base64,compressed-base64");

    expect(mocks.copyAsync).toHaveBeenCalledWith({ from: "content://provider/image", to: expect.stringContaining("report-") });
    expect(mocks.manipulateAsync).toHaveBeenCalledWith(expect.stringContaining("report-"), [{ resize: { width: 720 } }], { compress: 0.55, format: "jpeg" });
    expect(mocks.deleteAsync).toHaveBeenCalledWith(expect.stringContaining("report-"), { idempotent: true });
    expect(mocks.deleteAsync).toHaveBeenCalledWith("file:///cache/resized.jpg", { idempotent: true });
  });

  it("يضمّن الصورة الصغيرة مباشرة من دون انتظار ضغط غير ضروري", async () => {
    mocks.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, size: 1000 });
    mocks.readAsStringAsync.mockResolvedValue("small-base64");

    await expect(preparePdfImageDataUri("file:///documents/photo.png"))
      .resolves.toBe("data:image/png;base64,small-base64");

    expect(mocks.manipulateAsync).not.toHaveBeenCalled();
    expect(mocks.copyAsync).not.toHaveBeenCalled();
  });

  it("لا يعرض خطأ المساحة كمساحة فعلية عندما يكون عطل الطباعة مع وسائط", () => {
    expect(pdfExportErrorMessage(new Error("No space left on device"))).toContain("محرك الطباعة");
  });

  it("يشرح خطأ نفاد الذاكرة بوضوح بدلاً من اعتباره نقص مساحة", () => {
    expect(pdfExportErrorMessage(new Error("java.lang.OutOfMemoryError: Failed to allocate"))).toContain("ذاكرة التطبيق");
  });
});
