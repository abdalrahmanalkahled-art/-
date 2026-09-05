import { getItemsForKeys, STORAGE_KEYS } from "@/lib/storage";

type JsonRecord = Record<string, unknown>;

type DataDomain = {
  id: string;
  title: string;
  keywords: string[];
  keys: string[];
  fields: Record<string, string[]>;
};

const SURVEY_KEYS = [
  STORAGE_KEYS.SURVEYS,
  STORAGE_KEYS.SURVEY_TEMPLATES,
  STORAGE_KEYS.SURVEY_CYCLES,
  STORAGE_KEYS.SURVEY_RESULTS,
  STORAGE_KEYS.STORES,
  STORAGE_KEYS.STORE_CATEGORIES,
  STORAGE_KEYS.PRODUCTS,
  STORAGE_KEYS.COMPANY_PRODUCTS,
  STORAGE_KEYS.COMPETITOR_PRODUCTS,
  STORAGE_KEYS.PRODUCT_CATEGORIES,
  STORAGE_KEYS.BRANDS,
  STORAGE_KEYS.REGIONS,
];

const DATA_DOMAINS: DataDomain[] = [
  {
    id: "surveys",
    title: "الاستبيانات والتحليلات المتقدمة",
    keywords: ["استبيان", "استبيانات", "دورة", "نتيجة", "نتائج", "ظهور", "وجود", "نسبة", "تعليق", "ملاحظة", "منتج", "محل", "تحليل", "تحليلات", "سعر", "رف"],
    keys: SURVEY_KEYS,
    fields: {
      [STORAGE_KEYS.SURVEYS]: ["id", "name", "description", "createdAt", "updatedAt", "isActive"],
      [STORAGE_KEYS.SURVEY_TEMPLATES]: ["id", "name", "title", "productIds", "questions", "createdAt", "updatedAt"],
      [STORAGE_KEYS.SURVEY_CYCLES]: ["id", "name", "templateId", "startDate", "endDate", "status", "createdAt", "updatedAt"],
      [STORAGE_KEYS.SURVEY_RESULTS]: ["id", "storeId", "storeName", "storeRegion", "region", "brandName", "templateId", "templateName", "cycleId", "cycleName", "surveyDate", "createdAt", "notes", "noteType", "hasShelfPercentage", "hasProductPrice", "data"],
      [STORAGE_KEYS.STORES]: ["id", "name", "region", "category", "brandName", "isActive"],
      [STORAGE_KEYS.STORE_CATEGORIES]: ["id", "name", "label"],
      [STORAGE_KEYS.PRODUCTS]: ["id", "name", "brandName", "categoryName", "type", "isActive"],
      [STORAGE_KEYS.COMPANY_PRODUCTS]: ["id", "name", "brandName", "categoryName", "isActive"],
      [STORAGE_KEYS.COMPETITOR_PRODUCTS]: ["id", "name", "brandName", "categoryName", "isActive"],
      [STORAGE_KEYS.PRODUCT_CATEGORIES]: ["id", "name", "label", "icon"],
      [STORAGE_KEYS.BRANDS]: ["id", "name", "isActive"],
      [STORAGE_KEYS.REGIONS]: ["id", "name", "isActive"],
    },
  },
  {
    id: "field",
    title: "الميدان والفعاليات وجودة التنفيذ والمنافسون",
    keywords: ["ميدان", "فعالية", "فعاليات", "منافس", "منافسين", "تنفيذ", "جودة", "رصد", "زيارة", "تغطية", "مستفيد", "ماركة"],
    keys: [STORAGE_KEYS.EVENTS, STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS, STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS, STORAGE_KEYS.FIELD_CHECKLIST_RUNS, STORAGE_KEYS.STORES, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS],
    fields: {
      [STORAGE_KEYS.EVENTS]: ["id", "title", "name", "eventDate", "region", "brandName", "status", "attendeesCount", "beneficiariesCount", "giftsDistributed", "goalId", "description", "notes", "createdAt", "updatedAt"],
      [STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS]: ["id", "competitorName", "storeName", "storeId", "region", "kind", "message", "notes", "imageUris", "createdAt", "updatedAt"],
      [STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS]: ["id", "subjectType", "subjectName", "storeName", "region", "score", "notes", "imageUris", "createdAt", "updatedAt"],
      [STORAGE_KEYS.FIELD_CHECKLIST_RUNS]: ["id", "name", "storeName", "region", "score", "items", "createdAt", "updatedAt"],
      [STORAGE_KEYS.STORES]: ["id", "name", "region", "category", "brandName", "isActive"],
      [STORAGE_KEYS.BRANDS]: ["id", "name", "isActive"],
      [STORAGE_KEYS.REGIONS]: ["id", "name", "isActive"],
    },
  },
  {
    id: "plan",
    title: "الخطة التسويقية والأهداف",
    keywords: ["خطة", "هدف", "أهداف", "تقدم", "kpi", "انتهاء", "منتهي", "مستهدف", "إنجاز"],
    keys: [STORAGE_KEYS.MARKETING_GOALS, STORAGE_KEYS.MARKETING_TASKS, STORAGE_KEYS.EVENTS, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS],
    fields: {
      [STORAGE_KEYS.MARKETING_GOALS]: ["id", "title", "name", "description", "brandName", "startDate", "endDate", "period", "currentValue", "targetValue", "completionPercentage", "status", "createdAt", "updatedAt"],
      [STORAGE_KEYS.MARKETING_TASKS]: ["id", "title", "name", "goalId", "goalName", "status", "dueDate", "createdAt", "updatedAt"],
      [STORAGE_KEYS.EVENTS]: ["id", "title", "eventDate", "region", "brandName", "status", "beneficiariesCount", "goalId", "createdAt", "updatedAt"],
      [STORAGE_KEYS.BRANDS]: ["id", "name", "isActive"],
      [STORAGE_KEYS.REGIONS]: ["id", "name", "isActive"],
    },
  },
  {
    id: "warehouse",
    title: "المستودع والأدوات والمواد",
    keywords: ["مستودع", "مخزون", "مادة", "مواد", "أداة", "أدوات", "طرد", "قطعة", "صرف", "إدخال", "إخراج", "كمية"],
    keys: [STORAGE_KEYS.WAREHOUSE_ITEMS, STORAGE_KEYS.WAREHOUSE_MOVEMENTS, STORAGE_KEYS.WAREHOUSE_CATEGORIES, STORAGE_KEYS.WAREHOUSE_TOOLS],
    fields: {
      [STORAGE_KEYS.WAREHOUSE_ITEMS]: ["id", "name", "categoryName", "quantity", "packages", "unitsPerPackage", "availableQuantity", "unit", "createdAt", "updatedAt"],
      [STORAGE_KEYS.WAREHOUSE_MOVEMENTS]: ["id", "itemId", "itemName", "movementType", "quantity", "packages", "pieces", "movementDate", "notes", "createdAt"],
      [STORAGE_KEYS.WAREHOUSE_CATEGORIES]: ["id", "name", "label", "icon"],
      [STORAGE_KEYS.WAREHOUSE_TOOLS]: ["id", "name", "quantity", "condition", "brandNames", "imageUri", "createdAt", "updatedAt"],
    },
  },
  {
    id: "signage",
    title: "اللوحات والستاندات والأرفف والسيارات",
    keywords: ["لوحة", "لوحات", "ستاند", "ستاندات", "رف", "أرفف", "سيارة", "عقد", "تركيب", "إعلان"],
    keys: [STORAGE_KEYS.SIGNAGE_BOARDS, STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, STORAGE_KEYS.STANDS, STORAGE_KEYS.SHELVES, STORAGE_KEYS.ADVERTISING_VEHICLES],
    fields: {
      [STORAGE_KEYS.SIGNAGE_BOARDS]: ["id", "storeName", "brand", "type", "status", "installDate", "region", "notes", "createdAt", "updatedAt"],
      [STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS]: ["id", "name", "type", "startDate", "endDate", "status", "region", "boards", "createdAt", "updatedAt"],
      [STORAGE_KEYS.STANDS]: ["id", "storeName", "brand", "status", "installDate", "region", "notes", "createdAt", "updatedAt"],
      [STORAGE_KEYS.SHELVES]: ["id", "storeName", "brand", "status", "installDate", "region", "notes", "createdAt", "updatedAt"],
      [STORAGE_KEYS.ADVERTISING_VEHICLES]: ["id", "vehicleNumber", "brand", "status", "installDate", "region", "notes", "createdAt", "updatedAt"],
    },
  },
  {
    id: "reference",
    title: "البيانات المرجعية العامة",
    keywords: ["ماركة", "ماركات", "منطقة", "مناطق", "محل", "محلات", "تصنيف", "منافس", "منتج"],
    keys: [STORAGE_KEYS.STORES, STORAGE_KEYS.STORE_CATEGORIES, STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.PRODUCT_CATEGORIES, STORAGE_KEYS.COMPETITORS, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS],
    fields: {
      [STORAGE_KEYS.STORES]: ["id", "name", "region", "category", "brandName", "isActive"],
      [STORAGE_KEYS.STORE_CATEGORIES]: ["id", "name", "label"],
      [STORAGE_KEYS.PRODUCTS]: ["id", "name", "brandName", "categoryName", "type", "isActive"],
      [STORAGE_KEYS.PRODUCT_CATEGORIES]: ["id", "name", "label", "icon"],
      [STORAGE_KEYS.COMPETITORS]: ["id", "name", "isActive"],
      [STORAGE_KEYS.BRANDS]: ["id", "name", "isActive"],
      [STORAGE_KEYS.REGIONS]: ["id", "name", "isActive"],
    },
  },
];

