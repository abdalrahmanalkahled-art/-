import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

interface ExportOptions {
  filename: string;
  format: "csv" | "json";
  data: any[];
  columns?: string[];
}

/**
 * تحويل البيانات إلى CSV
 */
export const convertToCSV = (data: any[], columns?: string[]): string => {
  if (!data || data.length === 0) {
    return "";
  }

  // تحديد الأعمدة
  const keys = columns || Object.keys(data[0]);
  
  // إنشاء رأس الجدول
  const header = keys.map(key => `"${key}"`).join(",");
  
  // إنشاء الصفوف
  const rows = data.map(item =>
    keys.map(key => {
      const value = item[key];
      if (value === null || value === undefined) return '""';
      if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
      if (typeof value === "object") return `"${JSON.stringify(value)}"`;
      return `"${value}"`;
    }).join(",")
  );

  return [header, ...rows].join("\n");
};

/**
 * تحويل البيانات إلى JSON
 */
export const convertToJSON = (data: any[]): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * تصدير البيانات إلى ملف
 */
export const exportData = async (options: ExportOptions): Promise<void> => {
  try {
    const { filename, format, data, columns } = options;

    if (!data || data.length === 0) {
      Alert.alert("تنبيه", "لا توجد بيانات للتصدير");
      return;
    }

    let content: string;
    let fileExtension: string;

    if (format === "csv") {
      content = convertToCSV(data, columns);
      fileExtension = "csv";
    } else {
      content = convertToJSON(data);
      fileExtension = "json";
    }

    // إنشاء مسار الملف
    const fileUri = `${FileSystem.documentDirectory}${filename}.${fileExtension}`;

    // كتابة الملف
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // مشاركة الملف
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: format === "csv" ? "text/csv" : "application/json",
        dialogTitle: `مشاركة ${filename}`,
      });
    } else {
      Alert.alert("نجح", `تم حفظ الملف: ${filename}.${fileExtension}`);
    }
  } catch (error) {
    console.error("Export error:", error);
    Alert.alert("خطأ", "حدث خطأ أثناء تصدير البيانات");
  }
};

/**
 * تصدير البيانات إلى PDF (باستخدام HTML)
 */
export const exportToPDF = async (
  filename: string,
  htmlContent: string
): Promise<void> => {
  try {
    // استخدام مكتبة PDF
    const pdfUri = `${FileSystem.documentDirectory}${filename}.pdf`;
    
    // هنا يمكن استخدام مكتبة مثل react-native-html-to-pdf
    // للآن سنستخدم JSON كبديل
    Alert.alert("تنبيه", "يرجى استخدام صيغة CSV أو JSON للتصدير");
  } catch (error) {
    console.error("PDF export error:", error);
    Alert.alert("خطأ", "حدث خطأ أثناء تصدير PDF");
  }
};

/**
 * إنشاء جدول HTML من البيانات
 */
export const createHTMLTable = (data: any[], columns?: string[]): string => {
  if (!data || data.length === 0) {
    return "<p>لا توجد بيانات</p>";
  }

  const keys = columns || Object.keys(data[0]);
  
  let html = "<table border='1' cellpadding='10' cellspacing='0'>";
  
  // إضافة رأس الجدول
  html += "<thead><tr>";
  keys.forEach(key => {
    html += `<th>${key}</th>`;
  });
  html += "</tr></thead>";
  
  // إضافة الصفوف
  html += "<tbody>";
  data.forEach(item => {
    html += "<tr>";
    keys.forEach(key => {
      const value = item[key];
      html += `<td>${value || "-"}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody>";
  
  html += "</table>";
  
  return html;
};
