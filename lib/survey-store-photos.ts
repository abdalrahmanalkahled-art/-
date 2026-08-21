import * as FileSystem from "expo-file-system/legacy";
import { ensureDirectoryExists } from "@/lib/export-sanitizer";

const PHOTO_DIRECTORY = `${FileSystem.documentDirectory}survey-store-photos/`;

export async function persistSurveyStorePhoto(sourceUri: string): Promise<string> {
  await ensureDirectoryExists(PHOTO_DIRECTORY);
  const extension = sourceUri.toLowerCase().endsWith(".png") ? "png" : "jpg";
  const destination = `${PHOTO_DIRECTORY}store_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

type SurveyPhotoOwner = { storePhotoUri?: string; storePhotoUris?: string[] };

/** يحذف فقط صور الاستبيانات التي لم تعد تشير إليها أي نتيجة محفوظة. */
export async function deleteUnreferencedSurveyStorePhotos(removed: SurveyPhotoOwner[], retained: SurveyPhotoOwner[]): Promise<void> {
  const retainedUris = new Set(retained.flatMap(getSurveyPhotoUris));
  const candidates = [...new Set(removed.flatMap(getSurveyPhotoUris))];
  await Promise.all(candidates.filter((uri) => uri.startsWith(PHOTO_DIRECTORY) && !retainedUris.has(uri)).map(async (uri) => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // لا ينبغي أن يمنع تلف ملف صورة قديم حذف بيانات الاستبيان.
    }
  }));
}

function getSurveyPhotoUris(item: SurveyPhotoOwner): string[] {
  return item.storePhotoUris?.length ? item.storePhotoUris : item.storePhotoUri ? [item.storePhotoUri] : [];
}