function normalize(text: string): string {
  return text.toLocaleLowerCase("ar").replace(/[ًٌٍَُِّْـ]/g, "");
}

function selectDomains(question: string, selectedScopeIds: string[]): DataDomain[] {
  const normalized = normalize(question);
  const matched = DATA_DOMAINS.filter((domain) => domain.keywords.some((keyword) => normalized.includes(normalize(keyword))));
  if (matched.length) return matched;
  const selected = DATA_DOMAINS.filter((domain) => selectedScopeIds.includes(domain.id));
  return selected.length ? selected : DATA_DOMAINS;
}

function compactValue(value: unknown, fields: string[]): unknown {
  if (Array.isArray(value)) return value.map((item) => compactValue(item, fields));
  if (!value || typeof value !== "object") return value;
  const record = value as JsonRecord;
  const selected = Object.fromEntries(fields.filter((field) => record[field] !== undefined && record[field] !== null && record[field] !== "").map((field) => [field, record[field]]));
  if (Array.isArray(record.data)) selected.data = record.data.map((row) => compactValue(row, ["productId", "productName", "present", "shelfPercentage", "price", "comment", "notes", "note"]));
  if (Array.isArray(record.questions)) selected.questions = record.questions;
  if (Array.isArray(record.items)) selected.items = record.items;
  return selected;
}

