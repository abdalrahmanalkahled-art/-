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
});
