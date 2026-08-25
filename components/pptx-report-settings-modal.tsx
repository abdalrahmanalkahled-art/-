import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { FloatingFormModal } from "@/components/floating-form-modal";
import { useColors } from "@/hooks/use-colors";
import type { PptxAutoAdvanceSeconds, PptxMediaCompression, PptxMediaLimit, PptxReportSectionOption, PptxReportSettings } from "@/lib/pptx-report-settings";

interface PptxReportSettingsModalProps {
  visible: boolean;
  title: string;
  description: string;
  sectionOptions: PptxReportSectionOption[];
  settings: PptxReportSettings;
  onClose: () => void;
  onSave: (settings: PptxReportSettings) => void;
}

const MEDIA_LIMIT_OPTIONS: { value: PptxMediaLimit; label: string }[] = [{ value: 3, label: "3 صور" }, { value: 6, label: "6 صور" }, { value: 9, label: "9 صور" }];
const COMPRESSION_OPTIONS: { value: PptxMediaCompression; label: string }[] = [{ value: "compact", label: "ضغط أعلى" }, { value: "balanced", label: "متوازن" }];
const ADVANCE_OPTIONS: { value: PptxAutoAdvanceSeconds; label: string }[] = [{ value: 5, label: "5 ث" }, { value: 8, label: "8 ث" }, { value: 12, label: "12 ث" }];

export function PptxReportSettingsModal({ visible, title, description, sectionOptions, settings, onClose, onSave }: PptxReportSettingsModalProps) {
  const colors = useColors();
  const [draft, setDraft] = useState(settings);
  useEffect(() => { if (visible) setDraft(settings); }, [settings, visible]);
  const setSection = (key: string, value: boolean) => setDraft((current) => ({ ...current, sections: { ...current.sections, [key]: value } }));

  return <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.surface}>
    <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.background }]} accessibilityRole="button" accessibilityLabel="إغلاق إعدادات PowerPoint"><MaterialIcons name="close" size={21} color={colors.muted} /></TouchableOpacity>
      <View style={styles.headerCopy}><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text><Text style={[styles.description, { color: colors.muted }]}>{description}</Text></View>
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={[styles.label, { color: colors.foreground }]}>عنوان العرض</Text>
      <TextInput value={draft.reportTitle} onChangeText={(reportTitle) => setDraft((current) => ({ ...current, reportTitle }))} placeholder="عنوان العرض" placeholderTextColor={colors.muted} textAlign="right" style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>محتوى الشرائح</Text>
      {sectionOptions.map((section) => <ToggleRow key={section.key} label={section.label} description={section.description} value={draft.sections[section.key] !== false} onChange={(value) => setSection(section.key, value)} colors={colors} />)}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الوسائط</Text>
      <ToggleRow label="تضمين صور التوثيق المتاحة" description="تدرج الصور فقط في بطاقات الفعاليات أو الأصول التي تملك ملفات محلية قابلة للقراءة." value={draft.includeMedia} onChange={(includeMedia) => setDraft((current) => ({ ...current, includeMedia }))} colors={colors} />
      {draft.includeMedia ? <><ChoiceRow label="الحد الأعلى للصور" value={draft.mediaLimit} options={MEDIA_LIMIT_OPTIONS} onChange={(mediaLimit) => setDraft((current) => ({ ...current, mediaLimit }))} colors={colors} /><ChoiceRow label="معالجة الصور" value={draft.mediaCompression} options={COMPRESSION_OPTIONS} onChange={(mediaCompression) => setDraft((current) => ({ ...current, mediaCompression }))} colors={colors} /></> : null}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>العرض التلقائي</Text>
      <ToggleRow label="انتقال تلقائي بين الشرائح" description="يُدرج انتقال تلاشي متوافق بعد المدة المحددة. لا يتوفر انتقال Morph الحقيقي في مولد PowerPoint المحلي." value={draft.autoAdvance} onChange={(autoAdvance) => setDraft((current) => ({ ...current, autoAdvance }))} colors={colors} />
      {draft.autoAdvance ? <ChoiceRow label="المدة قبل الانتقال" value={draft.autoAdvanceSeconds} options={ADVANCE_OPTIONS} onChange={(autoAdvanceSeconds) => setDraft((current) => ({ ...current, autoAdvanceSeconds }))} colors={colors} /> : null}
    </ScrollView>
    <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}><TouchableOpacity onPress={onClose} style={[styles.cancel, { borderColor: colors.border }]}><Text style={[styles.cancelText, { color: colors.muted }]}>إلغاء</Text></TouchableOpacity><TouchableOpacity onPress={() => onSave({ ...draft, reportTitle: draft.reportTitle.trim() || settings.reportTitle })} style={[styles.save, { backgroundColor: colors.primary }]}><MaterialIcons name="save" size={19} color="#fff" /><Text style={styles.saveText}>حفظ الإعدادات</Text></TouchableOpacity></View>
  </FloatingFormModal>;
}

function ToggleRow({ label, description, value, onChange, colors }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.toggleRow, { backgroundColor: colors.background, borderColor: colors.border }]}><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary + "99" }} thumbColor={value ? colors.primary : colors.surface} /><View style={styles.toggleCopy}><Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text><Text style={[styles.toggleDescription, { color: colors.muted }]}>{description}</Text></View></View>;
}

function ChoiceRow<T extends string | number>({ label, value, options, onChange, colors }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.choiceBlock}><Text style={[styles.choiceLabel, { color: colors.foreground }]}>{label}</Text><View style={styles.choiceList}>{options.map((option) => <TouchableOpacity key={String(option.value)} onPress={() => onChange(option.value)} style={[styles.choice, { backgroundColor: option.value === value ? colors.primary + "14" : colors.background, borderColor: option.value === value ? colors.primary : colors.border }]}><MaterialIcons name={option.value === value ? "check-circle" : "radio-button-unchecked"} size={17} color={option.value === value ? colors.primary : colors.muted} /><Text style={[styles.choiceText, { color: option.value === value ? colors.primary : colors.foreground }]}>{option.label}</Text></TouchableOpacity>)}</View></View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 78, borderBottomWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }, closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "flex-end", gap: 3 }, title: { fontSize: 17, fontWeight: "800", textAlign: "right" }, description: { fontSize: 11, lineHeight: 17, textAlign: "right" }, content: { padding: 16, paddingBottom: 32, gap: 10 }, label: { fontSize: 13, fontWeight: "800", textAlign: "right", marginTop: 2 }, input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 }, sectionTitle: { fontSize: 14, fontWeight: "800", textAlign: "right", marginTop: 10 }, toggleRow: { minHeight: 72, borderWidth: 1, borderRadius: 14, padding: 11, flexDirection: "row", alignItems: "center", gap: 10 }, toggleCopy: { flex: 1, alignItems: "flex-end", gap: 3 }, toggleLabel: { fontSize: 12, fontWeight: "800", textAlign: "right" }, toggleDescription: { fontSize: 10, lineHeight: 15, textAlign: "right" }, choiceBlock: { gap: 7 }, choiceLabel: { fontSize: 12, fontWeight: "800", textAlign: "right" }, choiceList: { flexDirection: "row", gap: 7 }, choice: { flex: 1, minHeight: 43, borderWidth: 1, borderRadius: 11, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, choiceText: { fontSize: 11, fontWeight: "800", textAlign: "center" }, footer: { minHeight: 72, borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", gap: 9 }, cancel: { flex: 0.7, minHeight: 48, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" }, cancelText: { fontSize: 13, fontWeight: "800" }, save: { flex: 1.3, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 }, saveText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
