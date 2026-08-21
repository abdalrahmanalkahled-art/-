import { STORAGE_KEYS } from "./storage";

export interface BackupMergePreviewGroup {
  key: string;
  label: string;
  added: number;
  updated: number;
  retained: number;
}

export interface BackupMergePreview {
  added: number;
  updated: number;
  retained: number;
  preservedSettings: number;
  groups: BackupMergePreviewGroup[];
}

export interface BackupMergeResult {
  data: Record<string, string>;
  preview: BackupMergePreview;
}

type JsonRecord = Record<string, unknown>;

export const BACKUP_KEY_LABELS: Record<string, string> = {
  madar_stores: "المحلات", madar_store_visits: "زيارات المحلات", madar_surveys: "الاستبيانات", madar_survey_templates: "قوالب الاستبيان", madar_survey_results: "نتائج الاستبيان", madar_survey_cycles: "دورات الاستبيان",
  madar_events: "الفعاليات", madar_warehouse_items: "مواد المستودع", madar_warehouse_movements: "حركة المستودع", madar_warehouse_tools: "أدوات المستودع", madar_expenses: "الصرفيات", madar_budgets: "الميزانيات",
  madar_marketing_goals: "الأهداف التسويقية", madar_marketing_tasks: "المهام", madar_signage_boards: "اللوحات", madar_road_signage_contracts: "عقود اللوحات الطرقية", madar_road_signage_catalog: "أنواع وتقييمات اللوحات الطرقية", madar_stands: "الستاندات", madar_shelves: "الأرفف", madar_advertising_vehicles: "السيارات المعلنة", madar_products: "المنتجات", madar_company_products: "منتجات الشركة", madar_competitor_products: "منتجات المنافسين",
  madar_brands: "الماركات", madar_regions: "المناطق", madar_region_ratings: "تقييمات المناطق", madar_managed_users: "المستخدمون", "@madar_reports_history_v1": "سجل التقارير", "@madar_audit_logs_v1": "سجل النشاط", "@madar_analytics_settings": "إعدادات التحليلات",
};

/** إعدادات الواجهة والتقارير محلية دائماً ولا تدخل في أي نمط استعادة. */
export const LOCAL_SETTINGS_KEYS = new Set([
  "@madar_theme_preference_v1",
  "@madar_analytics_settings",
  "madar_app_customization_v1",
  "@madar_app_settings_v1",
  "@madar_notification_preferences_v1",
  "madar_market_visit_report_settings",
  "madar_expense_report_settings",
  "madar_signage_report_settings",
  "madar_warehouse_report_settings",
]);

