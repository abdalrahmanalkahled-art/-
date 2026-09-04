import AsyncStorage from "@react-native-async-storage/async-storage";

export const AI_MODEL_KEY = "madar_ai_model";
export const DEFAULT_AI_MODEL = "gemini-2.5-flash-lite";

export type AiModelId =
  | "gemini-2.5-flash-lite"
  | "gemini-2.5-flash"
  | "gemini-3.5-flash-lite"
  | "gemini-3.6-flash";

export type AiModelOption = {
  id: AiModelId;
  title: string;
  subtitle: string;
  tone: "success" | "primary" | "accent";
};

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  { id: "gemini-2.5-flash-lite", title: "Gemini 2.5 Flash-Lite", subtitle: "اقتصادي وسريع للأسئلة اليومية", tone: "success" },
  { id: "gemini-2.5-flash", title: "Gemini 2.5 Flash", subtitle: "متوازن للنصوص والتحليل العام", tone: "primary" },
  { id: "gemini-3.5-flash-lite", title: "Gemini 3.5 Flash-Lite", subtitle: "سريع للطلبات المتكررة", tone: "accent" },
  { id: "gemini-3.6-flash", title: "Gemini 3.6 Flash", subtitle: "تحليل أعمق وقدرات متعددة الوسائط", tone: "primary" },
];

export function isAiModelId(value: unknown): value is AiModelId {
  return typeof value === "string" && AI_MODEL_OPTIONS.some((option) => option.id === value);
}

export async function loadAiModel(): Promise<AiModelId> {
  const stored = await AsyncStorage.getItem(AI_MODEL_KEY);
  return isAiModelId(stored) ? stored : DEFAULT_AI_MODEL;
}

export async function saveAiModel(model: AiModelId): Promise<void> {
  await AsyncStorage.setItem(AI_MODEL_KEY, model);
}
