import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { exportToCSVWithArabic, exportToJSONWithArabic } from "@/lib/export-excel";
import { ExportPreviewModal } from "./export-preview-modal";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: string[];
  onExport?: () => void;
}

export function ExportButton({
  data,
  filename,
  columns,
  onExport,
}: ExportButtonProps) {
  const colors = useColors();
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "json") => {
    try {
      setIsExporting(true);
      if (format === "csv") {
        await exportToCSVWithArabic({
          filename,
          data,
          columns,
        });
      } else {
        await exportToJSONWithArabic({
          filename,
          data,
          columns,
        });
      }
      setShowPreview(false);
      onExport?.();
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء تصدير البيانات");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowPreview(true)}
        style={[
          styles.button,
          { backgroundColor: colors.primary, borderColor: colors.border },
        ]}
      >
        <MaterialIcons name="download" size={20} color="#fff" />
        <Text style={styles.buttonText}>تصدير</Text>
      </TouchableOpacity>

      <ExportPreviewModal
        visible={showPreview}
        data={data}
        columns={columns}
        filename={filename}
        onClose={() => setShowPreview(false)}
        onConfirm={handleExport}
        isLoading={isExporting}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
