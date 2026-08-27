import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getItems: vi.fn(), saveItems: vi.fn() }));
vi.mock("../storage", () => ({ getItems: mocks.getItems, saveItems: mocks.saveItems, STORAGE_KEYS: { SURVEY_DRAFTS: "survey_drafts" } }));

import { clearSurveyDraft, loadSurveyDraft, saveSurveyDraft, surveyDraftId } from "../survey-draft";

describe("مسودة الاستبيان", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("تفصل المسودة حسب القالب والمحل", () => {
    expect(surveyDraftId("template-a", "store-b")).toBe("template-a:store-b");
  });

  it("تستعيد المسودة المطابقة فقط", async () => {
    mocks.getItems.mockResolvedValue([{ id: "template-a:store-b", templateId: "template-a", storeId: "store-b" }, { id: "template-a:store-c", templateId: "template-a", storeId: "store-c" }]);
    await expect(loadSurveyDraft("template-a", "store-b")).resolves.toMatchObject({ storeId: "store-b" });
  });

  it("يستبدل المسودة السابقة ويحفظها بحد محدود", async () => {
    mocks.getItems.mockResolvedValue([{ id: "template-a:store-b", templateId: "template-a", storeId: "store-b" }]);
    await saveSurveyDraft({ templateId: "template-a", storeId: "store-b", surveyData: [], numericDrafts: [], totalShelves: "", storePhotoUris: [], notes: "ملاحظة", noteType: "positive" });
    expect(mocks.saveItems).toHaveBeenCalledWith("survey_drafts", [expect.objectContaining({ id: "template-a:store-b", notes: "ملاحظة" })]);
  });

  it("يمسح المسودة الخاصة بالنتيجة المحفوظة فقط", async () => {
    mocks.getItems.mockResolvedValue([{ id: "template-a:store-b" }, { id: "template-a:store-c" }]);
    await clearSurveyDraft("template-a", "store-b");
    expect(mocks.saveItems).toHaveBeenCalledWith("survey_drafts", [{ id: "template-a:store-c" }]);
  });
});
