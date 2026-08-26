import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("فتح الملفات المحفوظة", () => {
  it("يحدد صيغ PDF وExcel وPowerPoint قبل عرض التطبيقات المتوافقة", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/open-file-with-app.ts"), "utf8");
    expect(source).toContain("application/pdf");
    expect(source).toContain("spreadsheetml.sheet");
    expect(source).toContain("presentationml.presentation");
  });

  it("يفتح تقارير Android في عارض متوافق عبر VIEW intent بدلاً من واجهة المشاركة", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/open-file-with-app.ts"), "utf8");
    expect(source).toContain('import * as IntentLauncher from "expo-intent-launcher"');
    expect(source).toContain('Platform.OS === "android"');
    expect(source).toContain("FileSystem.getContentUriAsync(uri)");
    expect(source).toContain('IntentLauncher.startActivityAsync("android.intent.action.VIEW"');
    expect(source).toContain("type: mimeTypeFor(name)");
    expect(source).toContain("flags: 1");
  });
});
