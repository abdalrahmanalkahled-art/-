import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  multiGet: vi.fn(),
  multiSet: vi.fn(),
  multiRemove: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage,
}));

vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///app/documents/",
  cacheDirectory: "file:///app/cache/",
  EncodingType: { UTF8: "utf8", Base64: "base64" },
}));

vi.mock("../full-backup", () => ({
  BACKUP_DATA_KEYS: ["madar_products", "madar_product_categories"],
}));

vi.mock("../backup-merge", () => ({
  LOCAL_SETTINGS_KEYS: new Set(),
  mergeBackupData: vi.fn(),
}));

vi.mock("../backup-restore-history", () => ({
  createLastRestoreHistory: vi.fn(),
  saveLastRestoreHistory: vi.fn(),
}));

vi.mock("../marketing-manager-storage", () => ({
  restoreMarketingManagerFile: vi.fn(),
}));

import { restoreDataWithRollback } from "../backup-restore";

describe("حماية الأصناف عند استعادة النسخة", () => {
  beforeEach(() => {
    storage.multiGet.mockReset();
    storage.multiSet.mockReset();
    storage.multiRemove.mockReset();
    storage.multiGet.mockResolvedValue([
      ["madar_products", '[{"id":"product-local","name":"منظف"}]'],
      ["madar_product_categories", '[{"id":"category-local","name":"منظفات"}]'],
    ]);
    storage.multiSet.mockResolvedValue(undefined);
    storage.multiRemove.mockResolvedValue(undefined);
  });

  it("لا يحذف الأصناف المحلية عندما لا تشتمل النسخة الكاملة على مفتاح الأصناف", async () => {
    await restoreDataWithRollback({
      schemaVersion: 1,
      type: "madar-full-backup",
      backupKind: "full",
      createdAt: "2026-08-22T00:00:00.000Z",
      data: { madar_products: '[{"id":"product-backup","name":"صابون"}]' },
      media: [],
      skippedMediaPaths: [],
    });

    expect(storage.multiSet).toHaveBeenCalledWith([["madar_products", '[{"id":"product-backup","name":"صابون"}]']]);
    expect(storage.multiRemove).not.toHaveBeenCalled();
  });
});
