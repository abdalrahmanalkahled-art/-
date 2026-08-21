import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { LAST_RESTORE_HISTORY_KEY } from "./backup-restore-history";
import { BACKUP_DATA_KEYS } from "./full-backup";
import { STORAGE_KEYS } from "./storage";

export type AppResetScopeId = "all" | "stores" | "surveys" | "events" | "warehouse" | "expenses" | "goals" | "signage" | "products" | "brandsRegions" | "reports" | "analytics" | "users";

export interface AppResetScope {
  id: AppResetScopeId;
  title: string;
  description: string;
  warning?: string;
  keys: string[];
  directories: string[];
}

export interface AppResetOutcome {
  scope: AppResetScopeId;
  removedDataGroups: number;
  removedDirectories: number;
  retainedBackups: true;
}

const LOCAL_RUNTIME_KEYS = [
  "madar_auth",
  "madar_user",
  "app_session_token",
  "manus-runtime-user-info",
  "madar_app_customization_v1",
  "@madar_app_settings_v1",
  "@madar_notification_preferences_v1",
  "madar_expense_report_settings",
  "madar_signage_report_settings",
  "madar_warehouse_report_settings",
  LAST_RESTORE_HISTORY_KEY,
] as const;

const sharedDirectories = ["reports/", "survey-store-photos/", "signage-media/", "event_documentation/", "analytics/", "external-analytics-packages/", "market-visit-reports/generated/", "market-visit-reports/templates/", "survey-template-exports/"];

const ALL_DATA_KEYS = [...new Set([...BACKUP_DATA_KEYS, ...LOCAL_RUNTIME_KEYS])];