const KEY_IDENTITY_FIELDS: Record<string, string[]> = {
  [STORAGE_KEYS.STORES]: ["name"],
  [STORAGE_KEYS.STORE_VISITS]: ["storeName", "visitDate", "date"],
  [STORAGE_KEYS.SURVEYS]: ["name"],
  [STORAGE_KEYS.SURVEY_TEMPLATES]: ["name"],
  [STORAGE_KEYS.SURVEY_CYCLES]: ["name"],
  [STORAGE_KEYS.SURVEY_RESULTS]: ["templateName", "cycleName", "storeName", "surveyDate"],
  [STORAGE_KEYS.EVENTS]: ["name", "title", "eventDate", "date"],
  [STORAGE_KEYS.WAREHOUSE_ITEMS]: ["name"],
  [STORAGE_KEYS.WAREHOUSE_MOVEMENTS]: ["itemName", "movementType", "movementDate", "quantity"],
  [STORAGE_KEYS.WAREHOUSE_CATEGORIES]: ["name", "label"],
  [STORAGE_KEYS.WAREHOUSE_TOOLS]: ["name"],
  [STORAGE_KEYS.STORE_CATEGORIES]: ["name", "label"],
  [STORAGE_KEYS.EXPENSES]: ["title", "expenseDate", "amount", "category"],
  [STORAGE_KEYS.EXPENSE_CATEGORIES]: ["name", "label"],
  [STORAGE_KEYS.BUDGETS]: ["name", "title", "category"],
  [STORAGE_KEYS.MARKETING_GOALS]: ["title", "name"],
  [STORAGE_KEYS.MARKETING_TASKS]: ["title", "name", "goalName"],
  [STORAGE_KEYS.SIGNAGE_BOARDS]: ["storeName", "brand", "type", "installDate"],
  [STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS]: ["name", "startDate", "endDate"],
  [STORAGE_KEYS.STANDS]: ["storeName", "brand", "installDate"],
  [STORAGE_KEYS.SHELVES]: ["storeName", "installDate"],
  [STORAGE_KEYS.ADVERTISING_VEHICLES]: ["vehicleNumber", "brand", "installDate"],
  [STORAGE_KEYS.COMPANY_PRODUCTS]: ["name"],
  [STORAGE_KEYS.COMPETITOR_PRODUCTS]: ["name"],
  [STORAGE_KEYS.PRODUCTS]: ["name"],
  [STORAGE_KEYS.PRODUCT_CATEGORIES]: ["name"],
  [STORAGE_KEYS.COMPETITORS]: ["name"],
  [STORAGE_KEYS.BRANDS]: ["name"],
  [STORAGE_KEYS.REGIONS]: ["name"],
  [STORAGE_KEYS.REGION_RATINGS]: ["label", "name"],
  [STORAGE_KEYS.MARKET_VISIT_REPORT_TEMPLATES]: ["name", "title", "filename"],
  [STORAGE_KEYS.EXTERNAL_ANALYTICS_PACKAGES]: ["name"],
  madar_managed_users: ["username", "name"],
  surveys: ["name"],
  brands: ["name"],
  store_regions: ["name"],
  "@madar_reports_history_v1": ["title", "name", "filename", "createdAt"],
  "@madar_audit_logs_v1": ["message", "action", "createdAt"],
};

const GENERIC_IDENTITY_FIELDS = ["name", "title", "label", "username", "storeName", "templateName", "filename"];

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJson(raw: string | undefined): unknown {
  if (!raw) return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return normalizeNameForMerge(String(value));
  return "";
}

/** تنظيف موحّد للأسماء حتى لا تتسبب المسافات أو اختلاف شكل الحروف العربية بتكرار سجل واحد. */
export function normalizeNameForMerge(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .toLocaleLowerCase("ar");
}

function valuesForFields(record: JsonRecord, fields: string[]): string[] {
  const values = fields.map((field) => textValue(record[field])).filter(Boolean);
  return values;
}

function fallbackRecordIdentity(record: JsonRecord): string {
  const serializable = Object.fromEntries(Object.entries(record)
    .filter(([field]) => !["id", "createdAt", "updatedAt", "localUri", "fileUri", "uri"].includes(field))
    .sort(([left], [right]) => left.localeCompare(right)));
  return `content:${normalizeNameForMerge(JSON.stringify(serializable))}`;
}

function recordIdentity(key: string, record: JsonRecord): string {
  const configured = KEY_IDENTITY_FIELDS[key] || GENERIC_IDENTITY_FIELDS;
  const values = valuesForFields(record, configured);
  if (values.length) return `name:${values.join("|")}`;
  const generic = valuesForFields(record, GENERIC_IDENTITY_FIELDS);
  if (generic.length) return `name:${generic.join("|")}`;
  return fallbackRecordIdentity(record);
}

function stringId(record: JsonRecord): string | null {
  const value = record.id;
  return typeof value === "string" && value.trim() ? value : null;
}

function replaceMappedIds(value: unknown, idMap: Map<string, string>): unknown {
  if (typeof value === "string") return idMap.get(value) || value;
  if (Array.isArray(value)) return value.map((item) => replaceMappedIds(item, idMap));
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceMappedIds(item, idMap)]));
}

