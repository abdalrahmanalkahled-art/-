import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CardActionModal } from "@/components/card-action-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SuccessModal } from "@/components/success-modal";
import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { MoreModuleEmptyState, MoreModuleFilterChips } from "@/components/more-module-ui";
import { SkeletonList } from "@/components/ui/skeleton-loading";
import { AnimatedCard } from "@/components/animated-card";
import { useColors } from "@/hooks/use-colors";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { loadBrandRegionCatalog } from "@/lib/brand-region-repository";
import { ReportFab } from "@/components/report-fab";
import { exportTabReportExcel, exportTabReportPdf } from "@/lib/tab-report-exporter";
import { getGoalImpactMetrics } from "@/lib/goal-impact-metrics";
import { deriveGoalPeriod, getEffectiveGoalStatus, goalPeriodLabel, type GoalPeriod, type StoredGoalStatus } from "@/lib/goal-lifecycle";
import { PptxReportSettingsModal } from "@/components/pptx-report-settings-modal";
import { MARKETING_PLAN_PPTX_SECTIONS, MARKETING_PLAN_PPTX_SETTINGS_KEY, exportMarketingPlanPptx, type MarketingPlanPptxEvent } from "@/lib/marketing-plan-pptx-exporter";
import { createDefaultPptxReportSettings, loadPptxReportSettings, savePptxReportSettings, type PptxReportSettings } from "@/lib/pptx-report-settings";

interface MarketingGoal {
  id: string;
  title: string;
  brandName?: string;
  description: string;
  period: GoalPeriod;
  startDate: string;
  endDate: string;
  kpi: string;
  targetValue: number;
  currentValue: number;
  completionPercentage: number;
  status: StoredGoalStatus;
  createdAt: string;
}

const PERIOD_OPTIONS = [
  { value: "monthly", label: "شهري", color: "#3B82F6" },
  { value: "quarterly", label: "ربع سنوي", color: "#7C3AED" },
  { value: "semiannual", label: "نصف سنوي", color: "#0891B2" },
  { value: "annual", label: "سنوي", color: "#DC2626" },
];

const STATUS_OPTIONS = [
  { value: "on_track", label: "في المسار", color: "#10B981" },
  { value: "delayed", label: "متأخر", color: "#EF4444" },
  { value: "completed", label: "مكتمل", color: "#6B7280" },
  { value: "expired", label: "منتهٍ", color: "#64748B" },
  { value: "cancelled", label: "ملغي", color: "#9CA3AF" },
];

const GOAL_REPORT_SETTINGS_KEY = "madar_marketing_goals_report_settings";
type GoalReportSettings = { includeProgress: boolean; includeEvents: boolean; includeBeneficiaries: boolean; includeGifts: boolean; includeRegions: boolean; };
const DEFAULT_GOAL_REPORT_SETTINGS: GoalReportSettings = { includeProgress: true, includeEvents: true, includeBeneficiaries: true, includeGifts: true, includeRegions: true };
const DEFAULT_MARKETING_PLAN_PPTX_SETTINGS = createDefaultPptxReportSettings("عرض الخطة التسويقية", MARKETING_PLAN_PPTX_SECTIONS);

const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIsoDate = (value: string) => value ? new Date(`${value}T12:00:00`) : null;
type LegacyGoalRecord = MarketingGoal & { tasks?: unknown };
const removeLegacyTasks = (goal: LegacyGoalRecord): MarketingGoal => {
  const { tasks: _legacyTasks, ...cleanGoal } = goal;
  return cleanGoal;
};

