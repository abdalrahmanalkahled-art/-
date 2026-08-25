import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sourceText: "",
  files: new Map<string, Uint8Array>(),
  multiSet: vi.fn(),
  writeBytes: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    multiGet: vi.fn().mockResolvedValue([]),
    multiSet: mocks.multiSet.mockResolvedValue(undefined),
    multiRemove: vi.fn(),
  },
}));
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///app/documents/",
  cacheDirectory: "file:///app/cache/",
  EncodingType: { UTF8: "utf8", Base64: "base64" },
  getInfoAsync: vi.fn(async (uri: string) => {
    if (uri === "file:///backup.json") return { exists: true, isDirectory: false, size: new TextEncoder().encode(mocks.sourceText).length };
    const bytes = mocks.files.get(uri);
    return bytes ? { exists: true, isDirectory: false, size: bytes.length } : { exists: false, isDirectory: false, size: 0 };
  }),
  readAsStringAsync: vi.fn(async (_uri: string, options: { position?: number; length?: number }) => {
    const bytes = new TextEncoder().encode(mocks.sourceText);
    const start = options.position || 0;
    const end = start + (options.length || bytes.length);
    return Buffer.from(bytes.slice(start, end)).toString("base64");
  }),
  makeDirectoryAsync: vi.fn().mockResolvedValue(undefined),
  deleteAsync: vi.fn().mockResolvedValue(undefined),
  readDirectoryAsync: vi.fn().mockResolvedValue([]),
  getFreeDiskStorageAsync: vi.fn().mockResolvedValue(1024 * 1024 * 1024),
}));
vi.mock("expo-file-system/next", () => ({
  File: class {
    constructor(private readonly uri: string) {}
    create() { mocks.files.set(this.uri, new Uint8Array()); }
    open() {
      const targetUri = this.uri;
      return {
        writeBytes(bytes: Uint8Array) {
          const previous = mocks.files.get(targetUri) || new Uint8Array();
          const next = new Uint8Array(previous.length + bytes.length);
          next.set(previous);
          next.set(bytes, previous.length);
          mocks.files.set(targetUri, next);
          mocks.writeBytes(bytes);
        },
        close() {},
      };
    }
  },
}));
vi.mock("../full-backup", () => ({ BACKUP_DATA_KEYS: ["madar_events"] }));
vi.mock("../backup-merge", () => ({ BACKUP_KEY_LABELS: { madar_events: "الفعاليات" }, LOCAL_SETTINGS_KEYS: new Set(), mergeBackupData: vi.fn() }));
vi.mock("../backup-restore-history", () => ({ createLastRestoreHistory: vi.fn(() => ({})), saveLastRestoreHistory: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../marketing-manager-storage", () => ({ restoreMarketingManagerFile: vi.fn(), restoreMarketingManagerFileFromUri: vi.fn() }));

import { readLargeBackupHeader, restoreFullBackup } from "../backup-restore";

describe("استعادة الوسائط من النسخ الكبيرة المتدرجة", () => {
  it("يكتب الملف الداخلي في المسار النهائي ويعيد ربط سجل البيانات به", async () => {
    const sourceUri = "file:///old-app/event_documentation/photo.jpg";
    mocks.sourceText = JSON.stringify({
      schemaVersion: 1,
      type: "madar-full-backup",
      createdAt: "2026-08-25T00:00:00.000Z",
      data: { madar_events: JSON.stringify([{ id: "event-1", imageUri: sourceUri }]) },
      media: [{ relativePath: "event_documentation/photo.jpg", sourceUri, size: 4, base64: "AQIDBA==" }],
      skippedMediaPaths: [],
    });

    const payload = await readLargeBackupHeader("file:///backup.json");
    await restoreFullBackup(payload);

    expect(Array.from(mocks.files.get("file:///app/documents/event_documentation/photo.jpg") || [])).toEqual([1, 2, 3, 4]);
    const writtenEvents = JSON.parse(mocks.multiSet.mock.calls[0][0][0][1]);
    expect(writtenEvents[0].imageUri).toBe("file:///app/documents/event_documentation/photo.jpg");
  });
});
