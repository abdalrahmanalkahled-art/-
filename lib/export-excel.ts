import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

interface ExportOptions {
  filename: string;
  data: any[];
  columns?: string[];
}

/**
 * تحويل البيانات إلى صيغة CSV مع دعم العربية
 * يستخدم UTF-8 BOM لضمان عرض صحيح في Excel
 */
export const convertToCSVWithArabic = (data: any[], columns?: string[]): string => {
  if (!data || data.length === 0) {
    return "";
  }

  // تحديد الأعمدة
  const keys = columns || Object.keys(data[0]);
  
  // إنشاء رأس الجدول مع Escape للقيم التي تحتوي على فواصل
  const header = keys.map(key => {
    const value = String(key);
    // إذا كانت القيمة تحتوي على فاصلة أو علامات اقتباس، ضعها بين علامات اقتباس
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }).join(",");
  
  // إنشاء الصفوف
  const rows = data.map(item =>
    keys.map(key => {
      const value = item[key];
      
      // معالجة القيم المختلفة
      let cellValue = '';
      if (value === null || value === undefined) {
        cellValue = '';
      } else if (typeof value === "string") {
        cellValue = value;
      } else if (typeof value === "boolean") {
        cellValue = value ? "نعم" : "لا";
      } else if (typeof value === "number") {
        cellValue = String(value);
      } else if (Array.isArray(value)) {
        cellValue = value.join("; ");
      } else if (typeof value === "object") {
        cellValue = JSON.stringify(value, null, 2);
      } else {
        cellValue = String(value);
      }
      
      // Escape القيم التي تحتوي على فواصل أو علامات اقتباس
      if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
        return `"${cellValue.replace(/"/g, '""')}"`;
      }
      return cellValue;
    }).join(",")
  );

  // إضافة UTF-8 BOM في البداية لضمان عرض صحيح للعربية في Excel
  const csvContent = [header, ...rows].join("\n");
  return "\uFEFF" + csvContent; // UTF-8 BOM
};

/**
 * تصدير البيانات إلى ملف CSV على الويب
 */
const exportToCSVWeb = (filename: string, csvContent: string): void => {
  try {
    // إنشاء Blob مع UTF-8 BOM
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });
    
    // إنشاء رابط التحميل
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // تنظيف الذاكرة
    URL.revokeObjectURL(url);
    
    Alert.alert("نجح", `تم تحميل الملف: ${filename}.csv`);
  } catch (error) {
    console.error("Export to CSV error:", error);
    Alert.alert("خطأ", "حدث خطأ أثناء تحميل الملف. تأكد من أن المتصفح يدعم هذه الميزة.");
  }
};

/**
 * إنشاء المجلد إذا لم يكن موجوداً
 */
const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(dirPath);
    if (!fileInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  } catch (error) {
    console.error("Error creating directory:", error);
    throw error;
  }
};

/**
 * تصدير البيانات إلى ملف CSV على الموبايل (بدون اتصال)
 * يحفظ الملف مباشرة في مجلد المستندات
 */
const exportToCSVMobile = async (filename: string, csvContent: string): Promise<void> => {
  try {
    // التحقق من توفر FileSystem
    if (!FileSystem || !FileSystem.documentDirectory) {
      throw new Error("FileSystem غير متاح");
    }

    // إنشاء مسار الملف في مجلد المستندات
    const fileUri = `${FileSystem.documentDirectory}${filename}.csv`;

    // كتابة الملف مع UTF-8 BOM
    const contentWithBOM = "\uFEFF" + csvContent;
    
    try {
      await FileSystem.writeAsStringAsync(fileUri, contentWithBOM, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (writeError: any) {
      // إذا فشلت الكتابة، حاول إنشاء المجلد أولاً
      if (writeError.message && writeError.message.includes("ENOENT")) {
        const dir = FileSystem.documentDirectory;
        if (dir) {
          await ensureDirectoryExists(dir);
          // حاول الكتابة مرة أخرى
          await FileSystem.writeAsStringAsync(fileUri, contentWithBOM, {
            encoding: FileSystem.EncodingType.UTF8,
          });
        }
      } else {
        throw writeError;
      }
    }

    // مشاركة الملف أو حفظه محلياً
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: `مشاركة ${filename}`,
        UTI: "public.comma-separated-values-text",
      });
    } else {
      Alert.alert(
        "نجح",
        `تم حفظ الملف: ${filename}.csv\n\nالملف محفوظ محلياً على جهازك بدون الحاجة للاتصال بالإنترنت.\n\nالمسار: ${fileUri}`
      );
    }
  } catch (error) {
    console.error("Mobile export error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    Alert.alert(
      "خطأ في التصدير",
      `فشل تصدير البيانات: ${errorMessage}\n\nتأكد من:\n- توفر مساحة تخزين كافية\n- الأذونات المطلوبة (READ/WRITE)\n- عدم امتلاء ذاكرة الجهاز`
    );
  }
};

