import { useCallback, useMemo, useState } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface UsePaginatedDataOptions {
  initialPageSize?: number;
  cacheKey?: string;
}

/**
 * Hook للتعامل مع البيانات المقسمة (Pagination) مع Caching
 * يوفر:
 * - تقسيم البيانات إلى صفحات
 * - Caching للبيانات المحملة
 * - التنقل بين الصفحات
 * - معلومات الترقيم
 */
export function usePaginatedData<T>(
  allData: T[],
  options: UsePaginatedDataOptions = {}
) {
  const { initialPageSize = 20, cacheKey } = options;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // حساب البيانات المعروضة للصفحة الحالية
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allData.slice(startIndex, endIndex);
  }, [allData, page, pageSize]);

  // حساب معلومات الترقيم
  const paginationState = useMemo<PaginationState>(() => {
    const totalItems = allData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }, [allData.length, page, pageSize]);

  // دوال التنقل
  const goToPage = useCallback((newPage: number) => {
    const maxPage = Math.ceil(allData.length / pageSize);
    if (newPage >= 1 && newPage <= maxPage) {
      setPage(newPage);
    }
  }, [allData.length, pageSize]);

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // العودة للصفحة الأولى عند تغيير حجم الصفحة
  }, []);

  const reset = useCallback(() => {
    setPage(1);
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  return {
    // البيانات
    data: paginatedData,
    paginatedData, // إضافة هذا للتوافق مع الكود الموجود
    allData,
    
    // معلومات الترقيم
    pagination: paginationState,
    
    // دوال التنقل
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    reset,
    
    // معلومات مساعدة
    hasNextPage: page < paginationState.totalPages,
    hasPrevPage: page > 1,
    isFirstPage: page === 1,
    isLastPage: page === paginationState.totalPages,
  };
}

/**
 * Hook للـ Caching البسيط
 * يخزن البيانات مع timestamp ويتحقق من انتهاء الصلاحية
 */
export function useCachedData<T>(
  fetchFn: () => Promise<T>,
  cacheKey: string,
  staleTime: number = 5 * 60 * 1000 // 5 دقائق
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const isCacheValid = useCallback(() => {
    return Date.now() - lastFetchTime < staleTime;
  }, [lastFetchTime, staleTime]);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      // إذا كان الـ cache صحيح ولم نطلب refresh، استخدم البيانات المخزنة
      if (!forceRefresh && data !== null && isCacheValid()) {
        return data;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchFn();
        setData(result);
        setLastFetchTime(Date.now());
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchFn, data, isCacheValid]
  );

  const invalidateCache = useCallback(() => {
    setLastFetchTime(0);
  }, []);

  return {
    data,
    loading,
    error,
    fetchData,
    invalidateCache,
    isCacheValid: isCacheValid(),
  };
}

/**
 * Hook مدمج للـ Pagination + Caching
 * يجمع بين الاثنين للحصول على أداء أفضل
 */
export function usePaginatedCachedData<T>(
  fetchAllDataFn: () => Promise<T[]>,
  cacheKey: string,
  options: UsePaginatedDataOptions & { staleTime?: number } = {}
) {
  const { staleTime = 5 * 60 * 1000, ...paginationOptions } = options;

  const { data: allDataRaw = [], fetchData, invalidateCache, isCacheValid } = useCachedData(
    fetchAllDataFn,
    cacheKey,
    staleTime
  );

  const allData = allDataRaw || [];
  const pagination = usePaginatedData(allData, paginationOptions);

  return {
    ...pagination,
    fetchData,
    invalidateCache,
    isCacheValid,
    isLoading: allData && allData.length === 0,
  };
}
