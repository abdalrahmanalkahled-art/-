import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { AppError, ErrorType } from "@/lib/error-handler";

interface ErrorDisplayProps {
  error: AppError | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

/**
 * مكون لعرض الأخطاء بشكل احترافي
 */
export function ErrorDisplay({
  error,
  onDismiss,
  onRetry,
  showRetryButton = false,
}: ErrorDisplayProps) {
  const colors = useColors();

  if (!error) return null;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.error + "15",
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: "700" as any,
      color: colors.error,
      marginBottom: 4,
    },
    message: {
      fontSize: 13,
      color: colors.foreground,
      lineHeight: 20,
      marginBottom: 8,
    },
    buttons: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    button: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    retryButton: {
      backgroundColor: colors.error,
    },
    dismissButton: {
      backgroundColor: colors.border,
    },
    buttonText: {
      fontSize: 12,
      fontWeight: "700" as any,
    },
    retryButtonText: {
      color: "#fff",
    },
    dismissButtonText: {
      color: colors.foreground,
    },
    icon: {
      marginTop: 2,
    },
  });

  const getErrorTitle = () => {
    switch (error.type) {
      case ErrorType.UNAUTHORIZED:
        return "خطأ في المصادقة";
      case ErrorType.FORBIDDEN:
        return "صلاحيات غير كافية";
      case ErrorType.NOT_FOUND:
        return "غير موجود";
      case ErrorType.VALIDATION_ERROR:
        return "خطأ في البيانات";
      case ErrorType.NETWORK_ERROR:
        return "خطأ في الاتصال";
      case ErrorType.SERVER_ERROR:
        return "خطأ في الخادم";
      default:
        return "حدث خطأ";
    }
  };

  return (
    <View style={styles.container}>
      <MaterialIcons
        name="error-outline"
        size={20}
        color={colors.error}
        style={styles.icon}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{getErrorTitle()}</Text>
        <Text style={styles.message}>{error.message}</Text>

        {(onRetry || onDismiss) && (
          <View style={styles.buttons}>
            {onRetry && showRetryButton && (
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={onRetry}
              >
                <Text style={[styles.buttonText, styles.retryButtonText]}>
                  إعادة المحاولة
                </Text>
              </TouchableOpacity>
            )}
            {onDismiss && (
              <TouchableOpacity
                style={[styles.button, styles.dismissButton]}
                onPress={onDismiss}
              >
                <Text style={[styles.buttonText, styles.dismissButtonText]}>
                  إغلاق
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * مكون نافذة للأخطاء الحرجة
 */
interface ErrorModalProps {
  visible: boolean;
  error: AppError | null;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function ErrorModal({
  visible,
  error,
  onDismiss,
  onRetry,
}: ErrorModalProps) {
  const colors = useColors();

  if (!error) return null;

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: "85%",
      maxWidth: 320,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      gap: 12,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.error + "20",
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 16,
      fontWeight: "700" as any,
      color: colors.foreground,
      flex: 1,
    },
    message: {
      fontSize: 14,
      color: colors.muted,
      lineHeight: 20,
      marginBottom: 20,
    },
    buttons: {
      flexDirection: "row",
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    primaryButton: {
      backgroundColor: colors.error,
    },
    secondaryButton: {
      backgroundColor: colors.border,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "700" as any,
    },
    primaryButtonText: {
      color: "#fff",
    },
    secondaryButtonText: {
      color: colors.foreground,
    },
  });

  const getErrorTitle = () => {
    switch (error.type) {
      case ErrorType.UNAUTHORIZED:
        return "جلستك انتهت";
      case ErrorType.FORBIDDEN:
        return "صلاحيات غير كافية";
      case ErrorType.NETWORK_ERROR:
        return "خطأ في الاتصال";
      case ErrorType.SERVER_ERROR:
        return "خطأ في الخادم";
      default:
        return "حدث خطأ";
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="error-outline" size={24} color={colors.error} />
            </View>
            <Text style={styles.title}>{getErrorTitle()}</Text>
          </View>

          <Text style={styles.message}>{error.message}</Text>

          <View style={styles.buttons}>
            {onRetry && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={onRetry}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  إعادة المحاولة
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onDismiss}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                إغلاق
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Hook لإدارة حالة الخطأ
 */
export function useErrorState() {
  const [error, setError] = React.useState<AppError | null>(null);
  const [showModal, setShowModal] = React.useState(false);

  const showError = React.useCallback((err: AppError, modal = false) => {
    setError(err);
    if (modal) {
      setShowModal(true);
    }
  }, []);

  const dismissError = React.useCallback(() => {
    setError(null);
    setShowModal(false);
  }, []);

  return {
    error,
    showError,
    dismissError,
    showModal,
    setShowModal,
  };
}
