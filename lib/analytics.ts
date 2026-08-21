/**
 * نظام Analytics و Logging الموحد
 * يتتبع الأخطاء والعمليات والأداء
 */

export enum EventType {
  // الأخطاء
  ERROR = 'ERROR',
  WARNING = 'WARNING',

  // العمليات
  ACTION = 'ACTION',
  PAGE_VIEW = 'PAGE_VIEW',
  API_CALL = 'API_CALL',

  // الأداء
  PERFORMANCE = 'PERFORMANCE',
  CACHE_HIT = 'CACHE_HIT',
  CACHE_MISS = 'CACHE_MISS',
}

export interface AnalyticsEvent {
  type: EventType;
  name: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * مدير Analytics الموحد
 */
export class Analytics {
  private static sessionId = `session_${Date.now()}_${Math.random()}`;
  private static events: AnalyticsEvent[] = [];
  private static maxEvents = 1000;

  /**
   * تسجيل حدث
   */
  static track(
    type: EventType,
    name: string,
    metadata?: Record<string, any>,
    duration?: number
  ): void {
    const event: AnalyticsEvent = {
      type,
      name,
      timestamp: Date.now(),
      duration,
      metadata,
      sessionId: this.sessionId,
    };

    this.events.push(event);

    // حذف الأحداث القديمة إذا تجاوزت الحد الأقصى
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // تسجيل في console في بيئة التطوير
    if (__DEV__) {
      console.log(`[Analytics] ${type}: ${name}`, metadata);
    }
  }

  /**
   * تسجيل خطأ
   */
  static trackError(
    name: string,
    error: Error | string,
    metadata?: Record<string, any>
  ): void {
    const errorData = typeof error === 'string' ? { message: error } : {
      message: error.message,
      stack: error.stack,
    };

    const event: AnalyticsEvent = {
      type: EventType.ERROR,
      name,
      timestamp: Date.now(),
      metadata,
      sessionId: this.sessionId,
      error: errorData,
    };

    this.events.push(event);

    if (__DEV__) {
      console.error(`[Analytics Error] ${name}:`, errorData, metadata);
    }
  }

  /**
   * تسجيل عملية مع قياس الوقت
   */
  static async trackAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.track(EventType.ACTION, name, { ...metadata, success: true }, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.trackError(name, error as Error, { ...metadata, duration });
      throw error;
    }
  }

  /**
   * تسجيل استدعاء API
   */
  static trackApiCall(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    this.track(
      EventType.API_CALL,
      `${method} ${endpoint}`,
      {
        ...metadata,
        statusCode,
        success: statusCode >= 200 && statusCode < 300,
      },
      duration
    );
  }

  /**
   * تسجيل عرض صفحة
   */
  static trackPageView(pageName: string, metadata?: Record<string, any>): void {
    this.track(EventType.PAGE_VIEW, pageName, metadata);
  }

  /**
   * تسجيل إصابة التخزين المؤقت
   */
  static trackCacheHit(key: string, metadata?: Record<string, any>): void {
    this.track(EventType.CACHE_HIT, `Cache hit: ${key}`, metadata);
  }

  /**
   * تسجيل فشل التخزين المؤقت
   */
  static trackCacheMiss(key: string, metadata?: Record<string, any>): void {
    this.track(EventType.CACHE_MISS, `Cache miss: ${key}`, metadata);
  }

  /**
   * الحصول على جميع الأحداث
   */
  static getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * الحصول على الأحداث حسب النوع
   */
  static getEventsByType(type: EventType): AnalyticsEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * الحصول على الأخطاء
   */
  static getErrors(): AnalyticsEvent[] {
    return this.events.filter((e) => e.type === EventType.ERROR);
  }

  /**
   * حذف جميع الأحداث
   */
  static clear(): void {
    this.events = [];
  }

  /**
   * تصدير الأحداث
   */
  static export(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * إرسال الأحداث إلى الخادم
   */
  static async send(endpoint: string): Promise<void> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          events: this.events,
          timestamp: Date.now(),
        }),
      });

      if (response.ok) {
        this.clear();
      }
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }
}

/**
 * واجهة ثابتة للتحليلات. تُنشأ مرة واحدة حتى لا تتغير مراجع الدوال في
 * مصفوفات اعتماد useEffect وuseCallback بعد كل عملية رسم للشاشة.
 */
const analyticsApi = Object.freeze({
  track: Analytics.track.bind(Analytics),
  trackError: Analytics.trackError.bind(Analytics),
  trackAsync: Analytics.trackAsync.bind(Analytics),
  trackApiCall: Analytics.trackApiCall.bind(Analytics),
  trackPageView: Analytics.trackPageView.bind(Analytics),
  trackCacheHit: Analytics.trackCacheHit.bind(Analytics),
  trackCacheMiss: Analytics.trackCacheMiss.bind(Analytics),
});

/**
 * Hook لاستخدام Analytics بمرجع ثابت بين عمليات الرسم.
 */
export function useAnalytics() {
  return analyticsApi;
}