export default function GoalsModule() {
  const colors = useColors();
  const [goals, setGoals] = useState<MarketingGoal[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
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
  const [exporting, setExporting] = useState<"pdf" | "excel" | "pptx" | null>(null);
  const [showReportSettings, setShowReportSettings] = useState(false);
  const [showPptxSettings, setShowPptxSettings] = useState(false);
  const [reportSettings, setReportSettings] = useState<GoalReportSettings>(DEFAULT_GOAL_REPORT_SETTINGS);
  const [pptxSettings, setPptxSettings] = useState<PptxReportSettings>(DEFAULT_MARKETING_PLAN_PPTX_SETTINGS);
  const [goalForm, setGoalForm] = useState({
    title: "", brandName: "", description: "", period: "monthly" as MarketingGoal["period"],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "", kpi: "", targetValue: "", currentValue: "0", status: "on_track" as MarketingGoal["status"],
  });

  const loadData = useCallback(async () => {
    try {
      const storedGoals = await getItems<LegacyGoalRecord>(STORAGE_KEYS.MARKETING_GOALS);
      const data = storedGoals.map(removeLegacyTasks);
      if (storedGoals.some((goal) => Object.prototype.hasOwnProperty.call(goal, "tasks"))) await saveItems(STORAGE_KEYS.MARKETING_GOALS, data);
      setGoals(data.map((goal) => ({ ...goal, period: deriveGoalPeriod(goal.startDate, goal.endDate) })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } finally { setRefreshing(false); setIsInitialLoading(false); }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  const loadBrandOptions = useCallback(async () => {
    const catalog = await loadBrandRegionCatalog();
    setBrandNames(catalog.brands.filter((brand) => brand.isActive).map((brand) => brand.name));
  }, []);

  useEffect(() => { void loadBrandOptions(); }, [loadBrandOptions]);
  useEffect(() => { void getItems<GoalReportSettings>(GOAL_REPORT_SETTINGS_KEY).then((saved) => setReportSettings({ ...DEFAULT_GOAL_REPORT_SETTINGS, ...(saved[0] || {}) })); }, []);
  useEffect(() => { void loadPptxReportSettings(MARKETING_PLAN_PPTX_SETTINGS_KEY, DEFAULT_MARKETING_PLAN_PPTX_SETTINGS).then(setPptxSettings); }, []);

  const filtered = filterPeriod === "all" ? goals : goals.filter((g) => g.period === filterPeriod);

  const handleSaveGoal = async () => {
    if (!goalForm.title.trim()) { Alert.alert("خطأ", "أدخل عنوان الهدف"); return; }
    if (!goalForm.brandName.trim()) { Alert.alert("خطأ", "اختر الماركة المرتبطة بالهدف"); return; }
    const allGoals = (await getItems<LegacyGoalRecord>(STORAGE_KEYS.MARKETING_GOALS)).map(removeLegacyTasks);
    const target = parseFloat(goalForm.targetValue) || 0;
    const current = parseFloat(goalForm.currentValue) || 0;
    const completion = target > 0 ? Math.round((current / target) * 100) : 0;
    const period = deriveGoalPeriod(goalForm.startDate, goalForm.endDate);

    if (isEditing && selectedGoal) {
      // تعديل الهدف الموجود
      const updated = allGoals.map((g) =>
        g.id === selectedGoal.id
          ? {
              ...g,
              ...goalForm,
              period,
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
        id: Date.now().toString(), ...goalForm, period,
        targetValue: target, currentValue: current,
        completionPercentage: completion,
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

  const getPeriodInfo = (p: string) => PERIOD_OPTIONS.find((o) => o.value === p) || PERIOD_OPTIONS[0];
  const getStatusInfo = (s: string) => STATUS_OPTIONS.find((o) => o.value === s) || STATUS_OPTIONS[0];

  const openEditGoal = (goal: MarketingGoal) => {
    setSelectedGoal(goal);
    setIsEditing(true);
    setGoalForm({
      title: goal.title,
      brandName: goal.brandName || "",
      description: goal.description,
      period: deriveGoalPeriod(goal.startDate, goal.endDate),
      startDate: goal.startDate,
      endDate: goal.endDate,
      kpi: goal.kpi,
      targetValue: goal.targetValue.toString(),
      currentValue: goal.currentValue.toString(),
      status: goal.status,
    });
    setShowGoalModal(true);
  };

  const openCreateGoal = () => {
    setIsEditing(false);
    setSelectedGoal(null);
    void loadBrandOptions();
    setGoalForm({ title: "", brandName: "", description: "", period: "monthly", startDate: new Date().toISOString().split("T")[0], endDate: "", kpi: "", targetValue: "", currentValue: "0", status: "on_track" });
    setShowGoalModal(true);
  };

  const updateReportSetting = async (key: keyof GoalReportSettings) => {
    const next = { ...reportSettings, [key]: !reportSettings[key] };
    setReportSettings(next);
    await saveItems(GOAL_REPORT_SETTINGS_KEY, [next]);
  };

  const handleExportGoals = async (format: "pdf" | "excel" | "pptx") => {
    setExporting(format);
    try {
      const events = await getItems<any>(STORAGE_KEYS.EVENTS);
      const scope = filtered;
      const allScopedEvents = events.filter((event) => scope.some((goal) => goal.id === event.goalId));
      const totalImpact = getGoalImpactMetrics(allScopedEvents);
      if (format === "pptx") { await exportMarketingPlanPptx(scope, events as MarketingPlanPptxEvent[], pptxSettings); return; }
      const columns = ["الهدف", "الماركة", "الفترة", "الحالة", ...(reportSettings.includeProgress ? ["الإنجاز"] : []), ...(reportSettings.includeEvents ? ["فعاليات مرتبطة"] : []), ...(reportSettings.includeBeneficiaries ? ["المستفيدون"] : []), ...(reportSettings.includeGifts ? ["الهدايا"] : []), ...(reportSettings.includeRegions ? ["المناطق المغطاة"] : [])];
      const summary: Record<string, unknown> = { الهدف: "إجمالي الخطة ضمن النطاق", الماركة: "—", الفترة: "—", الحالة: "ملخص" };
      if (reportSettings.includeProgress) summary.الإنجاز = "—";
      if (reportSettings.includeEvents) summary["فعاليات مرتبطة"] = allScopedEvents.length;
      if (reportSettings.includeBeneficiaries) summary.المستفيدون = totalImpact.totalBeneficiaries;
      if (reportSettings.includeGifts) summary.الهدايا = totalImpact.totalGifts;
      if (reportSettings.includeRegions) summary["المناطق المغطاة"] = totalImpact.coveredRegionCount;
      const rows = [summary, ...scope.map((goal) => {
        const linkedEvents = events.filter((event) => event.goalId === goal.id);
        const impact = getGoalImpactMetrics(linkedEvents);
        const row: Record<string, unknown> = { الهدف: goal.title, الماركة: goal.brandName || "—", الفترة: `${goalPeriodLabel(deriveGoalPeriod(goal.startDate, goal.endDate))} · ${goal.startDate || "—"} ← ${goal.endDate || "—"}`, الحالة: getStatusInfo(getEffectiveGoalStatus(goal)).label };
        if (reportSettings.includeProgress) row.الإنجاز = `${Math.round(goal.completionPercentage || 0)}%`;
        if (reportSettings.includeEvents) row["فعاليات مرتبطة"] = linkedEvents.length;
        if (reportSettings.includeBeneficiaries) row.المستفيدون = impact.totalBeneficiaries;
        if (reportSettings.includeGifts) row.الهدايا = impact.totalGifts;
        if (reportSettings.includeRegions) row["المناطق المغطاة"] = impact.coveredRegionCount;
        return row;
      })];
      const report = { title: "تقرير الخطة التسويقية", filename: "الخطة_التسويقية", columns, rows };
      if (format === "pdf") await exportTabReportPdf(report); else await exportTabReportExcel(report);
    } finally { setExporting(null); }
  };

  return (
    <View style={styles.container}>
      <MoreModuleFilterChips items={[{ id: "all", label: "الكل" }, ...PERIOD_OPTIONS.map((period) => ({ id: period.value, label: period.label }))]} selectedId={filterPeriod} onSelect={(id) => setFilterPeriod(id as typeof filterPeriod)} />

      {isInitialLoading ? <SkeletonList rows={4} /> : <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const periodInfo = getPeriodInfo(item.period);
          const statusInfo = getStatusInfo(getEffectiveGoalStatus(item));
          return (
            <AnimatedCard
              style={[styles.goalCard, { marginHorizontal: 0, marginVertical: 0 }]}
              onPress={() => router.push({ pathname: "/goal-details", params: { id: item.id } })}
              onLongPress={() => setGoalActionTarget(item)}
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

            </AnimatedCard>
          );
        }}
        ListEmptyComponent={<MoreModuleEmptyState icon="flag" title="لا توجد أهداف" description="أضف هدفاً من الزر العائم لتبدأ الخطة التسويقية." />}
      />}

      {/* Goal Modal */}
      <FloatingFormModal visible={showGoalModal} onClose={() => { setShowGoalModal(false); setIsEditing(false); setSelectedGoal(null); }} backgroundColor={colors.background} isLoading={isInitialLoading}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
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
                <View style={[styles.periodSummary, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
                  <View style={[styles.periodSummaryIcon, { backgroundColor: colors.primary + "18" }]}><MaterialIcons name="timeline" size={19} color={colors.primary} /></View>
                  <View style={styles.periodSummaryCopy}><Text style={[styles.periodSummaryLabel, { color: colors.muted }]}>المسار المحتسب تلقائياً</Text><Text style={[styles.periodSummaryValue, { color: colors.foreground }]}>{goalPeriodLabel(deriveGoalPeriod(goalForm.startDate, goalForm.endDate))}</Text></View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>الحالة</Text>
                  <View style={styles.statusOptions}>
                    {STATUS_OPTIONS.filter((opt) => opt.value !== "expired").map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.statusOption, goalForm.status === opt.value && { backgroundColor: opt.color }]}
                        onPress={() => setGoalForm((f) => ({ ...f, status: opt.value as StoredGoalStatus }))}
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
        </SafeAreaView>
      </FloatingFormModal>
      <DateRangePickerModal
        visible={showGoalDateRange}
        startDate={fromIsoDate(goalForm.startDate)}
        endDate={fromIsoDate(goalForm.endDate)}
        title="فترة الهدف"
        onCancel={() => setShowGoalDateRange(false)}
        onConfirm={(startDate, endDate) => {
          const nextStartDate = toIsoDate(startDate);
          const nextEndDate = toIsoDate(endDate);
          setGoalForm((current) => ({ ...current, startDate: nextStartDate, endDate: nextEndDate, period: deriveGoalPeriod(nextStartDate, nextEndDate) }));
          setShowGoalDateRange(false);
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
        message={`هل أنت متأكد من حذف الهدف "${selectedGoal?.title}"؟ سيتم حذف الفعاليات المرتبطة به أيضاً.`}
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
      <FloatingFormModal visible={showReportSettings} onClose={() => setShowReportSettings(false)} backgroundColor={colors.background} compactHeight>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={() => setShowReportSettings(false)}><MaterialIcons name="close" size={24} color={colors.foreground} /></TouchableOpacity><Text style={[styles.modalTitle, { color: colors.foreground }]}>إعدادات تقرير الخطة</Text><View style={{ width: 24 }} /></View>
            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
              <Text style={[styles.reportSettingsHint, { color: colors.muted }]}>تُحسب المؤشرات من جميع الفعاليات المرتبطة بالأهداف الظاهرة ضمن التصفية الحالية.</Text>
              {[
                ["includeProgress", "تقدم الأهداف", "يعرض نسبة الإنجاز لكل هدف"],
                ["includeEvents", "عدد الفعاليات المرتبطة", "يجمع الفعاليات المسجلة لكل هدف"],
                ["includeBeneficiaries", "إجمالي المستفيدين", "يساوي مجموع الحضور في الفعاليات"],
                ["includeGifts", "إجمالي الهدايا", "يساوي الهدايا الموزعة في الفعاليات"],
                ["includeRegions", "المناطق المغطاة", "عدد المناطق الفريدة للفعاليات المرتبطة"],
              ].map(([key, title, detail]) => <TouchableOpacity key={key} onPress={() => void updateReportSetting(key as keyof GoalReportSettings)} style={[styles.reportSettingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name={reportSettings[key as keyof GoalReportSettings] ? "check-circle" : "radio-button-unchecked"} size={22} color={reportSettings[key as keyof GoalReportSettings] ? colors.primary : colors.muted} /><View style={styles.reportSettingCopy}><Text style={[styles.reportSettingTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.reportSettingDetail, { color: colors.muted }]}>{detail}</Text></View></TouchableOpacity>)}
            </ScrollView>
          </View>
        </SafeAreaView>
      </FloatingFormModal>
      <PptxReportSettingsModal visible={showPptxSettings} title="إعدادات PowerPoint للخطة" description="تتحكم في العرض التقديمي للخطة فقط، ولا تغير إعدادات PDF أو Excel." sectionOptions={MARKETING_PLAN_PPTX_SECTIONS} settings={pptxSettings} onSave={async (nextSettings) => { await savePptxReportSettings(MARKETING_PLAN_PPTX_SETTINGS_KEY, nextSettings); setPptxSettings(nextSettings); setShowPptxSettings(false); }} onClose={() => setShowPptxSettings(false)} />
      <ReportFab module="goals" addLabel="إضافة هدف" onAdd={openCreateGoal} onSettings={() => setShowReportSettings(true)} onPptxSettings={() => setShowPptxSettings(true)} onPptxExport={() => void handleExportGoals("pptx")} pptxExporting={exporting === "pptx"} onExport={(format) => void handleExportGoals(format)} exporting={exporting === "pptx" ? null : exporting} />
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
  list: { paddingHorizontal: 12, gap: 10, paddingBottom: 104 },
  goalCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  goalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
  goalTitle: { fontSize: 15, fontWeight: "700" as any, textAlign: "right" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "600" as any },
  periodBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  periodText: { fontSize: 11, fontWeight: "600" as any },
  kpiText: { fontSize: 12, textAlign: "right" },
  brandBadge: { flexDirection: "row", alignSelf: "flex-end", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
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
  brandOption: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 8, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(100,116,139,0.2)" },
  brandOptionText: { fontSize: 13, fontWeight: "500" as any, textAlign: "right" },
  brandEmptyText: { fontSize: 12, textAlign: "right", padding: 12 },
  periodSummary: { minHeight: 64, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, marginBottom: 16 },
  periodSummaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  periodSummaryCopy: { flex: 1, alignItems: "flex-end" },
  periodSummaryLabel: { fontSize: 11, textAlign: "right" },
  periodSummaryValue: { marginTop: 2, fontSize: 14, fontWeight: "800" as any, textAlign: "right" },
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
  reportSettingsHint: { fontSize: 12, textAlign: "right", lineHeight: 19, marginBottom: 12 },
  reportSettingRow: { minHeight: 68, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 },
  reportSettingCopy: { flex: 1, alignItems: "flex-end" },
  reportSettingTitle: { fontSize: 13, fontWeight: "800" as any, textAlign: "right" },
  reportSettingDetail: { fontSize: 11, textAlign: "right", marginTop: 3, lineHeight: 16 },
});
