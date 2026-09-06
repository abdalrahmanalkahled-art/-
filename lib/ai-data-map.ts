import { getItemsForKeys, STORAGE_KEYS } from "@/lib/storage";

type JsonRecord = Record<string, unknown>;
type DataDomain = { id: string; title: string; keywords: string[]; keys: string[]; fields: Record<string, string[]> };

const COMMON_REFERENCE_KEYS = [STORAGE_KEYS.STORES, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS, STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.COMPETITORS];

const DATA_DOMAINS: DataDomain[] = [
  { id: "surveys", title: "الاستبيانات والدورات والتحليلات المتقدمة", keywords: ["استبيان", "استبيانات", "دورة", "نتيجة", "نتائج", "ظهور", "وجود", "نسبة", "تعليق", "ملاحظة", "منتج", "محل", "تحليل", "تحليلات", "سعر", "رف"], keys: [STORAGE_KEYS.SURVEYS, STORAGE_KEYS.SURVEY_TEMPLATES, STORAGE_KEYS.SURVEY_CYCLES, STORAGE_KEYS.SURVEY_RESULTS, STORAGE_KEYS.STORES, STORAGE_KEYS.STORE_CATEGORIES, STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.COMPANY_PRODUCTS, STORAGE_KEYS.COMPETITOR_PRODUCTS, STORAGE_KEYS.PRODUCT_CATEGORIES, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS], fields: {
    [STORAGE_KEYS.SURVEYS]: ["id", "name", "description", "createdAt", "updatedAt", "isActive"],
    [STORAGE_KEYS.SURVEY_TEMPLATES]: ["id", "name", "createdAt", "imageUri", "products", "showShelfPercentage", "showProductPrice", "allowStorePhoto", "questions", "hasNotes"],
    [STORAGE_KEYS.SURVEY_CYCLES]: ["id", "templateId", "templateName", "name", "startDate", "endDate", "resultIds", "createdAt", "closedAt"],
    [STORAGE_KEYS.SURVEY_RESULTS]: ["id", "templateId", "templateName", "cycleId", "cycleName", "hasShelfPercentage", "hasProductPrice", "allowStorePhoto", "totalShelves", "storePhotoUri", "storePhotoUris", "storeId", "storeName", "storeRegion", "surveyDate", "imageUri", "data", "questions", "notes", "noteType", "createdAt"],
    [STORAGE_KEYS.STORES]: ["id", "name", "region", "category", "brandName", "isActive"], [STORAGE_KEYS.STORE_CATEGORIES]: ["id", "name", "label"],
    [STORAGE_KEYS.PRODUCTS]: ["id", "name", "brandName", "categoryName", "type", "competitorName", "isActive"], [STORAGE_KEYS.COMPANY_PRODUCTS]: ["id", "name", "brandName", "categoryName", "isActive"], [STORAGE_KEYS.COMPETITOR_PRODUCTS]: ["id", "name", "brandName", "categoryName", "competitorName", "isActive"], [STORAGE_KEYS.PRODUCT_CATEGORIES]: ["id", "name", "label", "icon"], [STORAGE_KEYS.BRANDS]: ["id", "name", "isActive"], [STORAGE_KEYS.REGIONS]: ["id", "name", "isActive"],
  } },
  { id: "field", title: "الميدان والفعاليات وجودة التنفيذ والمنافسون", keywords: ["ميدان", "فعالية", "فعاليات", "منافس", "منافسين", "تنفيذ", "جودة", "رصد", "زيارة", "تغطية", "مستفيد", "ماركة", "قائمة تحقق"], keys: [STORAGE_KEYS.EVENTS, STORAGE_KEYS.STORE_VISITS, STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS, STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS, STORAGE_KEYS.FIELD_CHECKLIST_RUNS, STORAGE_KEYS.FIELD_VISIT_DRAFTS, ...COMMON_REFERENCE_KEYS], fields: {
    [STORAGE_KEYS.EVENTS]: ["id", "title", "name", "eventDate", "startDate", "endDate", "region", "detailedAddress", "brandName", "status", "attendeesCount", "beneficiariesCount", "giftsDistributed", "rating", "goalId", "description", "notes", "imageUri", "mediaUris", "createdAt", "updatedAt"], [STORAGE_KEYS.STORE_VISITS]: ["id", "storeId", "storeName", "region", "visitDate", "purpose", "notes", "status", "createdAt", "updatedAt"], [STORAGE_KEYS.FIELD_COMPETITOR_OBSERVATIONS]: ["id", "competitorName", "storeName", "storeId", "region", "observationDate", "kind", "message", "notes", "imageUris", "createdAt", "updatedAt"], [STORAGE_KEYS.FIELD_EXECUTION_ASSESSMENTS]: ["id", "subjectType", "subjectName", "storeName", "storeId", "region", "assessmentDate", "score", "notes", "imageUris", "createdAt", "updatedAt"], [STORAGE_KEYS.FIELD_CHECKLIST_RUNS]: ["id", "name", "storeName", "storeId", "region", "runDate", "score", "items", "createdAt", "updatedAt"], [STORAGE_KEYS.FIELD_VISIT_DRAFTS]: ["id", "storeId", "storeName", "region", "draftType", "createdAt", "updatedAt"], [STORAGE_KEYS.STORES]: ["id", "name", "region", "category", "brandName", "isActive"], [STORAGE_KEYS.BRANDS]: ["id", "name", "isActive"], [STORAGE_KEYS.REGIONS]: ["id", "name", "isActive"], [STORAGE_KEYS.PRODUCTS]: ["id", "name", "brandName", "categoryName", "type"], [STORAGE_KEYS.COMPETITORS]: ["id", "name", "isActive"],
  } },
  { id: "plan", title: "الخطة التسويقية والأهداف والمهام", keywords: ["خطة", "هدف", "أهداف", "تقدم", "kpi", "انتهاء", "منتهي", "مستهدف", "إنجاز", "مهمة"], keys: [STORAGE_KEYS.MARKETING_GOALS, STORAGE_KEYS.MARKETING_TASKS, STORAGE_KEYS.EVENTS, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS], fields: {
    [STORAGE_KEYS.MARKETING_GOALS]: ["id", "title", "name", "description", "brandName", "region", "startDate", "endDate", "period", "kpi", "targetValue", "currentValue", "completionPercentage", "status", "tasks", "createdAt", "updatedAt"], [STORAGE_KEYS.MARKETING_TASKS]: ["id", "title", "name", "goalId", "goalName", "status", "dueDate", "createdAt", "updatedAt"], [STORAGE_KEYS.EVENTS]: ["id", "title", "eventDate", "region", "brandName", "status", "beneficiariesCount", "goalId", "createdAt", "updatedAt"], [STORAGE_KEYS.BRANDS]: ["id", "name", "isActive"], [STORAGE_KEYS.REGIONS]: ["id", "name", "isActive"],
  } },
  { id: "warehouse", title: "المستودع والمواد والأدوات والحركات", keywords: ["مستودع", "مخزون", "مادة", "مواد", "أداة", "أدوات", "طرد", "قطعة", "صرف", "إدخال", "إخراج", "كمية", "حركة"], keys: [STORAGE_KEYS.WAREHOUSE_ITEMS, STORAGE_KEYS.WAREHOUSE_MOVEMENTS, STORAGE_KEYS.WAREHOUSE_CATEGORIES, STORAGE_KEYS.WAREHOUSE_TOOLS], fields: {
    [STORAGE_KEYS.WAREHOUSE_ITEMS]: ["id", "name", "category", "unit", "currentQuantity", "minimumQuantity", "packageCount", "piecesPerPackage", "description", "isActive", "createdAt", "updatedAt"], [STORAGE_KEYS.WAREHOUSE_MOVEMENTS]: ["id", "itemId", "itemName", "movementType", "quantity", "movementUnit", "enteredQuantity", "relatedEventId", "notes", "movementDate", "createdAt"], [STORAGE_KEYS.WAREHOUSE_CATEGORIES]: ["id", "name", "label", "icon"], [STORAGE_KEYS.WAREHOUSE_TOOLS]: ["id", "name", "quantity", "condition", "brandNames", "imageUri", "createdAt", "updatedAt"],
  } },
  { id: "expenses", title: "الصرفيات والميزانيات والتصنيفات", keywords: ["صرفية", "صرفيات", "مصروف", "مصاريف", "تكلفة", "تكاليف", "ميزانية", "ميزانيات", "إنفاق", "مبلغ"], keys: [STORAGE_KEYS.EXPENSES, STORAGE_KEYS.EXPENSE_CATEGORIES, STORAGE_KEYS.BUDGETS, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS], fields: {
    [STORAGE_KEYS.EXPENSES]: ["id", "title", "amount", "category", "categoryId", "expenseDate", "region", "brandName", "eventId", "notes", "createdAt", "updatedAt"], [STORAGE_KEYS.EXPENSE_CATEGORIES]: ["id", "name", "label", "icon"], [STORAGE_KEYS.BUDGETS]: ["id", "name", "amount", "spent", "remaining", "period", "startDate", "endDate", "brandName", "region", "createdAt", "updatedAt"], [STORAGE_KEYS.BRANDS]: ["id", "name", "isActive"], [STORAGE_KEYS.REGIONS]: ["id", "name", "isActive"],
  } },
  { id: "signage", title: "اللوحات والستاندات والأرفف والسيارات والعقود", keywords: ["لوحة", "لوحات", "ستاند", "ستاندات", "رف", "أرفف", "سيارة", "عقد", "تركيب", "إعلان", "صيانة"], keys: [STORAGE_KEYS.SIGNAGE_BOARDS, STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS, STORAGE_KEYS.ROAD_SIGNAGE_CATALOG, STORAGE_KEYS.STANDS, STORAGE_KEYS.SHELVES, STORAGE_KEYS.ADVERTISING_VEHICLES, STORAGE_KEYS.STORES, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS], fields: {
    [STORAGE_KEYS.SIGNAGE_BOARDS]: ["id", "type", "storeId", "storeName", "region", "address", "responsible", "brand", "frontBrand", "backBrand", "sides", "frontImageUri", "backImageUri", "widthCm", "heightCm", "boardType", "rating", "frontBrandInstalledAt", "backBrandInstalledAt", "brandHistory", "islandCount", "installDate", "contractEndDate", "imageUri", "notes", "isActive", "createdAt", "updatedAt"], [STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS]: ["id", "name", "type", "startDate", "endDate", "status", "region", "boards", "renewedFromId", "archivedAt", "createdAt", "updatedAt"], [STORAGE_KEYS.ROAD_SIGNAGE_CATALOG]: ["id", "name", "type", "widthCm", "heightCm", "description", "createdAt", "updatedAt"], [STORAGE_KEYS.STANDS]: ["id", "storeId", "storeName", "brand", "condition", "installDate", "imageUri", "maintenanceHistory", "notes", "isActive", "createdAt", "updatedAt"], [STORAGE_KEYS.SHELVES]: ["id", "storeId", "storeName", "brand", "shelfCount", "condition", "installDate", "imageUri", "notes", "isActive", "createdAt", "updatedAt"], [STORAGE_KEYS.ADVERTISING_VEHICLES]: ["id", "vehicleNumber", "brand", "region", "status", "installDate", "images", "notes", "createdAt", "updatedAt"], [STORAGE_KEYS.STORES]: ["id", "name", "region", "category", "brandName", "isActive"], [STORAGE_KEYS.BRANDS]: ["id", "name", "isActive"], [STORAGE_KEYS.REGIONS]: ["id", "name", "isActive"],
  } },
  { id: "reference", title: "البيانات المرجعية العامة", keywords: ["ماركة", "ماركات", "منطقة", "مناطق", "محل", "محلات", "تصنيف", "منافس", "منتج"], keys: [STORAGE_KEYS.STORES, STORAGE_KEYS.STORE_CATEGORIES, STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.COMPANY_PRODUCTS, STORAGE_KEYS.COMPETITOR_PRODUCTS, STORAGE_KEYS.PRODUCT_CATEGORIES, STORAGE_KEYS.COMPETITORS, STORAGE_KEYS.BRANDS, STORAGE_KEYS.REGIONS, STORAGE_KEYS.REGION_RATINGS], fields: {
    [STORAGE_KEYS.STORES]: ["id", "name", "ownerName", "phone", "region", "address", "category", "notes", "imageUri", "isActive", "createdAt"], [STORAGE_KEYS.STORE_CATEGORIES]: ["id", "name", "label"], [STORAGE_KEYS.PRODUCTS]: ["id", "name", "brandName", "categoryName", "type", "competitorName", "isActive"], [STORAGE_KEYS.COMPANY_PRODUCTS]: ["id", "name", "brandName", "categoryName", "isActive"], [STORAGE_KEYS.COMPETITOR_PRODUCTS]: ["id", "name", "brandName", "categoryName", "competitorName", "isActive"], [STORAGE_KEYS.PRODUCT_CATEGORIES]: ["id", "name", "label", "icon"], [STORAGE_KEYS.COMPETITORS]: ["id", "name", "isActive"], [STORAGE_KEYS.BRANDS]: ["id", "name", "isActive"], [STORAGE_KEYS.REGIONS]: ["id", "name", "isActive"], [STORAGE_KEYS.REGION_RATINGS]: ["id", "regionId", "regionName", "rating", "notes", "createdAt", "updatedAt"],
  } },
];

