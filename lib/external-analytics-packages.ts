import * as FileSystem from "expo-file-system/legacy";

import { ensureDirectoryExists, sanitizeFilename } from "@/lib/export-sanitizer";
import { createCombinedExternalAnalyticsDataset } from "@/lib/external-analytics-merge";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { createExternalAnalyticsDataset, type ExternalAnalyticsDataset, type SurveyResultsExportPayload } from "@/lib/survey-results-transfer";

const PACKAGE_DIR = `${FileSystem.documentDirectory}external-analytics-packages/`;

export interface ExternalAnalyticsPackage {
  id: string;
  name: string;
  sourceTemplateName: string;
  importedAt: string;
  cycleCount: number;
  resultCount: number;
  fileUri: string;
}

interface StoredExternalAnalyticsPackage extends ExternalAnalyticsPackage { dataset: ExternalAnalyticsDataset; }

export async function listExternalAnalyticsPackages(): Promise<ExternalAnalyticsPackage[]> {
  const packages = await getItems<StoredExternalAnalyticsPackage>(STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES);
  return packages.map(({ dataset: _dataset, ...item }) => item).sort((first, second) => new Date(second.importedAt).getTime() - new Date(first.importedAt).getTime());
}

export async function getExternalAnalyticsPackage(id: string): Promise<StoredExternalAnalyticsPackage | null> {
  const packages = await getItems<StoredExternalAnalyticsPackage>(STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES);
  return packages.find((item) => item.id === id) || null;
}

/** يبني تحليلاً مجمّعاً مؤقتاً من آخر دورة لكل حزمة، دون تعديل أو حفظ الحزم الأصلية. */
export async function buildCombinedExternalAnalyticsDataset(): Promise<ExternalAnalyticsDataset> {
  const packages = await getItems<StoredExternalAnalyticsPackage>(STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES);
  return createCombinedExternalAnalyticsDataset(packages);
}

export async function saveExternalAnalyticsPackage(name: string, payload: SurveyResultsExportPayload): Promise<ExternalAnalyticsPackage> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("أدخل تسمية لنتائج الاستبيان المستوردة.");
  const packages = await getItems<StoredExternalAnalyticsPackage>(STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES);
  const finalName = uniqueName(trimmedName, packages.map((item) => item.name));
  const id = `external_analytics_${Date.now()}`;
  await ensureDirectoryExists(PACKAGE_DIR);
  const fileUri = `${PACKAGE_DIR}${sanitizeFilename(id, "json")}`;
  const stored: StoredExternalAnalyticsPackage = { id, name: finalName, sourceTemplateName: payload.template.name, importedAt: new Date().toISOString(), cycleCount: payload.cycles.length, resultCount: payload.results.length, fileUri, dataset: createExternalAnalyticsDataset(payload) };
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(stored), { encoding: FileSystem.EncodingType.UTF8 });
  await saveItems(STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES, [...packages, stored]);
  return { id: stored.id, name: stored.name, sourceTemplateName: stored.sourceTemplateName, importedAt: stored.importedAt, cycleCount: stored.cycleCount, resultCount: stored.resultCount, fileUri: stored.fileUri };
}

export async function deleteExternalAnalyticsPackage(id: string): Promise<void> {
  const packages = await getItems<StoredExternalAnalyticsPackage>(STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES);
  const target = packages.find((item) => item.id === id);
  if (!target) return;
  const info = await FileSystem.getInfoAsync(target.fileUri);
  if (info.exists) await FileSystem.deleteAsync(target.fileUri, { idempotent: true });
  await saveItems(STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES, packages.filter((item) => item.id !== id));
}

export async function deleteAllExternalAnalyticsPackages(): Promise<void> {
  const packages = await getItems<StoredExternalAnalyticsPackage>(STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES);
  await Promise.all(packages.map((item) => FileSystem.deleteAsync(item.fileUri, { idempotent: true })));
  await saveItems(STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES, []);
}

function uniqueName(name: string, names: string[]) { const known = new Set(names.map(normalize)); if (!known.has(normalize(name))) return name; let index = 2; while (known.has(normalize(`${name} (${index})`))) index += 1; return `${name} (${index})`; }
function normalize(value: string) { return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ar"); }
