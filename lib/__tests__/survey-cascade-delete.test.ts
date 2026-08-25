import { beforeEach, describe, expect, it, vi } from "vitest";

const { getItems, saveItems, getItem, setItem } = vi.hoisted(() => ({ getItems: vi.fn(), saveItems: vi.fn(), getItem: vi.fn(), setItem: vi.fn() }));

vi.mock("../storage", () => ({
  getItems,
  saveItems,
  STORAGE_KEYS: { SURVEY_TEMPLATES: "templates", SURVEY_RESULTS: "results", SURVEY_CYCLES: "cycles", STORES: "stores", PRODUCTS: "products" },
}));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem, setItem } }));

import { deleteStoreSurveyDataCascade, deleteSurveyCycleMedia, deleteSurveyResultCascade, deleteSurveyTemplateCascade, pruneOrphanedSurveyData } from "../survey-storage";
import { sortSurveyCyclesNewestFirst } from "../survey-cycle-manager";

const template = { id: "template-a", name: "دراسة أ", createdAt: "2026-01-01", products: [] };
const otherTemplate = { id: "template-b", name: "دراسة ب", createdAt: "2026-01-02", products: [] };
const resultA = { id: "result-a", templateId: "template-a", templateName: "دراسة أ", storeId: "store-a", storeName: "محل أ", storeRegion: "دمشق", surveyDate: "2026-01-03", createdAt: "2026-01-03", data: [] };
const resultB = { id: "result-b", templateId: "template-b", templateName: "دراسة ب", storeId: "store-b", storeName: "محل ب", storeRegion: "حلب", surveyDate: "2026-01-04", createdAt: "2026-01-04", data: [] };

