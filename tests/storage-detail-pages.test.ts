import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const overviewSource = readFileSync(resolve(process.cwd(), "app/storage-management.tsx"), "utf8");
const detailsSource = readFileSync(resolve(process.cwd(), "app/storage-details/[bucket].tsx"), "utf8");
const managerSource = readFileSync(resolve(process.cwd(), "lib/storage-detail-manager.ts"), "utf8");

describe("صفحات تفاصيل إدارة مساحة التخزين", () => {
  it("يفتح صور المحلات والرصد ووسائط الأصول والقوالب والنسخ الاحتياطية والحزم التحليلية من ملخص المساحة", () => {
    expect(overviewSource).toContain('const DETAIL_BUCKETS: StorageBucketId[] = ["storePhotos", "competitorPhotos", "signageMedia", "templates", "backups", "externalAnalytics"]');
    expect(overviewSource).toContain('pathname: "/storage-details/[bucket]"');
  });

  it("يوفر إجراءات الحذف والاستعادة مع تأكيد صريح", () => {
    expect(detailsSource).toContain("deleteStorageStorePhoto");
    expect(detailsSource).toContain("deleteStorageCompetitorObservationPhoto");
    expect(detailsSource).toContain("deleteStorageSignageMedia");
    expect(detailsSource).toContain("deleteStorageTemplate");
    expect(detailsSource).toContain("deleteStorageExternalAnalyticsPackage");
    expect(detailsSource).toContain("restoreFullBackup");
    expect(detailsSource).toContain("<ConfirmDialog visible={Boolean(pendingDelete)}");
    expect(detailsSource).toContain("<ConfirmDialog visible={Boolean(pendingRestore)}");
  });

  it("يحمي حذف الملفات ليتعلق فقط بمجلدات التطبيق المخصصة", () => {
    expect(managerSource).toContain("isInsideDocumentDirectory");
    expect(managerSource).toContain("لا يمكن حذف صورة خارج مساحة صور المحلات");
    expect(managerSource).toContain("لا يمكن حذف صورة خارج مساحة صور رصد المنافسين");
    expect(managerSource).toContain("لا يمكن حذف نسخة خارج مساحة النسخ الاحتياطية");
    expect(managerSource).toContain("لا يمكن حذف وسيط خارج مساحة اللوحات والستاندات");
  });

  it("يدعم التحديد المتعدد بالضغط المطوّل مع تحديد الكل وحذف مؤكد", () => {
    expect(detailsSource).toContain("onLongPress={() => startSelection(photo.uri)}");
    expect(detailsSource).toContain("onLongPress={() => startSelection(template.uri)}");
    expect(detailsSource).toContain("onLongPress={() => startSelection(media.uri)}");
    expect(detailsSource).toContain("تحديد الكل");
    expect(detailsSource).toContain("حذف المحدد");
    expect(detailsSource).toContain("requestSelectedDelete");
  });
});
