import { useEffect, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/use-colors";
import { ModalMotion } from "@/components/modal-motion";
import {
  type DashboardChartId,
  type DashboardQuickActionId,
  type DashboardSectionId,
  type DashboardSettings,
} from "@/lib/dashboard-settings-model";

interface Option<T extends string> {
  id: T;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

const SECTION_OPTIONS: Option<DashboardSectionId>[] = [
  { id: "dailyFocus", title: "ملخص اليوم", subtitle: "تحية اليوم والميزانية الحالية", icon: "today", color: "#2563EB" },
  { id: "metrics", title: "المؤشرات الأساسية", subtitle: "الفعاليات والمحلات والاستبيانات والتواجد", icon: "insights", color: "#7C3AED" },
  { id: "charts", title: "مخططات المتابعة", subtitle: "عرض المخططات التي تختارها أدناه", icon: "show-chart", color: "#0E9F6E" },
  { id: "alerts", title: "تنبيهات اليوم", subtitle: "المخزون والمهام والفعاليات", icon: "notifications-active", color: "#D97706" },
  { id: "quickActions", title: "إجراءات سريعة", subtitle: "اختصارات الإدخال الميداني", icon: "bolt", color: "#DB2777" },
  { id: "goals", title: "الأولويات والأهداف", subtitle: "تقدم الخطة التسويقية", icon: "flag", color: "#0891B2" },
  { id: "activity", title: "آخر النشاطات", subtitle: "الزيارات والفعاليات الأخيرة", icon: "history", color: "#64748B" },
];

const CHART_OPTIONS: Option<DashboardChartId>[] = [
  { id: "presence", title: "اتجاه التواجد", subtitle: "متوسط التواجد في أحدث الاستبيانات", icon: "trending-up", color: "#0E9F6E" },
  { id: "activity", title: "النشاط الميداني", subtitle: "توزيع الفعاليات والمحلات والاستبيانات", icon: "bar-chart", color: "#7C3AED" },
];

const QUICK_ACTION_OPTIONS: Option<DashboardQuickActionId>[] = [
  { id: "survey", title: "استبيان", subtitle: "بدء استبيان ميداني جديد", icon: "assignment-add", color: "#0E9F6E" },
  { id: "event", title: "فعالية", subtitle: "إضافة فعالية ميدانية", icon: "add-circle", color: "#2563EB" },
  { id: "store", title: "محل", subtitle: "إضافة محل جديد", icon: "storefront", color: "#7C3AED" },
  { id: "dailyReport", title: "تقرير يومي", subtitle: "إنشاء تقرير نشاط اليوم", icon: "summarize", color: "#D97706" },
];

interface DashboardCustomizationSheetProps {
  visible: boolean;
  value: DashboardSettings;
  onClose: () => void;
  onSave: (settings: DashboardSettings) => void;
}

export function DashboardCustomizationSheet({ visible, value, onClose, onSave }: DashboardCustomizationSheetProps) {
  const colors = useColors();
  const [draft, setDraft] = useState<DashboardSettings>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);

  const toggleSection = (id: DashboardSectionId) => {
    setDraft((current) => {
      const enabled = current.enabledSections.includes(id);
      if (enabled && current.enabledSections.length === 1) return current;
      return { ...current, enabledSections: enabled ? current.enabledSections.filter((item) => item !== id) : [...current.enabledSections, id] };
    });
  };

  const toggleChart = (id: DashboardChartId) => {
    setDraft((current) => ({
      ...current,
      enabledCharts: current.enabledCharts.includes(id) ? current.enabledCharts.filter((item) => item !== id) : [...current.enabledCharts, id],
    }));
  };
  const toggleQuickAction = (id: DashboardQuickActionId) => {
    setDraft((current) => {
      const enabled = current.enabledQuickActions.includes(id);
      if (enabled && current.enabledQuickActions.length === 1) return current;
      return { ...current, enabledQuickActions: enabled ? current.enabledQuickActions.filter((item) => item !== id) : [...current.enabledQuickActions, id] };
    });
  };

  const moveSection = (id: DashboardSectionId, direction: -1 | 1) => {
    setDraft((current) => {
      const currentIndex = current.enabledSections.indexOf(id);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.enabledSections.length) return current;
      const enabledSections = [...current.enabledSections];
      [enabledSections[currentIndex], enabledSections[nextIndex]] = [enabledSections[nextIndex], enabledSections[currentIndex]];
      return { ...current, enabledSections };
    });
  };

  const orderedOptions = draft.enabledSections.map((id) => SECTION_OPTIONS.find((item) => item.id === id)).filter(Boolean) as Option<DashboardSectionId>[];

  return <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <View style={styles.overlay}>
      <ModalMotion visible={visible}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}><MaterialIcons name="close" size={21} color={colors.foreground} /></TouchableOpacity>
            <View style={styles.headerText}><Text style={[styles.title, { color: colors.foreground }]}>تخصيص الشاشة الرئيسية</Text><Text style={[styles.subtitle, { color: colors.muted }]}>اختر ما يهمك ورتّبه كما تريد</Text></View>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + "18" }]}><MaterialIcons name="dashboard-customize" size={21} color={colors.primary} /></View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>ترتيب الأقسام الظاهرة</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {orderedOptions.map((option, index) => <View key={option.id} style={[styles.optionRow, index < orderedOptions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <View style={styles.orderActions}>
                  <TouchableOpacity disabled={index === 0} onPress={() => moveSection(option.id, -1)} style={[styles.orderButton, { backgroundColor: colors.background, opacity: index === 0 ? 0.36 : 1 }]}><MaterialIcons name="keyboard-arrow-up" size={18} color={colors.foreground} /></TouchableOpacity>
                  <TouchableOpacity disabled={index === orderedOptions.length - 1} onPress={() => moveSection(option.id, 1)} style={[styles.orderButton, { backgroundColor: colors.background, opacity: index === orderedOptions.length - 1 ? 0.36 : 1 }]}><MaterialIcons name="keyboard-arrow-down" size={18} color={colors.foreground} /></TouchableOpacity>
                </View>
                <View style={styles.optionText}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{option.title}</Text><Text style={[styles.optionSubtitle, { color: colors.muted }]}>{option.subtitle}</Text></View>
                <View style={[styles.optionIcon, { backgroundColor: option.color + "16" }]}><MaterialIcons name={option.icon} size={19} color={option.color} /></View>
              </View>)}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.muted }]}>إظهار وإخفاء الأقسام</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              {SECTION_OPTIONS.map((option, index) => <View key={option.id} style={[styles.optionRow, index < SECTION_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}> 
                <Switch value={draft.enabledSections.includes(option.id)} onValueChange={() => toggleSection(option.id)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />
                <View style={styles.optionText}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{option.title}</Text><Text style={[styles.optionSubtitle, { color: colors.muted }]}>{option.subtitle}</Text></View>
                <View style={[styles.optionIcon, { backgroundColor: option.color + "16" }]}><MaterialIcons name={option.icon} size={19} color={option.color} /></View>
              </View>)}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.muted }]}>إجراءات ابدأ مهمة</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              {QUICK_ACTION_OPTIONS.map((option, index) => <View key={option.id} style={[styles.optionRow, index < QUICK_ACTION_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}> 
                <Switch value={draft.enabledQuickActions.includes(option.id)} onValueChange={() => toggleQuickAction(option.id)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />
                <View style={styles.optionText}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{option.title}</Text><Text style={[styles.optionSubtitle, { color: colors.muted }]}>{option.subtitle}</Text></View>
                <View style={[styles.optionIcon, { backgroundColor: option.color + "16" }]}><MaterialIcons name={option.icon} size={19} color={option.color} /></View>
              </View>)}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.muted }]}>المخططات الاختيارية</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {CHART_OPTIONS.map((option, index) => <View key={option.id} style={[styles.optionRow, index < CHART_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <Switch value={draft.enabledCharts.includes(option.id)} onValueChange={() => toggleChart(option.id)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />
                <View style={styles.optionText}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{option.title}</Text><Text style={[styles.optionSubtitle, { color: colors.muted }]}>{option.subtitle}</Text></View>
                <View style={[styles.optionIcon, { backgroundColor: option.color + "16" }]}><MaterialIcons name={option.icon} size={19} color={option.color} /></View>
              </View>)}
            </View>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={[styles.cancelButton, { borderColor: colors.border }]}><Text style={[styles.cancelText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(draft)} style={[styles.saveButton, { backgroundColor: colors.primary }]}><MaterialIcons name="check" size={19} color="#fff" /><Text style={styles.saveText}>حفظ التخصيص</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </ModalMotion>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.48)", justifyContent: "flex-end" },
  sheet: { maxHeight: "91%", borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: "hidden" },
  header: { minHeight: 76, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "flex-end" }, title: { fontSize: 16, fontWeight: "800" as any, textAlign: "right" }, subtitle: { fontSize: 11, marginTop: 3, textAlign: "right" }, headerIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 24 }, sectionTitle: { textAlign: "right", fontSize: 12, fontWeight: "800" as any, marginTop: 6, marginBottom: 8, marginRight: 4 },
  card: { borderWidth: 1, borderRadius: 16, overflow: "hidden", marginBottom: 14 }, optionRow: { minHeight: 70, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 }, optionText: { flex: 1, alignItems: "flex-end" }, optionTitle: { fontSize: 13, fontWeight: "700" as any, textAlign: "right" }, optionSubtitle: { fontSize: 10, marginTop: 3, textAlign: "right", lineHeight: 15 }, optionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  orderActions: { flexDirection: "row", gap: 5 }, orderButton: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  footer: { padding: 14, paddingBottom: 16, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10 }, cancelButton: { flex: 0.76, minHeight: 48, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" }, cancelText: { fontSize: 14, fontWeight: "700" as any }, saveButton: { flex: 1.35, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 }, saveText: { color: "#fff", fontSize: 14, fontWeight: "800" as any },
});