function normalize(text: string): string { return text.toLocaleLowerCase("ar").replace(/[ًٌٍَُِّْـ]/g, "").replace(/[إأآ]/g, "ا").replace(/ى/g, "ي"); }

function selectDomains(question: string, selectedScopeIds: string[]): DataDomain[] {
  const normalized = normalize(question);
  if (/(كل|كامل|جميع|التطبيق|البيانات|شامل|دون استثناء)/.test(normalized) || selectedScopeIds.includes("all")) return DATA_DOMAINS;
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
  if (Array.isArray(record.data)) selected.data = record.data.map((row) => compactValue(row, ["productId", "productName", "present", "shelfPercentage", "shelfOccupied", "price", "comment", "notes", "note"]));
  if (Array.isArray(record.questions)) selected.questions = record.questions;
  if (Array.isArray(record.items)) selected.items = record.items;
  if (Array.isArray(record.maintenanceHistory)) selected.maintenanceHistory = record.maintenanceHistory;
  return selected;
}

function sortFresh(items: unknown[]): unknown[] {
  const dateOf = (item: unknown) => item && typeof item === "object" ? String((item as JsonRecord).updatedAt || (item as JsonRecord).createdAt || (item as JsonRecord).surveyDate || (item as JsonRecord).eventDate || (item as JsonRecord).expenseDate || (item as JsonRecord).movementDate || (item as JsonRecord).installDate || "") : "";
  return [...items].sort((a, b) => dateOf(b).localeCompare(dateOf(a)));
}

