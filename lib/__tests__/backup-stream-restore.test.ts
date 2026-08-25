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
vi.mock("../full-backup", () => ({ BACKUP_DATA_KEYS: ["madar_survey_results"] }));
vi.mock("../backup-merge", () => ({ BACKUP_KEY_LABELS: { madar_survey_results: "نتائج الاستبيانات" }, LOCAL_SETTINGS_KEYS: new Set(), mergeBackupData: vi.fn() }));
vi.mock("../backup-restore-history", () => ({ createLastRestoreHistory: vi.fn(() => ({})), saveLastRestoreHistory: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../marketing-manager-storage", () => ({ restoreMarketingManagerFile: vi.fn(), restoreMarketingManagerFileFromUri: vi.fn() }));

import { readLargeBackupHeader, restoreFullBackup } from "../backup-restore";

describe("استعادة الوسائط من النسخ الكبيرة المتدرجة", () => {
  it("يكتب الملف الداخلي في المسار النهائي ويعيد ربط سجل البيانات به", async () => {
    const sourceUri = "file:///data/user/0/old.app/files/survey-store-photos/store_1.jpg";
    mocks.sourceText = JSON.stringify({
      schemaVersion: 1,
      type: "madar-full-backup",
      createdAt: "2026-08-25T00:00:00.000Z",
      data: { madar_survey_results: JSON.stringify([{ id: "survey-1", storePhotoUri: sourceUri, storePhotoUris: [sourceUri] }]) },
      // هذا هو ترتيب النسخة القديمة الفعلي: مراجع المصدر والحجم تأتي بعد Base64 الكبير.
      media: [{ relativePath: "survey-store-photos/store_1.jpg", base64: "AQIDBA==", size: 4, sourceUri }],
      skippedMediaPaths: [],
    });

    const payload = await readLargeBackupHeader("file:///backup.json");
    expect(payload.media[0].sourceUri).toBe(sourceUri);
    await restoreFullBackup(payload);

    expect(Array.from(mocks.files.get("file:///app/documents/survey-store-photos/store_1.jpg") || [])).toEqual([1, 2, 3, 4]);
    const writtenResults = JSON.parse(mocks.multiSet.mock.calls[0][0][0][1]);
    expect(writtenResults[0].storePhotoUri).toBe("file:///app/documents/survey-store-photos/store_1.jpg");
    expect(writtenResults[0].storePhotoUris).toEqual(["file:///app/documents/survey-store-photos/store_1.jpg"]);
  });
});
