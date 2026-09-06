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

  it("يبني سياقاً حديثاً من خريطة البيانات دون إرسال الصور تلقائياً", () => {
    expect(moduleSource).toContain("buildSmartDataContext");
    expect(moduleSource).toContain("selectedScopes");
    expect(moduleSource).toContain("selectedFiles");
    expect(moduleSource).toContain("readAttachment");
  });

  it("يمرر الملفات إلى Gemini بصيغة inlineData ويتحقق من النوع والحجم", () => {
    expect(serverSource).toContain("attachments:");
    expect(serverSource).toContain("inlineData");
    expect(serverSource).toContain("supportedMimeTypes");
    expect(serverSource).toContain("totalAttachmentSize > 24000000");
    expect(moduleSource).toContain("readAttachment");
    expect(moduleSource).not.toContain("streamChatResponse");
    expect(moduleSource).not.toContain("new XMLHttpRequest()");
    expect(moduleSource).not.toContain("response.body.getReader");
    expect(moduleSource).toContain("aiChatMutation.mutateAsync");
  });

  it("يستدعي Gemini من الخادم فقط ويحدد حجم الطلب", () => {
    expect(serverSource).toContain("process.env.GEMINI_API_KEY");
    expect(serverSource).toContain("models/${input.model}:generateContent");
    expect(serverSource).toContain('model: z.enum(["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash"])');
    expect(serverSource).toContain("max(3000)");
    expect(serverSource).toContain("max(60000)");
    expect(serverSource).toContain("maxOutputTokens: 3000");
    expect(moduleSource).not.toContain("GEMINI_API_KEY");
    expect(moduleSource).toContain("loadAiModel");
    expect(moduleSource).toContain("aiChatMutation.mutateAsync");
    expect(moduleSource).toContain("model: aiModel");
  });

  it("يوفر نموذجاً اقتصادياً افتراضياً وخيارات نموذج محفوظة محلياً", () => {
    const modelSource = read("lib/ai-model-settings.ts");
    expect(modelSource).toContain('DEFAULT_AI_MODEL = "gemini-2.5-flash-lite"');
    expect(modelSource).toContain("AI_MODEL_OPTIONS");
    expect(modelSource).toContain("AsyncStorage");
    expect(modelSource).toContain("saveAiModel");
  });

  it("يبقي اللوحة للأرشيف وينقل النطاق والذاكرة إلى الإعدادات", () => {
    expect(moduleSource).toContain("النطاق والأرشيف");
    expect(moduleSource).toContain("data={[]}");
    expect(moduleSource).toContain("settingsContent");
    expect(moduleSource).not.toContain("النطاق: {SCOPE_OPTIONS");
    expect(moduleSource).not.toContain("تُرسل فقط البيانات الواقعة ضمن النطاق المختار");
  });

  it("يستخدم أيقونة قائمة وإعدادات وبطاقة محادثة جديدة داخل اللوحة", () => {
    expect(moduleSource).toContain('name="menu"');
    expect(moduleSource).toContain('name="settings"');
    expect(moduleSource).toContain("فتح نطاق البيانات والأرشيف");
    expect(moduleSource).toContain("إعدادات الذكاء الصناعي");
    expect(moduleSource).toContain("newConversationCard");
    expect(moduleSource).toContain("drawerListWrap");
    expect(moduleSource).toContain("Math.max(insets.top, 10)");
    expect(moduleSource).toContain("statusBarTranslucent={false}");
    expect(moduleSource).toContain("translateX");
    expect(moduleSource).toContain('width: "75%"');
    expect(moduleSource).toContain('drawer: { width: "75%"');
    expect(moduleSource).not.toContain('drawer: { flex: 1, width:');
    expect(moduleSource).toContain('justifyContent: "space-between"');
    expect(moduleSource).toContain("تنظيف السياق");
    expect(moduleSource).toContain("تنظيف الأرشيف");
    expect(moduleSource).toContain("settingsModal");
  });

  it("يعرض تنسيق الإجابات وإجراءات النسخ والمشاركة", () => {
    expect(moduleSource).toContain("markdownBold");
    expect(moduleSource).toContain("نسخ الإجابة");
    expect(moduleSource).toContain("مشاركة الإجابة");
    expect(moduleSource).toContain("text.split");
  });

  it("يحافظ على الردود الطويلة ويثبت محرر الإرسال مع لوحة المفاتيح", () => {
    expect(moduleSource).toContain("removeClippedSubviews={false}");
        expect(moduleSource).toContain("composerFloating");
    expect(moduleSource).toContain("keyboardHeight");
    expect(moduleSource).toContain("Keyboard.addListener");
    expect(moduleSource).toContain('const composerKeyboardLift = Platform.OS === "ios" ? keyboardHeight : 0;');
    expect(moduleSource).toContain("translateY: -composerKeyboardLift");
    expect(moduleSource).toContain("softwareKeyboardLayoutMode=resize");
    expect(moduleSource).toContain('keyboardShouldPersistTaps="always"');
    expect(moduleSource).toContain('keyboardDismissMode="none"');
    expect(moduleSource).toContain("SafeAreaView");
    expect(moduleSource).toContain('edges={["top", "bottom"]}');
    expect(moduleSource).toContain("navigationBarTranslucent={false}");
    expect(moduleSource).toContain("MarkdownMessage");
    expect(moduleSource).toContain("Clipboard.setStringAsync");
    expect(moduleSource).toContain("Share.share");
    expect(moduleSource).toContain("messageListRef.current?.scrollToEnd");
    expect(moduleSource).toContain("marginHorizontal: 12");
    expect(moduleSource).toContain("maxHeight: 110");
    expect(moduleSource).not.toContain("new AbortController()");
    expect(moduleSource).not.toContain("abortControllerRef");
    expect(moduleSource).not.toContain("إيقاف توليد الإجابة");
    expect(moduleSource).not.toContain("تم إيقاف التوليد.");
  });
});
