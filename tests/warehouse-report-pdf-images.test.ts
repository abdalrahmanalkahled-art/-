import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const settingsSheet = readFileSync(resolve(process.cwd(), "components/warehouse-report-settings-sheet.tsx"), "utf8");
const model = readFileSync(resolve(process.cwd(), "lib/warehouse-report-settings-model.ts"), "utf8");
const exporter = readFileSync(resolve(process.cwd(), "lib/warehouse-report-exporter.ts"), "utf8");
const moreScreen = readFileSync(resolve(process.cwd(), "app/(tabs)/more.tsx"), "utf8");
const moreShell = readFileSync(resolve(process.cwd(), "components/modules/more-module-shell.tsx"), "utf8");

describe("إعداد تقرير المستودع", () => {
  it("يعرض كل جدول كبطاقة تفتح نافذة أعمدة مستقلة", () => {
    expect(settingsSheet).toContain("activeColumnGroup");
    expect(settingsSheet).toContain("<TableCard");
    expect(settingsSheet).toContain('<PanelModal visible={activeColumnGroup !== null}');
    expect(settingsSheet).toContain("أعمدة محددة");
  });

  it("يحفظ إعدادات حجم وجودة الصور بقيم مضبوطة", () => {
    expect(model).toContain("imageMaxWidth?: number");
    expect(model).toContain("imageQuality?: number");
    expect(model).toContain("imageMaxWidth: 900");
    expect(model).toContain("imageQuality: 0.72");
    expect(settingsSheet).toContain("جودة وحجم ملف PDF");
  });

  it("يطابق قالب إعدادات المستودع بطاقات ونوافذ إعدادات اللوحات والستاندات", () => {
    expect(settingsSheet).toContain("<PanelCard");
    expect(settingsSheet).toContain("function PanelModal");
    expect(settingsSheet).toContain("إعدادات تقرير المستودع");
    expect(settingsSheet).toContain("الجداول والأعمدة");
  });

  it("يوحد رأس وحدات المزيد مع نمط مختصر للمنتجات", () => {
    expect(moreScreen).toContain("<MoreModuleShell");
    expect(moreScreen).toContain('compact={activeModule === "products"}');
    expect(moreShell).toContain("accessibilityLabel=\"العودة إلى المزيد\"");
    expect(moreShell).toContain("subtitle");
  });

  it("يحوّل صورة الأداة إلى JPEG مضغوط وData URI داخل PDF", () => {
    expect(exporter).toContain("ImageManipulator.manipulateAsync");
    expect(exporter).toContain("StorageAccessFramework.readAsStringAsync");
    expect(exporter).toContain("localToolImageUri");
    expect(exporter).toContain("FileSystem.readAsStringAsync");
    expect(exporter).toContain("data:image/jpeg;base64,");
    expect(exporter).toContain("await embeddedToolImage(tool.imageUri, settings)");
  });
});
