export type MarketVisitOrderField = "category" | "region";
export type MarketVisitImageFit = "fill" | "fit-height" | "fit-width";
export type MarketVisitImageCompression = "compressed" | "original";
export type MarketVisitSlideRepeatMode = "second-slide" | "repeat-tag";

export interface MarketVisitTemplateTag {
  tag: string;
  title: string;
  description: string;
  required?: boolean;
}

export const MARKET_VISIT_TEMPLATE_TAGS: MarketVisitTemplateTag[] = [
  { tag: "{{اسم_المحل}}", title: "اسم المحل", description: "اسم المحل المرتبط بنتيجة الاستبيان." },
  { tag: "{{تصنيف_المحل}}", title: "تصنيف المحل", description: "تصنيف المحل المحفوظ في بيانات المحلات." },
  { tag: "{{منطقة_المحل}}", title: "منطقة المحل", description: "منطقة المحل المحفوظة في بيانات المحلات." },
  { tag: "{{ملاحظات_الاستبيان}}", title: "ملاحظات الاستبيان", description: "كل ملاحظات نتيجة الاستبيان دون تصنيف أو اختصار." },
  { tag: "{{صورة_المحل}}", title: "صور المحل", description: "ضعه داخل إطار الصورة؛ يملأه التطبيق بصور المحل في شبكة متوازنة." },
  { tag: "{{اسم_الدورة}}", title: "اسم الدورة", description: "اسم الدورة التي يختارها المستخدم للتقرير." },
  { tag: "{{تاريخ_التقرير}}", title: "تاريخ الإنشاء", description: "تاريخ إنشاء ملف التقرير على الهاتف." },
  { tag: "{{تكرار_محل}}", title: "تكرار شريحة المحل", description: "استخدمه مرة واحدة فقط داخل الشريحة التي تريد تكرارها لكل محلات الدورة عند اختيار وضع الوسم." },
];

export interface MarketVisitReportTemplate {
  id: string;
  name: string;
  fileName: string;
  uri: string;
  size?: number;
  createdAt: string;
}

export interface MarketVisitReportOrder {
  primary: MarketVisitOrderField;
  categoryPriority: string[];
  regionPriority: string[];
  imageFit?: MarketVisitImageFit;
  imageCompression?: MarketVisitImageCompression;
  slideRepeatMode?: MarketVisitSlideRepeatMode;
  productMetricIds?: string[];
}

export const DEFAULT_MARKET_VISIT_REPORT_ORDER: MarketVisitReportOrder = {
  primary: "category",
  categoryPriority: [],
  regionPriority: [],
  imageFit: "fill",
  imageCompression: "compressed",
  slideRepeatMode: "second-slide",
  productMetricIds: [],
};

export interface MarketVisitStoreEntry {
  id: string;
  storeName: string;
  category: string;
  region: string;
  surveyDate: string;
}

/** تضم كل نتائج الدورة، بما فيها النتائج القديمة التي تحفظ مرجعها داخل resultIds فقط. */
export function getMarketVisitCycleResults<T extends { id: string; cycleId?: string }>(cycle: { id: string; resultIds: string[] }, results: T[]) {
  const resultIds = new Set(cycle.resultIds);
  return results.filter((result) => result.cycleId === cycle.id || resultIds.has(result.id));
}

function priorityIndex(value: string, priority: string[]): number {
  const index = priority.indexOf(value);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function sortMarketVisitStores<T extends MarketVisitStoreEntry>(entries: T[], order: MarketVisitReportOrder): T[] {
  const firstPriority = order.primary === "category" ? order.categoryPriority : order.regionPriority;
  const secondPriority = order.primary === "category" ? order.regionPriority : order.categoryPriority;
  const firstValue = (item: MarketVisitStoreEntry) => order.primary === "category" ? item.category : item.region;
  const secondValue = (item: MarketVisitStoreEntry) => order.primary === "category" ? item.region : item.category;

  return [...entries].sort((left, right) => {
    const first = priorityIndex(firstValue(left), firstPriority) - priorityIndex(firstValue(right), firstPriority);
    if (first) return first;
    const second = priorityIndex(secondValue(left), secondPriority) - priorityIndex(secondValue(right), secondPriority);
    if (second) return second;
    const date = new Date(left.surveyDate).getTime() - new Date(right.surveyDate).getTime();
    if (date) return date;
    return left.storeName.localeCompare(right.storeName, "ar");
  });
}

/** يحذف أولوية تصنيف أو منطقة لم تعد متاحة كي يبدأ الترقيم من 1 دائماً. */
export function pruneMarketVisitOrder(order: MarketVisitReportOrder, categories: string[], regions: string[]): MarketVisitReportOrder {
  const categorySet = new Set(categories);
  const regionSet = new Set(regions);
  return {
    ...DEFAULT_MARKET_VISIT_REPORT_ORDER,
    ...order,
    categoryPriority: (order.categoryPriority || []).filter((item) => categorySet.has(item)),
    regionPriority: (order.regionPriority || []).filter((item) => regionSet.has(item)),
  };
}

/** يحافظ على اسم العرض الأول ويزيل الفراغات والتكرارات قبل عرض خيارات الأولوية. */
export function normalizeMarketVisitPriorityOptions(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  return values.reduce<string[]>((items, value) => {
    const label = value?.trim();
    const key = label?.toLocaleLowerCase("ar");
    if (label && key && !seen.has(key)) { seen.add(key); items.push(label); }
    return items;
  }, []);
}
