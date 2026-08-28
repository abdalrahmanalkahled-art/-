export type StorageBucketId = "reports" | "storePhotos" | "signageMedia" | "eventMedia" | "templates" | "backups" | "exports" | "analytics" | "externalAnalytics" | "other" | "temporary";

export interface StorageBucketUsage {
  id: StorageBucketId;
  label: string;
  bytes: number;
  fileCount: number;
}

export interface StorageOverview {
  buckets: StorageBucketUsage[];
  documentBytes: number;
  temporaryBytes: number;
  totalBytes: number;
  freeBytes: number | null;
}

export const STORAGE_BUCKET_META: Record<StorageBucketId, Pick<StorageBucketUsage, "label">> = {
  reports: { label: "التقارير" },
  storePhotos: { label: "صور المحلات" },
  competitorPhotos: { label: "صور رصد المنافسين" },
  signageMedia: { label: "وسائط اللوحات والستاندات" },
  eventMedia: { label: "توثيق الفعاليات" },
  templates: { label: "قوالب زيارة السوق" },
  backups: { label: "النسخ الاحتياطية" },
  exports: { label: "ملفات الاستبيانات المصدّرة" },
  analytics: { label: "شعارات وإعدادات التقارير" },
  externalAnalytics: { label: "استبيانات محفوظة للتحليل" },
  other: { label: "ملفات التطبيق الأخرى" },
  temporary: { label: "ملفات مؤقتة" },
};

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} غيغابايت`;
}

export function buildStorageOverview(values: Partial<Record<StorageBucketId, { bytes: number; fileCount: number }>>, freeBytes: number | null = null): StorageOverview {
  const buckets = (Object.keys(STORAGE_BUCKET_META) as StorageBucketId[]).map((id) => ({
    id,
    label: STORAGE_BUCKET_META[id].label,
    bytes: Math.max(0, values[id]?.bytes || 0),
    fileCount: Math.max(0, values[id]?.fileCount || 0),
  }));
  const documentBytes = buckets.filter((bucket) => bucket.id !== "temporary").reduce((total, bucket) => total + bucket.bytes, 0);
  const temporaryBytes = buckets.find((bucket) => bucket.id === "temporary")?.bytes || 0;
  return { buckets, documentBytes, temporaryBytes, totalBytes: documentBytes + temporaryBytes, freeBytes };
}