/**
 * تصدير البيانات إلى ملف CSV مع دعم العربية والتصدير بدون اتصال
 */
export const exportToCSVWithArabic = async (options: ExportOptions): Promise<void> => {
  try {
    const { filename, data, columns } = options;

    if (!data || data.length === 0) {
      Alert.alert("تنبيه", "لا توجد بيانات للتصدير");
      return;
    }

    const content = convertToCSVWithArabic(data, columns);

    // على الويب، استخدم طريقة مختلفة
    if (Platform.OS === "web") {
      exportToCSVWeb(filename, content);
    } else {
      // على الأجهزة المحمولة، استخدم FileSystem (بدون اتصال)
      await exportToCSVMobile(filename, content);
    }
  } catch (error) {
    console.error("Export error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    Alert.alert("خطأ", `حدث خطأ أثناء تصدير البيانات: ${errorMessage}`);
  }
};

/**
 * تحويل البيانات إلى صيغة JSON مع دعم العربية
 */
export const convertToJSONWithArabic = (data: any[]): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * تصدير البيانات إلى ملف JSON على الويب
 */
const exportToJSONWeb = (filename: string, jsonContent: string): void => {
  try {
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.json`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    Alert.alert("نجح", `تم تحميل الملف: ${filename}.json`);
  } catch (error) {
    console.error("Export to JSON error:", error);
    Alert.alert("خطأ", "حدث خطأ أثناء تحميل الملف. تأكد من أن المتصفح يدعم هذه الميزة.");
  }
};

/**
 * تصدير البيانات إلى ملف JSON على الموبايل (بدون اتصال)
 */
const exportToJSONMobile = async (filename: string, jsonContent: string): Promise<void> => {
  try {
    if (!FileSystem || !FileSystem.documentDirectory) {
      throw new Error("FileSystem غير متاح");
    }

    const fileUri = `${FileSystem.documentDirectory}${filename}.json`;

    try {
      await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (writeError: any) {
      if (writeError.message && writeError.message.includes("ENOENT")) {
        const dir = FileSystem.documentDirectory;
        if (dir) {
          await ensureDirectoryExists(dir);
          await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
            encoding: FileSystem.EncodingType.UTF8,
          });
        }
      } else {
        throw writeError;
      }
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: `مشاركة ${filename}`,
      });
    } else {
      Alert.alert(
        "نجح",
        `تم حفظ الملف: ${filename}.json\n\nالملف محفوظ محلياً على جهازك بدون الحاجة للاتصال بالإنترنت.`
      );
    }
  } catch (error) {
    console.error("Mobile JSON export error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    Alert.alert("خطأ", `فشل تصدير البيانات: ${errorMessage}`);
  }
};

/**
 * تصدير البيانات إلى ملف JSON مع دعم العربية والتصدير بدون اتصال
 */
export const exportToJSONWithArabic = async (options: ExportOptions): Promise<void> => {
  try {
    const { filename, data } = options;

    if (!data || data.length === 0) {
      Alert.alert("تنبيه", "لا توجد بيانات للتصدير");
      return;
    }

    const content = convertToJSONWithArabic(data);

    if (Platform.OS === "web") {
      exportToJSONWeb(filename, content);
    } else {
      await exportToJSONMobile(filename, content);
    }
  } catch (error) {
    console.error("Export error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    Alert.alert("خطأ", `حدث خطأ أثناء تصدير البيانات: ${errorMessage}`);
  }
};
