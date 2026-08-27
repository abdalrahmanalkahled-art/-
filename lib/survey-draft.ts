import { getItems, saveItems, STORAGE_KEYS } from "./storage";

export interface SurveyDraftEntry {
  id: string;
  templateId: string;
  storeId: string;
  surveyData: [string, { present?: boolean; shelfPercentage?: number; shelfOccupied?: number; price?: number; answers?: string[] }][];
  numericDrafts: [string, string][];
  totalShelves: string;
  storePhotoUris: string[];
  notes: string;
  noteType: "positive" | "negative" | "complaint" | "suggestion" | "recommendation";
  updatedAt: string;
}

export function surveyDraftId(templateId: string, storeId: string): string { return `${templateId}:${storeId}`; }

export async function loadSurveyDraft(templateId: string, storeId: string): Promise<SurveyDraftEntry | null> {
  const id = surveyDraftId(templateId, storeId);
  return (await getItems<SurveyDraftEntry>(STORAGE_KEYS.SURVEY_DRAFTS)).find((item) => item.id === id) || null;
}

export async function saveSurveyDraft(draft: Omit<SurveyDraftEntry, "id" | "updatedAt">): Promise<void> {
  const id = surveyDraftId(draft.templateId, draft.storeId);
  const items = await getItems<SurveyDraftEntry>(STORAGE_KEYS.SURVEY_DRAFTS);
  const next = [{ ...draft, id, updatedAt: new Date().toISOString() }, ...items.filter((item) => item.id !== id)].slice(0, 20);
  await saveItems(STORAGE_KEYS.SURVEY_DRAFTS, next);
}

export async function clearSurveyDraft(templateId: string, storeId: string): Promise<void> {
  const items = await getItems<SurveyDraftEntry>(STORAGE_KEYS.SURVEY_DRAFTS);
  await saveItems(STORAGE_KEYS.SURVEY_DRAFTS, items.filter((item) => item.id !== surveyDraftId(templateId, storeId)));
}
