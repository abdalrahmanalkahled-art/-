export interface LegacyBackupMediaMeta {
  relativePath: string;
  size: number;
  sourceUri?: string;
}

export interface LegacyBackupHeader {
  schemaVersion: number;
  type: "madar-full-backup";
  backupKind?: "full" | "partial";
  sections?: string[];
  createdAt: string;
  data: Record<string, string>;
}

export type LegacyBackupStreamEvent =
  | { type: "header"; header: LegacyBackupHeader }
  | { type: "media-start"; media: LegacyBackupMediaMeta }
  | { type: "media-base64"; value: string }
  | { type: "media-end"; media: LegacyBackupMediaMeta }
  | { type: "complete" };

const MEDIA_MARKER = '"media":[';
const BASE64_MARKER = '"base64":"';
const MAX_HEADER_CHARS = 8 * 1024 * 1024;

function parseJson<T>(raw: string, error: string): T {
  try { return JSON.parse(raw) as T; } catch { throw new Error(error); }
}

function asMediaMeta(value: unknown): LegacyBackupMediaMeta {
  if (!value || typeof value !== "object") throw new Error("تحتوي النسخة على وسيط غير صالح.");
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.relativePath !== "string" || !candidate.relativePath || typeof candidate.size !== "number") throw new Error("تحتوي النسخة على بيانات وسيط غير صالحة.");
  return { relativePath: candidate.relativePath, size: candidate.size, ...(typeof candidate.sourceUri === "string" ? { sourceUri: candidate.sourceUri } : {}) };
}

function asPartialMedia(value: unknown): LegacyBackupMediaMeta {
  if (!value || typeof value !== "object") throw new Error("تحتوي النسخة على وسيط غير صالح.");
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.relativePath !== "string" || !candidate.relativePath) throw new Error("تحتوي النسخة على مسار وسيط غير صالح.");
  return { relativePath: candidate.relativePath, size: 0, ...(typeof candidate.sourceUri === "string" ? { sourceUri: candidate.sourceUri } : {}) };
}

/** محلل نصي صغير لهيكل النسخ الصادر من التطبيق. لا يحتفظ بسلسلة Base64 كاملة في الذاكرة. */
export class LegacyBackupStreamParser {
  private phase: "header" | "media-start" | "media-prefix" | "media-base64" | "media-tail" | "done" = "header";
  private buffer = "";
  private mediaPrefix = "";
  private mediaTail = "";
  private partialMedia: LegacyBackupMediaMeta | null = null;

  feed(chunk: string, isFinal = false): LegacyBackupStreamEvent[] {
    const events: LegacyBackupStreamEvent[] = [];
    this.buffer += chunk;
    let progressed = true;
    while (progressed) {
      progressed = false;
      if (this.phase === "header") {
        const markerIndex = this.buffer.indexOf(MEDIA_MARKER);
        if (markerIndex < 0) {
          if (this.buffer.length > MAX_HEADER_CHARS) throw new Error("بيانات النسخة قبل الوسائط كبيرة جداً ولا يمكن فحصها بأمان.");
          break;
        }
        const head = `${this.buffer.slice(0, markerIndex)}"media":[],"skippedMediaPaths":[]}`;
        const header = parseJson<LegacyBackupHeader>(head, "تعذر قراءة بيانات النسخة الاحتياطية.");
        events.push({ type: "header", header });
        this.buffer = this.buffer.slice(markerIndex + MEDIA_MARKER.length);
        this.phase = "media-start";
        progressed = true;
        continue;
      }
      if (this.phase === "media-start") {
        this.buffer = this.buffer.replace(/^\s*,?\s*/, "");
        if (!this.buffer) break;
        if (this.buffer.startsWith("]")) {
          this.buffer = this.buffer.slice(1);
          this.phase = "done";
          events.push({ type: "complete" });
          progressed = true;
          continue;
        }
        if (!this.buffer.startsWith("{")) {
          if (isFinal) throw new Error("صيغة قائمة الوسائط غير صالحة.");
          break;
        }
        this.mediaPrefix = "{";
        this.buffer = this.buffer.slice(1);
        this.phase = "media-prefix";
        progressed = true;
        continue;
      }
      if (this.phase === "media-prefix") {
        const index = this.buffer.indexOf(BASE64_MARKER);
        if (index < 0) {
          this.mediaPrefix += this.buffer;
          this.buffer = "";
          if (this.mediaPrefix.length > 64 * 1024) throw new Error("بيانات وسيط النسخة غير صالحة.");
          break;
        }
        this.mediaPrefix += this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + BASE64_MARKER.length);
        this.partialMedia = asPartialMedia(parseJson(`${this.mediaPrefix}"base64":""}`, "تعذر قراءة بيانات وسيط النسخة."));
        events.push({ type: "media-start", media: this.partialMedia });
        this.phase = "media-base64";
        progressed = true;
        continue;
      }
      if (this.phase === "media-base64") {
        const quoteIndex = this.buffer.indexOf('"');
        if (quoteIndex >= 0) {
          const value = this.buffer.slice(0, quoteIndex);
          if (value) events.push({ type: "media-base64", value });
          this.buffer = this.buffer.slice(quoteIndex + 1);
          this.mediaTail = "";
          this.phase = "media-tail";
          progressed = true;
          continue;
        }
        const safeLength = this.buffer.length - (this.buffer.length % 4);
        if (safeLength > 0) {
          events.push({ type: "media-base64", value: this.buffer.slice(0, safeLength) });
          this.buffer = this.buffer.slice(safeLength);
        }
        break;
      }
      if (this.phase === "media-tail") {
        const endIndex = this.buffer.indexOf("}");
        if (endIndex < 0) {
          this.mediaTail += this.buffer;
          this.buffer = "";
          if (this.mediaTail.length > 64 * 1024) throw new Error("نهاية وسيط النسخة غير صالحة.");
          break;
        }
        this.mediaTail += this.buffer.slice(0, endIndex + 1);
        this.buffer = this.buffer.slice(endIndex + 1);
        const media = asMediaMeta(parseJson(`${this.mediaPrefix}"base64":""${this.mediaTail}`, "تعذر إنهاء قراءة وسيط النسخة."));
        events.push({ type: "media-end", media });
        this.partialMedia = null;
        this.mediaPrefix = "";
        this.mediaTail = "";
        this.phase = "media-start";
        progressed = true;
      }
    }
    if (isFinal && this.phase !== "done") throw new Error("ملف النسخة الاحتياطية غير مكتمل أو لا يتبع التنسيق المدعوم.");
    return events;
  }
}
