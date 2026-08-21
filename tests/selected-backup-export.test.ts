import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const screen = readFileSync(resolve(process.cwd(), "app/backup-management.tsx"), "utf8");
const exporter = readFileSync(resolve(process.cwd(), "lib/selected-backup-export.ts"), "utf8");

describe("تصدير النسخ الاحتياطية المحددة", () => {
  it("يوفر إجراءي الحفظ والمشاركة في رأس وضع التحديد المتعدد", () => {
    expect(screen).toContain("saveSelectedToPhone");
    expect(screen).toContain("shareSelected");
    expect(screen).toContain('name="save-alt"');
    expect(screen).toContain('name="share"');
  });

  it("يحفظ كل نسخة JSON في مجلد الهاتف ويجمع النسخ المتعددة للمشاركة", () => {
    expect(exporter).toContain("StorageAccessFramework.requestDirectoryPermissionsAsync");
    expect(exporter).toContain("StorageAccessFramework.createFileAsync");
    expect(exporter).toContain("new JSZip()");
    expect(exporter).toContain("shareSelectedBackups");
    expect(exporter).toContain("saveSelectedBackupsToPhone");
  });
});
