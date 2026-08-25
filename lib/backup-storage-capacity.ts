import type { FullBackupPayload } from "./full-backup";

export interface BackupRestoreSpaceEstimate {
  localMediaBytes: number;
  dataBytes: number;
  requiredBytes: number;
}

function base64Bytes(value: string): number {
  const normalized = value.replace(/\s/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * يحسب فقط ما سيُكتب داخل حاوية التطبيق أثناء الاستعادة.
 * وسائط marketing manager تذهب مباشرة إلى المجلد الخارجي الذي اختاره المستخدم، فلا تُحسب مرتين هنا.
 */
export function estimateBackupRestoreSpace(payload: FullBackupPayload): BackupRestoreSpaceEstimate {
  const localMediaBytes = payload.media
    .filter((media) => !media.relativePath.startsWith("marketing-manager/"))
    .reduce((total, media) => total + Math.max(media.size, base64Bytes(media.base64)), 0);
  const dataBytes = Object.values(payload.data).reduce((total, value) => total + utf8Bytes(value), 0);
  return { localMediaBytes, dataBytes, requiredBytes: localMediaBytes + dataBytes };
}

export function describeBackupRestoreSpaceError(requiredBytes: number, availableBytes: number): string {
  const toMegabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
  return `لا تكفي المساحة الحرة الفعلية على الجهاز لإتمام الاستعادة الآن. تحتاج الاستعادة إلى ${toMegabytes(requiredBytes)} على الأقل، بينما المتاح حالياً ${toMegabytes(availableBytes)}. لا يوجد حد ثابت لحجم النسخة؛ أعد المحاولة بعد تحرير مساحة فعلية.`;
}

/** يعيد false فقط عندما توفّر المنصة قياساً فعلياً وكانت المساحة أقل من الحجم الذي سيكتب محلياً. */
export function hasEnoughBackupRestoreSpace(payload: FullBackupPayload, availableBytes: number | null): boolean {
  if (availableBytes === null || !Number.isFinite(availableBytes)) return true;
  return availableBytes >= estimateBackupRestoreSpace(payload).requiredBytes;
}
