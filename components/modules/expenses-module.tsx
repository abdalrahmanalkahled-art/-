import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { CategoryManagerModal } from "@/components/category-manager-modal";
import { CardActionModal } from "@/components/card-action-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import { ExpenseReportSettingsSheet } from "@/components/expense-report-settings-sheet";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { ReportFab } from "@/components/report-fab";
import { useColors } from "@/hooks/use-colors";
import { useHasPermission } from "@/lib/app-context";
import { DEFAULT_EXPENSE_CATEGORIES, getFallbackCategoryId, getManagedCategories, type ManagedCategory } from "@/lib/category-management";
import { buildExpenseReportData } from "@/lib/expense-report-data";
import { exportExpenseReport } from "@/lib/expense-report-exporter";
import { loadExpenseReportSettings, saveExpenseReportSettings } from "@/lib/expense-report-settings";
import { DEFAULT_EXPENSE_REPORT_SETTINGS, type ExpenseReportSettings } from "@/lib/expense-report-settings-model";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseDate: string;
  notes: string;
  createdAt: string;
}

const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIsoDate = (value: string) => value ? new Date(`${value}T12:00:00`) : null;

export default function ExpensesModule() {
  const colors = useColors();
  const canCreate = useHasPermission("expenses", "create");
  const canDelete = useHasPermission("expenses", "delete");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ManagedCategory[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ title: "", amount: "", category: "other", expenseDate: new Date().toISOString().split("T")[0], notes: "" });
  const [expensePendingDelete, setExpensePendingDelete] = useState<string | null>(null);
  const [expenseActionTarget, setExpenseActionTarget] = useState<Expense | null>(null);
  const [reportSettings, setReportSettings] = useState<ExpenseReportSettings>(DEFAULT_EXPENSE_REPORT_SETTINGS);
  const [showReportSettings, setShowReportSettings] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const loadData = useCallback(async () => {
    const [expenseData, storedCategories, storedReportSettings] = await Promise.all([
      getItems<Expense>(STORAGE_KEYS.EXPENSES),
      getItems<ManagedCategory>(STORAGE_KEYS.EXPENSE_CATEGORIES),
      loadExpenseReportSettings(),
    ]);
    const resolvedCategories = getManagedCategories(storedCategories, DEFAULT_EXPENSE_CATEGORIES);
    if (storedCategories.length === 0) await saveItems(STORAGE_KEYS.EXPENSE_CATEGORIES, resolvedCategories);
    setExpenses(expenseData.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()));
    setCategories(resolvedCategories);
    setReportSettings(storedReportSettings);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const categoryFor = (id: string) => categories.find((category) => category.id === id) ?? categories[0] ?? DEFAULT_EXPENSE_CATEGORIES[0];
  const filtered = filterCat === "all" ? expenses : expenses.filter((expense) => expense.category === filterCat);
  const totalAmount = filtered.reduce((sum, expense) => sum + expense.amount, 0);

  const openNewExpense = () => {
    setForm({ title: "", amount: "", category: categories.find((category) => category.id === "other")?.id ?? categories[0]?.id ?? "other", expenseDate: new Date().toISOString().split("T")[0], notes: "" });
    setShowCategoryMenu(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.amount) {
      Alert.alert("خطأ", "أدخل العنوان والمبلغ");
      return;
    }
    const allExpenses = await getItems<Expense>(STORAGE_KEYS.EXPENSES);
    const newExpense: Expense = {
      id: Date.now().toString(),
      title: form.title.trim(),
      amount: Number.parseFloat(form.amount) || 0,
      category: form.category,
      expenseDate: form.expenseDate,
      notes: form.notes,
      createdAt: new Date().toISOString(),
    };
    await saveItems(STORAGE_KEYS.EXPENSES, [...allExpenses, newExpense]);
    setShowModal(false);
    await loadData();
  };

  const handleDeleteExpense = (id: string) => setExpensePendingDelete(id);
  const confirmDeleteExpense = async () => {
    if (!expensePendingDelete) return;
    const allExpenses = await getItems<Expense>(STORAGE_KEYS.EXPENSES);
    await saveItems(STORAGE_KEYS.EXPENSES, allExpenses.filter((expense) => expense.id !== expensePendingDelete));
    setExpensePendingDelete(null);
    await loadData();
  };

  const saveCategory = async (category: ManagedCategory) => {
    const updated = categories.some((item) => item.id === category.id)
      ? categories.map((item) => item.id === category.id ? category : item)
      : [...categories, category];
    await saveItems(STORAGE_KEYS.EXPENSE_CATEGORIES, updated);
    setCategories(updated);
  };

  const deleteCategory = async (category: ManagedCategory) => {
    if (categories.length < 2) {
      Alert.alert("لا يمكن الحذف", "يجب أن يبقى تصنيف واحد على الأقل.");
      return;
    }
    const fallbackId = getFallbackCategoryId(categories, category.id);
    if (!fallbackId) return;
    const [allExpenses] = await Promise.all([getItems<Expense>(STORAGE_KEYS.EXPENSES)]);
    const updatedCategories = categories.filter((item) => item.id !== category.id);
    await Promise.all([
      saveItems(STORAGE_KEYS.EXPENSE_CATEGORIES, updatedCategories),
      saveItems(STORAGE_KEYS.EXPENSES, allExpenses.map((expense) => expense.category === category.id ? { ...expense, category: fallbackId } : expense)),
    ]);
    if (filterCat === category.id) setFilterCat("all");
    if (form.category === category.id) setForm((current) => ({ ...current, category: fallbackId }));
    await loadData();
  };

  const selectedCategory = categoryFor(form.category);
  const saveReportSettings = async (settings: ExpenseReportSettings) => setReportSettings(await saveExpenseReportSettings(settings));
  const exportReport = async (format: "pdf" | "excel") => {
    setExporting(format);
    try {
      const data = buildExpenseReportData(expenses, categories, reportSettings);
      await exportExpenseReport(format, data, reportSettings);
    } finally {
      setExporting(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}> 
        <Text style={styles.summaryLabel}>إجمالي الصرفيات</Text>
        <Text style={styles.summaryValue}>{totalAmount.toLocaleString("en-US")} ل.س</Text>
        <Text style={styles.summaryCount}>{filtered.length} صرفية</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {[{ id: "all", label: "الكل" }, ...categories].map((option) => (
          <TouchableOpacity key={option.id} style={[styles.filterChip, filterCat === option.id && { backgroundColor: colors.primary }]} onPress={() => setFilterCat(option.id)}>
            <Text style={[styles.filterChipText, { color: filterCat === option.id ? "#fff" : colors.muted }]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const category = categoryFor(item.category);
          return (
            <TouchableOpacity onLongPress={() => setExpenseActionTarget(item)} delayLongPress={350} activeOpacity={0.82} style={[styles.expenseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <View style={styles.expenseRight}>
                <View style={[styles.catIcon, { backgroundColor: category.color + "20" }]}>
                  <MaterialIcons name={category.icon as keyof typeof MaterialIcons.glyphMap} size={18} color={category.color} />
                </View>
                <View style={styles.expenseText}>
                  <Text style={[styles.expenseTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[styles.expenseMeta, { color: colors.muted }]}>{category.label} • {item.expenseDate}</Text>
                </View>
              </View>
              <Text style={[styles.expenseAmount, { color: colors.foreground }]}>{item.amount.toLocaleString("en-US")} ل.س</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="receipt" size={40} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد صرفيات</Text></View>}
      />

      <FloatingFormModal visible={showModal} onClose={() => setShowModal(false)} backgroundColor={colors.background}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <View style={[styles.modal, { backgroundColor: colors.background }]}> 
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowModal(false)}><MaterialIcons name="close" size={24} color={colors.foreground} /></TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>صرفية جديدة</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                {[
                  { key: "title", label: "العنوان *", placeholder: "وصف الصرفية" },
                  { key: "amount", label: "المبلغ (ل.س) *", placeholder: "0", keyboardType: "numeric" as const },
                ].map((field) => (
                  <View key={field.key} style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>{field.label}</Text>
                    <TextInput style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} value={(form as Record<string, string>)[field.key]} onChangeText={(value) => setForm((current) => ({ ...current, [field.key]: value }))} placeholder={field.placeholder} placeholderTextColor={colors.muted} keyboardType={field.keyboardType ?? "default"} textAlign="right" />
                  </View>
                ))}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>تاريخ الصرفية</Text>
                  <TouchableOpacity onPress={() => setShowExpenseDatePicker(true)} style={[styles.formInput, styles.datePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                    <Text style={[styles.datePickerText, { color: form.expenseDate ? colors.foreground : colors.muted }]}>{form.expenseDate || "اختر تاريخ الصرفية"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.formGroup, { zIndex: 2 }]}> 
                  <View style={styles.categoryLabelRow}>
                    <TouchableOpacity onPress={() => setShowCategoryManager(true)}><Text style={[styles.manageCategoriesText, { color: colors.primary }]}>إدارة التصنيفات</Text></TouchableOpacity>
                    <Text style={[styles.formLabel, { color: colors.foreground, marginBottom: 0 }]}>التصنيف</Text>
                  </View>
                  <View style={[styles.categoryDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity style={styles.categoryDropdownButton} onPress={() => setShowCategoryMenu((current) => !current)}>
                      <MaterialIcons name={showCategoryMenu ? "expand-less" : "expand-more"} size={22} color={colors.primary} />
                      <View style={styles.categorySelection}><MaterialIcons name={selectedCategory.icon as keyof typeof MaterialIcons.glyphMap} size={18} color={selectedCategory.color} /><Text style={[styles.categorySelectionText, { color: colors.foreground }]}>{selectedCategory.label}</Text></View>
                    </TouchableOpacity>
                    {showCategoryMenu ? <ScrollView style={[styles.categoryDropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                      {categories.map((category) => <TouchableOpacity key={category.id} style={styles.categoryDropdownItem} onPress={() => { setForm((current) => ({ ...current, category: category.id })); setShowCategoryMenu(false); }}><MaterialIcons name={category.id === form.category ? "check-circle" : "radio-button-unchecked"} size={19} color={category.id === form.category ? category.color : colors.muted} /><Text style={[styles.categoryDropdownText, { color: colors.foreground }]}>{category.label}</Text></TouchableOpacity>)}
                    </ScrollView> : null}
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>ملاحظات</Text>
                  <TextInput style={[styles.formInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} value={form.notes} onChangeText={(notes) => setForm((current) => ({ ...current, notes }))} placeholder="ملاحظات..." placeholderTextColor={colors.muted} multiline numberOfLines={3} textAlign="right" textAlignVertical="top" />
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.muted + "20" }]} onPress={() => setShowModal(false)}><Text style={[styles.cancelText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.primary }]} onPress={() => void handleSave()}><Text style={styles.saveText}>حفظ</Text></TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </FloatingFormModal>
      <DateRangePickerModal visible={showExpenseDatePicker} startDate={fromIsoDate(form.expenseDate)} endDate={fromIsoDate(form.expenseDate)} selectionMode="single" title="تاريخ الصرفية" onCancel={() => setShowExpenseDatePicker(false)} onConfirm={(date) => { setForm((current) => ({ ...current, expenseDate: toIsoDate(date) })); setShowExpenseDatePicker(false); }} />

      <CategoryManagerModal visible={showCategoryManager} title="تصنيفات الصرفيات" categories={categories} onClose={() => setShowCategoryManager(false)} onSave={saveCategory} onDelete={deleteCategory} />
      <ExpenseReportSettingsSheet visible={showReportSettings} categories={categories} settings={reportSettings} onSave={saveReportSettings} onClose={() => setShowReportSettings(false)} />
      <ReportFab module="expenses" addLabel="إضافة صرفية" onAdd={canCreate ? openNewExpense : undefined} onSettings={() => setShowReportSettings(true)} onExport={(format) => void exportReport(format)} exporting={exporting} />
      <ConfirmDialog
        visible={Boolean(expensePendingDelete)}
        title="حذف الصرفية"
        message="هل أنت متأكد من حذف هذه الصرفية؟ لا يمكن التراجع عن ذلك."
        confirmText="حذف"
        isDangerous
        icon="warning"
        onCancel={() => setExpensePendingDelete(null)}
        onConfirm={() => void confirmDeleteExpense()}
      />
      <CardActionModal visible={Boolean(expenseActionTarget)} title={expenseActionTarget?.title || "إجراءات الصرفية"} onClose={() => setExpenseActionTarget(null)} actions={canDelete ? [{ id: "delete", label: "حذف الصرفية", icon: "delete-outline", tone: "danger", onPress: () => { const target = expenseActionTarget; setExpenseActionTarget(null); if (target) handleDeleteExpense(target.id); } }] : []} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, summaryCard: { margin: 12, borderRadius: 14, padding: 16, alignItems: "center" }, summaryLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13 }, summaryValue: { color: "#fff", fontSize: 28, fontWeight: "800" as any, marginVertical: 4 }, summaryCount: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  filterRow: { maxHeight: 44 }, filterContent: { paddingHorizontal: 12, gap: 8, alignItems: "center" }, filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#E5E7EB" }, filterChipText: { fontSize: 12, fontWeight: "500" as any },
  list: { paddingHorizontal: 12, gap: 8, paddingBottom: 102 },
  expenseCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 12, borderWidth: 1 }, expenseRight: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }, expenseText: { flex: 1 }, catIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" }, expenseTitle: { fontSize: 14, fontWeight: "600" as any, textAlign: "right" }, expenseMeta: { fontSize: 11, marginTop: 2, textAlign: "right" }, expenseAmount: { fontSize: 15, fontWeight: "700" as any, marginHorizontal: 8 }, deleteBtn: { padding: 4 },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 }, emptyText: { fontSize: 14 }, modal: { flex: 1 }, modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5 }, modalTitle: { fontSize: 17, fontWeight: "700" as any }, modalContent: { flex: 1, padding: 16 }, formGroup: { marginBottom: 16 }, formLabel: { fontSize: 14, fontWeight: "600" as any, marginBottom: 8, textAlign: "right" }, formInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 }, datePickerButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, datePickerText: { fontSize: 15, fontWeight: "600" as any }, textArea: { height: 80 },
  categoryLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, manageCategoriesText: { fontSize: 13, fontWeight: "700" as any }, categoryDropdown: { borderRadius: 10, borderWidth: 1 }, categoryDropdownButton: { minHeight: 48, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, categorySelection: { flexDirection: "row", alignItems: "center", gap: 8 }, categorySelectionText: { fontSize: 15, fontWeight: "600" as any }, categoryDropdownMenu: { borderTopWidth: 1, maxHeight: 210 }, categoryDropdownItem: { minHeight: 44, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 }, categoryDropdownText: { fontSize: 14, fontWeight: "600" as any },
  modalFooter: { flexDirection: "row", padding: 16, gap: 12, borderTopWidth: 0.5 }, footerBtn: { flex: 1, minHeight: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" }, cancelText: { fontSize: 15, fontWeight: "600" as any }, saveText: { color: "#fff", fontSize: 15, fontWeight: "700" as any },
});
