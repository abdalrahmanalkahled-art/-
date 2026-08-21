import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const screen = readFileSync(resolve(process.cwd(), "app/backup-management.tsx"), "utf8");
const settings = readFileSync(resolve(process.cwd(), "app/settings.tsx"), "utf8");
const storageManagement = readFileSync(resolve(process.cwd(), "app/storage-management.tsx"), "utf8");
const events = readFileSync(resolve(process.cwd(), "app/(tabs)/events.tsx"), "utf8");

describe("صفحة إدارة النسخ الاحتياطية", () => {
  it("توفر إنشاء النسخة الكاملة والجزئية والاستعادة من الهاتف", () => {
    expect(screen).toContain("createFullBackup");
    expect(screen).toContain("createPartialBackup");
    expect(screen).toContain("DocumentPicker.getDocumentAsync");
    expect(screen).toContain("BACKUP_SECTION_OPTIONS");
  });

  it("يعرض نمطي الاستعادة ومعاينة الكتابة فوق قبل التأكيد", () => {
    expect(screen).toContain("استبدال البيانات");
    expect(screen).toContain("الكتابة فوق البيانات");
    expect(screen).toContain("createMergePreview");
    expect(screen).toContain("معاينة الكتابة فوق");
    expect(screen).toContain("إعدادات التطبيق تبقى محلية دائماً");
  });

  it("يعرض سجل آخر استعادة مع تفاصيل الأقسام والتغييرات", () => {
    expect(screen).toContain("getLastRestoreHistory");
    expect(screen).toContain("آخر عملية استعادة");
    expect(screen).toContain("سجل آخر عملية استعادة");
    expect(screen).toContain("تفاصيل الأقسام");
  });

  it("تحمي الحذف المتعدد بكلمة مرور الحساب الحالي", () => {
    expect(screen).toContain("onLongPress={() => startSelection(item.uri)}");
    expect(screen).toContain("verifyLocalUserPassword");
    expect(screen).toContain("حذف المحدد");
    expect(screen).toContain("secureTextEntry");
  });

  it("يصل إليها خيار النسخ في الإعدادات وقسم النسخ في إدارة المساحة", () => {
    expect(settings).toContain('router.push("/backup-management" as any)');
    expect(storageManagement).toContain('bucket.id === "backups" ? router.push("/backup-management" as any)');
    expect(settings).not.toContain('title="استعادة نسخة احتياطية"');
  });

  it("يعرض اختيار هدف الفعالية داخل نافذة عائمة قابلة للإغلاق من الخارج", () => {
    expect(events).toContain('transparent visible={showGoalSelector}');
    expect(events).toContain('animationType="fade"');
    expect(events).toContain('statusBarTranslucent');
    expect(events).toContain('goalSelectorOverlay');
  });
});
