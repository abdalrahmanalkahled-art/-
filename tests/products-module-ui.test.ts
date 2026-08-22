import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/modules/products-module.tsx"), "utf8");

describe("واجهة إدارة المنتجات", () => {
  it("يفتح منتجات التصنيف داخل نافذة عائمة عند الضغط على التصنيف", () => {
    expect(source).toContain("setSelectedCategory(item.category)");
    expect(source).toContain("visible={Boolean(selectedCategory)}");
    expect(source).toContain("المنتجات المرتبطة بالتصنيف");
  });

  it("يعرض إجراءات المنتج بالضغط المطوّل فقط", () => {
    expect(source).toContain("onLongPress={() => setProductActionTarget(item)}");
    expect(source).toContain("تعديل المنتج");
    expect(source).toContain("حذف المنتج");
    expect(source).toContain("<CardActionModal");
    expect(source).not.toContain('onPress={() => handleDeleteProduct(product.id)}');
  });

  it("يحافظ على التأكيد والنجاح في الحذف والحفظ", () => {
    expect(source).toContain("تأكيد الحذف");
    expect(source).toContain("<SuccessModal visible={showSuccessAdd}");
    expect(source).toContain("onPress={handleSaveProduct}");
  });
});
