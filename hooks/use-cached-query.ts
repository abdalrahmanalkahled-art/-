import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";

/**
 * Hook للـ Caching المتقدم مع React Query و AsyncStorage
 * يوفر:
 * - Caching في الذاكرة (React Query)
 * - Caching على الجهاز (AsyncStorage)
 * - Stale time قابل للتخصيص
 * - معالجة الأخطاء
 */

export interface CachedQueryOptions<TData>
  extends Omit<UseQueryOptions<TData>, "queryKey" | "queryFn"> {
  persistCache?: boolean; // حفظ في AsyncStorage
  persistKey?: string; // مفتاح التخزين
  staleTime?: number; // مدة صلاحية البيانات (ميلي ثانية)
  gcTime?: number; // مدة الاحتفاظ بالبيانات غير المستخدمة
}

/**
 * Hook للـ Caching مع AsyncStorage
 * مثالي للبيانات التي تتغير بشكل نادر
 */
export function useCachedQuery<TData>(
  queryKey: (string | number | object)[],
  queryFn: () => Promise<TData>,
  options: CachedQueryOptions<TData> = {}
) {
  // تحويل queryKey إلى string للتأكد من أنه array
  const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];
  const defaultPersistKey = normalizedKey
    .map((k) => (typeof k === "object" ? JSON.stringify(k) : String(k)))
    .join("_");

  const {
    persistCache = true,
    persistKey = defaultPersistKey,
    staleTime = 5 * 60 * 1000, // 5 دقائق
    gcTime = 10 * 60 * 1000, // 10 دقائق
    ...queryOptions
  } = options;

  // تحسين: استخدام useCallback لتجنب infinite loops
  const memoizedQueryFn = React.useCallback(async () => {
    try {
      // محاولة الحصول على البيانات من الخادم
      const data = await queryFn();
      
      // حفظ في AsyncStorage عند النجاح
      if (persistCache) {
        try {
          await AsyncStorage.setItem(persistKey, JSON.stringify(data));
        } catch (err) {
          console.warn(`[Cache] فشل حفظ البيانات لـ ${persistKey}:`, err);
        }
      }
      
      return data;
    } catch (error) {
      // إذا فشل، حاول الحصول من AsyncStorage
      if (persistCache) {
        try {
          const cachedData = await AsyncStorage.getItem(persistKey);
          if (cachedData) {
            console.warn(
              `[Cache] استخدام البيانات المخزنة محلياً لـ ${persistKey}`
            );
            return JSON.parse(cachedData) as TData;
          }
        } catch {
          // تجاهل أخطاء AsyncStorage
        }
      }
      throw error;
    }
  }, [queryFn, persistCache, persistKey]);

  const query = useQuery<TData>({
    queryKey: normalizedKey as any,
    queryFn: memoizedQueryFn,
    staleTime,
    gcTime,
    ...queryOptions,
  } as any);

  return query;
}

/**
 * Hook للـ Pagination مع Caching
 * يجمع بين الاثنين للأداء الأمثل
 */
export function usePaginatedCachedQuery<TData extends any[]>(
  queryKey: (string | number | object)[],
  queryFn: () => Promise<TData>,
  pageSize: number = 20,
  options: CachedQueryOptions<TData> = {}
) {
  const query = useCachedQuery(queryKey, queryFn, {
    staleTime: 5 * 60 * 1000,
    ...options,
  });

  const data = query.data || [];
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  // إعادة تعيين الصفحة عند تغيير البيانات
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return {
    ...query,
    paginatedData,
    allData: data,
    pagination: {
      currentPage,
      totalPages,
      pageSize,
      totalItems: data.length,
    },
    goToPage: (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    nextPage: () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    },
    prevPage: () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
  };
}

/**
 * Hook للـ Caching المحلي البسيط (بدون React Query)
 * مناسب للبيانات الصغيرة والبسيطة
 */
export function useLocalCache<TData>(
  key: string,
  fetchFn: () => Promise<TData>,
  options: {
    staleTime?: number;
    fallbackData?: TData;
  } = {}
) {
  const { staleTime = 5 * 60 * 1000, fallbackData } = options;

  const [data, setData] = React.useState<TData | undefined>(fallbackData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = React.useState<number>(0);

  const isCacheValid = React.useCallback(() => {
    return Date.now() - lastFetchTime < staleTime;
  }, [lastFetchTime, staleTime]);

  const fetch = React.useCallback(
    async (forceRefresh = false) => {
      // إذا كان الـ cache صحيح ولم نطلب refresh
      if (!forceRefresh && data !== undefined && isCacheValid()) {
        return data;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchFn();
        setData(result);
        setLastFetchTime(Date.now());

        // حفظ في AsyncStorage
        try {
          await AsyncStorage.setItem(key, JSON.stringify(result));
        } catch {
          // تجاهل أخطاء التخزين
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // محاولة الحصول من AsyncStorage عند الفشل
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const parsedData = JSON.parse(cached) as TData;
            setData(parsedData);
            return parsedData;
          }
        } catch {
          // تجاهل
        }

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchFn, data, isCacheValid, key]
  );

  const invalidate = React.useCallback(() => {
    setLastFetchTime(0);
  }, []);

  const clear = React.useCallback(async () => {
    setData(undefined);
    setLastFetchTime(0);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // تجاهل
    }
  }, [key]);

  // تحميل البيانات عند التركيب
  React.useEffect(() => {
    fetch();
  }, []);

  return {
    data,
    loading,
    error,
    fetch,
    invalidate,
    clear,
    isCacheValid: isCacheValid(),
  };
}

/**
 * Hook للـ Caching المتعدد
 * يدير عدة استعلامات مع caching موحد
 */
export function useMultiCache<T extends Record<string, any>>(
  queries: {
    [K in keyof T]: {
      key: string;
      fn: () => Promise<T[K]>;
      staleTime?: number;
    };
  }
) {
  const [data, setData] = React.useState<Partial<T>>({});
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, Error>>>({});

  const fetch = React.useCallback(async (forceRefresh = false) => {
    setLoading(true);
    const newData: Partial<T> = {};
    const newErrors: Partial<Record<keyof T, Error>> = {};

    const promises = Object.entries(queries).map(async ([key, config]) => {
      try {
        const result = await config.fn();
        newData[key as keyof T] = result;
      } catch (err) {
        newErrors[key as keyof T] = err instanceof Error ? err : new Error(String(err));
      }
    });

    await Promise.all(promises);

    setData(newData);
    setErrors(newErrors);
    setLoading(false);
  }, [queries]);

  React.useEffect(() => {
    fetch();
  }, []);

  return {
    data,
    loading,
    errors,
    fetch,
  };
}
