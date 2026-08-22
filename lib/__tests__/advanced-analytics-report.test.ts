import { describe, expect, it } from "vitest";

import { buildAnalyticsReportData, flattenAnalyticsReportForExcel } from "../advanced-analytics-report";

describe("بيانات تقرير التحليلات المتقدمة", () => {
  const analytics = {
    points: [{
      cycleId: "cycle-1",
      cycleName: "دراسة مسحوق 18-3 – 16-4",
      startDate: "2026-03-18T08:00:00.000Z",
      endDate: "2026-04-16T08:00:00.000Z",
      surveyCount: 3,
      storeCount: 3,
      products: [{ productId: "p-1", productName: "مسحوق مدار", type: "company" as const, color: "#2563EB", presencePercentage: 67, presentCount: 2, sampleSize: 3 }],
    }],
    productOptions: [],
    totalSurveys: 3,
    totalStores: 3,
    averagePresence: 67,
    notes: [],
    noteCounts: { positive: 0, negative: 0, complaint: 0, suggestion: 0, recommendation: 0 },
  };

  const scope = { analysisName: "تواجد الاستبيانات والدورات", templateName: "دراسة مسحوق", cycleName: "كل الدورات", brandName: "مدار", regionName: "دمشق", storeName: "كل المحلات" };

  it("ينشئ صفوفاً عربية قابلة للتصدير ومؤشرات ملخصة", () => {
    const report = buildAnalyticsReportData(analytics, scope);

    expect(report.summary).toContainEqual({ label: "متوسط منتجاتنا", value: "67%" });
    expect(report.summary).toContainEqual({ label: "متوسط المنافسين", value: "غير متاح" });
    expect(report.categorySourceAverages).toContainEqual({ الصنف: "بدون تصنيف", "متوسط منتجاتنا": "67%", "متوسط المنافسين": "غير متاح", "طريقة الحساب": "متوسط متساوٍ" });
    expect(report.cycleRows[0]).toMatchObject({ المنتج: "مسحوق مدار", "نسبة التواجد": "67%", "عدد مرات التواجد": 2 });
  });

  it("يحترم عنوان التقرير المستقل لكل صفحة تحليلية", () => {
    const report = buildAnalyticsReportData(analytics, { ...scope, analysisName: "تتبع ماركة", reportTitle: "تقرير تتبع الماركة" });

    expect(report.title).toBe("تقرير تتبع الماركة");
    expect(report.marketingRows).toEqual([]);
  });

  it("يضيف نطاق المرشحات إلى كل صف Excel", () => {
    const rows = flattenAnalyticsReportForExcel(buildAnalyticsReportData(analytics, scope));

    expect(rows[0]).toMatchObject({ الاستبيان: "دراسة مسحوق", الماركة: "مدار", المحل: "كل المحلات", المنتج: "مسحوق مدار" });
  });

  it("يفصل متوسط التواجد لمنتجات الشركة عن منتجات المنافسين", () => {
    const mixedAnalytics = { ...analytics, points: [{ ...analytics.points[0], products: [
      { productId: "p-1", productName: "مسحوق مدار", type: "company" as const, color: "#2563EB", presencePercentage: 75, presentCount: 3, sampleSize: 4 },
      { productId: "p-2", productName: "منتج منافس", type: "competitor" as const, color: "#DB2777", presencePercentage: 50, presentCount: 2, sampleSize: 4 },
    ] }] };
    const report = buildAnalyticsReportData(mixedAnalytics, scope);

    expect(report.summary).toContainEqual({ label: "متوسط منتجاتنا", value: "75%" });
    expect(report.summary).toContainEqual({ label: "متوسط المنافسين", value: "50%" });
    expect(report.categorySourceAverages).toContainEqual({ الصنف: "بدون تصنيف", "متوسط منتجاتنا": "75%", "متوسط المنافسين": "50%", "طريقة الحساب": "متوسط متساوٍ" });
  });

  it("يحافظ على تسلسل الأصناف والمنتجات الوارد من تحليل الاستبيان عند تجهيز التقرير", () => {
    const orderedAnalytics = {
      ...analytics,
      points: [{
        ...analytics.points[0],
        products: [
          { productId: "p-2", productName: "منظف ثانٍ", category: "منظفات", type: "company" as const, color: "#0E9F6E", presencePercentage: 50, presentCount: 1, sampleSize: 2 },
          { productId: "p-1", productName: "مسحوق أول", category: "مساحيق", type: "company" as const, color: "#2563EB", presencePercentage: 100, presentCount: 2, sampleSize: 2 },
        ],
      }],
    };
    const report = buildAnalyticsReportData(orderedAnalytics, scope);

    expect(report.cycleRows.map((row) => [row.الصنف, row.المنتج])).toEqual([
      ["منظفات", "منظف ثانٍ"],
      ["مساحيق", "مسحوق أول"],
    ]);
    expect(flattenAnalyticsReportForExcel(report).map((row) => row.المنتج)).toEqual(["منظف ثانٍ", "مسحوق أول"]);
  });

  it("يبني قسماً تسويقياً تشغيلياً بلا أسعار للفعاليات والأهداف والأصول", () => {
    const report = buildAnalyticsReportData(analytics, scope, {
      events: [{ id: "e1", title: "فعالية رمضان", brandName: "مدار", region: "دمشق", eventDate: "2026-04-10", status: "completed", attendeesCount: 120, giftsDistributed: 80, goalId: "g1" }],
      signages: [{ id: "b1", type: "road", brand: "مدار", region: "دمشق", isActive: true }],
      stands: [{ id: "s1", brand: "مدار", condition: "needs_repair", isActive: true }],
      totalBudget: 300,
      totalCost: 240,
      activeSignages: 1,
      activeStands: 0,
      goals: [{ id: "g1", title: "انتشار رمضان", brandName: "مدار", completionPercentage: 60, status: "on_track" }],
      goalProgress: 60,
      eventStatusCounts: { planned: 0, ongoing: 0, completed: 1, cancelled: 0 },
      totalAttendees: 120,
      totalGifts: 80,
      coveredRegions: ["دمشق"],
      signageTypeCounts: { store: 0, road: 1, wall: 0, island: 0 },
      standsNeedingAttention: 1,
    });

    expect(report.marketingRows).toContainEqual({ البند: "إجمالي المستفيدين", الإجمالي: "120" });
    expect(report.marketingRows.some((row) => row.البند.includes("تكلفة") || row.البند.includes("ميزانية"))).toBe(false);
    expect(report.marketingEvents[0]).toMatchObject({ الفعالية: "فعالية رمضان", الحالة: "مكتملة", المستفيدون: "120", الهدف: "انتشار رمضان" });
    expect(report.marketingGoals[0]).toMatchObject({ الهدف: "انتشار رمضان", الإنجاز: "60%", "عدد الفعاليات المرتبطة": "1" });
    expect(report.marketingSignages[0]).toMatchObject({ النوع: "لوحة طرقية", الحالة: "نشطة" });
    expect(report.marketingStands[0]).toMatchObject({ الحالة: "يحتاج صيانة" });
  });

  it("يبني صف المحل المدروس مع حالات المواد والملاحظات", () => {
    const report = buildAnalyticsReportData(analytics, scope, undefined, {
      stores: [{ id: "store-1", name: "سوبر ماركت الندى", region: "دمشق", category: "نخبة", phone: "0999000000" }],
      results: [{ id: "result-1", templateId: "template-1", cycleId: "cycle-1", storeId: "store-1", storeName: "سوبر ماركت الندى", storeRegion: "دمشق", surveyDate: "2026-04-16", notes: "طلب عرضاً ترويجياً", data: [{ productId: "p-1", productName: "مسحوق مدار", present: true }, { productId: "p-2", productName: "صابون مدار", present: false }] }],
      filters: { templateId: "template-1" },
    });

    expect(report.studiedStores).toEqual([expect.objectContaining({ "اسم المحل": "سوبر ماركت الندى", التصنيف: "نخبة", "رقم التواصل": "0999000000", "المواد المدروسة": "مسحوق مدار، صابون مدار", الملاحظات: "طلب عرضاً ترويجياً", حالات_المواد: { "مسحوق مدار": "موجود", "صابون مدار": "غير موجود" } })]);
  });
});
