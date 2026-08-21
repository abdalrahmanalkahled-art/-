import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { FloatingFormModal } from "@/components/floating-form-modal";
import { useColors } from "@/hooks/use-colors";

interface DateRangePickerModalProps {
  visible: boolean;
  startDate: Date | null;
  endDate: Date | null;
  selectionMode?: "range" | "single";
  title?: string;
  onConfirm: (startDate: Date, endDate: Date) => void;
  onCancel: () => void;
}

/** تقويم موحّد لاختيار بداية ونهاية فترة زمنية داخل نافذة عائمة. */
export function DateRangePickerModal({ visible, startDate, endDate, selectionMode = "range", title, onConfirm, onCancel }: DateRangePickerModalProps) {
  const colors = useColors();
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(startDate);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(endDate);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectingStart, setSelectingStart] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
    setSelectingStart(true);
    const anchor = startDate ?? new Date();
    setCurrentMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  }, [visible, startDate, endDate]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return [...Array.from({ length: firstDay.getDay() }, () => null), ...Array.from({ length: lastDay.getDate() }, (_, index) => index + 1)];
  }, [currentMonth]);

  const dayDate = (day: number) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
  const isSameDay = (one: Date | null, two: Date) => Boolean(one && one.getFullYear() === two.getFullYear() && one.getMonth() === two.getMonth() && one.getDate() === two.getDate());
  const selectDay = (day: number) => {
    const date = dayDate(day);
    if (selectionMode === "single") {
      setSelectedStartDate(date);
      setSelectedEndDate(date);
      setSelectingStart(true);
      return;
    }
    if (selectingStart || !selectedStartDate) {
      setSelectedStartDate(date);
      setSelectedEndDate(null);
      setSelectingStart(false);
      return;
    }
    if (date < selectedStartDate) {
      setSelectedStartDate(date);
      setSelectedEndDate(null);
      setSelectingStart(false);
      return;
    }
    setSelectedEndDate(date);
    setSelectingStart(true);
  };

  const inRange = (day: number) => {
    const date = dayDate(day);
    return Boolean(selectedStartDate && selectedEndDate && date >= selectedStartDate && date <= selectedEndDate);
  };
  const monthName = currentMonth.toLocaleDateString("ar-SA", { month: "long", year: "numeric" });
  const dateLabel = (date: Date | null) => date ? date.toLocaleDateString("ar-SA") : "اختر التاريخ";
  const canConfirm = selectionMode === "single" ? Boolean(selectedStartDate) : Boolean(selectedStartDate && selectedEndDate);

  return <FloatingFormModal visible={visible} onClose={onCancel} backgroundColor={colors.background}>
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onCancel} accessibilityLabel="إغلاق اختيار نطاق التاريخ" style={styles.iconButton}><MaterialIcons name="close" size={23} color={colors.foreground} /></TouchableOpacity>
        <View style={styles.headerCopy}><Text style={[styles.title, { color: colors.foreground }]}>{title ?? (selectionMode === "single" ? "اختر التاريخ" : "اختر نطاق التاريخ")}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{selectionMode === "single" ? "اختر يوماً واحداً" : selectingStart ? "اختر تاريخ البداية" : "اختر تاريخ النهاية"}</Text></View>
        <View style={styles.headerGap} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="none" keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
        <View style={[styles.selectedDates, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {selectionMode === "single" ? <DateSummary label="التاريخ" value={dateLabel(selectedStartDate)} active={Boolean(selectedStartDate)} colors={colors} /> : <><DateSummary label="من" value={dateLabel(selectedStartDate)} active={!selectingStart ? true : Boolean(selectedStartDate)} colors={colors} /><MaterialIcons name="arrow-back" size={20} color={colors.muted} /><DateSummary label="إلى" value={dateLabel(selectedEndDate)} active={Boolean(selectedEndDate)} colors={colors} /></>}
        </View>

        <View style={[styles.monthNav, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} style={styles.monthButton} accessibilityLabel="الشهر السابق"><MaterialIcons name="chevron-right" size={27} color={colors.primary} /></TouchableOpacity>
          <Text style={[styles.monthName, { color: colors.foreground }]}>{monthName}</Text>
          <TouchableOpacity onPress={() => setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} style={styles.monthButton} accessibilityLabel="الشهر التالي"><MaterialIcons name="chevron-left" size={27} color={colors.primary} /></TouchableOpacity>
        </View>

        <View style={[styles.calendar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.weekRow}>{["ح", "ج", "ث", "أ", "خ", "ب", "ن"].map((label) => <Text key={label} style={[styles.weekday, { color: colors.muted }]}>{label}</Text>)}</View>
          <View style={styles.daysGrid}>{calendarDays.map((day, index) => {
            if (!day) return <View key={`empty-${index}`} style={styles.day} />;
            const date = dayDate(day);
            const selected = isSameDay(selectedStartDate, date) || isSameDay(selectedEndDate, date);
            return <TouchableOpacity key={day} onPress={() => selectDay(day)} style={[styles.day, inRange(day) && { backgroundColor: colors.primary + "18" }, selected && { backgroundColor: colors.primary }]}><Text style={[styles.dayText, { color: selected ? "#fff" : colors.foreground }]}>{day.toLocaleString("en-US")}</Text></TouchableOpacity>;
          })}</View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={onCancel} style={[styles.footerButton, { backgroundColor: colors.muted + "18" }]}><Text style={[styles.cancelText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity>
        <TouchableOpacity disabled={!canConfirm} onPress={() => selectedStartDate && (selectedEndDate ?? selectedStartDate) && onConfirm(selectedStartDate, selectedEndDate ?? selectedStartDate)} style={[styles.footerButton, { backgroundColor: colors.primary }, !canConfirm && styles.disabled]}><Text style={styles.confirmText}>{selectionMode === "single" ? "تأكيد التاريخ" : "تأكيد الفترة"}</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  </FloatingFormModal>;
}

function DateSummary({ label, value, active, colors }: { label: string; value: string; active: boolean; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.dateSummary, active && { backgroundColor: colors.primary + "12" }]}><Text style={[styles.dateLabel, { color: colors.muted }]}>{label}</Text><Text style={[styles.dateValue, { color: active ? colors.primary : colors.foreground }]} numberOfLines={1}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 70, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 10 },
  iconButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerCopy: { flex: 1, alignItems: "flex-end" },
  title: { fontSize: 17, fontWeight: "800" as any, textAlign: "right" },
  subtitle: { fontSize: 11, marginTop: 3, textAlign: "right" },
  headerGap: { width: 40 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  selectedDates: { minHeight: 80, borderWidth: 1, borderRadius: 16, padding: 8, flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  dateSummary: { flex: 1, minHeight: 60, paddingHorizontal: 9, justifyContent: "center", alignItems: "flex-end", borderRadius: 11 },
  dateLabel: { fontSize: 10, fontWeight: "700" as any },
  dateValue: { fontSize: 12, fontWeight: "800" as any, marginTop: 4 },
  monthNav: { minHeight: 54, borderWidth: 1, borderRadius: 14, paddingHorizontal: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  monthButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  monthName: { fontSize: 15, fontWeight: "800" as any },
  calendar: { borderWidth: 1, borderRadius: 18, padding: 11 },
  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekday: { width: "14.285%", textAlign: "center", fontSize: 11, fontWeight: "800" as any },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  day: { width: "14.285%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 10, marginBottom: 3 },
  dayText: { fontSize: 13, fontWeight: "700" as any },
  footer: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row-reverse", gap: 10 },
  footerButton: { flex: 1, minHeight: 48, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 14, fontWeight: "800" as any },
  confirmText: { color: "#fff", fontSize: 14, fontWeight: "800" as any },
  disabled: { opacity: 0.45 },
});
