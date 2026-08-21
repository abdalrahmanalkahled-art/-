import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, ScrollView, Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CardActionModal } from "@/components/card-action-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SuccessModal } from "@/components/success-modal";
import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { useColors } from "@/hooks/use-colors";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { loadBrandRegionCatalog } from "@/lib/brand-region-repository";

interface MarketingTask {
  id: string;
  goalId: string;
  title: string;
  description: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed" | "delayed";
  assignedTo: string;
  createdAt: string;
}

interface MarketingGoal {
  id: string;
  title: string;
  brandName?: string;
  description: string;
  period: "monthly" | "quarterly" | "annual";
  startDate: string;
  endDate: string;
  kpi: string;
  targetValue: number;
  currentValue: number;
  completionPercentage: number;
  status: "on_track" | "delayed" | "completed" | "cancelled";
  tasks: MarketingTask[];
  createdAt: string;
}

const PERIOD_OPTIONS = [
  { value: "monthly", label: "شهري", color: "#3B82F6" },
  { value: "quarterly", label: "ربع سنوي", color: "#7C3AED" },
  { value: "annual", label: "سنوي", color: "#DC2626" },
];

const STATUS_OPTIONS = [
  { value: "on_track", label: "في المسار", color: "#10B981" },
  { value: "delayed", label: "متأخر", color: "#EF4444" },
  { value: "completed", label: "مكتمل", color: "#6B7280" },
  { value: "cancelled", label: "ملغي", color: "#9CA3AF" },
];

const TASK_STATUS = [
  { value: "pending", label: "معلق", color: "#F59E0B" },
  { value: "in_progress", label: "جاري", color: "#3B82F6" },
  { value: "completed", label: "مكتمل", color: "#10B981" },
  { value: "delayed", label: "متأخر", color: "#EF4444" },
];

const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIsoDate = (value: string) => value ? new Date(`${value}T12:00:00`) : null;

