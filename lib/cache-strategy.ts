import { useAppStore } from './store/app-store';

/**
 * استراتيجيات التخزين المؤقت المختلفة
 */
export enum CacheStrategy {
  /**
   * لا تخزين مؤقت
   */
  NONE = 'NONE',

  /**
   * تخزين مؤقت قصير الأجل (5 دقائق)
   */
  SHORT = 'SHORT',

  /**
   * تخزين مؤقت متوسط الأجل (30 دقيقة)
   */
  MEDIUM = 'MEDIUM',

  /**
   * تخزين مؤقت طويل الأجل (ساعة واحدة)
   */
  LONG = 'LONG',

  /**
   * تخزين مؤقت دائم (24 ساعة)
   */
  PERMANENT = 'PERMANENT',
}

/**
 * مدة التخزين المؤقت لكل استراتيجية (بالميلي ثانية)
 */
const CACHE_DURATIONS: Record<CacheStrategy, number> = {
  [CacheStrategy.NONE]: 0,
  [CacheStrategy.SHORT]: 5 * 60 * 1000, // 5 دقائق
  [CacheStrategy.MEDIUM]: 30 * 60 * 1000, // 30 دقيقة
  [CacheStrategy.LONG]: 60 * 60 * 1000, // ساعة واحدة
  [CacheStrategy.PERMANENT]: 24 * 60 * 60 * 1000, // 24 ساعة
};

/**
 * مفاتيح التخزين المؤقت
 */
export const CACHE_KEYS = {
  // المحلات
  STORES_LIST: 'stores_list',
  STORE_DETAIL: (id: string) => `store_detail_${id}`,

  // الفعاليات
  EVENTS_LIST: 'events_list',
  EVENT_DETAIL: (id: string) => `event_detail_${id}`,

  // الاستبيانات
  SURVEYS_LIST: 'surveys_list',
  SURVEY_TEMPLATES: 'survey_templates',
  SURVEY_RESULTS: 'survey_results',
  SURVEY_DETAIL: (id: string) => `survey_detail_${id}`,

  // التحليلات
  ANALYTICS_DATA: 'analytics_data',
  ANALYTICS_SUMMARY: 'analytics_summary',

  // المستخدم
  USER_PROFILE: 'user_profile',
  USER_PERMISSIONS: 'user_permissions',
};

/**
 * استراتيجيات التخزين المؤقت الافتراضية لكل مفتاح
 */
const DEFAULT_STRATEGIES: Record<string, CacheStrategy> = {
  [CACHE_KEYS.STORES_LIST]: CacheStrategy.MEDIUM,
  [CACHE_KEYS.EVENTS_LIST]: CacheStrategy.MEDIUM,
  [CACHE_KEYS.SURVEYS_LIST]: CacheStrategy.MEDIUM,
  [CACHE_KEYS.SURVEY_TEMPLATES]: CacheStrategy.LONG,
  [CACHE_KEYS.SURVEY_RESULTS]: CacheStrategy.SHORT,
  [CACHE_KEYS.ANALYTICS_DATA]: CacheStrategy.SHORT,
  [CACHE_KEYS.ANALYTICS_SUMMARY]: CacheStrategy.SHORT,
  [CACHE_KEYS.USER_PROFILE]: CacheStrategy.LONG,
  [CACHE_KEYS.USER_PERMISSIONS]: CacheStrategy.LONG,
};

/**
 * مدير التخزين المؤقت الموحد
 */
export class CacheManager {
  /**
   * الحصول على البيانات من التخزين المؤقت
   */
  static get<T>(key: string): T | null {
    const store = useAppStore.getState();
    return store.getCachedData(key) as T | null;
  }

  /**
   * حفظ البيانات في التخزين المؤقت
   */
  static set<T>(key: string, data: T, strategy?: CacheStrategy): void {
    const store = useAppStore.getState();
    store.setCachedData(key, data);
  }

  /**
   * حذف البيانات من التخزين المؤقت
   */
  static remove(key: string): void {
    const store = useAppStore.getState();
    store.clearCachedData(key);
  }

  /**
   * حذف جميع البيانات المخزنة مؤقتاً
   */
  static clear(): void {
    const store = useAppStore.getState();
    store.clearCachedData();
  }

  /**
   * الحصول على مدة التخزين المؤقت لمفتاح معين
   */
  static getDuration(key: string): number {
    const strategy = DEFAULT_STRATEGIES[key] || CacheStrategy.MEDIUM;
    return CACHE_DURATIONS[strategy];
  }

  /**
   * تنفيذ عملية مع التخزين المؤقت
   */
  static async withCache<T>(
    key: string,
    fn: () => Promise<T>,
    strategy?: CacheStrategy
  ): Promise<T> {
    // محاولة الحصول على البيانات من التخزين المؤقت
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // تنفيذ العملية والحفظ في التخزين المؤقت
    const data = await fn();
    this.set(key, data, strategy);

    return data;
  }

  /**
   * تنفيذ عملية مع التخزين المؤقت والإعادة في الخلفية
   */
  static async withCacheAndRefresh<T>(
    key: string,
    fn: () => Promise<T>,
    strategy?: CacheStrategy
  ): Promise<T> {
    // الحصول على البيانات المخزنة مؤقتاً
    const cached = this.get<T>(key);

    // تحديث البيانات في الخلفية
    fn()
      .then((data) => {
        this.set(key, data, strategy);
      })
      .catch((error) => {
        console.error('Background cache refresh failed:', error);
      });

    // إرجاع البيانات المخزنة مؤقتاً أو تنفيذ العملية
    if (cached !== null) {
      return cached;
    }

    return await fn();
  }

  /**
   * تنفيذ عملية مع التخزين المؤقت والتحديث عند الحاجة
   */
  static async withSmartCache<T>(
    key: string,
    fn: () => Promise<T>,
    strategy?: CacheStrategy,
    forceRefresh = false
  ): Promise<T> {
    if (forceRefresh) {
      const data = await fn();
      this.set(key, data, strategy);
      return data;
    }

    return this.withCacheAndRefresh(key, fn, strategy);
  }

  /**
   * حذف التخزين المؤقت لمجموعة من المفاتيح
   */
  static invalidate(keys: string[]): void {
    keys.forEach((key) => this.remove(key));
  }

  /**
   * حذف التخزين المؤقت لمجموعة من المفاتيح بناءً على نمط
   */
  static invalidateByPattern(pattern: string | RegExp): void {
    const store = useAppStore.getState();
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    Object.keys(store.cachedData).forEach((key) => {
      if (regex.test(key)) {
        this.remove(key);
      }
    });
  }
}

/**
 * Hook لاستخدام التخزين المؤقت
 */
export function useCache() {
  return {
    get: CacheManager.get.bind(CacheManager),
    set: CacheManager.set.bind(CacheManager),
    remove: CacheManager.remove.bind(CacheManager),
    clear: CacheManager.clear.bind(CacheManager),
    withCache: CacheManager.withCache.bind(CacheManager),
    withCacheAndRefresh: CacheManager.withCacheAndRefresh.bind(CacheManager),
    withSmartCache: CacheManager.withSmartCache.bind(CacheManager),
    invalidate: CacheManager.invalidate.bind(CacheManager),
    invalidateByPattern: CacheManager.invalidateByPattern.bind(CacheManager),
  };
}
