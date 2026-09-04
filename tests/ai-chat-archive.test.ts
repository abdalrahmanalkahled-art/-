import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("أرشيف وإعدادات محادثة الذكاء الاصطناعي", () => {
  const source = read("components/modules/ai-chat-module.tsx");

  it("يفصل التهيئة الأولية عن حفظ النطاق لمنع الوميض", () => {
    expect(source).toContain("scopeHydrated");
    expect(source).toContain("if (!scopeHydrated) return;");
    expect(source).toContain("}, []);");
  });

  it("يحفظ نطاقات البيانات والمحادثات على الجهاز", () => {
    expect(source).toContain('const SCOPE_KEY = "madar_ai_chat_scope"');
    expect(source).toContain('const ARCHIVE_KEY = "madar_ai_chat_archive"');
    expect(source).toContain("AsyncStorage.setItem(SCOPE_KEY");
    expect(source).toContain("AsyncStorage.setItem(ARCHIVE_KEY");
  });

  it("يعرض نطاقات قابلة للتحديد وأرشيفاً مع بدء محادثة جديدة", () => {
    expect(source).toContain("toggleScope");
    expect(source).toContain("أرشيف المحادثات");
    expect(source).toContain("startNewConversation");
    expect(source).toContain("openArchivedConversation");
  });

  it("يحذف المحادثة بعد التأكيد ولا يحذفها مباشرة", () => {
    expect(source).toContain("setDeleteTarget(item)");
    expect(source).toContain("ConfirmDialog");
    expect(source).toContain("حذف المحادثة");
    expect(source).toContain("AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(next))");
  });
});