describe("الحذف المتسلسل للاستبيانات", () => {
  beforeEach(() => { getItems.mockReset(); saveItems.mockReset(); getItem.mockReset(); setItem.mockReset(); getItem.mockResolvedValue(JSON.stringify([{ surveyId: "result-a" }, { surveyId: "result-b" }])); });

  it("يحذف وسائط دورة منتهية نهائياً مع إبقاء نتائجها والسجل", async () => {
    const mediaResult = { ...resultA, cycleId: "cycle-a", storePhotoUris: ["file:///documents/survey-store-photos/a.jpg", "file:///documents/survey-store-photos/b.jpg"] };
    getItems.mockResolvedValueOnce([mediaResult, resultB]).mockResolvedValueOnce([{ id: "cycle-a", templateId: "template-a", templateName: "دراسة أ", name: "دورة أ", resultIds: ["result-a"], createdAt: "2026-01-03", closedAt: "2026-01-04" }]);

    const outcome = await deleteSurveyCycleMedia("cycle-a");

    expect(outcome.removedMediaCount).toBe(2);
    expect(outcome.results.find((item) => item.id === "result-a")?.storePhotoUris).toBeUndefined();
    expect(outcome.results.find((item) => item.id === "result-a")?.cycleId).toBe("cycle-a");
    expect(saveItems).toHaveBeenCalledWith("results", outcome.results);
  });

  it("يحذف القالب ودوراته ونتائجه وملاحظاته الموازية مع إبقاء البيانات الأخرى", async () => {
    getItems.mockResolvedValueOnce([template, otherTemplate]).mockResolvedValueOnce([resultA, resultB]).mockResolvedValueOnce([{ id: "cycle-a", templateId: "template-a", templateName: "دراسة أ", name: "دورة أ", resultIds: ["result-a"], createdAt: "2026-01-03" }, { id: "cycle-b", templateId: "template-b", templateName: "دراسة ب", name: "دورة ب", resultIds: ["result-b"], createdAt: "2026-01-04" }]);

    const outcome = await deleteSurveyTemplateCascade("template-a");

    expect(outcome.templates.map((item: { id: string }) => item.id)).toEqual(["template-b"]);
    expect(outcome.results.map((item: { id: string }) => item.id)).toEqual(["result-b"]);
    expect(outcome.cycles.map((item: { id: string }) => item.id)).toEqual(["cycle-b"]);
    expect(setItem).toHaveBeenCalledWith("surveys", JSON.stringify([{ surveyId: "result-b" }]));
  });

  it("يحذف النتيجة وينظف مرجعها من الدورة ثم يحذف الدورة الفارغة", async () => {
    getItems.mockResolvedValueOnce([template]).mockResolvedValueOnce([resultA]).mockResolvedValueOnce([{ id: "cycle-a", templateId: "template-a", templateName: "دراسة أ", name: "دورة أ", resultIds: ["result-a"], createdAt: "2026-01-03" }]);

    const outcome = await deleteSurveyResultCascade("result-a");

    expect(outcome.results).toEqual([]);
    expect(outcome.cycles).toEqual([]);
  });

  it("يحذف المحل ونتائج استبياناته كي لا تبقى ضمن التحليلات", async () => {
    getItems.mockResolvedValueOnce([{ id: "store-a" }, { id: "store-b" }]).mockResolvedValueOnce([template, otherTemplate]).mockResolvedValueOnce([{ ...resultA, cycleId: "cycle-a" }, { ...resultB, cycleId: "cycle-b" }]).mockResolvedValueOnce([{ id: "cycle-a", templateId: "template-a", templateName: "دراسة أ", name: "دورة أ", startDate: "2026-01-03", endDate: "2026-01-03", resultIds: ["result-a"], createdAt: "2026-01-03" }, { id: "cycle-b", templateId: "template-b", templateName: "دراسة ب", name: "دورة ب", startDate: "2026-01-04", endDate: "2026-01-04", resultIds: ["result-b"], createdAt: "2026-01-04" }]);

    const outcome = await deleteStoreSurveyDataCascade("store-a");

    expect(outcome.deletedResultIds).toEqual(["result-a"]);
    expect(outcome.results.map((item: { id: string }) => item.id)).toEqual(["result-b"]);
    expect(saveItems).toHaveBeenCalledWith("stores", [{ id: "store-b" }]);
  });

  it("يستبعد النتائج والدورات اليتيمة من أي قراءة لاحقة", () => {
    const cleaned = pruneOrphanedSurveyData([template], [{ ...resultA, cycleId: "cycle-a" }, { ...resultB, templateId: "missing" }], [{ id: "cycle-a", templateId: "template-a", templateName: "دراسة أ", name: "دورة أ", startDate: "2026-01-03", endDate: "2026-01-03", resultIds: ["result-a", "missing"], createdAt: "2026-01-03" }]);

    expect(cleaned.results.map((item: { id: string }) => item.id)).toEqual(["result-a"]);
    expect(cleaned.cycles[0]?.resultIds).toEqual(["result-a"]);
  });

  it("يحذف الدورات القديمة التي لا تملك معرف قالب عند تطابق اسم الاستبيان المحذوف", async () => {
    getItems.mockResolvedValueOnce([template, otherTemplate]).mockResolvedValueOnce([resultA, resultB]).mockResolvedValueOnce([
      { id: "cycle-old", templateName: "دراسة أ", name: "دورة قديمة", resultIds: ["result-a"], createdAt: "2026-01-03" },
      { id: "cycle-b", templateId: "template-b", templateName: "دراسة ب", name: "دورة ب", resultIds: ["result-b"], createdAt: "2026-01-04" },
    ]);
    const outcome = await deleteSurveyTemplateCascade("template-a");
    expect(outcome.cycles.map((item: { id: string }) => item.id)).toEqual(["cycle-b"]);
  });

  it("يرتب الدورات بأحدث تاريخ إغلاق أو نهاية أولاً", () => {
    const sorted = sortSurveyCyclesNewestFirst([
      { id: "old", templateId: "template-a", templateName: "دراسة أ", name: "قديمة", startDate: "2026-01-01", endDate: "2026-01-04", resultIds: ["a"], createdAt: "2026-01-01" },
      { id: "new", templateId: "template-a", templateName: "دراسة أ", name: "حديثة", startDate: "2026-01-06", endDate: "2026-01-10", resultIds: ["b"], createdAt: "2026-01-06", closedAt: "2026-01-11T09:00:00.000Z" },
    ] as any);
    expect(sorted.map((cycle) => cycle.id)).toEqual(["new", "old"]);
  });
});