function collectIdMap(current: JsonRecord[], incoming: JsonRecord[], key: string, output: Map<string, string>): void {
  const localByIdentity = new Map(current.map((record) => [recordIdentity(key, record), record]));
  incoming.forEach((record) => {
    const local = localByIdentity.get(recordIdentity(key, record));
    const remoteId = stringId(record);
    const localId = local && stringId(local);
    if (remoteId && localId && remoteId !== localId) output.set(remoteId, localId);
  });
}

export function mergeArrayByName<T extends JsonRecord>(key: string, local: T[], incoming: T[]): { records: T[]; added: number; updated: number; retained: number } {
  const localByIdentity = new Map(local.map((record, index) => [recordIdentity(key, record), index]));
  const records = [...local];
  let added = 0;
  let updated = 0;
  const matched = new Set<number>();

  incoming.forEach((record) => {
    const index = localByIdentity.get(recordIdentity(key, record));
    if (index === undefined) {
      records.push(record);
      added += 1;
      return;
    }
    records[index] = record;
    matched.add(index);
    updated += 1;
  });

  return { records, added, updated, retained: local.length - matched.size };
}

function asRecordArray(value: unknown): JsonRecord[] | null {
  return Array.isArray(value) && value.every(isRecord) ? value : null;
}

/**
 * يدمج كل مفاتيح النسخة المسموح بها. تحفظ المعرفات المحلية للسجلات المتطابقة،
 * ثم تُعاد ربط المراجع القادمة من النسخة بهذه المعرفات حتى لا تنكسر العلاقات.
 */
export function mergeBackupData(currentData: Record<string, string | null | undefined>, incomingData: Record<string, string>): BackupMergeResult {
  const parsedCurrent = new Map<string, unknown>();
  const parsedIncoming = new Map<string, unknown>();
  Object.keys(incomingData).forEach((key) => {
    if (LOCAL_SETTINGS_KEYS.has(key)) return;
    parsedCurrent.set(key, parseJson(currentData[key] || undefined));
    parsedIncoming.set(key, parseJson(incomingData[key]));
  });

  const idMap = new Map<string, string>();
  parsedIncoming.forEach((incoming, key) => {
    const localRecords = asRecordArray(parsedCurrent.get(key));
    const incomingRecords = asRecordArray(incoming);
    if (localRecords && incomingRecords) collectIdMap(localRecords, incomingRecords, key, idMap);
  });

  const data: Record<string, string> = {};
  const groups: BackupMergePreviewGroup[] = [];
  let added = 0;
  let updated = 0;
  let retained = 0;

  parsedIncoming.forEach((incoming, key) => {
    const local = parsedCurrent.get(key);
    const localRecords = asRecordArray(local);
    const incomingRecords = asRecordArray(incoming);
    const label = BACKUP_KEY_LABELS[key] || key;

    if (localRecords && incomingRecords) {
      const remappedIncoming = replaceMappedIds(incomingRecords, idMap) as JsonRecord[];
      const merged = mergeArrayByName(key, localRecords, remappedIncoming);
      data[key] = JSON.stringify(merged.records);
      groups.push({ key, label, added: merged.added, updated: merged.updated, retained: merged.retained });
      added += merged.added;
      updated += merged.updated;
      retained += merged.retained;
      return;
    }

    const hasLocalValue = currentData[key] !== null && currentData[key] !== undefined;
    const incomingValue = replaceMappedIds(incoming, idMap);
    data[key] = incoming === undefined ? incomingData[key] : JSON.stringify(incomingValue);
    const group = { key, label, added: hasLocalValue ? 0 : 1, updated: hasLocalValue ? 1 : 0, retained: 0 };
    groups.push(group);
    added += group.added;
    updated += group.updated;
  });

  return {
    data,
    preview: {
      added,
      updated,
      retained,
      preservedSettings: Object.keys(incomingData).filter((key) => LOCAL_SETTINGS_KEYS.has(key)).length,
      groups,
    },
  };
}
