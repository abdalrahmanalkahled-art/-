import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("الحديث مع الذكاء الصناعي", () => {
  const moduleSource = read("components/modules/ai-chat-module.tsx");
  const serverSource = read("server/routers.ts");
  const moreSource = read("components/modules/more-module-screen.tsx");

  it("يظهر كوحدة مستقلة داخل صفحة المزيد", () => {
    expect(moreSource).toContain('id: "ai-chat"');
    expect(moreSource).toContain("AIChatModule");
    expect(moreSource).toContain("الحديث مع الذكاء الصناعي");
  });

  it("يجمع سياقاً مختصراً من التخزين المحلي دون إرسال الصور تلقائياً", () => {
    expect(moduleSource).toContain("getItemsForKeys");
    expect(moduleSource).toContain("STORAGE_KEYS.EVENTS");
    expect(moduleSource).toContain("STORAGE_KEYS.MARKETING_GOALS");
    expect(moduleSource).toContain("STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS");
    expect(moduleSource).toContain("لا تُرسل الصور تلقائياً");
  });

  it("يستدعي Gemini من الخادم فقط ويحدد حجم الطلب", () => {
    expect(serverSource).toContain("process.env.GEMINI_API_KEY");
    expect(serverSource).toContain("gemini-3.6-flash:generateContent");
    expect(serverSource).toContain("max(3000)");
    expect(serverSource).toContain("max(30000)");
    expect(moduleSource).not.toContain("GEMINI_API_KEY");
  });
});
