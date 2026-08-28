import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { MediaSourcePickerModal } from "@/components/media-source-picker-modal";
import { useColors } from "@/hooks/use-colors";
import { persistCompetitorObservationImage } from "@/lib/competitor-observation-media";
import { clampScore, fieldObservationKindLabel, type CompetitorObservation, type FieldObservationKind } from "@/lib/field-marketing-model";
import { launchCamera, launchImageLibrary } from "@/lib/media-picker";

export type FieldStoreOption = { id: string; name: string; region?: string; isActive?: boolean };
type ObservationDraft = Pick<CompetitorObservation, "competitorName" | "storeName" | "region" | "kind" | "message" | "visibilityScore" | "executionScore" | "notes" | "photoUris">;
type PickerKind = "competitor" | "store";

const KINDS: FieldObservationKind[] = ["shelf", "display", "promotion", "event", "outdoor"];
const toDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const emptyDraft = (): ObservationDraft => ({ competitorName: "", storeName: "", region: "", kind: "display", message: "", visibilityScore: 3, executionScore: 3, notes: "", photoUris: [] });

export function ObservationEditorModal({
  visible,
  initial,
  competitors,
  stores,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial?: CompetitorObservation | null;
  competitors: string[];
  stores: FieldStoreOption[];
  onClose: () => void;
  onSave: (item: CompetitorObservation) => Promise<void>;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState<ObservationDraft>(emptyDraft());
  const [observationDate, setObservationDate] = useState(toDateOnly(new Date()));
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [query, setQuery] = useState("");
  const [mediaSourceOpen, setMediaSourceOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    const source = initial || { ...emptyDraft(), createdAt: new Date().toISOString(), id: "" };
    setDraft({
      competitorName: source.competitorName || "",
      storeName: source.storeName || "",
      region: source.region || "",
      kind: source.kind || "display",
      message: source.message || "",
      visibilityScore: clampScore(source.visibilityScore),
      executionScore: clampScore(source.executionScore),
      notes: source.notes || "",
      photoUris: [...(source.photoUris || [])],
    });
    setObservationDate(source.createdAt ? toDateOnly(new Date(source.createdAt)) : toDateOnly(new Date()));
    setError("");
    setPicker(null);
    setMediaSourceOpen(false);
  }, [initial, visible]);

  const pickerItems = picker === "competitor" ? competitors : stores.map((store) => store.name);
  const listed = useMemo(() => pickerItems.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase())), [pickerItems, query]);
  const choose = (value: string) => {
    if (picker === "competitor") setDraft((current) => ({ ...current, competitorName: value }));
    if (picker === "store") {
      const store = stores.find((item) => item.name === value);
      setDraft((current) => ({ ...current, storeName: value, region: store?.region || current.region }));
    }
    setPicker(null);
  };

  const addImage = async (source: "camera" | "library") => {
    const launch = source === "camera" ? launchCamera : launchImageLibrary;
    await launch({ mediaType: "photo", quality: 0.82 }, async (response) => {
      const uri = response.assets?.[0]?.uri;
      if (!uri) return;
      try {
        const localUri = await persistCompetitorObservationImage(uri);
        setDraft((current) => ({ ...current, photoUris: [...(current.photoUris || []), localUri] }));
      } catch {
        setError("تعذر حفظ الصورة محلياً. حاول اختيار صورة أخرى.");
      }
    });
  };

  const save = async () => {
    if (!draft.competitorName || !draft.storeName) {
      setError("اختر اسم المنافس والمحل أولاً.");
      return;
    }
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const item: CompetitorObservation = {
        id: initial?.id || `competitor_${Date.now()}`,
        ...draft,
        region: draft.region || stores.find((store) => store.name === draft.storeName)?.region || "",
        visibilityScore: clampScore(draft.visibilityScore),
        executionScore: clampScore(draft.executionScore),
        createdAt: `${observationDate}T12:00:00.000Z`,
      };
      await onSave(item);
    } catch {
      setError("تعذر حفظ الرصد. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.background} isDismissDisabled={saving}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity accessibilityLabel="إغلاق" onPress={onClose} disabled={saving} style={styles.headerButton}><MaterialIcons name="close" size={22} color={colors.foreground} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{initial ? "تعديل رصد منافس" : "رصد منافس"}</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PickerField label="اسم المنافس" value={draft.competitorName} onPress={() => { setQuery(""); setPicker("competitor"); }} colors={colors} />
        <PickerField label="اسم المحل" value={draft.storeName} onPress={() => { setQuery(""); setPicker("store"); }} colors={colors} />
        <PickerField label="تاريخ الرصد" value={observationDate} onPress={() => setDatePickerOpen(true)} colors={colors} />
        <Text style={[styles.regionHint, { color: colors.muted }]}>المنطقة: {draft.region || "تُحدد تلقائياً عند اختيار المحل"}</Text>
        <Text style={[styles.label, { color: colors.foreground }]}>الرسالة الظاهرة</Text>
        <TextInput value={draft.message} onChangeText={(message) => setDraft((current) => ({ ...current, message }))} textAlign="right" placeholder="وصف مختصر لما ظهر في الميدان" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} multiline />
        <Text style={[styles.label, { color: colors.foreground }]}>نوع الظهور</Text>
        <View style={styles.kindList}>{KINDS.map((kind) => <TouchableOpacity key={kind} onPress={() => setDraft((current) => ({ ...current, kind }))} style={[styles.kind, { backgroundColor: draft.kind === kind ? colors.primary : colors.surface, borderColor: draft.kind === kind ? colors.primary : colors.border }]}><Text style={{ color: draft.kind === kind ? "#fff" : colors.foreground, fontSize: 11 }}>{fieldObservationKindLabel(kind)}</Text></TouchableOpacity>)}</View>
        <ScorePicker label="وضوح الظهور" value={draft.visibilityScore} onChange={(visibilityScore) => setDraft((current) => ({ ...current, visibilityScore }))} colors={colors} />
        <ScorePicker label="جودة التنفيذ" value={draft.executionScore} onChange={(executionScore) => setDraft((current) => ({ ...current, executionScore }))} colors={colors} />
        <Text style={[styles.label, { color: colors.foreground }]}>ملاحظات إضافية</Text>
        <TextInput value={draft.notes || ""} onChangeText={(notes) => setDraft((current) => ({ ...current, notes }))} textAlign="right" placeholder="اختياري" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} multiline />
        <TouchableOpacity onPress={() => setMediaSourceOpen(true)} style={[styles.photoButton, { borderColor: colors.primary, backgroundColor: colors.primary + "12" }]}><View style={[styles.photoIcon, { backgroundColor: colors.primary + "18" }]}><MaterialIcons name="add-photo-alternate" size={19} color={colors.primary} /></View><View style={styles.photoCopy}><Text style={[styles.photoTitle, { color: colors.primary }]}>{draft.photoUris?.length ? `إضافة صور أخرى (${draft.photoUris.length})` : "إضافة صور للرصد"}</Text><Text style={[styles.photoHint, { color: colors.muted }]}>اختياري · كاميرا أو معرض</Text></View><MaterialIcons name="chevron-left" size={20} color={colors.primary} /></TouchableOpacity>
        {draft.photoUris?.length ? <ScrollView horizontal contentContainerStyle={styles.photoStrip}>{draft.photoUris.map((uri) => <Image key={uri} source={{ uri }} style={styles.preview} />)}</ScrollView> : null}
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      </ScrollView>
      <TouchableOpacity onPress={() => void save()} disabled={saving} style={[styles.save, { backgroundColor: colors.primary, opacity: saving ? 0.55 : 1 }]}><Text style={styles.saveText}>{saving ? "جارٍ الحفظ..." : initial ? "حفظ التعديل" : "حفظ الرصد"}</Text></TouchableOpacity>
      <MediaSourcePickerModal visible={mediaSourceOpen} title="إضافة صورة للرصد" description="اختر تصويراً جديداً أو صورة من المعرض" onClose={() => setMediaSourceOpen(false)} onCamera={() => { setMediaSourceOpen(false); void addImage("camera"); }} onLibrary={() => { setMediaSourceOpen(false); void addImage("library"); }} />
      <DateRangePickerModal visible={datePickerOpen} startDate={new Date(`${observationDate}T12:00:00`)} endDate={new Date(`${observationDate}T12:00:00`)} selectionMode="single" title="تاريخ الرصد" onCancel={() => setDatePickerOpen(false)} onConfirm={(date) => { setObservationDate(toDateOnly(date)); setDatePickerOpen(false); }} />
      <FloatingPicker visible={Boolean(picker)} title={picker === "competitor" ? "اختر المنافس" : "اختر المحل"} query={query} onQueryChange={setQuery} items={listed} onSelect={choose} onClose={() => setPicker(null)} colors={colors} />
    </FloatingFormModal>
  );
}