function recordMatchesQuestion(value: unknown, question: string): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as JsonRecord;
  const q = normalize(question);
  const candidates = [record.name, record.title, record.storeName, record.storeRegion, record.region, record.brand, record.brandName, record.productName, record.itemName, record.competitorName, record.cycleName, record.templateName, record.vehicleNumber, record.category];
  return candidates.some((candidate) => typeof candidate === "string" && candidate.trim().length > 1 && q.includes(normalize(candidate)));
}

function selectRelevantRecords(values: unknown[], question: string): unknown[] {
  const matches = values.filter((value) => recordMatchesQuestion(value, question));
  return matches.length ? matches : values;
}

function surveyDerived(results: unknown[]): JsonRecord {
  const rows = results.filter((item): item is JsonRecord => Boolean(item && typeof item === "object"));
  const stats = new Map<string, { name: string; total: number; present: number; shelfTotal: number; shelfCount: number; priceTotal: number; priceCount: number }>();
  let totalPresence = 0; let noteCount = 0;
  rows.forEach((result) => {
    const data = Array.isArray(result.data) ? result.data as JsonRecord[] : [];
    const present = data.filter((row) => row.present === true).length;
    totalPresence += data.length ? Math.round((present / data.length) * 100) : 0;
    if (String(result.notes || "").trim()) noteCount += 1;
    data.forEach((row) => {
      const id = String(row.productId || row.productName || "منتج غير معروف");
      const current = stats.get(id) || { name: String(row.productName || id), total: 0, present: 0, shelfTotal: 0, shelfCount: 0, priceTotal: 0, priceCount: 0 };
      current.total += 1; if (row.present === true) current.present += 1;
      if (typeof row.shelfPercentage === "number") { current.shelfTotal += row.shelfPercentage; current.shelfCount += 1; }
      if (typeof row.price === "number") { current.priceTotal += row.price; current.priceCount += 1; }
      stats.set(id, current);
    });
  });
  return { totalSurveys: rows.length, averagePresence: rows.length ? Math.round(totalPresence / rows.length) : 0, notesCount: noteCount, products: Array.from(stats.values()).map((item) => ({ ...item, presencePercentage: item.total ? Math.round((item.present / item.total) * 100) : 0, averageShelfPercentage: item.shelfCount ? Math.round((item.shelfTotal / item.shelfCount) * 10) / 10 : null, averagePrice: item.priceCount ? Math.round((item.priceTotal / item.priceCount) * 100) / 100 : null })).sort((a, b) => b.presencePercentage - a.presencePercentage) };
}

