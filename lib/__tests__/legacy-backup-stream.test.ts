import { describe, expect, it } from "vitest";

import { LegacyBackupStreamParser } from "../legacy-backup-stream";

describe("قارئ النسخ الاحتياطية المتدرج", () => {
  it("يصدر وسائط Base64 على دفعات ولا يحتاج إلى تجميعها داخل حدث واحد", () => {
    const base64 = "QUJD".repeat(10000);
    const raw = JSON.stringify({ schemaVersion: 1, type: "madar-full-backup", createdAt: "2026-08-25T00:00:00.000Z", data: { madar_stores: "[]" }, media: [{ relativePath: "media/photo.jpg", base64, size: 30000, sourceUri: "file:///old.jpg" }], skippedMediaPaths: [] });
    const parser = new LegacyBackupStreamParser();
    const events = [] as ReturnType<LegacyBackupStreamParser["feed"]>;
    for (let index = 0; index < raw.length; index += 257) events.push(...parser.feed(raw.slice(index, index + 257), index + 257 >= raw.length));
    const chunks = events.filter((event) => event.type === "media-base64");
    expect(events.some((event) => event.type === "header")).toBe(true);
    expect(events.some((event) => event.type === "media-start")).toBe(true);
    expect(events.some((event) => event.type === "media-end")).toBe(true);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.reduce((total, event) => total + event.value.length, 0)).toBe(base64.length);
  });
});
