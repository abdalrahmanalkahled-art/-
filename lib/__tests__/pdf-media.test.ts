import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(),
  manipulateAsync: vi.fn(),
}));

vi.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { Base64: "base64" },
  StorageAccessFramework: { readAsStringAsync: mocks.readAsStringAsync },
  readAsStringAsync: mocks.readAsStringAsync,
  writeAsStringAsync: mocks.writeAsStringAsync,
  deleteAsync: mocks.deleteAsync,
}));
vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: mocks.manipulateAsync,
}));

import { pdfExportErrorMessage, preparePdfImageDataUri } from "../pdf-media";

describe("وسائط تقارير PDF", () => {
  afterEach(() => vi.clearAllMocks());

  it("يقرأ content:// عبر SAF ويضغطه ثم ينظف نسخه المؤقتة", async () => {
    mocks.readAsStringAsync.mockResolvedValueOnce("source-base64").mockResolvedValueOnce("compressed-base64");
    mocks.manipulateAsync.mockResolvedValue({ uri: "file:///cache/resized.jpg" });
    mocks.deleteAsync.mockResolvedValue(undefined);

    await expect(preparePdfImageDataUri("content://provider/image", { width: 720, quality: 0.55, prefix: "report" }))
      .resolves.toBe("data:image/jpeg;base64,compressed-base64");

    expect(mocks.writeAsStringAsync).toHaveBeenCalledWith(expect.stringContaining("report-"), "source-base64", { encoding: "base64" });
    expect(mocks.manipulateAsync).toHaveBeenCalledWith(expect.stringContaining("report-"), [{ resize: { width: 720 } }], { compress: 0.55, format: "jpeg" });
    expect(mocks.deleteAsync).toHaveBeenCalledWith(expect.stringContaining("report-"), { idempotent: true });
    expect(mocks.deleteAsync).toHaveBeenCalledWith("file:///cache/resized.jpg", { idempotent: true });
  });

  it("لا يعرض خطأ المساحة كمساحة فعلية عندما يكون عطل الطباعة مع وسائط", () => {
    expect(pdfExportErrorMessage(new Error("No space left on device"))).toContain("محرك الطباعة");
  });
});
