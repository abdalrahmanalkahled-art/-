import { TRPCClientError } from "@trpc/client";
import { AppRouter } from "@/server/routers";

/**
 * أنواع الأخطاء المختلفة
 */
export enum ErrorType {
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * واجهة الخطأ الموحدة
 */
export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: Record<string, any>;
  originalError?: Error;
}

/**
 * معالج الأخطاء الرئيسي
 */
export class ErrorHandler {
  /**
   * تحليل الخطأ وتحويله إلى AppError
   */
  static parse(error: unknown): AppError {
    // خطأ tRPC
    if (error instanceof TRPCClientError) {
      return this.parseTRPCError(error);
    }

    // خطأ عادي
    if (error instanceof Error) {
      return this.parseStandardError(error);
    }

    // خطأ غير معروف
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: "حدث خطأ غير متوقع",
      originalError: error instanceof Error ? error : new Error(String(error)),
    };
  }

  /**
   * معالجة أخطاء tRPC
   */
  private static parseTRPCError(
    error: TRPCClientError<any>
  ): AppError {
    const code = error.data?.code;
    const message = error.message;

    switch (code) {
      case "UNAUTHORIZED":
        return {
          type: ErrorType.UNAUTHORIZED,
          message: "جلستك انتهت. يرجى تسجيل الدخول مجدداً",
          code,
          originalError: error,
        };

      case "FORBIDDEN":
        return {
          type: ErrorType.FORBIDDEN,
          message: "ليس لديك صلاحية لهذا الإجراء",
          code,
          originalError: error,
        };

      case "NOT_FOUND":
        return {
          type: ErrorType.NOT_FOUND,
          message: "العنصر المطلوب غير موجود",
          code,
          originalError: error,
        };

      case "BAD_REQUEST":
        return {
          type: ErrorType.VALIDATION_ERROR,
          message: "البيانات المرسلة غير صحيحة",
          code,
          details: (error.data as any)?.zodError,
          originalError: error,
        };

      case "INTERNAL_SERVER_ERROR":
        return {
          type: ErrorType.SERVER_ERROR,
          message: "حدث خطأ في الخادم. يرجى المحاولة لاحقاً",
          code,
          originalError: error,
        };

      default:
        return {
          type: ErrorType.SERVER_ERROR,
          message: message || "حدث خطأ في الخادم",
          code: code || "UNKNOWN",
          originalError: error,
        };
    }
  }

  /**
   * معالجة الأخطاء العادية
   */
  private static parseStandardError(error: Error): AppError {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return {
        type: ErrorType.NETWORK_ERROR,
        message: "فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت",
        originalError: error,
      };
    }

    if (message.includes("timeout")) {
      return {
        type: ErrorType.NETWORK_ERROR,
        message: "انتهت مهلة الانتظار. يرجى المحاولة مجدداً",
        originalError: error,
      };
    }

    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: error.message || "حدث خطأ غير متوقع",
      originalError: error,
    };
  }

  /**
   * الحصول على رسالة الخطأ المناسبة للعرض
   */
  static getUserMessage(error: AppError): string {
    return error.message;
  }

  /**
   * تسجيل الخطأ
   */
  static log(error: AppError, context?: Record<string, any>) {
    console.error("[AppError]", {
      type: error.type,
      message: error.message,
      code: error.code,
      context,
      originalError: error.originalError,
    });
  }

  /**
   * التحقق من نوع الخطأ
   */
  static is(error: AppError, type: ErrorType): boolean {
    return error.type === type;
  }

  /**
   * التحقق من أن الخطأ متعلق بالمصادقة
   */
  static isAuthError(error: AppError): boolean {
    return (
      error.type === ErrorType.UNAUTHORIZED ||
      error.type === ErrorType.FORBIDDEN
    );
  }

  /**
   * التحقق من أن الخطأ متعلق بالشبكة
   */
  static isNetworkError(error: AppError): boolean {
    return error.type === ErrorType.NETWORK_ERROR;
  }

  /**
   * التحقق من أن الخطأ متعلق بالتحقق من البيانات
   */
  static isValidationError(error: AppError): boolean {
    return error.type === ErrorType.VALIDATION_ERROR;
  }
}

/**
 * Hook لمعالجة الأخطاء
 */
import { useCallback } from "react";

export function useErrorHandler() {
  const handleError = useCallback((error: unknown, context?: string) => {
    const appError = ErrorHandler.parse(error);
    ErrorHandler.log(appError, { context });
    return appError;
  }, []);

  const handleAuthError = useCallback((error: AppError) => {
    if (ErrorHandler.isAuthError(error)) {
      return true;
    }
    return false;
  }, []);

  const handleNetworkError = useCallback((error: AppError) => {
    if (ErrorHandler.isNetworkError(error)) {
      return true;
    }
    return false;
  }, []);

  return {
    handleError,
    handleAuthError,
    handleNetworkError,
  };
}

/**
 * مساعد للتعامل مع الأخطاء في العمليات غير المتزامنة
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError?: (error: AppError) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const appError = ErrorHandler.parse(error);
    ErrorHandler.log(appError);
    onError?.(appError);
    return null;
  }
}

/**
 * مساعد للتعامل مع الأخطاء في العمليات المتزامنة
 */
export function withSyncErrorHandling<T>(
  fn: () => T,
  onError?: (error: AppError) => void
): T | null {
  try {
    return fn();
  } catch (error) {
    const appError = ErrorHandler.parse(error);
    ErrorHandler.log(appError);
    onError?.(appError);
    return null;
  }
}

/**
 * مساعد للتحقق من صحة البيانات
 */
export function validateData<T>(
  data: unknown,
  validator: (data: unknown) => data is T
): { valid: true; data: T } | { valid: false; error: AppError } {
  if (validator(data)) {
    return { valid: true, data };
  }

  return {
    valid: false,
    error: {
      type: ErrorType.VALIDATION_ERROR,
      message: "البيانات المرسلة غير صحيحة",
    },
  };
}
