import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { ensureDirectoryExists, sanitizeFilename } from "@/lib/export-sanitizer";
import { parseSurveyTemplateExport, type SurveyTemplateExportPayload } from "@/lib/survey-template-transfer";

const EXPORT_DIR = `${FileSystem.documentDirectory}survey-template-exports/`;

export async function exportSurveyTemplateFile(payload: SurveyTemplateExportPayload) {
  await ensureDirectoryExists(EXPORT_DIR);
  const filename = sanitizeFilename(`استبيان_${payload.template.name}_${new Date().toISOString().slice(0, 10)}`, "json");
  const uri = `${EXPORT_DIR}${filename}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
  const shared = await Sharing.isAvailableAsync();
  if (shared) await Sharing.shareAsync(uri, { dialogTitle: "مشاركة قالب الاستبيان", mimeType: "application/json" });
  return { uri, shared };
}

export async function readSurveyTemplateFile(uri: string) {
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  return parseSurveyTemplateExport(text);
}
