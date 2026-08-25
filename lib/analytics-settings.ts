import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { DEFAULT_ANALYTICS_SETTINGS, normalizeAnalyticsSettings, type AnalyticsSettings } from "./analytics-settings-model";
import { persistMarketingManagerFile } from "./marketing-manager-storage";
import { preparePdfImageDataUri } from "./pdf-media";

export { DEFAULT_ANALYTICS_SETTINGS, normalizeAnalyticsSettings, type AnalyticsSettings, type ChartLabelSize, type ChartOrientation, type ChartType } from "./analytics-settings-model";

export const ANALYTICS_SETTINGS_KEY = "madar_analytics_settings";
export async function loadAnalyticsSettings(): Promise<AnalyticsSettings> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_SETTINGS_KEY);
    return raw ? normalizeAnalyticsSettings(JSON.parse(raw)) : { ...DEFAULT_ANALYTICS_SETTINGS };
  } catch {
    return { ...DEFAULT_ANALYTICS_SETTINGS };
  }
}

export async function saveAnalyticsSettings(settings: AnalyticsSettings): Promise<void> {
  await AsyncStorage.setItem(ANALYTICS_SETTINGS_KEY, JSON.stringify(normalizeAnalyticsSettings(settings)));
}

function logoExtension(uri: string): string {
  const extension = uri.split("?")[0]?.split(".").pop()?.toLowerCase();
  return extension && ["png", "jpg", "jpeg", "webp"].includes(extension) ? extension : "jpg";
}

/**
 * يحفظ نسخة داخل مساحة التطبيق لضمان بقاء الشعار متاحاً بعد إغلاق منتقي الصور.
 */
export async function persistAnalyticsLogo(uri: string): Promise<string> {
  const externalUri = await persistMarketingManagerFile(uri, "branding", "report-logo");
  if (externalUri !== uri) return externalUri;
  if (Platform.OS === "web" || !FileSystem.documentDirectory) return uri;
  const directory = `${FileSystem.documentDirectory}analytics/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}report-logo-${Date.now()}.${logoExtension(uri)}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  const info = await FileSystem.getInfoAsync(destination);
  if (!info.exists || info.isDirectory || !info.size) throw new Error("تعذر حفظ نسخة صالحة من شعار التقرير");
  return destination;
}

export async function logoUriToDataUri(uri?: string): Promise<string | undefined> {
  if (!uri) return undefined;
  const dataUri = await preparePdfImageDataUri(uri, { width: 360, quality: 0.78, prefix: "pdf-logo" });
  if (!dataUri) throw new Error("تعذر قراءة شعار التقرير من موقعه المحفوظ");
  return dataUri;
}
