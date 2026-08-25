import AsyncStorage from "@react-native-async-storage/async-storage";

import { getItems, saveItems, STORAGE_KEYS } from "./storage";
import type { Product, Store, SurveyCycle, SurveyResult, SurveyTemplate } from "./types/survey-types";
import { sortSurveyCyclesNewestFirst } from "./survey-cycle-manager";
import { synchronizeActiveCycleResultsWithTemplate } from "./survey-template-sync";

export interface SurveyScreenData {
  templates: SurveyTemplate[];
  results: SurveyResult[];
  cycles: SurveyCycle[];
  stores: Store[];
  products: Product[];
}

export interface SurveyCascadeDeleteOutcome {
  templates: SurveyTemplate[];
  results: SurveyResult[];
  cycles: SurveyCycle[];
  deletedResultIds: string[];
}

type ParallelSurveyNote = { id?: string; surveyId?: string };

/** يحفظ القالب ويحدّث نتائج الدورة النشطة التابعة له فقط في عملية موحدة. */
export async function saveSurveyTemplateWithActiveCycleSync(template: SurveyTemplate): Promise<{ templates: SurveyTemplate[]; results: SurveyResult[]; cycles: SurveyCycle[] }> {
  const [allTemplates, allResults, allCycles] = await Promise.all([
    getItems<SurveyTemplate>(STORAGE_KEYS.SURVEY_TEMPLATES),
    getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS),
    getItems<SurveyCycle>(STORAGE_KEYS.SURVEY_CYCLES),
  ]);
  const templates = allTemplates.map((item) => item.id === template.id ? template : item);
  const results = synchronizeActiveCycleResultsWithTemplate(template, allResults, allCycles);
  await Promise.all([
    saveItems(STORAGE_KEYS.SURVEY_TEMPLATES, templates),
    saveItems(STORAGE_KEYS.SURVEY_RESULTS, results),
  ]);
  return { templates, results, cycles: allCycles };
}

/** يستبعد البيانات اليتيمة حتى لا تؤثر السجلات القديمة في الواجهة أو التحليلات. */
export function pruneOrphanedSurveyData(templates: SurveyTemplate[], results: SurveyResult[], cycles: SurveyCycle[]) {
  const templateIds = new Set(templates.map((template) => template.id));
  const templateResults = results.filter((result) => templateIds.has(result.templateId));
  const resultIds = new Set(templateResults.map((result) => result.id));
  const candidateCycles = cycles
    .filter((cycle) => templateIds.has(cycle.templateId))
    .map((cycle) => ({ ...cycle, resultIds: cycle.resultIds.filter((id) => resultIds.has(id)) }))
    .filter((cycle) => cycle.resultIds.length > 0);
  const cycleIds = new Set(candidateCycles.map((cycle) => cycle.id));
  const validResults = templateResults.filter((result) => !result.cycleId || cycleIds.has(result.cycleId));
  const validResultIds = new Set(validResults.map((result) => result.id));
  const validCycles = candidateCycles
    .map((cycle) => ({ ...cycle, resultIds: cycle.resultIds.filter((id) => validResultIds.has(id)) }))
    .filter((cycle) => cycle.resultIds.length > 0);
  return { templates, results: validResults, cycles: sortSurveyCyclesNewestFirst(validCycles) };
}

async function removeParallelNotes(resultIds: string[]) {
  if (!resultIds.length) return;
  try {
    const raw = await AsyncStorage.getItem("surveys");
    const notes = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(notes)) return;
    const removed = new Set(resultIds);
    await AsyncStorage.setItem("surveys", JSON.stringify(notes.filter((note: ParallelSurveyNote) => !removed.has(note.surveyId || note.id || ""))));
  } catch {
    // لا يجب أن يمنع سجل الملاحظات القديم حذف بيانات الاستبيان الأساسية.
  }
}

