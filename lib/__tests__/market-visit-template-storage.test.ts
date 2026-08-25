import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ persistExternal: vi.fn(), copyAsync: vi.fn(), ensureDirectoryExists: vi.fn(), readAsStringAsync: vi.fn(), writeAsStringAsync: vi.fn(), getInfoAsync: vi.fn(), buildPptx: vi.fn(), recordGeneratedReport: vi.fn(), isSharingAvailable: vi.fn(), shareAsync: vi.fn() }));

vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///documents/", EncodingType: { Base64: "base64" }, copyAsync: mocks.copyAsync, readAsStringAsync: mocks.readAsStringAsync, writeAsStringAsync: mocks.writeAsStringAsync, getInfoAsync: mocks.getInfoAsync }));
vi.mock("expo-sharing", () => ({ isAvailableAsync: mocks.isSharingAvailable, shareAsync: mocks.shareAsync }));
vi.mock("react-native", () => ({ Image: {} }));
vi.mock("expo-image-manipulator", () => ({}));
vi.mock("@/lib/marketing-manager-storage", () => ({ persistMarketingManagerFile: mocks.persistExternal }));
vi.mock("@/lib/export-sanitizer", () => ({ ensureDirectoryExists: mocks.ensureDirectoryExists, sanitizeFilename: vi.fn(() => "template.pptx") }));
vi.mock("@/lib/report-history", () => ({ recordGeneratedReport: mocks.recordGeneratedReport }));
vi.mock("@/lib/market-visit-pptx", () => ({ buildMarketVisitPptx: mocks.buildPptx }));

import { generateAndShareMarketVisitPptx, persistMarketVisitTemplate } from "../market-visit-report-service";

describe("حفظ قالب زيارة السوق", () => {
  it("يرجع للحفظ المحلي عندما يرفض مجلد marketing manager النسخ برسالة مساحة مضللة", async () => {
    mocks.persistExternal.mockRejectedValue(new Error("No space left on device"));
    mocks.ensureDirectoryExists.mockResolvedValue(true);
    mocks.copyAsync.mockResolvedValue(undefined);

    const stages: string[] = [];
    const template = await persistMarketVisitTemplate("file:///cache/template.pptx", "قالب.pptx", 1234, (stage) => stages.push(stage));

    expect(template.uri).toBe("file:///documents/market-visit-reports/templates/template.pptx");
    expect(mocks.copyAsync).toHaveBeenCalledWith({ from: "file:///cache/template.pptx", to: template.uri });
    expect(stages).toEqual(["copy-external", "copy-local", "verify"]);
  });

  it("يبعث مراحل بناء وحفظ ومشاركة التقرير عند إنشائه", async () => {
    mocks.readAsStringAsync.mockResolvedValue("TEMPLATE");
    mocks.buildPptx.mockResolvedValue("REPORT");
    mocks.ensureDirectoryExists.mockResolvedValue(true);
    mocks.writeAsStringAsync.mockResolvedValue(undefined);
    mocks.getInfoAsync.mockResolvedValue({ exists: true, size: 500 });
    mocks.isSharingAvailable.mockResolvedValue(false);
    const stages: string[] = [];

    await generateAndShareMarketVisitPptx({ id: "template", name: "قالب", fileName: "template.pptx", uri: "file:///template.pptx", size: 100, createdAt: "2026-08-25" }, "الدورة", [], "fill", "second-slide", [], (stage) => stages.push(stage));

    expect(stages).toEqual(["build", "save", "share"]);
    expect(mocks.writeAsStringAsync).toHaveBeenCalled();
  });
});