function PickerField({ label, value, onPress, colors }: { label: string; value: string; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <View><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><TouchableOpacity onPress={onPress} activeOpacity={0.76} style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="keyboard-arrow-down" size={22} color={colors.muted} /><Text numberOfLines={1} style={[styles.pickerText, { color: value ? colors.foreground : colors.muted }]}>{value || `اختر ${label}`}</Text></TouchableOpacity></View>;
}

function ScorePicker({ label, value, onChange, colors }: { label: string; value: number; onChange: (value: number) => void; colors: ReturnType<typeof useColors> }) {
  return <View><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><View style={styles.scoreList}>{[1, 2, 3, 4, 5].map((score) => <TouchableOpacity key={score} onPress={() => onChange(score)} style={[styles.score, { borderColor: score === value ? colors.primary : colors.border, backgroundColor: score === value ? colors.primary : colors.surface }]}><Text style={{ color: score === value ? "#fff" : colors.muted, fontWeight: "800" }}>{score}</Text></TouchableOpacity>)}</View></View>;
}

function FloatingPicker({ visible, title, query, onQueryChange, items, onSelect, onClose, colors }: { visible: boolean; title: string; query: string; onQueryChange: (value: string) => void; items: string[]; onSelect: (value: string) => void; onClose: () => void; colors: ReturnType<typeof useColors> }) {
  return <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.background} compactHeight><View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={onClose} accessibilityLabel="إغلاق" style={styles.headerButton}><MaterialIcons name="close" size={22} color={colors.foreground} /></TouchableOpacity><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text><View style={styles.headerButton} /></View><View style={styles.pickerBody}><TextInput value={query} onChangeText={onQueryChange} textAlign="right" placeholder="بحث" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />{items.length ? <ScrollView keyboardShouldPersistTaps="handled">{items.map((item) => <TouchableOpacity key={item} onPress={() => onSelect(item)} style={[styles.pickRow, { borderBottomColor: colors.border }]}><Text style={[styles.pickText, { color: colors.foreground }]}>{item}</Text><MaterialIcons name="chevron-left" size={20} color={colors.muted} /></TouchableOpacity>)}</ScrollView> : <Text style={[styles.empty, { color: colors.muted }]}>لا توجد بيانات مطابقة.</Text>}</View></FloatingFormModal>;
}