export const APP_RESET_SCOPES: AppResetScope[] = [
  { id: "all", title: "تهيئة التطبيق بالكامل", description: "حذف جميع البيانات والإعدادات والوسائط من التطبيق", warning: "ستُحذف جميع بيانات التطبيق بما فيها الحسابات المحلية والإعدادات والتقارير والوسائط. ستبقى ملفات النسخ الاحتياطية الموجودة في إدارة النسخ الاحتياطية فقط.", keys: ALL_DATA_KEYS, directories: sharedDirectories },
  { id: "stores", title: "المحلات", description: "المحلات، التصنيفات، الزيارات، والنتائج المرتبطة بها", warning: "سيؤدي ذلك إلى حذف المحلات وزياراتها ونتائج الاستبيانات المرتبطة بالمحلات لتجنّب بقاء بيانات يتيمة.", keys: [STORAGE_KEYS.STORES, STORAGE_KEYS.STORE_CATEGORIES, STORAGE_KEYS.STORE_VISITS, STORAGE_KEYS.SURVEY_RESULTS], directories: ["survey-store-photos/"] },
  { id: "surveys", title: "الاستبيانات", description: "القوالب والدورات والنتائج وصور المحلات", warning: "سيُحذف كل ما يتعلق بالاستبيانات، بما في ذلك الدورات والنتائج وصور المحلات المرتبطة بها.", keys: [STORAGE_KEYS.SURVEYS, STORAGE_KEYS.SURVEY_TEMPLATES, STORAGE_KEYS.SURVEY_CYCLES, STORAGE_KEYS.SURVEY_RESULTS, STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES], directories: ["survey-store-photos/", "external-analytics-packages/", "survey-template-exports/"] },
  { id: "events", title: "الفعاليات", description: "الفعاليات وملفات التوثيق المرئية", warning: "سيُحذف توثيق الفعاليات من صور وفيديوهات نهائياً مع سجلات الفعاليات.", keys: [STORAGE_KEYS.EVENTS], directories: ["event_documentation/"] },
  { id: "warehouse", title: "المستودع", description: "المواد والأدوات والتصنيفات والحركات", keys: [STORAGE_KEYS.WAREHOUSE_ITEMS, STORAGE_KEYS.WAREHOUSE_MOVEMENTS, STORAGE_KEYS.WAREHOUSE_CATEGORIES, STORAGE_KEYS.WAREHOUSE_TOOLS], directories: [] },
  { id: "expenses", title: "الصرفيات", description: "الصرفيات والتصنيفات والميزانيات", keys: [STORAGE_KEYS.EXPENSES, STORAGE_KEYS.EXPENSE_CATEGORIES, STORAGE_KEYS.BUDGETS], directories: [] },
  { id: "goals", title: "الخطة التسويقية", description: "الأهداف والمهام والفعاليات المرتبطة بها", warning: "سيُحذف كل هدف ومهامه والفعاليات المرتبطة بالخطة حتى لا تبقى فعالية تشير إلى هدف غير موجود.", keys: [STORAGE_KEYS.MARKETING_GOALS, STORAGE_KEYS.MARKETING_TASKS, STORAGE_KEYS.EVENTS], directories: ["event_documentation/"] },
  { id: "signage", title: "اللوحات والستاندات", description: "اللوحات والستاندات والأرفف والسيارات المعلنة وعقود اللوحات الطرقية وأرشيفها", keys: [STORAGE_KEYS.SIGNAGE_BOARDS, STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, STORAGE_KEYS.STANDS, STORAGE_KEYS.SHELVES, STORAGE_KEYS.ADVERTISING_VEHICLES], directories: ["signage-media/"] },
  { id: "products", title: "المنتجات والمنافسون", description: "المنتجات والأصناف والمنافسون وقوالب الاستبيان المرتبطة", warning: "لأن قوالب الاستبيان تعتمد على المنتجات، سيؤدي ذلك إلى حذف القوالب والدورات والنتائج المرتبطة أيضاً.", keys: [STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.COMPANY_PRODUCTS, STORAGE_KEYS.COMPETITOR_PRODUCTS, STORAGE_KEYS.PRODUCT_CATEGORIES, STORAGE_KEYS.COMPETITORS, STORAGE_KEYS.SURVEYS, STORAGE_KEYS.SURVEY_TEMPLATES, STORAGE_KEYS.SURVEY_CYCLES, STORAGE_KEYS.SURVEY_RESULTS], directories: ["survey-store-photos/", "survey-template-exports/"] },
  { id: "brandsRegions", title: "الماركات والمناطق", description: "الماركات والمناطق وتقييماتها والبيانات التابعة", warning: "سيُحذف كذلك ما يعتمد على الماركات أو المناطق: المحلات والزيارات والنتائج والفعاليات واللوحات والستاندات والأرفف والسيارات المعلنة والخطط ذات الصلة.", keys: [STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS, STORAGE_KEYS.REGION_RATINGS, "brands", "store_regions", STORAGE_KEYS.STORES, STORAGE_KEYS.STORE_VISITS, STORAGE_KEYS.SURVEY_RESULTS, STORAGE_KEYS.EVENTS, STORAGE_KEYS.SIGNAGE_BOARDS, STORAGE_KEYS.STANDS, STORAGE_KEYS.SHELVES, STORAGE_KEYS.ADVERTISING_VEHICLES, STORAGE_KEYS.MARKETING_GOALS, STORAGE_KEYS.MARKETING_TASKS], directories: ["survey-store-photos/", "event_documentation/"] },
  { id: "reports", title: "التقارير", description: "القوالب والتقارير المولّدة وسجل التقارير", keys: [STORAGE_KEYS.MARKET_VISIT_REPORT_TEMPLATES, STORAGE_KEYS.MARKET_VISIT_REPORT_SETTINGS, "@madar_reports_history_v1", "madar_expense_report_settings", "madar_signage_report_settings", "madar_warehouse_report_settings"], directories: ["reports/", "market-visit-reports/generated/", "market-visit-reports/templates/"] },
  { id: "analytics", title: "التحليلات المتقدمة", description: "إعدادات التحليلات والحزم المستوردة المحفوظة", keys: ["@madar_analytics_settings", STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES], directories: ["analytics/", "external-analytics-packages/"] },
  { id: "users", title: "المستخدمون والصلاحيات", description: "الحسابات المدارة والتخصيص المحلي للجهاز", warning: "سيتم تسجيل الخروج وحذف الحسابات المدارة والصلاحيات المخصصة. ستعود حسابات التطبيق الافتراضية فقط عند فتحه من جديد.", keys: ["madar_managed_users", "madar_auth", "madar_user", "madar_app_customization_v1"], directories: [] },
];

export function getAppResetScope(id: AppResetScopeId): AppResetScope {
  return APP_RESET_SCOPES.find((scope) => scope.id === id) || APP_RESET_SCOPES[0];
}

/** يحذف بيانات التهيئة ووسائطها فقط؛ لا يلمس مجلد backups/ ولا ملفات النسخ الاحتياطية. */
export async function resetAppData(scopeId: AppResetScopeId): Promise<AppResetOutcome> {
  const scope = getAppResetScope(scopeId);
  const keys = [...new Set(scope.keys)];
  if (keys.length) await AsyncStorage.multiRemove(keys);

  const base = FileSystem.documentDirectory;
  let removedDirectories = 0;
  if (base) {
    for (const directory of [...new Set(scope.directories)]) {
      const uri = `${base}${directory}`;
      const info = await FileSystem.getInfoAsync(uri).catch(() => null);
      if (!info?.exists) continue;
      await FileSystem.deleteAsync(uri, { idempotent: true });
      removedDirectories += 1;
    }
  }

  return { scope: scopeId, removedDataGroups: keys.length, removedDirectories, retainedBackups: true };
}
