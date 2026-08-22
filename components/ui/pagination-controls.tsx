import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { PaginationState } from "@/hooks/use-paginated-data";

interface PaginationControlsProps {
  pagination: PaginationState;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading?: boolean;
}

export function PaginationControls({
  pagination,
  onPrevPage,
  onNextPage,
  onGoToPage,
  hasNextPage,
  hasPrevPage,
  isLoading = false,
}: PaginationControlsProps) {
  const colors = useColors();

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    buttonGroup: {
      flexDirection: "row",
      gap: 8,
    },
    button: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    buttonText: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: "600" as any as any,
    },
    buttonTextActive: {
      color: "#fff",
    },
    infoText: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: "500" as any as any,
    },
    pageIndicator: {
      flexDirection: "row",
      gap: 4,
      justifyContent: "center",
      alignItems: "center",
    },
  });

  return (
    <View style={styles.container}>
      {/* معلومات الصفحة */}
      <Text style={styles.infoText}>
        {pagination.totalItems === 0
          ? "لا توجد بيانات"
          : `${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(
              pagination.page * pagination.pageSize,
              pagination.totalItems
            )} من ${pagination.totalItems}`}
      </Text>

      {/* أزرار التنقل */}
      <View style={styles.buttonGroup}>
        {/* الصفحة السابقة */}
        <TouchableOpacity
          onPress={onPrevPage}
          disabled={!hasPrevPage || isLoading}
          style={[
            styles.button,
            !hasPrevPage && styles.buttonDisabled,
          ]}
        >
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={hasPrevPage ? colors.foreground : colors.muted}
          />
        </TouchableOpacity>

        {/* رقم الصفحة */}
        <View style={styles.pageIndicator}>
          <Text style={styles.infoText}>{pagination.page}</Text>
          <Text style={styles.infoText}>/</Text>
          <Text style={styles.infoText}>{pagination.totalPages}</Text>
        </View>

        {/* الصفحة التالية */}
        <TouchableOpacity
          onPress={onNextPage}
          disabled={!hasNextPage || isLoading}
          style={[
            styles.button,
            !hasNextPage && styles.buttonDisabled,
          ]}
        >
          <MaterialIcons
            name="chevron-left"
            size={20}
            color={hasNextPage ? colors.foreground : colors.muted}
          />
        </TouchableOpacity>
      </View>

      {/* حجم الصفحة */}
      <Text style={styles.infoText}>
        {pagination.pageSize} / صفحة
      </Text>
    </View>
  );
}

/**
 * مكون بسيط لعرض معلومات الترقيم فقط
 */
export function PaginationInfo({
  pagination,
  isLoading = false,
}: {
  pagination: PaginationState;
  isLoading?: boolean;
}) {
  const colors = useColors();

  const styles = StyleSheet.create({
    container: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginVertical: 8,
    },
    text: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: "500" as any,
      textAlign: "center",
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        الصفحة {pagination.page} من {pagination.totalPages} • {pagination.totalItems} عنصر
      </Text>
    </View>
  );
}
