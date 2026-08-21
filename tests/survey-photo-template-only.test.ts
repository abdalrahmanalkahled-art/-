import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const surveys = readFileSync(resolve(process.cwd(), "app/(tabs)/surveys.tsx"), "utf8");

describe("صور المحل في أخذ الاستبيان", () => {
  it("يعتمد إظهار بطاقة الصور على إعداد القالب فقط ولا يعرض زر تفعيل داخلي", () => {
    expect(surveys).toContain("selectedTemplate?.allowStorePhoto ? <StorePhotosEditor");
    expect(surveys).not.toContain("storePhotoEnabled");
    expect(surveys).not.toContain("أخذ صورة للمحل");
  });
});