function sortFresh(items: unknown[]): unknown[] {
  return [...items].sort((first, second) => {
    const a = first && typeof first === "object" ? String((first as JsonRecord).updatedAt || (first as JsonRecord).createdAt || (first as JsonRecord).surveyDate || (first as JsonRecord).eventDate || "") : "";
    const b = second && typeof second === "object" ? String((second as JsonRecord).updatedAt || (second as JsonRecord).createdAt || (second as JsonRecord).surveyDate || (second as JsonRecord).eventDate || "") : "";
    return b.localeCompare(a);
  });
}

function surveyDerived(results: unknown[]): JsonRecord {
  const rows = results.filter((item): item is JsonRecord => Boolean(item && typeof item === "object"));
  const productStats = new Map<string, { name: string; total: number; present: number }>();
  let totalPresence = 0;
  let noteCount = 0;
  rows.forEach((result) => {
    const data = Array.isArray(result.data) ? result.data as JsonRecord[] : [];
    const present = data.filter((row) => row.present === true).length;
    totalPresence += data.length ? Math.round((present / data.length) * 100) : 0;
    if (String(result.notes || "").trim()) noteCount += 1;
    data.forEach((row) => {
      const id = String(row.productId || row.productName || "منتج غير معروف");
      const current = productStats.get(id) || { name: String(row.productName || id), total: 0, present: 0 };
      current.total += 1;
      if (row.present === true) current.present += 1;
      productStats.set(id, current);
    });
  });
  return {
    totalSurveys: rows.length,
    averagePresence: rows.length ? Math.round(totalPresence / rows.length) : 0,
    notesCount: noteCount,
    products: Array.from(productStats.values()).map((item) => ({ ...item, presencePercentage: item.total ? Math.round((item.present / item.total) * 100) : 0 })).sort((a, b) => b.presencePercentage - a.presencePercentage),
  };
}

export async function buildSmartDataContext(question: string, selectedScopeIds: string[]): Promise<{ context: string; domainIds: string[]; freshness: string }> {
  const domains = selectDomains(question, selectedScopeIds);
  const keys = [...new Set(domains.flatMap((domain) => domain.keys))];
  const data = await getItemsForKeys<unknown>(keys);
  const context: JsonRecord = {
    generatedAt: new Date().toISOString(),
    freshness: "تمت القراءة مباشرة من التخزين المحلي قبل هذا السؤال؛ لا تعتمد هذه اللقطة على كاش سابق.",
    requestedQuestion: question,
    selectedDomains: domains.map((domain) => ({ id: domain.id, title: domain.title })),
    counts: Object.fromEntries(keys.map((key) => [key, (data[key] || []).length])),
  };
  domains.forEach((domain) => {
    const payload: JsonRecord = {};
    domain.keys.forEach((key) => {
      const values = data[key] || [];
      payload[key] = sortFresh(values).map((value) => compactValue(value, domain.fields[key] || []));
    });
    if (domain.id === "surveys") payload.advancedAnalytics = surveyDerived(data[STORAGE_KEYS.SURVEY_RESULTS] || []);
    context[domain.id] = payload;
  });
  return { context: JSON.stringify(context, null, 2).slice(0, 30000), domainIds: domains.map((domain) => domain.id), freshness: context.generatedAt as string };
}

export function getDataMapDescription(): string {
  return DATA_DOMAINS.map((domain) => `${domain.id}: ${domain.title}؛ المفاتيح: ${domain.keys.join(", ")}`).join("\n");
}

export const AI_DATA_DOMAIN_IDS = DATA_DOMAINS.map((domain) => domain.id);
