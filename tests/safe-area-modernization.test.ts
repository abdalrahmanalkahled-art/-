import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const settingsSheets = [
  "components/analytics-settings-sheet.tsx",
  "components/expense-report-settings-sheet.tsx",
  "components/signage-report-settings-sheet.tsx",
];

describe("التوافق مع المناطق الآمنة", () => {
  it("يستخدم SafeAreaView المدعوم في نوافذ إعدادات التقارير", () => {
    for (const relativePath of settingsSheets) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      expect(source).toContain('import { SafeAreaView } from "react-native-safe-area-context"');
      expect(source).not.toMatch(/SafeAreaView[^\n]*from "react-native"/);
    }
  });
});
