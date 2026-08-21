import { describe, expect, it } from "vitest";

import { buildStorageOverview, formatStorageBytes } from "../storage-space-model";

describe("نموذج إدارة مساحة التخزين", () => {
  it("ينسق الحجم بوحدات مفهومة", () => {
    expect(formatStorageBytes(512)).toBe("512 بايت");
    expect(formatStorageBytes(2 * 1024 * 1024)).toBe("2.0 ميغابايت");
  });

  it("يفصل بين مساحة المستندات والملفات المؤقتة", () => {
    const overview = buildStorageOverview({ reports: { bytes: 100, fileCount: 2 }, temporary: { bytes: 30, fileCount: 1 } }, 900);
    expect(overview.documentBytes).toBe(100);
    expect(overview.temporaryBytes).toBe(30);
    expect(overview.totalBytes).toBe(130);
    expect(overview.freeBytes).toBe(900);
  });
});
