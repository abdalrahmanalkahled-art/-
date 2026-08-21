import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { ensureDirectoryExists, sanitizeFilename } from "@/lib/export-sanitizer";
import { parseSurveyResultsExport, type SurveyResultsExportPayload } from "@/lib/survey-results-transfer";

const EXPORT_DIR = `${FileSystem.documentDirectory}survey-results-exports/`;

export async function exportSurveyResultsFile(payload: SurveyResultsExportPayload) {
  await ensureDirectoryExists(EXPORT_DIR);
  const filename = sanitizeFilename(`نتائج_${payload.template.name}_${new Date().toISOString().slice(0, 10)}`, "json");
  const uri = `${EXPORT_DIR}${filename}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
  const shared = await Sharing.isAvailableAsync();
  if (shared) await Sharing.shareAsync(uri, { dialogTitle: "تصدير نتائج الاستبيان", mimeType: "application/json" });
  return { uri, shared };
}

export async function readSurveyResultsFile(uri: string) {
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  return parseSurveyResultsExport(text);
}
