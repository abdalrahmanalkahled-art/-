import { describe, expect, it } from "vitest";

describe("Gemini secret", () => {
  it("يستجيب طلب التحقق الخفيف بمفتاح Gemini صالح", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey ?? "")}`,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { models?: unknown[] };
    expect(Array.isArray(payload.models)).toBe(true);
  }, 20_000);

  it("يقبل النموذج الجديد طلب محادثة نصية بسيطاً", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey ?? "")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "أجب بكلمة: جاهز" }] }],
          generationConfig: { maxOutputTokens: 64 },
        }),
      },
    );

    expect(response.status).toBe(200);
  }, 20_000);
});
