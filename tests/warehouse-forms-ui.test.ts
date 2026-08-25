import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const warehouse = readFileSync(resolve(process.cwd(), "components/modules/warehouse-module.tsx"), "utf8");
const tools = readFileSync(resolve(process.cwd(), "components/warehouse-tools-tab.tsx"), "utf8");

describe("نماذج إدارة المستودع", () => {
  it("تستخدم النماذج غلافاً آمناً وحاوية عائمة وأزراراً سفلية موحدة", () => {
    expect(warehouse).toContain("<FloatingFormModal visible={showItemModal}");
    expect(warehouse).toContain("<SafeAreaView edges={[\"top\", \"bottom\", \"left\", \"right\"]}");
    expect(warehouse).toContain("styles.modalFooter");
    expect(warehouse).toContain("DESIGN.control.standard");
  });

  it("يضيف المادة بالطرود والقطع ويتيح تحديد وحدة الإدخال أو الإخراج", () => {
    expect(warehouse).toContain('key: "packageCount"');
    expect(warehouse).toContain('key: "piecesPerPackage"');
    expect(warehouse).toContain('movementUnit: "package"');
    expect(warehouse).toContain('movementUnit === "piece"');
    expect(warehouse).toContain("calculateMovementPieces");
    expect(warehouse).toContain("formatWarehouseQuantity");
  });

  it("يبقى حقل حالة الأداة بخياراته الحالية داخل نموذج الإضافة والتعديل", () => {
    expect(tools).toContain("حالة الأداة");
    expect(tools).toContain('["new", "good", "needs_repair"]');
    expect(tools).toContain("conditionMeta(condition)");
    expect(tools).toContain("onChange((current) => ({ ...current, condition }))");
  });

  it("يحافظ على التأكيد والنجاح والضغط المطوّل للأدوات", () => {
    expect(tools).toContain("onLongPress={() => setToolActionTarget(item)}");
    expect(tools).toContain("<ConfirmDialog");
    expect(tools).toContain("<SuccessModal");
  });
});
