import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: { multiGet: vi.fn(), multiSet: vi.fn(), multiRemove: vi.fn() } }));
vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///new-app/documents/", cacheDirectory: "file:///new-app/cache/", EncodingType: { UTF8: "utf8", Base64: "base64" }, StorageAccessFramework: {} }));
vi.mock("../full-backup", () => ({ BACKUP_DATA_KEYS: ["madar_events", "madar_market_visit_report_templates", "madar_analytics_settings"] }));
vi.mock("../backup-merge", () => ({ LOCAL_SETTINGS_KEYS: new Set(), mergeBackupData: vi.fn() }));
vi.mock("../backup-restore-history", () => ({ createLastRestoreHistory: vi.fn(), saveLastRestoreHistory: vi.fn() }));
vi.mock("../marketing-manager-storage", () => ({ restoreMarketingManagerFile: vi.fn() }));

import { rebasePayloadMediaReferences } from "../backup-restore";

describe("إعادة ربط ملفات النسخة بين هاتفين", () => {
  it("يستبدل مسارات البيئة القديمة بمسارات marketing manager الجديدة في الصور والقوالب والشعارات", () => {
    const oldImage = "content://old-device/marketing%20manager/media/event.jpg";
    const oldTemplate = "content://old-device/marketing%20manager/templates/visit.pptx";
    const oldLogo = "content://old-device/marketing%20manager/branding/report-logo.png";
    const payload = {
      schemaVersion: 1,
      type: "madar-full-backup" as const,
      backupKind: "full" as const,
      createdAt: "2026-08-22T00:00:00.000Z",
      media: [],
      skippedMediaPaths: [],
      data: {
        madar_events: JSON.stringify([{ id: "event-1", imageUri: oldImage }]),
        madar_market_visit_report_templates: JSON.stringify([{ id: "template-1", uri: oldTemplate }]),
        madar_analytics_settings: JSON.stringify({ logoUri: oldLogo }),
      },
    };
    const rebased = rebasePayloadMediaReferences(payload, new Map([
      [oldImage, "content://new-device/marketing%20manager/media/event.jpg"],
      [oldTemplate, "content://new-device/marketing%20manager/templates/visit.pptx"],
      [oldLogo, "content://new-device/marketing%20manager/branding/report-logo.png"],
    ]));

    expect(JSON.parse(rebased.data.madar_events)[0].imageUri).toContain("new-device");
    expect(JSON.parse(rebased.data.madar_market_visit_report_templates)[0].uri).toContain("new-device");
    expect(JSON.parse(rebased.data.madar_analytics_settings).logoUri).toContain("new-device");
  });
});
