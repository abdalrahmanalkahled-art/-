import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const warehouseModule = readFileSync(resolve(process.cwd(), "components/modules/warehouse-module.tsx"), "utf8");
const toolsTab = readFileSync(resolve(process.cwd(), "components/warehouse-tools-tab.tsx"), "utf8");
const details = readFileSync(resolve(process.cwd(), "components/warehouse-detail-sheets.tsx"), "utf8");

describe("تفاصيل مواد وأدوات المستودع", () => {
  it("يربط بطاقة المادة بصفحة تفاصيلها ويبقي الضغط المطوّل للإجراءات", () => {
    expect(warehouseModule).toContain("onPress={() => setItemDetails(item)}");
    expect(warehouseModule).toContain("onLongPress={() => setItemActionTarget(item)}");
    expect(warehouseModule).toContain("<WarehouseMaterialDetailsSheet");
  });

  it("يربط بطاقة الأداة بصفحة تفاصيلها ويبقي الضغط المطوّل للإجراءات", () => {
    expect(toolsTab).toContain("onPress={() => setToolDetails(item)}");
    expect(toolsTab).toContain("onLongPress={() => setToolActionTarget(item)}");
    expect(toolsTab).toContain("<WarehouseToolDetailsSheet");
  });

  it("يعرض بيانات تفصيلية جذابة من دون أزرار تعديل أو حذف مباشرة", () => {
    expect(details).toContain("تفاصيل المادة");
    expect(details).toContain("تفاصيل الأداة");
    expect(details).toContain("آخر حركات المخزون");
    expect(details).toContain("الماركات المرتبطة");
    expect(details).toContain("اضغط مطولاً على بطاقة الأداة");
    expect(details).not.toContain("تعديل الأداة");
    expect(details).not.toContain("حذف الأداة");
  });
});
