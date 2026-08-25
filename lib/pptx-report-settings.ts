import AsyncStorage from "@react-native-async-storage/async-storage";

export type PptxMediaLimit = 3 | 6 | 9;
export type PptxMediaCompression = "compact" | "balanced";
export type PptxAutoAdvanceSeconds = 5 | 8 | 12;

export interface PptxReportSettings {
  reportTitle: string;
  includeMedia: boolean;
  mediaLimit: PptxMediaLimit;
  mediaCompression: PptxMediaCompression;
  autoAdvance: boolean;
  autoAdvanceSeconds: PptxAutoAdvanceSeconds;
  sections: Record<string, boolean>;
}

export interface PptxReportSectionOption {
  key: string;
  label: string;
  description: string;
}

export function createDefaultPptxReportSettings(title: string, sections: PptxReportSectionOption[]): PptxReportSettings {
  return {
    reportTitle: title,
    includeMedia: true,
    mediaLimit: 6,
    mediaCompression: "balanced",
    autoAdvance: true,
    autoAdvanceSeconds: 8,
    sections: Object.fromEntries(sections.map((section) => [section.key, true])),
  };
}

export function normalizePptxReportSettings(value: unknown, fallback: PptxReportSettings): PptxReportSettings {
  const saved = value && typeof value === "object" ? value as Partial<PptxReportSettings> : {};
  const sectionValues = saved.sections && typeof saved.sections === "object" ? saved.sections : {};
  const mediaLimit = saved.mediaLimit === 3 || saved.mediaLimit === 6 || saved.mediaLimit === 9 ? saved.mediaLimit : fallback.mediaLimit;
  const autoAdvanceSeconds = saved.autoAdvanceSeconds === 5 || saved.autoAdvanceSeconds === 8 || saved.autoAdvanceSeconds === 12 ? saved.autoAdvanceSeconds : fallback.autoAdvanceSeconds;
  return {
    reportTitle: typeof saved.reportTitle === "string" && saved.reportTitle.trim() ? saved.reportTitle.trim() : fallback.reportTitle,
    includeMedia: typeof saved.includeMedia === "boolean" ? saved.includeMedia : fallback.includeMedia,
    mediaLimit,
    mediaCompression: saved.mediaCompression === "compact" || saved.mediaCompression === "balanced" ? saved.mediaCompression : fallback.mediaCompression,
    autoAdvance: typeof saved.autoAdvance === "boolean" ? saved.autoAdvance : fallback.autoAdvance,
    autoAdvanceSeconds,
    sections: Object.fromEntries(Object.keys(fallback.sections).map((key) => [key, typeof (sectionValues as Record<string, unknown>)[key] === "boolean" ? (sectionValues as Record<string, boolean>)[key] : fallback.sections[key]])),
  };
}

export async function loadPptxReportSettings(storageKey: string, fallback: PptxReportSettings): Promise<PptxReportSettings> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return fallback;
  try {
    return normalizePptxReportSettings(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export async function savePptxReportSettings(storageKey: string, settings: PptxReportSettings): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(settings));
}
