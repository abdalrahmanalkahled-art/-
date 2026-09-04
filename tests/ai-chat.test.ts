import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("الحديث مع الذكاء الصناعي", () => {
  const moduleSource = read("components/modules/ai-chat-module.tsx");
  const serverSource = read("server/routers.ts");
  const streamSource = read("server/ai-stream.ts");
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

  it("يمرر الملفات إلى Gemini بصيغة inlineData ويتحقق من النوع والحجم", () => {
    expect(serverSource).toContain("attachments:");
    expect(serverSource).toContain("inlineData");
    expect(serverSource).toContain("supportedMimeTypes");
    expect(serverSource).toContain("totalAttachmentSize > 24000000");
    expect(moduleSource).toContain("readAttachment");
    expect(moduleSource).toContain("streamChatResponse");
    expect(moduleSource).toContain("new XMLHttpRequest()");
    expect(moduleSource).not.toContain("response.body.getReader");
    expect(moduleSource).toContain("attachments }, controller.signal");
  });

  it("يستدعي Gemini من الخادم فقط ويحدد حجم الطلب", () => {
    expect(serverSource).toContain("process.env.GEMINI_API_KEY");
    expect(serverSource).toContain("gemini-3.6-flash:generateContent");
    expect(serverSource).toContain("max(3000)");
    expect(serverSource).toContain("max(30000)");
    expect(serverSource).toContain("maxOutputTokens: 3000");
    expect(streamSource).toContain("/v1beta/models/gemini-3.6-flash:streamGenerateContent");
    expect(streamSource).toContain("text/event-stream");
    expect(streamSource).toContain("upstreamController.abort");
    expect(streamSource).toContain("dataLines");
    expect(streamSource).toContain("consumeProviderBuffer");
    expect(streamSource).toContain("replace(/\\r\\n/g");
    expect(moduleSource).not.toContain("GEMINI_API_KEY");
  });

  it("يحافظ على الردود الطويلة ويثبت محرر الإرسال مع لوحة المفاتيح", () => {
    expect(moduleSource).toContain("removeClippedSubviews={false}");
    expect(moduleSource).toContain('behavior={Platform.OS === "ios" ? "padding" : "height"}');
    expect(moduleSource).toContain("messageListRef.current?.scrollToEnd");
    expect(moduleSource).toContain("marginHorizontal: 12");
    expect(moduleSource).toContain("maxHeight: 110");
    expect(moduleSource).toContain("new AbortController()");
    expect(moduleSource).toContain("abortControllerRef.current?.abort()");
    expect(moduleSource).toContain("إيقاف توليد الإجابة");
    expect(moduleSource).toContain("تم إيقاف التوليد.");
  });
});
