import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_SIGNAGE_REPORT_SETTINGS, normalizeSignageReportSettings, type SignageReportScope, type SignageReportSettings } from "./signage-report-settings-model";

const SETTINGS_KEYS: Record<SignageReportScope, string> = { boards: "madar_signage_boards_report_settings", works: "madar_signage_works_report_settings", archive: "madar_signage_archive_report_settings" };

export async function loadSignageReportSettings(scope: SignageReportScope = "boards"): Promise<SignageReportSettings> { try { const raw = await AsyncStorage.getItem(SETTINGS_KEYS[scope]); return raw ? normalizeSignageReportSettings(JSON.parse(raw), scope) : { ...DEFAULT_SIGNAGE_REPORT_SETTINGS, reportScope: scope }; } catch { return { ...DEFAULT_SIGNAGE_REPORT_SETTINGS, reportScope: scope }; } }
export async function saveSignageReportSettings(value: SignageReportSettings): Promise<SignageReportSettings> { const settings = normalizeSignageReportSettings(value, value.reportScope); await AsyncStorage.setItem(SETTINGS_KEYS[settings.reportScope], JSON.stringify(settings)); return settings; }