export async function deleteSurveyTemplateCascade(templateId: string): Promise<SurveyCascadeDeleteOutcome> {
  const [allTemplates, allResults, allCycles] = await Promise.all([
    getItems<SurveyTemplate>(STORAGE_KEYS.SURVEY_TEMPLATES),
    getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS),
    getItems<SurveyCycle>(STORAGE_KEYS.SURVEY_CYCLES),
  ]);
  const deletedTemplate = allTemplates.find((template) => template.id === templateId);
  const deletedTemplateName = deletedTemplate?.name;
  const belongsToDeletedTemplate = (record: { templateId?: string; templateName?: string }) => record.templateId === templateId || (!record.templateId && Boolean(deletedTemplateName) && record.templateName === deletedTemplateName);
  const deletedResultIds = allResults.filter(belongsToDeletedTemplate).map((result) => result.id);
  const cleaned = pruneOrphanedSurveyData(
    allTemplates.filter((template) => template.id !== templateId),
    allResults.filter((result) => !belongsToDeletedTemplate(result)),
    allCycles.filter((cycle) => !belongsToDeletedTemplate(cycle)),
  );
  await Promise.all([
    saveItems(STORAGE_KEYS.SURVEY_TEMPLATES, cleaned.templates),
    saveItems(STORAGE_KEYS.SURVEY_RESULTS, cleaned.results),
    saveItems(STORAGE_KEYS.SURVEY_CYCLES, cleaned.cycles),
    removeParallelNotes(deletedResultIds),
  ]);
  return { ...cleaned, deletedResultIds };
}

export async function deleteSurveyResultCascade(resultId: string): Promise<SurveyCascadeDeleteOutcome> {
  const [allTemplates, allResults, allCycles] = await Promise.all([
    getItems<SurveyTemplate>(STORAGE_KEYS.SURVEY_TEMPLATES),
    getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS),
    getItems<SurveyCycle>(STORAGE_KEYS.SURVEY_CYCLES),
  ]);
  const cleaned = pruneOrphanedSurveyData(
    allTemplates,
    allResults.filter((result) => result.id !== resultId),
    allCycles.map((cycle) => ({ ...cycle, resultIds: cycle.resultIds.filter((id) => id !== resultId) })),
  );
  await Promise.all([
    saveItems(STORAGE_KEYS.SURVEY_RESULTS, cleaned.results),
    saveItems(STORAGE_KEYS.SURVEY_CYCLES, cleaned.cycles),
    removeParallelNotes([resultId]),
  ]);
  return { ...cleaned, deletedResultIds: allResults.some((result) => result.id === resultId) ? [resultId] : [] };
}

/** يحذف المحل ونتائج استبياناته حتى لا تبقى ضمن التحليلات أو التقارير. */
export async function deleteStoreSurveyDataCascade(storeId: string): Promise<SurveyCascadeDeleteOutcome> {
  const [allStores, allTemplates, allResults, allCycles] = await Promise.all([
    getItems<{ id: string }>(STORAGE_KEYS.STORES),
    getItems<SurveyTemplate>(STORAGE_KEYS.SURVEY_TEMPLATES),
    getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS),
    getItems<SurveyCycle>(STORAGE_KEYS.SURVEY_CYCLES),
  ]);
  const deletedResultIds = allResults.filter((result) => result.storeId === storeId).map((result) => result.id);
  const cleaned = pruneOrphanedSurveyData(
    allTemplates,
    allResults.filter((result) => result.storeId !== storeId),
    allCycles.map((cycle) => ({ ...cycle, resultIds: cycle.resultIds.filter((id) => !deletedResultIds.includes(id)) })),
  );
  await Promise.all([
    saveItems(STORAGE_KEYS.STORES, allStores.filter((store) => store.id !== storeId)),
    saveItems(STORAGE_KEYS.SURVEY_RESULTS, cleaned.results),
    saveItems(STORAGE_KEYS.SURVEY_CYCLES, cleaned.cycles),
    removeParallelNotes(deletedResultIds),
  ]);
  return { ...cleaned, deletedResultIds };
}

export async function loadSurveyScreenData(): Promise<SurveyScreenData> {
  const [templatesData, resultsData, cyclesData, storesData, productsData] = await Promise.all([
    getItems<SurveyTemplate>(STORAGE_KEYS.SURVEY_TEMPLATES),
    getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS),
    getItems<SurveyCycle>(STORAGE_KEYS.SURVEY_CYCLES),
    getItems<Store>(STORAGE_KEYS.STORES),
    getItems<Product>(STORAGE_KEYS.PRODUCTS),
  ]);
  const cleaned = pruneOrphanedSurveyData(templatesData, resultsData, cyclesData);
  if (cleaned.results.length !== resultsData.length || cleaned.cycles.length !== cyclesData.length) {
    await Promise.all([
      saveItems(STORAGE_KEYS.SURVEY_RESULTS, cleaned.results),
      saveItems(STORAGE_KEYS.SURVEY_CYCLES, cleaned.cycles),
    ]);
  }
  return {
    templates: cleaned.templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    results: cleaned.results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    cycles: sortSurveyCyclesNewestFirst(cleaned.cycles),
    stores: storesData.filter((store) => store.isActive !== false),
    products: productsData,
  };
}
