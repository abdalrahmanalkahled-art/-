import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAppStore, AppError } from '@/lib/store/app-store';

/**
 * Hook لإدارة الأخطاء من المتجر المركزي
 */
export function useAppError() {
  const { addError, removeError, clearErrors, retryError, errors } = useAppStore();

  /**
   * إضافة خطأ جديد وعرضه للمستخدم
   */
  const showError = useCallback(
    (message: string, code?: string, retryable = false) => {
      const errorId = addError({
        message,
        code,
        retryable,
        maxRetries: retryable ? 3 : 0,
      });

      Alert.alert('خطأ', message, [
        {
          text: 'حسناً',
          onPress: () => removeError(errorId),
        },
      ]);

      return errorId;
    },
    [addError, removeError]
  );

  /**
   * إعادة محاولة عملية معينة
   */
  const retry = useCallback(
    (errorId: string, fn: () => Promise<void>) => {
      retryError(errorId);
      fn().catch((error) => {
        console.error('Retry failed:', error);
      });
    },
    [retryError]
  );

  /**
   * تنفيذ عملية مع معالجة الأخطاء
   */
  const execute = useCallback(
    async <T,>(fn: () => Promise<T>, errorMessage?: string): Promise<T | null> => {
      try {
        return await fn();
      } catch (error) {
        const message = errorMessage || (error instanceof Error ? error.message : 'حدث خطأ');
        showError(message);
        return null;
      }
    },
    [showError]
  );

  /**
   * تنفيذ عملية مع إعادة محاولة
   */
  const executeWithRetry = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      maxRetries = 3,
      errorMessage?: string
    ): Promise<T | null> => {
      let lastError: any;

      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;

          if (i < maxRetries - 1) {
            // الانتظار قبل المحاولة التالية
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
          }
        }
      }

      const message = errorMessage || (lastError instanceof Error ? lastError.message : 'حدث خطأ');
      showError(message);
      return null;
    },
    [showError]
  );

  return {
    showError,
    removeError,
    clearErrors,
    retry,
    execute,
    executeWithRetry,
    errors,
  };
}
