import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/media-gallery-lightbox.tsx"), "utf8");

describe("نافذة إضافة توثيق الفعالية", () => {
  it("تعرض خيارات الصورة والفيديو داخل نافذة عائمة", () => {
    expect(source).toContain('visible={showMediaPicker} transparent animationType="fade"');
    expect(source).toContain("إضافة توثيق");
    expect(source).toContain('label="إضافة صورة"');
    expect(source).toContain('label="إضافة فيديو"');
  });
});
