import { beforeEach, describe, expect, it, vi } from "vitest";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { BACKUP_SECTION_OPTIONS, buildFullBackupPayload, collectManagedMediaUris, createFullBackup, getBackupFilename, getPartialBackupFilename, isBackupManagedMediaUri } from "../full-backup";

const { logAudit } = vi.hoisted(() => ({ logAudit: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { multiGet: vi.fn() } }));
vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///app/documents/", getInfoAsync: vi.fn(), readAsStringAsync: vi.fn(), writeAsStringAsync: vi.fn(), makeDirectoryAsync: vi.fn(), EncodingType: { Base64: "base64", UTF8: "utf8" } }));
vi.mock("expo-sharing", () => ({ isAvailableAsync: vi.fn(), shareAsync: vi.fn() }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("../storage", () => ({ STORAGE_KEYS: { STORES: "madar_stores", EVENTS: "madar_events", SURVEY_RESULTS: "madar_survey_results", SIGNAGE_BOARDS: "madar_signage_boards", ROAD_SIGNAGE_CONTRACTS: "madar_road_signage_contracts", STANDS: "madar_stands", EXTERNAL_ANALYTICS_PACKAGES: "madar_external_analytics_packages", MARKET_VISIT_REPORT_TEMPLATES: "madar_market_visit_report_templates", MARKET_VISIT_REPORT_SETTINGS: "madar_market_visit_report_settings" } }));
vi.mock("../audit-log", () => ({ logAudit }));

describe("full backup", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("ينشئ اسماً آمناً للملف بلا فواصل مسار", () => {
    const filename = getBackupFilename(new Date("2026-08-16T17:20:30.123Z"));
    expect(filename).toBe("madar_full_backup_2026-08-16_17-20-30-123.json");
    expect(filename).not.toContain("/");
    expect(filename).not.toContain(":");
  });

  it("يعرّف أقسام النسخ الجزئي ويعطيها اسماً مستقلاً", () => {
    expect(getPartialBackupFilename(new Date("2026-08-16T17:20:30.123Z"))).toBe("madar_partial_backup_2026-08-16_17-20-30-123.json");
    expect(BACKUP_SECTION_OPTIONS.map((section) => section.id)).toEqual(expect.arrayContaining(["stores", "surveys", "events", "warehouse"]));
    expect(BACKUP_SECTION_OPTIONS.find((section) => section.id === "reports")?.keys).toContain("madar_external_analytics_packages");
  });

  it("يجمع مراجع الوسائط الداخلية فقط من قيم التخزين المنظمة", () => {
    const signageSection = BACKUP_SECTION_OPTIONS.find((section) => section.id === "signage");
    expect(signageSection?.keys).toContain("madar_road_signage_contracts");
    const data = { events: JSON.stringify({ imageUri: "file:///app/documents/event_documentation/poster.jpg" }), analytics: JSON.stringify({ logoUri: "file:///app/documents/analytics/logo.png" }), templates: JSON.stringify({ uri: "file:///app/documents/market-visit-reports/templates/market.pptx" }), external: JSON.stringify({ fileUri: "file:///app/documents/external-analytics-packages/external.json", videoUri: "content://media/video/12" }), history: JSON.stringify({ uri: "file:///app/documents/reports/report.pdf" }), backups: JSON.stringify({ uri: "file:///app/documents/backups/old.json" }), theme: "dark" };
    expect(collectManagedMediaUris(data, "file:///app/documents/")).toEqual(["file:///app/documents/event_documentation/poster.jpg", "file:///app/documents/analytics/logo.png", "file:///app/documents/market-visit-reports/templates/market.pptx"]);
    expect(isBackupManagedMediaUri("file:///app/documents/market-visit-reports/generated/report.pptx", "file:///app/documents/")).toBe(false);
    expect(isBackupManagedMediaUri("file:///app/documents/signage-media/board.jpg", "file:///app/documents/")).toBe(true);
  });

  it("يحفظ البيانات والوسائط والبيانات الوصفية بصيغة يمكن التحقق منها", () => {
    const payload = buildFullBackupPayload({ madar_stores: '[{"id":"store-1"}]' }, [{ relativePath: "event_documentation/photo.jpg", base64: "YWJj", size: 3 }], [], "2026-08-16T17:20:30.000Z");
    expect(payload.type).toBe("madar-full-backup");
    expect(payload.schemaVersion).toBe(1);
    expect(payload.data.madar_stores).toContain("store-1");
    expect(payload.media[0].relativePath).toBe("event_documentation/photo.jpg");
  });

  it("يضع علامة النسخة الجزئية والأقسام المختارة داخل الملف", () => {
    const payload = buildFullBackupPayload({ madar_stores: "[]" }, [], [], "2026-08-16T17:20:30.000Z", "partial", ["stores"]);
    expect(payload).toMatchObject({ backupKind: "partial", sections: ["stores"] });
  });

  it("ينشئ النسخة محلياً افتراضياً من دون الحاجة إلى المشاركة النظامية", async () => {
    vi.mocked(AsyncStorage.multiGet).mockResolvedValue([["madar_stores", '[{"id":"store-1","name":"محل المدار"}]']]);
    vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({ exists: true, isDirectory: true, size: 0 } as any).mockResolvedValueOnce({ exists: true, isDirectory: false, size: 256 } as any);

    const result = await createFullBackup();

    expect(result.shared).toBe(false);
    expect(result.skippedMediaCount).toBe(0);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(expect.stringContaining("backups/madar_full_backup_"), expect.stringContaining("madar_stores"), expect.objectContaining({ encoding: "utf8" }));
    expect(Sharing.isAvailableAsync).not.toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith("BACKUP", "النسخ الاحتياطية", expect.stringContaining("نسخة احتياطية كاملة"));
  });

  it("يحافظ على الملف المحلي إذا تعذرت ورقة المشاركة الاختيارية", async () => {
    vi.mocked(AsyncStorage.multiGet).mockResolvedValue([["madar_stores", '[{"id":"store-1","name":"محل المدار"}]'], ["madar_events", '[{"id":"event-1","title":"فعالية"}]']]);
    vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({ exists: true, isDirectory: true, size: 0 } as any).mockResolvedValueOnce({ exists: true, isDirectory: false, size: 256 } as any);
    vi.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
    vi.mocked(Sharing.shareAsync).mockRejectedValue(new Error("مشاركة غير متاحة"));
    const result = await createFullBackup({ share: true });
    expect(result.itemCount).toBe(2);
    expect(result.shared).toBe(false);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(expect.stringContaining("backups/madar_full_backup_"), expect.stringContaining("madar_stores"), expect.objectContaining({ encoding: "utf8" }));
    expect(Sharing.shareAsync).toHaveBeenCalledWith(expect.stringContaining("madar_full_backup_"), expect.objectContaining({ mimeType: "application/json" }));
  });
});
