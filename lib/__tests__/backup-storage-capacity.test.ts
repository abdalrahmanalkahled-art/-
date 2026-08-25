import { describe, expect, it } from "vitest";

import { describeBackupRestoreSpaceError, estimateBackupRestoreSpace, hasEnoughBackupRestoreSpace } from "../backup-storage-capacity";

const payload = {
  schemaVersion: 1,
  type: "madar-full-backup" as const,
  backupKind: "full" as const,
  createdAt: "2026-08-25T00:00:00.000Z",
  data: { madar_stores: '[{"id":"store-1"}]' },
  media: [
    { relativePath: "event_documentation/photo.jpg", base64: "YWJj", size: 3 },
    { relativePath: "marketing-manager/media/logo.jpg", base64: "YWJj", size: 3 },
  ],
  skippedMediaPaths: [],
};

describe("السعة الفعلية لاستعادة النسخة", () => {
  it("يحسب فقط الملفات التي ستكتب داخل حاوية التطبيق ولا يفرض سقفاً ثابتاً على حجم النسخة", () => {
    const estimate = estimateBackupRestoreSpace(payload);
    expect(estimate.localMediaBytes).toBe(3);
    expect(estimate.requiredBytes).toBeGreaterThan(3);
    expect(hasEnoughBackupRestoreSpace(payload, estimate.requiredBytes + 60 * 1024 * 1024)).toBe(true);
  });

  it("يرفض فقط حين تكون المساحة الحرة المبلّغ عنها أقل من حجم الكتابة الفعلي", () => {
    const estimate = estimateBackupRestoreSpace(payload);
    expect(hasEnoughBackupRestoreSpace(payload, estimate.requiredBytes - 1)).toBe(false);
    expect(hasEnoughBackupRestoreSpace(payload, null)).toBe(true);
    expect(describeBackupRestoreSpaceError(60 * 1024 * 1024, 30 * 1024 * 1024)).toContain("60.0 ميغابايت");
  });
});
