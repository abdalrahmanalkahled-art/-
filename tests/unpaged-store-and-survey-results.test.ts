import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const storesSource = readFileSync(resolve(process.cwd(), "app/(tabs)/stores.tsx"), "utf8");
const surveysSource = readFileSync(resolve(process.cwd(), "app/(tabs)/surveys.tsx"), "utf8");

describe("قوائم المحلات ونتائج الاستبيانات", () => {
  it("تعرض كل المحلات المفلترة ضمن القائمة نفسها بلا تنقل صفحي", () => {
    expect(storesSource).toContain("data={filtered}");
    expect(storesSource).not.toContain("usePaginatedData");
    expect(storesSource).not.toContain("PaginationControls");
  });

  it("تعرض كل نتائج الاستبيانات المفلترة ضمن القائمة نفسها مع إبقاء تنقل القوالب مستقلاً", () => {
    expect(surveysSource).toContain("data={filteredResults}");
    expect(surveysSource).not.toContain("resultsPagination");
    expect(surveysSource).toContain("templatesPagination");
  });
});
