import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: { multiGet: vi.fn(), multiSet: vi.fn(), multiRemove: vi.fn() } }));
vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///app/documents/", cacheDirectory: "file:///app/cache/", EncodingType: { UTF8: "utf8", Base64: "base64" } }));
vi.mock("../storage", () => ({ STORAGE_KEYS: { STORES: "madar_stores", EVENTS: "madar_events" } }));
vi.mock("../full-backup", () => ({ BACKUP_DATA_KEYS: ["madar_stores", "madar_events"] }));

import { createBackupPreview, parseFullBackup } from "../backup-restore";

describe("استعادة النسخة الاحتياطية", () => {
  it("يتحقق من النسخة ويبني معاينة للسجلات والوسائط قبل الاستعادة", () => {
    const payload = parseFullBackup(JSON.stringify({
      schemaVersion: 1, type: "madar-full-backup", createdAt: "2026-08-17T09:00:00.000Z",
      data: { madar_stores: '[{"id":"store-1"}]', madar_events: '[{"id":"event-1"},{"id":"event-2"}]' },
      media: [{ relativePath: "event_documentation/photo.jpg", base64: "YWJj", size: 3 }], skippedMediaPaths: [],
    }));
    const preview = createBackupPreview(payload);
    expect(preview).toMatchObject({ dataGroupCount: 2, recordCount: 3, mediaCount: 1 });
    expect(preview.groups.map((group) => group.label)).toContain("المحلات");
  });

  it("يرفض الملفات التي تحاول الكتابة خارج مساحة التطبيق", () => {
    expect(() => parseFullBackup(JSON.stringify({
      schemaVersion: 1, type: "madar-full-backup", createdAt: "2026-08-17T09:00:00.000Z", data: {},
      media: [{ relativePath: "../outside.jpg", base64: "YWJj", size: 3 }], skippedMediaPaths: [],
    }))).toThrow("غير آمنة");
  });

  it("يميّز النسخة الجزئية كي تُدمج بياناتها دون اعتبارها نسخة كاملة", () => {
    const payload = parseFullBackup(JSON.stringify({
      schemaVersion: 1, type: "madar-full-backup", backupKind: "partial", sections: ["stores"], createdAt: "2026-08-17T09:00:00.000Z",
      data: { madar_stores: '[{"id":"store-1"}]' }, media: [], skippedMediaPaths: [],
    }));
    const preview = createBackupPreview(payload);
    expect(preview).toMatchObject({ isPartial: true, sections: ["stores"], dataGroupCount: 1 });
  });
});
