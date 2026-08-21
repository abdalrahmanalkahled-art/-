import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * نوع البيانات للخطأ
 */
export interface AppError {
  id: string;
  message: string;
  code?: string;
  timestamp: number;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

/**
 * نوع البيانات للحالة العامة للتطبيق
 */
interface AppStateType {
  // حالة الأخطاء
  errors: AppError[];
  addError: (error: Omit<AppError, 'id' | 'timestamp' | 'retryCount'>) => string;
  removeError: (id: string) => void;
  clearErrors: () => void;
  retryError: (id: string) => void;

  // حالة التحميل
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // حالة الاتصال
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;

  // حالة المستخدم
  userId: string | null;
  isManager: boolean;
  setUser: (userId: string | null, isManager: boolean) => void;

  // حالة البيانات المخزنة مؤقتاً
  cachedData: Record<string, CacheEntry>;
  setCachedData: (key: string, data: unknown) => void;
  getCachedData: (key: string, maxAge?: number) => unknown | null;
  clearCachedData: (key?: string) => void;

  // حالة الصفحة الحالية
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // حالة التصفية والبحث
  filters: Record<string, unknown>;
  setFilter: (key: string, value: unknown) => void;
  clearFilters: () => void;

  // حالة الفرز
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  setSortBy: (sortBy: string, sortOrder?: 'asc' | 'desc') => void;
}

/**
 * متجر Zustand المركزي للتطبيق
 */
export const useAppStore = create<AppStateType>()(
  subscribeWithSelector((set, get) => ({
    // الأخطاء
    errors: [],
    addError: (error: Omit<AppError, 'id' | 'timestamp' | 'retryCount'>) => {
      const id = `error_${Date.now()}_${Math.random()}`;
      set((state) => ({
        errors: [
          ...state.errors,
          {
            ...error,
            id,
            timestamp: Date.now(),
            retryCount: 0,
          },
        ],
      }));
      return id;
    },
    removeError: (id: string) => {
      set((state) => ({
        errors: state.errors.filter((e: AppError) => e.id !== id),
      }));
    },
    clearErrors: () => {
      set({ errors: [] });
    },
    retryError: (id: string) => {
      set((state) => ({
        errors: state.errors.map((e: AppError) =>
          e.id === id && e.retryCount < e.maxRetries
            ? { ...e, retryCount: e.retryCount + 1 }
            : e
        ),
      }));
    },

    // التحميل
    isLoading: false,
    setIsLoading: (loading: boolean) => set({ isLoading: loading }),

    // الاتصال
    isOnline: true,
    setIsOnline: (online: boolean) => set({ isOnline: online }),

    // المستخدم
    userId: null,
    isManager: false,
    setUser: (userId: string | null, isManager: boolean) => set({ userId, isManager }),

    // البيانات المخزنة مؤقتاً
    cachedData: {},
    setCachedData: (key: string, data: unknown) => {
      set((state) => ({
        cachedData: {
          ...state.cachedData,
          [key]: { data, timestamp: Date.now() },
        },
      }));
    },
    getCachedData: (key: string, maxAge = 5 * 60 * 1000) => {
      const state = get();
      const cached = state.cachedData[key];

      if (!cached) return null;

      const age = Date.now() - cached.timestamp;
      if (age > maxAge) {
        // حذف البيانات المنتهية الصلاحية
        set((state) => {
          const newCachedData = { ...state.cachedData };
          delete newCachedData[key];
          return { cachedData: newCachedData };
        });
        return null;
      }

      return cached.data;
    },
    clearCachedData: (key?: string) => {
      if (key) {
        set((state) => {
          const newCachedData = { ...state.cachedData };
          delete newCachedData[key];
          return { cachedData: newCachedData };
        });
      } else {
        set({ cachedData: {} });
      }
    },

    // الصفحة الحالية
    currentPage: 'home',
    setCurrentPage: (page: string) => set({ currentPage: page }),

    // الفلاتر
    filters: {},
    setFilter: (key: string, value: unknown) => {
      set((state) => ({
        filters: {
          ...state.filters,
          [key]: value,
        },
      }));
    },
    clearFilters: () => set({ filters: {} }),

    // الفرز
    sortBy: 'createdAt',
    sortOrder: 'desc',
    setSortBy: (sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') => set({ sortBy, sortOrder }),
  }))
);

/**
 * Hook للحصول على الأخطاء فقط
 */
export const useAppErrors = () => useAppStore((state: AppStateType) => state.errors);

/**
 * Hook للحصول على حالة التحميل فقط
 */
export const useAppLoading = () => useAppStore((state: AppStateType) => state.isLoading);

/**
 * Hook للحصول على حالة الاتصال فقط
 */
export const useAppOnline = () => useAppStore((state: AppStateType) => state.isOnline);

/**
 * Hook للحصول على بيانات المستخدم فقط
 */
export const useAppUser = () =>
  useAppStore((state: AppStateType) => ({ userId: state.userId, isManager: state.isManager }));
