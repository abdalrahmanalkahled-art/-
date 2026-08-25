import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ persistExternal: vi.fn(), copyAsync: vi.fn(), ensureDirectoryExists: vi.fn() }));

vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///documents/", copyAsync: mocks.copyAsync }));
vi.mock("expo-sharing", () => ({}));
vi.mock("react-native", () => ({ Image: {} }));
vi.mock("expo-image-manipulator", () => ({}));
vi.mock("@/lib/marketing-manager-storage", () => ({ persistMarketingManagerFile: mocks.persistExternal }));
vi.mock("@/lib/export-sanitizer", () => ({ ensureDirectoryExists: mocks.ensureDirectoryExists, sanitizeFilename: vi.fn(() => "template.pptx") }));
vi.mock("@/lib/report-history", () => ({ recordGeneratedReport: vi.fn() }));
vi.mock("@/lib/market-visit-pptx", () => ({ buildMarketVisitPptx: vi.fn() }));

import { persistMarketVisitTemplate } from "../market-visit-report-service";

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
});
