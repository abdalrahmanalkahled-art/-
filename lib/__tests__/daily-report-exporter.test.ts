import { describe, expect, it, vi } from "vitest";

vi.mock("expo-print", () => ({}));
vi.mock("expo-sharing", () => ({}));
vi.mock("react-native", () => ({ Platform: { OS: "android" }, Alert: { alert: vi.fn() } }));
vi.mock("expo-file-system/legacy", () => ({ EncodingType: { Base64: "base64" } }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("../storage", () => ({
  getItems: vi.fn(),
  STORAGE_KEYS: { SURVEY_RESULTS: "madar_survey_results", EVENTS: "madar_events", STORES: "madar_stores" },
}));

import { buildDailyReportData } from "../daily-report-exporter";

describe("التقرير اليومي", () => {
  it("يحصر الاستبيانات والفعاليات ضمن نطاق التاريخ ويحسب الملخص التنفيذي", () => {
    const report = buildDailyReportData(
      { startDate: "2026-08-10", endDate: "2026-08-12" },
      [
        { id: "r1", storeId: "s1", storeName: "محل النور", storeRegion: "الشمال", surveyDate: "2026-08-10", createdAt: "2026-08-10", templateId: "t", templateName: "دراسة", data: [], storePhotoUri: "file:///photo.jpg" },
        { id: "r2", storeId: "s2", storeName: "محل الأمل", storeRegion: "الجنوب", surveyDate: "2026-08-12", createdAt: "2026-08-12", templateId: "t", templateName: "دراسة", data: [] },
        { id: "r3", storeId: "s3", storeName: "خارج النطاق", storeRegion: "الشرق", surveyDate: "2026-08-15", createdAt: "2026-08-15", templateId: "t", templateName: "دراسة", data: [] },
      ] as any,
      [{ id: "e1", title: "فعالية", eventDate: "2026-08-11" }, { id: "e2", title: "خارج", eventDate: "2026-08-20" }],
    );
    expect(report.surveyResults).toHaveLength(2);
    expect(report.events).toHaveLength(1);
    expect(report.summary).toMatchObject({ storesVisited: 2, surveyResults: 2, eventsCount: 1, photosCount: 1 });
    expect(report.summary.regionsVisited).toEqual(["الشمال", "الجنوب"]);
  });

  it("يستعيد منطقة المحل من سجل المحلات عندما لا تكون محفوظة في نتيجة الاستبيان", () => {
    const report = buildDailyReportData(
      { startDate: "2026-08-10", endDate: "2026-08-10" },
      [{ id: "r1", storeId: "s1", storeName: "محل النور", surveyDate: "2026-08-10", createdAt: "2026-08-10", templateId: "t", templateName: "دراسة", data: [] }] as any,
      [],
      [{ id: "s1", region: "المنطقة الشمالية" }],
    );

    expect(report.summary.regionsVisited).toEqual(["المنطقة الشمالية"]);
    expect(report.surveyResults[0].storeRegion).toBe("المنطقة الشمالية");
  });

  it("يحسب كل صور المحل المتعددة ضمن ملخص التقرير اليومي", () => {
    const report = buildDailyReportData(
      { startDate: "2026-08-10", endDate: "2026-08-10" },
      [{ id: "r1", storeId: "s1", storeName: "محل النور", storeRegion: "الشمال", surveyDate: "2026-08-10", createdAt: "2026-08-10", templateId: "t", templateName: "دراسة", data: [], storePhotoUris: ["file:///one.jpg", "file:///two.jpg"], storePhotoUri: "file:///one.jpg" }] as any,
      [],
    );

    expect(report.summary.photosCount).toBe(2);
  });
});
