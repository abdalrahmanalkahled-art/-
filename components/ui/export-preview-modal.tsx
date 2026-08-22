import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  FlatList,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

interface ExportPreviewModalProps {
  visible: boolean;
  data: any[];
  columns?: string[];
  filename: string;
  onClose: () => void;
  onConfirm: (format: "csv" | "json") => void;
  isLoading?: boolean;
}

export function ExportPreviewModal({
  visible,
  data,
  columns,
  filename,
  onClose,
  onConfirm,
  isLoading = false,
}: ExportPreviewModalProps) {
  const colors = useColors();
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "json">("csv");
  const [previewPage, setPreviewPage] = useState(0);

  if (!data || data.length === 0) {
    return null;
  }

  const keys = columns || Object.keys(data[0]);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = previewPage * itemsPerPage;
  const previewData = data.slice(startIndex, startIndex + itemsPerPage);

  const handleConfirm = () => {
    onConfirm(selectedFormat);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            معاينة البيانات
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Info */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <MaterialIcons name="info" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              عدد الصفوف: {data.length} | عدد الأعمدة: {keys.length}
            </Text>
          </View>
          <Text style={[styles.filenameText, { color: colors.muted }]}>
            اسم الملف: {filename}
          </Text>
        </View>

        {/* Preview Table */}
        <ScrollView style={styles.previewContainer}>
          {/* Header Row */}
          <View
            style={[
              styles.tableRow,
              styles.headerRow,
              { backgroundColor: colors.primary },
            ]}
          >
            {keys.map((key, index) => (
              <Text
                key={index}
                style={[styles.headerCell, { flex: 1 }]}
                numberOfLines={1}
              >
                {String(key)}
              </Text>
            ))}
          </View>

          {/* Data Rows */}
          {previewData.map((item, rowIndex) => (
            <View
              key={rowIndex}
              style={[
                styles.tableRow,
                {
                  backgroundColor:
                    rowIndex % 2 === 0 ? colors.background : colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              {keys.map((key, colIndex) => {
                const value = item[key];
                let displayValue = "";

                if (value === null || value === undefined) {
                  displayValue = "-";
                } else if (typeof value === "boolean") {
                  displayValue = value ? "نعم" : "لا";
                } else if (typeof value === "object") {
                  displayValue = JSON.stringify(value).substring(0, 20) + "...";
                } else {
                  displayValue = String(value).substring(0, 30);
                }

                return (
                  <Text
                    key={colIndex}
                    style={[
                      styles.cell,
                      { flex: 1, color: colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {displayValue}
                  </Text>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={[styles.paginationContainer, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={() => setPreviewPage(Math.max(0, previewPage - 1))}
              disabled={previewPage === 0}
              style={[
                styles.paginationButton,
                {
                  backgroundColor: previewPage === 0 ? colors.muted : colors.primary,
                },
              ]}
            >
              <MaterialIcons name="chevron-right" size={20} color="#fff" />
            </Pressable>
            <Text style={[styles.paginationText, { color: colors.foreground }]}>
              {previewPage + 1} / {totalPages}
            </Text>
            <Pressable
              onPress={() => setPreviewPage(Math.min(totalPages - 1, previewPage + 1))}
              disabled={previewPage === totalPages - 1}
              style={[
                styles.paginationButton,
                {
                  backgroundColor:
                    previewPage === totalPages - 1 ? colors.muted : colors.primary,
                },
              ]}
            >
              <MaterialIcons name="chevron-left" size={20} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* Format Selection */}
        <View style={[styles.formatSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formatTitle, { color: colors.foreground }]}>
            اختر صيغة التصدير
          </Text>
          <View style={styles.formatButtons}>
            <Pressable
              onPress={() => setSelectedFormat("csv")}
              style={[
                styles.formatButton,
                {
                  backgroundColor:
                    selectedFormat === "csv" ? colors.primary : colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <MaterialIcons
                name="table-chart"
                size={20}
                color={selectedFormat === "csv" ? "#fff" : colors.primary}
              />
              <Text
                style={[
                  styles.formatButtonText,
                  {
                    color: selectedFormat === "csv" ? "#fff" : colors.foreground,
                  },
                ]}
              >
                CSV
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedFormat("json")}
              style={[
                styles.formatButton,
                {
                  backgroundColor:
                    selectedFormat === "json" ? colors.primary : colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <MaterialIcons
                name="code"
                size={20}
                color={selectedFormat === "json" ? "#fff" : colors.primary}
              />
              <Text
                style={[
                  styles.formatButtonText,
                  {
                    color: selectedFormat === "json" ? "#fff" : colors.foreground,
                  },
                ]}
              >
                JSON
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionContainer, { backgroundColor: colors.surface }]}>
          <Pressable
            onPress={onClose}
            disabled={isLoading}
            style={[
              styles.cancelButton,
              { borderColor: colors.border, opacity: isLoading ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
              إلغاء
            </Text>
          </Pressable>

          <Pressable
            onPress={handleConfirm}
            disabled={isLoading}
            style={[
              styles.confirmButton,
              { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 },
            ]}
          >
            {isLoading ? (
              <>
                <MaterialIcons name="hourglass-empty" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>جاري التصدير...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="download" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>تصدير الآن</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filenameText: {
    fontSize: 12,
  },
  previewContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerRow: {
    paddingVertical: 10,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginHorizontal: 4,
  },
  cell: {
    fontSize: 11,
    marginHorizontal: 4,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  paginationText: {
    fontSize: 14,
    fontWeight: "500",
    minWidth: 50,
    textAlign: "center",
  },
  formatSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  formatButtons: {
    flexDirection: "row",
    gap: 12,
  },
  formatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  formatButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