export default function GoalsModule() {
  const colors = useColors();
  const [goals, setGoals] = useState<MarketingGoal[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<MarketingGoal | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [goalActionTarget, setGoalActionTarget] = useState<MarketingGoal | null>(null);
  const [goalSuccess, setGoalSuccess] = useState({ visible: false, message: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [brandNames, setBrandNames] = useState<string[]>([]);
  const [showBrandOptions, setShowBrandOptions] = useState(false);
  const [showGoalDateRange, setShowGoalDateRange] = useState(false);
  const [showTaskDatePicker, setShowTaskDatePicker] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: "", brandName: "", description: "", period: "monthly" as MarketingGoal["period"],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "", kpi: "", targetValue: "", currentValue: "0", status: "on_track" as MarketingGoal["status"],
  });
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", dueDate: "", assignedTo: "", status: "pending" as MarketingTask["status"],
  });

  const loadData = useCallback(async () => {
    const data = await getItems<MarketingGoal>(STORAGE_KEYS.MARKETING_GOALS);
    setGoals(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setRefreshing(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadBrandOptions = useCallback(async () => {
    const catalog = await loadBrandRegionCatalog();
    setBrandNames(catalog.brands.filter((brand) => brand.isActive).map((brand) => brand.name));
  }, []);

  useEffect(() => { void loadBrandOptions(); }, [loadBrandOptions]);

  const filtered = filterPeriod === "all" ? goals : goals.filter((g) => g.period === filterPeriod);

  const handleSaveGoal = async () => {
    if (!goalForm.title.trim()) { Alert.alert("خطأ", "أدخل عنوان الهدف"); return; }
    if (!goalForm.brandName.trim()) { Alert.alert("خطأ", "اختر الماركة المرتبطة بالهدف"); return; }
    const allGoals = await getItems<MarketingGoal>(STORAGE_KEYS.MARKETING_GOALS);
    const target = parseFloat(goalForm.targetValue) || 0;
    const current = parseFloat(goalForm.currentValue) || 0;
    const completion = target > 0 ? Math.round((current / target) * 100) : 0;

    if (isEditing && selectedGoal) {
      // تعديل الهدف الموجود
      const updated = allGoals.map((g) =>
        g.id === selectedGoal.id
          ? {
              ...g,
              ...goalForm,
              targetValue: target,
              currentValue: current,
              completionPercentage: completion,
            }
          : g
      );
      await saveItems(STORAGE_KEYS.MARKETING_GOALS, updated);
    } else {
      // إنشاء هدف جديد
      const newGoal: MarketingGoal = {
        id: Date.now().toString(), ...goalForm,
        targetValue: target, currentValue: current,
        completionPercentage: completion, tasks: [],
        createdAt: new Date().toISOString(),
      };
      await saveItems(STORAGE_KEYS.MARKETING_GOALS, [...allGoals, newGoal]);
    }
    setShowGoalModal(false);
    setIsEditing(false);
    setSelectedGoal(null);
    await loadData();
    setGoalSuccess({ visible: true, message: isEditing ? "تم تحديث الهدف بنجاح" : "تمت إضافة الهدف بنجاح" });
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;
    const updated = goals.filter(g => g.id !== selectedGoal.id);
    setGoals(updated);
    await saveItems(STORAGE_KEYS.MARKETING_GOALS, updated);
    setShowDeleteConfirm(false);
    setSelectedGoal(null);
    setGoalSuccess({ visible: true, message: "تم حذف الهدف بنجاح" });
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim() || !selectedGoal) return;
    const allGoals = await getItems<MarketingGoal>(STORAGE_KEYS.MARKETING_GOALS);
    const newTask: MarketingTask = {
      id: Date.now().toString(), goalId: selectedGoal.id,
      ...taskForm, createdAt: new Date().toISOString(),
    };
    const updated = allGoals.map((g) =>
      g.id === selectedGoal.id ? { ...g, tasks: [...(g.tasks || []), newTask] } : g
    );
    await saveItems(STORAGE_KEYS.MARKETING_GOALS, updated);
    setShowTaskModal(false);
    setTaskForm({ title: "", description: "", dueDate: "", assignedTo: "", status: "pending" });
    await loadData();
    setGoalSuccess({ visible: true, message: "تمت إضافة المهمة بنجاح" });
  };

  const updateTaskStatus = async (goalId: string, taskId: string, status: MarketingTask["status"]) => {
    const allGoals = await getItems<MarketingGoal>(STORAGE_KEYS.MARKETING_GOALS);
    const updated = allGoals.map((g) => {
      if (g.id !== goalId) return g;
      const updatedTasks = (g.tasks || []).map((t) => t.id === taskId ? { ...t, status } : t);
      const completedCount = updatedTasks.filter((t) => t.status === "completed").length;
      const completion = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0;
      return { ...g, tasks: updatedTasks, completionPercentage: completion };
    });
    await saveItems(STORAGE_KEYS.MARKETING_GOALS, updated);
    loadData();
  };

  const getPeriodInfo = (p: string) => PERIOD_OPTIONS.find((o) => o.value === p) || PERIOD_OPTIONS[0];
  const getStatusInfo = (s: string) => STATUS_OPTIONS.find((o) => o.value === s) || STATUS_OPTIONS[0];
  const getTaskStatusInfo = (s: string) => TASK_STATUS.find((o) => o.value === s) || TASK_STATUS[0];

  const openEditGoal = (goal: MarketingGoal) => {
    setSelectedGoal(goal);
    setIsEditing(true);
    setGoalForm({
      title: goal.title,
      brandName: goal.brandName || "",
      description: goal.description,
      period: goal.period,
      startDate: goal.startDate,
      endDate: goal.endDate,
      kpi: goal.kpi,
      targetValue: goal.targetValue.toString(),
      currentValue: goal.currentValue.toString(),
      status: goal.status,
    });
    setShowGoalModal(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {[{ value: "all", label: "الكل" }, ...PERIOD_OPTIONS.map((p) => ({ value: p.value, label: p.label }))].map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterChip, filterPeriod === opt.value && { backgroundColor: colors.primary }]}
            onPress={() => setFilterPeriod(opt.value)}
          >
            <Text style={[styles.filterChipText, { color: filterPeriod === opt.value ? "#fff" : colors.muted }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
        onPress={() => {
          setIsEditing(false);
          setSelectedGoal(null);
          void loadBrandOptions();
          setGoalForm({ title: "", brandName: "", description: "", period: "monthly", startDate: new Date().toISOString().split("T")[0], endDate: "", kpi: "", targetValue: "", currentValue: "0", status: "on_track" });
          setShowGoalModal(true);
        }}
      >
        <MaterialIcons name="add" size={18} color="#fff" />
        <Text style={styles.addBtnText}>إضافة هدف</Text>
      </TouchableOpacity>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const periodInfo = getPeriodInfo(item.period);
          const statusInfo = getStatusInfo(item.status);
          return (
            <TouchableOpacity
              style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: "/goal-details", params: { id: item.id } })}
              onLongPress={() => setGoalActionTarget(item)}
              delayLongPress={350}
              activeOpacity={0.72}
              accessibilityLabel={`تفاصيل الهدف ${item.title}`}
              accessibilityHint="اضغط لعرض التفاصيل، أو اضغط مطولاً لفتح إجراءات التعديل والحذف"
            >
              <View style={styles.goalHeader}>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "20" }]}> 
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
                <View style={[styles.periodBadge, { backgroundColor: periodInfo.color + "20" }]}>
                  <Text style={[styles.periodText, { color: periodInfo.color }]}>{periodInfo.label}</Text>
                </View>
              </View>

              <Text style={[styles.goalTitle, { color: colors.foreground }]}>{item.title}</Text>

              {item.brandName ? (
                <View style={[styles.brandBadge, { backgroundColor: colors.primary + "18" }]}>
                  <MaterialIcons name="sell" size={14} color={colors.primary} />
                  <Text style={[styles.brandBadgeText, { color: colors.primary }]}>{item.brandName}</Text>
                </View>
              ) : null}

              {item.kpi ? <Text style={[styles.kpiText, { color: colors.muted }]}>KPI: {item.kpi}</Text> : null}

              <ProgressBar value={item.completionPercentage} label={`الإنجاز: ${item.currentValue}/${item.targetValue}`} />

              {/* Tasks */}
              {(item.tasks || []).length > 0 && (
                <View style={styles.tasksSection}>
                  <Text style={[styles.tasksTitle, { color: colors.foreground }]}>المهام ({item.tasks.length})</Text>
                  {item.tasks.slice(0, 3).map((task) => {
                    const tStatus = getTaskStatusInfo(task.status);
                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={[styles.taskItem, { borderLeftColor: tStatus.color }]}
                        onPress={() => {
                          const nextStatus = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "completed" : "pending";
                          updateTaskStatus(item.id, task.id, nextStatus as MarketingTask["status"]);
                        }}
                      >
                        <Text style={[styles.taskStatus, { color: tStatus.color }]}>{tStatus.label}</Text>
                        <Text style={[styles.taskTitle, { color: colors.foreground }]}>{task.title}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Add Task Button */}
              {selectedGoal?.id === item.id && (
                <TouchableOpacity
                  style={[styles.addTaskBtn, { borderColor: colors.primary }]}
                  onPress={() => {
                    setSelectedGoal(item);
                    setTaskForm({ title: "", description: "", dueDate: "", assignedTo: "", status: "pending" });
                    setShowTaskModal(true);
                  }}
                >
                  <MaterialIcons name="add" size={16} color={colors.primary} />
                  <Text style={[styles.addTaskBtnText, { color: colors.primary }]}>إضافة مهمة</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="flag" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد أهداف</Text>
          </View>
        }
      />

      {/* Goal Modal */}
      <FloatingFormModal visible={showGoalModal} onClose={() => { setShowGoalModal(false); setIsEditing(false); setSelectedGoal(null); }} backgroundColor={colors.background}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, backgroundColor: colors.background }}
          >
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => {
                  setShowGoalModal(false);
                  setIsEditing(false);
                  setSelectedGoal(null);
                }}>
                  <MaterialIcons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {isEditing ? "تعديل الهدف" : "هدف جديد"}
                </Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="always" keyboardDismissMode="none" nestedScrollEnabled showsVerticalScrollIndicator>
                {[
                  { key: "title", label: "عنوان الهدف *", placeholder: "أدخل عنوان الهدف" },
                  { key: "brandName", label: "الماركة المرتبطة", placeholder: "اختر الماركة", picker: true },
                  { key: "description", label: "الوصف", placeholder: "وصف الهدف" },
                  { key: "kpi", label: "مؤشر الأداء (KPI)", placeholder: "مثال: نسبة التواجد" },
                  { key: "targetValue", label: "القيمة المستهدفة", placeholder: "100", keyboardType: "numeric" as const },
                  { key: "currentValue", label: "القيمة الحالية", placeholder: "0", keyboardType: "numeric" as const },
                ].map((field) => (
                  <View key={field.key} style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>{field.label}</Text>
                    {field.picker ? (
                      <>
                        <TouchableOpacity
                          style={[styles.formInput, styles.brandPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => {
                            void loadBrandOptions();
                            setShowBrandOptions((value) => !value);
                          }}
                        >
                          <MaterialIcons name="expand-more" size={22} color={colors.muted} />
                          <Text style={[styles.brandPickerText, { color: goalForm.brandName ? colors.foreground : colors.muted }]}>
                            {goalForm.brandName || field.placeholder}
                          </Text>
                        </TouchableOpacity>
                        {showBrandOptions ? (
                          <ScrollView
                            style={[styles.brandOptions, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="always"
                            keyboardDismissMode="none"
                            showsVerticalScrollIndicator
                            onStartShouldSetResponderCapture={() => true}
                            onMoveShouldSetResponderCapture={() => true}
                            onResponderTerminationRequest={() => false}
                          >
                            {brandNames.map((brandName) => (
                              <TouchableOpacity
                                key={brandName}
                                style={[styles.brandOption, goalForm.brandName === brandName && { backgroundColor: colors.primary + "12" }]}
                                onPress={() => { setGoalForm((form) => ({ ...form, brandName })); setShowBrandOptions(false); }}
                              >
                                <MaterialIcons name={goalForm.brandName === brandName ? "check-circle" : "sell"} size={17} color={goalForm.brandName === brandName ? colors.primary : colors.muted} />
                                <Text style={[styles.brandOptionText, { color: colors.foreground }]}>{brandName}</Text>
                              </TouchableOpacity>
                            ))}
                            {!brandNames.length ? <Text style={[styles.brandEmptyText, { color: colors.muted }]}>أضف ماركة أولاً من «الماركات والمناطق».</Text> : null}
                          </ScrollView>
                        ) : null}
                      </>
                    ) : (
                      <TextInput
                        style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                        value={(goalForm as any)[field.key]}
                        onChangeText={(v) => setGoalForm((f) => ({ ...f, [field.key]: v }))}
                        placeholder={field.placeholder}
                        placeholderTextColor={colors.muted}
                        keyboardType={field.keyboardType || "default"}
                        textAlign="right"
                      />
                    )}
                  </View>
                ))}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>فترة الهدف</Text>
                  <TouchableOpacity style={[styles.formInput, styles.brandPicker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowGoalDateRange(true)}>
                    <MaterialIcons name="date-range" size={21} color={colors.primary} />
                    <Text style={[styles.brandPickerText, { color: goalForm.startDate && goalForm.endDate ? colors.foreground : colors.muted }]}>{goalForm.startDate && goalForm.endDate ? `${goalForm.startDate} ← ${goalForm.endDate}` : "اختر فترة الهدف"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>الفترة الزمنية</Text>
                  <View style={styles.periodOptions}>
                    {PERIOD_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.periodOption, goalForm.period === opt.value && { backgroundColor: opt.color }]}
                        onPress={() => setGoalForm((f) => ({ ...f, period: opt.value as MarketingGoal["period"] }))}
                      >
                        <Text style={[styles.periodOptionText, { color: goalForm.period === opt.value ? "#fff" : colors.muted }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>الحالة</Text>
                  <View style={styles.statusOptions}>
                    {STATUS_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.statusOption, goalForm.status === opt.value && { backgroundColor: opt.color }]}
                        onPress={() => setGoalForm((f) => ({ ...f, status: opt.value as MarketingGoal["status"] }))}
                      >
                        <Text style={[styles.statusOptionText, { color: goalForm.status === opt.value ? "#fff" : colors.muted }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={[styles.footerBtn, styles.cancelBtn, { backgroundColor: colors.muted + "20" }]}
                  onPress={() => {
                    setShowGoalModal(false);
                    setIsEditing(false);
                    setSelectedGoal(null);
                  }}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerBtn, styles.saveFooterBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowSaveConfirm(true)}
                >
                  <Text style={styles.saveBtnText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </FloatingFormModal>
      <DateRangePickerModal
        visible={showGoalDateRange}
        startDate={fromIsoDate(goalForm.startDate)}
        endDate={fromIsoDate(goalForm.endDate)}
        title="فترة الهدف"
        onCancel={() => setShowGoalDateRange(false)}
        onConfirm={(startDate, endDate) => {
          setGoalForm((current) => ({ ...current, startDate: toIsoDate(startDate), endDate: toIsoDate(endDate) }));
          setShowGoalDateRange(false);
        }}
      />

      {/* Task Modal */}
      <FloatingFormModal visible={showTaskModal} onClose={() => setShowTaskModal(false)} backgroundColor={colors.background}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, backgroundColor: colors.background }}
          >
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowTaskModal(false)}>
                  <MaterialIcons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>مهمة جديدة</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                {[
                  { key: "title", label: "عنوان المهمة *", placeholder: "أدخل عنوان المهمة" },
                  { key: "description", label: "الوصف", placeholder: "وصف المهمة" },
                  { key: "assignedTo", label: "المسؤول", placeholder: "اسم المسؤول" },
                ].map((field) => (
                  <View key={field.key} style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>{field.label}</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                      value={(taskForm as any)[field.key]}
                      onChangeText={(v) => setTaskForm((f) => ({ ...f, [field.key]: v }))}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.muted}
                      textAlign="right"
                    />
                  </View>
                ))}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>تاريخ الاستحقاق</Text>
                  <TouchableOpacity style={[styles.formInput, styles.brandPicker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowTaskDatePicker(true)}>
                    <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                    <Text style={[styles.brandPickerText, { color: taskForm.dueDate ? colors.foreground : colors.muted }]}>{taskForm.dueDate || "اختر تاريخ الاستحقاق"}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={[styles.footerBtn, styles.cancelBtn, { backgroundColor: colors.muted + "20" }]}
                  onPress={() => setShowTaskModal(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerBtn, styles.saveFooterBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveTask}
                >
                  <Text style={styles.saveBtnText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </FloatingFormModal>
      <DateRangePickerModal
        visible={showTaskDatePicker}
        startDate={fromIsoDate(taskForm.dueDate)}
        endDate={fromIsoDate(taskForm.dueDate)}
        selectionMode="single"
        title="تاريخ استحقاق المهمة"
        onCancel={() => setShowTaskDatePicker(false)}
        onConfirm={(date) => {
          setTaskForm((current) => ({ ...current, dueDate: toIsoDate(date) }));
          setShowTaskDatePicker(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showSaveConfirm}
        title={isEditing ? "حفظ تعديلات الهدف" : "تأكيد إنشاء الهدف"}
        message={isEditing ? "هل تريد حفظ التعديلات التي أجريتها على هذا الهدف؟" : "هل تريد إنشاء هذا الهدف ضمن الخطة التسويقية؟"}
        confirmText="حفظ"
        cancelText="إلغاء"
        icon="check-circle"
        onConfirm={() => {
          setShowSaveConfirm(false);
          void handleSaveGoal();
        }}
        onCancel={() => setShowSaveConfirm(false)}
      />
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="حذف الهدف"
        message={`هل أنت متأكد من حذف الهدف "${selectedGoal?.title}"؟ سيتم حذف جميع المهام المرتبطة به أيضاً.`}
        confirmText="حذف"
        cancelText="إلغاء"
        isDangerous={true}
        icon="delete"
        onConfirm={handleDeleteGoal}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedGoal(null);
        }}
      />
      <CardActionModal
        visible={Boolean(goalActionTarget)}
        title={goalActionTarget?.title || "إجراءات الهدف"}
        description="اضغط الإجراء المطلوب لهذا الهدف"
        onClose={() => setGoalActionTarget(null)}
        actions={goalActionTarget ? [
          {
            id: "edit",
            label: "تعديل الهدف",
            icon: "edit",
            onPress: () => {
              const target = goalActionTarget;
              setGoalActionTarget(null);
              openEditGoal(target);
            },
          },
          {
            id: "delete",
            label: "حذف الهدف",
            icon: "delete-outline",
            tone: "danger",
            onPress: () => {
              setSelectedGoal(goalActionTarget);
              setGoalActionTarget(null);
              setShowDeleteConfirm(true);
            },
          },
        ] : []}
      />
      <SuccessModal visible={goalSuccess.visible} message={goalSuccess.message} onClose={() => setGoalSuccess({ visible: false, message: "" })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { maxHeight: 44 },
  filterContent: { paddingHorizontal: 12, gap: 8, alignItems: "center" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#E5E7EB" },
  filterChipText: { fontSize: 12, fontWeight: "500" as any },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", margin: 12, padding: 12, borderRadius: 12, gap: 6 },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" as any },
  list: { paddingHorizontal: 12, gap: 10, paddingBottom: 20 },
  goalCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  goalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
  goalTitle: { fontSize: 15, fontWeight: "700" as any, textAlign: "right" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "600" as any },
  periodBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  periodText: { fontSize: 11, fontWeight: "600" as any },
  kpiText: { fontSize: 12, textAlign: "right" },
  brandBadge: { flexDirection: "row-reverse", alignSelf: "flex-end", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  brandBadgeText: { fontSize: 11, fontWeight: "600" as any },
  tasksSection: { gap: 6 },
  tasksTitle: { fontSize: 13, fontWeight: "600" as any, textAlign: "right" },
  taskItem: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: 8, borderLeftWidth: 3, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.03)" },
  taskTitle: { fontSize: 13, flex: 1, textAlign: "right" },
  taskStatus: { fontSize: 11, fontWeight: "600" as any },
  addTaskBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 8, borderRadius: 8, borderWidth: 1, gap: 4 },
  addTaskBtnText: { fontSize: 13, fontWeight: "600" as any },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 17, fontWeight: "700" as any },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontWeight: "600" as any },
  modalContent: { flex: 1 }, modalScrollContent: { padding: 16, paddingBottom: 28 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600" as any, marginBottom: 8, textAlign: "right" },
  formInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  brandPicker: { minHeight: 46, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandPickerText: { flex: 1, textAlign: "right", fontSize: 15 },
  brandOptions: { maxHeight: 220, marginTop: 6, borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  brandOption: { minHeight: 42, flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-start", gap: 8, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(100,116,139,0.2)" },
  brandOptionText: { fontSize: 13, fontWeight: "500" as any, textAlign: "right" },
  brandEmptyText: { fontSize: 12, textAlign: "right", padding: 12 },
  periodOptions: { flexDirection: "row", gap: 8 },
  periodOption: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#E5E7EB", alignItems: "center" },
  periodOptionText: { fontSize: 13, fontWeight: "600" as any },
  statusOptions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusOption: { flex: 1, minWidth: "48%", paddingVertical: 10, borderRadius: 10, backgroundColor: "#E5E7EB", alignItems: "center" },
  statusOptionText: { fontSize: 13, fontWeight: "600" as any },
  modalFooter: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 0.5, justifyContent: "flex-end" },
  footerBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cancelBtn: {},
  cancelBtnText: { fontSize: 15, fontWeight: "600" as any },
  saveFooterBtn: {},
});