const styles = StyleSheet.create({
  header: { minHeight: 60, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 28, height: 42, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "800" as const },
  form: { padding: 16, paddingBottom: 26, gap: 9 },
  label: { fontSize: 12, fontWeight: "700" as const, textAlign: "right", marginBottom: 6 },
  picker: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  pickerText: { flex: 1, fontSize: 14, textAlign: "right" },
  regionHint: { fontSize: 11, textAlign: "right", marginTop: -2 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 },
  multiline: { minHeight: 74, paddingTop: 12, textAlignVertical: "top" },
  kindList: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 7 },
  kind: { minHeight: 34, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, justifyContent: "center" },
  scoreList: { flexDirection: "row", justifyContent: "flex-end", gap: 7 },
  score: { width: 36, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  photoButton: { minHeight: 58, marginTop: 3, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  photoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  photoCopy: { flex: 1, alignItems: "flex-end" },
  photoTitle: { fontSize: 13, fontWeight: "800" as const, textAlign: "right" },
  photoHint: { fontSize: 10, marginTop: 2, textAlign: "right" },
  photoStrip: { paddingTop: 2, gap: 8 },
  preview: { width: 58, height: 58, borderRadius: 12 },
  error: { fontSize: 12, textAlign: "right", lineHeight: 18 },
  save: { minHeight: 50, borderRadius: 14, margin: 14, marginTop: 0, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "800" as const },
  pickerBody: { flex: 1, padding: 16, gap: 10 },
  pickRow: { minHeight: 48, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickText: { flex: 1, fontSize: 13, textAlign: "right" },
  empty: { padding: 14, fontSize: 12, textAlign: "right" },
});
