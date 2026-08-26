export type SurveyOverlay = "surveyError" | "templateImport" | "deleteCycleMedia" | "cycleDetail" | "resultAction" | "resultsExport" | "templateAction" | "resultDetail" | "storeDetails" | "create" | "use" | "edit" | "dateRange" | "deleteTemplate" | "deleteResult" | "closeCycle" | "addQuestion";

export interface SurveyOverlayState {
  showResultDetail: boolean;
  showStoreDetails: boolean;
  showCreateModal: boolean;
  showUseModal: boolean;
  showEditModal: boolean;
  showDateRangePicker: boolean;
  showDeleteConfirm: boolean;
  showDeleteResultConfirm: boolean;
  showCloseCycleConfirm: boolean;
  showAddQuestion: boolean;
  showSurveyError: boolean;
  hasPendingTemplateImport: boolean;
  showDeleteCycleMediaConfirm: boolean;
  showCycleDetail: boolean;
  hasResultActionTarget: boolean;
  showResultsExportModal: boolean;
  hasTemplateActionTarget: boolean;
}

/** يعيد العنصر الأعلى أولوية الذي يجب إغلاقه عند استخدام زر الرجوع. */
export function getSurveyOverlayToClose(state: SurveyOverlayState): SurveyOverlay | null {
  if (state.showSurveyError) return "surveyError";
  if (state.hasPendingTemplateImport) return "templateImport";
  if (state.showDeleteCycleMediaConfirm) return "deleteCycleMedia";
  if (state.showCycleDetail) return "cycleDetail";
  if (state.hasResultActionTarget) return "resultAction";
  if (state.showResultsExportModal) return "resultsExport";
  if (state.hasTemplateActionTarget) return "templateAction";
  if (state.showResultDetail) return "resultDetail";
  if (state.showStoreDetails) return "storeDetails";
  if (state.showCreateModal) return "create";
  if (state.showUseModal) return "use";
  if (state.showEditModal) return "edit";
  if (state.showDateRangePicker) return "dateRange";
  if (state.showDeleteConfirm) return "deleteTemplate";
  if (state.showDeleteResultConfirm) return "deleteResult";
  if (state.showCloseCycleConfirm) return "closeCycle";
  if (state.showAddQuestion) return "addQuestion";
  return null;
}
