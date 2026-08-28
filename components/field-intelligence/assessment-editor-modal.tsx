import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { FloatingFormModal } from "@/components/floating-form-modal";
import { useColors } from "@/hooks/use-colors";
import { assessmentScore, clampScore, type ExecutionAssessment, type ExecutionSubjectType } from "@/lib/field-marketing-model";

const SUBJECTS: { value: ExecutionSubjectType; label: string }[] = [{ value: "store", label: "محل" }, { value: "event", label: "فعالية" }, { value: "signage", label: "لوحة أو ستاند" }];
const emptyQuality = { visibility: 3, brandAlignment: 3, materialCondition: 3 };

export function AssessmentEditorModal({ visible, initial, onClose, onSave }: { visible: boolean; initial?: ExecutionAssessment | null; onClose: () => void; onSave: (item: ExecutionAssessment) => Promise<void> }) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [subjectType, setSubjectType] = useState<ExecutionSubjectType>("store");
  const [region, setRegion] = useState("");
  const [quality, setQuality] = useState(emptyQuality);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setName(initial?.subjectName || "");
    setSubjectType(initial?.subjectType || "store");
    setRegion(initial?.region || "");
    setQuality({ visibility: clampScore(initial?.visibility || 3), brandAlignment: clampScore(initial?.brandAlignment || 3), materialCondition: clampScore(initial?.materialCondition || 3) });
    setNotes(initial?.notes || "");
    setError("");
  }, [initial, visible]);

  const save = async () => {
    if (!name.trim()) { setError("أدخل اسم المحل أو موقع التنفيذ."); return; }
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const item: ExecutionAssessment = { id: initial?.id || `quality_${Date.now()}`, subjectType, subjectName: name.trim(), region: region.trim() || undefined, ...quality, score: assessmentScore(quality), notes: notes.trim() || undefined, createdAt: initial?.createdAt || new Date().toISOString() };
      await onSave(item);
    } catch {
      setError("تعذر حفظ التقييم. حاول مرة أخرى.");
    } finally { setSaving(false); }
  };

  return <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.background} compactHeight isDismissDisabled={saving}>
    <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={onClose} disabled={saving} accessibilityLabel="إغلاق" style={styles.headerButton}><MaterialIcons name="close" size={22} color={colors.foreground} /></TouchableOpacity><Text style={[styles.title, { color: colors.foreground }]}>{initial ? "تعديل تقييم الجودة" : "تقييم جودة التنفيذ"}</Text><View style={styles.headerButton} /></View>
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={[styles.label, { color: colors.foreground }]}>المحل أو موقع التنفيذ</Text><TextInput value={name} onChangeText={setName} textAlign="right" placeholder="اكتب الاسم" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
      <Text style={[styles.label, { color: colors.foreground }]}>نوع الموقع</Text><View style={styles.subjectList}>{SUBJECTS.map((item) => <TouchableOpacity key={item.value} onPress={() => setSubjectType(item.value)} style={[styles.subject, { backgroundColor: subjectType === item.value ? colors.primary : colors.surface, borderColor: subjectType === item.value ? colors.primary : colors.border }]}><Text style={{ color: subjectType === item.value ? "#fff" : colors.foreground, fontSize: 11 }}>{item.label}</Text></TouchableOpacity>)}</View>
      <Text style={[styles.label, { color: colors.foreground }]}>المنطقة <Text style={{ color: colors.muted, fontWeight: "400" }}>· اختياري</Text></Text><TextInput value={region} onChangeText={setRegion} textAlign="right" placeholder="اسم المنطقة" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
      <ScorePicker label="وضوح التفعيل" value={quality.visibility} onChange={(visibility) => setQuality((current) => ({ ...current, visibility }))} colors={colors} />
      <ScorePicker label="الالتزام بالهوية" value={quality.brandAlignment} onChange={(brandAlignment) => setQuality((current) => ({ ...current, brandAlignment }))} colors={colors} />
      <ScorePicker label="حالة المواد" value={quality.materialCondition} onChange={(materialCondition) => setQuality((current) => ({ ...current, materialCondition }))} colors={colors} />
      <Text style={[styles.label, { color: colors.foreground }]}>ملاحظات إضافية</Text><TextInput value={notes} onChangeText={setNotes} textAlign="right" multiline placeholder="اختياري" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </ScrollView>
    <TouchableOpacity onPress={() => void save()} disabled={saving} style={[styles.save, { backgroundColor: colors.primary, opacity: saving ? 0.55 : 1 }]}><Text style={styles.saveText}>{saving ? "جارٍ الحفظ..." : initial ? "حفظ التعديل" : "حفظ التقييم"}</Text></TouchableOpacity>
  </FloatingFormModal>;
}

function ScorePicker({ label, value, onChange, colors }: { label: string; value: number; onChange: (value: number) => void; colors: ReturnType<typeof useColors> }) {
  return <View><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><View style={styles.scoreList}>{[1, 2, 3, 4, 5].map((score) => <TouchableOpacity key={score} onPress={() => onChange(score)} style={[styles.score, { borderColor: score === value ? colors.primary : colors.border, backgroundColor: score === value ? colors.primary : colors.surface }]}><Text style={{ color: score === value ? "#fff" : colors.muted, fontWeight: "800" }}>{score}</Text></TouchableOpacity>)}</View></View>;
}

const styles = StyleSheet.create({ header: { minHeight: 60, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerButton: { width: 28, height: 42, alignItems: "center", justifyContent: "center" }, title: { fontSize: 16, fontWeight: "800" as const }, form: { padding: 16, paddingBottom: 24, gap: 9 }, label: { fontSize: 12, fontWeight: "700" as const, textAlign: "right", marginBottom: 6 }, input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 }, multiline: { minHeight: 70, paddingTop: 12, textAlignVertical: "top" }, subjectList: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 7 }, subject: { minHeight: 36, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, justifyContent: "center" }, scoreList: { flexDirection: "row", justifyContent: "flex-end", gap: 7 }, score: { width: 36, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" }, error: { fontSize: 12, textAlign: "right" }, save: { minHeight: 50, borderRadius: 14, margin: 14, marginTop: 0, alignItems: "center", justifyContent: "center" }, saveText: { color: "#fff", fontSize: 14, fontWeight: "800" as const } });