export async function buildSmartDataContext(question: string, selectedScopeIds: string[]): Promise<{ context: string; domainIds: string[]; freshness: string }> {
  const domains = selectDomains(question, selectedScopeIds);
  const keys = [...new Set(domains.flatMap((domain) => domain.keys))];
  const data = await getItemsForKeys<unknown>(keys);
  const context: JsonRecord = { generatedAt: new Date().toISOString(), freshness: "تمت القراءة مباشرة من التخزين المحلي قبل هذا السؤال؛ هذه لقطة حديثة وليست ذاكرة قديمة.", retrievalPolicy: "اختيار الوحدات والعلاقات حسب السؤال، وتفضيل السجلات المطابقة للكيان، وترتيب التاريخ الأحدث أولاً.", requestedQuestion: question, selectedDomains: domains.map((domain) => ({ id: domain.id, title: domain.title })), availableDomains: DATA_DOMAINS.map((domain) => ({ id: domain.id, title: domain.title, keys: domain.keys })), counts: Object.fromEntries(keys.map((key) => [key, (data[key] || []).length])) };
  domains.forEach((domain) => {
    const payload: JsonRecord = {};
    domain.keys.forEach((key) => { payload[key] = sortFresh(selectRelevantRecords(data[key] || [], question)).map((value) => compactValue(value, domain.fields[key] || [])); });
    if (domain.id === "surveys") payload.advancedAnalytics = surveyDerived(data[STORAGE_KEYS.SURVEY_RESULTS] || []);
    if (domain.id === "plan") {
      const goals = (data[STORAGE_KEYS.MARKETING_GOALS] || []) as JsonRecord[];
      const events = (data[STORAGE_KEYS.EVENTS] || []) as JsonRecord[];
      const matchedGoals = goals.filter((goal) => recordMatchesQuestion(goal, question));
      const matchedEvents = events.filter((event) => recordMatchesQuestion(event, question));
      const relatedGoalIds = new Set([...matchedGoals.map((goal) => String(goal.id || "")), ...matchedEvents.map((event) => String(event.goalId || ""))].filter(Boolean));
      const relatedEvents = relatedGoalIds.size ? events.filter((event) => relatedGoalIds.has(String(event.goalId || ""))) : events;
      const relatedGoals = matchedGoals.length ? matchedGoals : relatedGoalIds.size ? goals.filter((goal) => relatedGoalIds.has(String(goal.id || ""))) : goals;
      payload.relatedEvents = sortFresh(selectRelevantRecords(relatedEvents, question)).map((event) => compactValue(event, ["id", "title", "eventDate", "startDate", "endDate", "region", "detailedAddress", "brandName", "status", "attendeesCount", "beneficiariesCount", "giftsDistributed", "rating", "goalId", "description", "notes", "imageUri", "mediaUris", "createdAt", "updatedAt"]));
      payload.taskDetails = relatedGoals.flatMap((goal) => Array.isArray(goal.tasks) ? goal.tasks.map((task) => ({ ...task, goalId: goal.id, goalTitle: goal.title })) : []);
    }
    if (domain.id === "field") {
      const events = (data[STORAGE_KEYS.EVENTS] || []) as JsonRecord[];
      const goals = (data[STORAGE_KEYS.MARKETING_GOALS] || []) as JsonRecord[];
      const matchedEvents = events.filter((event) => recordMatchesQuestion(event, question));
      const eventGoalIds = new Set(matchedEvents.map((event) => String(event.goalId || "")).filter(Boolean));
      const relatedGoals = eventGoalIds.size ? goals.filter((goal) => eventGoalIds.has(String(goal.id || ""))) : goals;
      payload.relatedGoals = sortFresh(selectRelevantRecords(relatedGoals, question)).map((goal) => compactValue(goal, ["id", "title", "description", "brandName", "startDate", "endDate", "period", "kpi", "targetValue", "currentValue", "completionPercentage", "status", "tasks", "createdAt", "updatedAt"]));
    }
    context[domain.id] = payload;
  });
  return { context: JSON.stringify(context, null, 2).slice(0, 60000), domainIds: domains.map((domain) => domain.id), freshness: context.generatedAt as string };
}

export function getDataMapDescription(): string { return DATA_DOMAINS.map((domain) => `${domain.id}: ${domain.title}؛ المفاتيح: ${domain.keys.join(", ")}`).join("\n"); }
export const AI_DATA_DOMAIN_IDS = DATA_DOMAINS.map((domain) => domain.id);
export const AI_DATA_ALL_SCOPE_ID = "all";
