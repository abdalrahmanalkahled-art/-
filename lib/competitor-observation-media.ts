import * as FileSystem from "expo-file-system/legacy";

export const COMPETITOR_OBSERVATION_MEDIA_DIRECTORY = "competitor-observations/";

function extensionFromUri(uri: string): string {
  const value = uri.split("?")[0].match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
  return value && /^[a-z0-9]{1,5}$/.test(value) ? value : "jpg";
}

export function isCompetitorObservationMediaUri(uri?: string): boolean {
  return Boolean(uri && FileSystem.documentDirectory && uri.startsWith(`${FileSystem.documentDirectory}${COMPETITOR_OBSERVATION_MEDIA_DIRECTORY}`));
}

/** ينسخ صورة الرصد إلى مساحة دائمة مرتبطة بسجل الملاحظة. */
export async function removeCompetitorObservationImages(uris: string[] = []): Promise<void> {
  await Promise.all(uris.filter(isCompetitorObservationMediaUri).map(async (uri) => {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // الملف قد يكون أُزيل سابقاً؛ لا نفشل حذف السجل بسبب ذلك.
    }
  }));
}

export async function persistCompetitorObservationImage(sourceUri: string): Promise<string> {
  const base = FileSystem.documentDirectory;
  if (!base) throw new Error("تعذر الوصول إلى مساحة صور الرصد المحلية.");
  const directory = `${base}${COMPETITOR_OBSERVATION_MEDIA_DIRECTORY}`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}observation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extensionFromUri(sourceUri)}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  const info = await FileSystem.getInfoAsync(destination);
  if (!info.exists || info.isDirectory || !info.size) throw new Error("تعذر حفظ صورة رصد صالحة.");
  return destination;
}
