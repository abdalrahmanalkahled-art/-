import { describe, expect, it } from "vitest";

import { getSurveyOverlayToClose, type SurveyOverlayState } from "../survey-overlay-state";

const closedState: SurveyOverlayState = {
  showResultDetail: false,
  showStoreDetails: false,
  showCreateModal: false,
  showUseModal: false,
  showEditModal: false,
  showDateRangePicker: false,
  showDeleteConfirm: false,
  showDeleteResultConfirm: false,
  showCloseCycleConfirm: false,
  showAddQuestion: false,
  showSurveyError: false,
  hasPendingTemplateImport: false,
  showDeleteCycleMediaConfirm: false,
  showCycleDetail: false,
  hasResultActionTarget: false,
  showResultsExportModal: false,
  hasTemplateActionTarget: false,
};

describe("تدفق زر الرجوع في الاستبيانات", () => {
  it("لا يمنع الرجوع من الصفحة عندما لا تكون أي نافذة مفتوحة", () => {
    expect(getSurveyOverlayToClose(closedState)).toBeNull();
  });

  it("يغلق شاشة التفاصيل قبل نافذة التأكيد المفتوحة تحتها", () => {
    expect(getSurveyOverlayToClose({ ...closedState, showResultDetail: true, showDeleteConfirm: true })).toBe("resultDetail");
  });

  it("يغلق نافذة إنشاء القالب قبل أي نافذة أقل أولوية", () => {
    expect(getSurveyOverlayToClose({ ...closedState, showCreateModal: true, showAddQuestion: true })).toBe("create");
  });

  it("يتعرف على نوافذ التعبئة والتعديل والحذف بشكل مستقل", () => {
    expect(getSurveyOverlayToClose({ ...closedState, showUseModal: true })).toBe("use");
    expect(getSurveyOverlayToClose({ ...closedState, showEditModal: true })).toBe("edit");
    expect(getSurveyOverlayToClose({ ...closedState, showDeleteResultConfirm: true })).toBe("deleteResult");
    expect(getSurveyOverlayToClose({ ...closedState, showCloseCycleConfirm: true })).toBe("closeCycle");
  });

  it("يغلق إجراءات القوالب والتصدير وتأكيدات الدورة قبل الطبقات السفلية", () => {
    expect(getSurveyOverlayToClose({ ...closedState, hasTemplateActionTarget: true })).toBe("templateAction");
    expect(getSurveyOverlayToClose({ ...closedState, showResultsExportModal: true })).toBe("resultsExport");
    expect(getSurveyOverlayToClose({ ...closedState, showCycleDetail: true, showDeleteCycleMediaConfirm: true })).toBe("deleteCycleMedia");
  });
});
