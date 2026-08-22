import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { SuccessModal } from "@/components/success-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { MediaSourcePickerModal } from "@/components/media-source-picker-modal";
import { CardActionModal } from "@/components/card-action-modal";
import { useColors } from "@/hooks/use-colors";
import { loadBrandRegionCatalog } from "@/lib/brand-region-repository";
import { launchCamera, launchImageLibrary } from "@/lib/media-picker";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { conditionMeta, validateWarehouseTool, type WarehouseTool, type WarehouseToolBrandMode, type WarehouseToolCondition } from "@/lib/warehouse-tools";
import { DESIGN } from "@/lib/design-system";

type ToolForm = { name: string; quantity: string; brandMode: WarehouseToolBrandMode; brandNames: string[]; imageUri?: string; condition: WarehouseToolCondition };
const EMPTY_FORM: ToolForm = { name: "", quantity: "1", brandMode: "single", brandNames: [], condition: "new" };

export function WarehouseToolsTab({ openSignal }: { openSignal: number }) {
  const colors = useColors();
  const [tools, setTools] = useState<WarehouseTool[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<WarehouseTool | null>(null);
  const [form, setForm] = useState<ToolForm>(EMPTY_FORM);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [toolPendingDelete, setToolPendingDelete] = useState<WarehouseTool | null>(null);
  const [toolActionTarget, setToolActionTarget] = useState<WarehouseTool | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const reload = useCallback(async () => {
    const [savedTools, catalog] = await Promise.all([getItems<WarehouseTool>(STORAGE_KEYS.WAREHOUSE_TOOLS), loadBrandRegionCatalog()]);
    setTools(savedTools.filter((tool) => tool.isActive).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setBrands(catalog.brands.filter((brand) => brand.isActive).map((brand) => brand.name));
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { if (openSignal > 0) openCreate(); }, [openSignal]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setVisible(true); };
  const openEdit = (tool: WarehouseTool) => { setEditing(tool); setForm({ name: tool.name, quantity: String(tool.quantity), brandMode: tool.brandMode, brandNames: tool.brandNames, imageUri: tool.imageUri, condition: tool.condition }); setVisible(true); };
  const toggleBrand = (brandName: string) => setForm((current) => {
    if (current.brandMode === "single") return { ...current, brandNames: current.brandNames[0] === brandName ? [] : [brandName] };
    return { ...current, brandNames: current.brandNames.includes(brandName) ? current.brandNames.filter((item) => item !== brandName) : [...current.brandNames, brandName] };
  });
  const pickImage = (source: "camera" | "library") => {
    const picker = source === "camera" ? launchCamera : launchImageLibrary;
    void picker({ mediaType: "photo", quality: 0.8 }, (result) => { if (!result.didCancel && result.assets?.[0]?.uri) setForm((current) => ({ ...current, imageUri: result.assets?.[0]?.uri })); else if (result.errorMessage) Alert.alert("خطأ", result.errorMessage); });
  };
  const saveTool = async () => {
    const quantity = Number.parseInt(form.quantity, 10);
    const error = validateWarehouseTool({ name: form.name, quantity, brandMode: form.brandMode, brandNames: form.brandNames });
    if (error) { Alert.alert("تحقق من البيانات", error); return; }
    const allTools = await getItems<WarehouseTool>(STORAGE_KEYS.WAREHOUSE_TOOLS);
    const now = new Date().toISOString();
    const next: WarehouseTool = { id: editing?.id || `${Date.now()}`, name: form.name.trim(), quantity, brandMode: form.brandMode, brandNames: form.brandNames, imageUri: form.imageUri, condition: form.condition, isActive: true, createdAt: editing?.createdAt || now, updatedAt: now };
    await saveItems(STORAGE_KEYS.WAREHOUSE_TOOLS, editing ? allTools.map((tool) => tool.id === editing.id ? next : tool) : [next, ...allTools]);
    setVisible(false); await reload(); setSuccessMessage(editing ? "تم تحديث الأداة بنجاح" : "تم حفظ الأداة بنجاح"); setSuccess(true);
  };
  const deleteTool = (tool: WarehouseTool) => setToolPendingDelete(tool);
  const confirmDeleteTool = async () => {
    if (!toolPendingDelete) return;
    const allTools = await getItems<WarehouseTool>(STORAGE_KEYS.WAREHOUSE_TOOLS);
    await saveItems(STORAGE_KEYS.WAREHOUSE_TOOLS, allTools.filter((item) => item.id !== toolPendingDelete.id));
    setToolPendingDelete(null);
    await reload();
    setSuccessMessage("تم حذف الأداة بنجاح");
    setSuccess(true);
  };

  return <View style={styles.root}>
    <FlatList data={tools} keyExtractor={(item) => item.id} contentContainerStyle={tools.length ? styles.list : styles.emptyList} ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="handyman" size={44} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد أدوات</Text><Text style={[styles.emptyText, { color: colors.muted }]}>أضف أداة وربطها بماركة واحدة أو عدة ماركات.</Text></View>} renderItem={({ item }) => {
      const meta = conditionMeta(item.condition);
      return <TouchableOpacity onLongPress={() => setToolActionTarget(item)} delayLongPress={350} activeOpacity={0.82} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.topRow}>
          {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.image} /> : <View style={[styles.icon, { backgroundColor: colors.primary + "14" }]}><MaterialIcons name="handyman" size={25} color={colors.primary} /></View>}
          <View style={styles.copy}><Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.quantity, { color: colors.muted }]}>{item.quantity} قطعة{item.quantity > 1 ? "" : ""}</Text></View>
        </View>
        <View style={styles.metaRow}><View style={[styles.condition, { backgroundColor: meta.color + "14" }]}><MaterialIcons name={meta.icon} size={14} color={meta.color} /><Text style={[styles.conditionText, { color: meta.color }]}>{meta.label}</Text></View><Text numberOfLines={1} style={[styles.brands, { color: colors.muted }]}>الماركات: {item.brandNames.join("، ")}</Text></View>
      </TouchableOpacity>;
    }} />
    <ToolModal visible={visible} editing={Boolean(editing)} form={form} brands={brands} onClose={() => setVisible(false)} onChange={setForm} onToggleBrand={toggleBrand} onPickImage={() => setShowMediaPicker(true)} onSave={() => void saveTool()} />
    <MediaSourcePickerModal visible={showMediaPicker} title="إضافة صورة الأداة" description="اختر تصوير الأداة أو اختيار صورة من المعرض" onClose={() => setShowMediaPicker(false)} onCamera={() => pickImage("camera")} onLibrary={() => pickImage("library")} />
    <SuccessModal visible={success} message={successMessage} onClose={() => setSuccess(false)} duration={2200} />
    <ConfirmDialog visible={Boolean(toolPendingDelete)} title="حذف الأداة" message={toolPendingDelete ? `سيتم حذف «${toolPendingDelete.name}» من الأدوات. لا يمكن التراجع عن ذلك.` : ""} confirmText="حذف" isDangerous icon="warning" onCancel={() => setToolPendingDelete(null)} onConfirm={() => void confirmDeleteTool()} />
    <CardActionModal visible={Boolean(toolActionTarget)} title={toolActionTarget?.name || "إجراءات الأداة"} onClose={() => setToolActionTarget(null)} actions={[{ id: "edit", label: "تعديل الأداة", icon: "edit", onPress: () => { const target = toolActionTarget; setToolActionTarget(null); if (target) openEdit(target); } }, { id: "delete", label: "حذف الأداة", icon: "delete-outline", tone: "danger", onPress: () => { const target = toolActionTarget; setToolActionTarget(null); if (target) deleteTool(target); } }]} />
  </View>;
}

function ToolModal({ visible, editing, form, brands, onClose, onChange, onToggleBrand, onPickImage, onSave }: { visible: boolean; editing: boolean; form: ToolForm; brands: string[]; onClose: () => void; onChange: Dispatch<SetStateAction<ToolForm>>; onToggleBrand: (brand: string) => void; onPickImage: () => void; onSave: () => void }) {
  const colors = useColors();
  const quantity = Number.parseInt(form.quantity, 10) || 0;
  return <FloatingFormModal visible={visible} onClose={onClose} backgroundColor={colors.background}><View style={[styles.modalRoot, { backgroundColor: colors.background }]}><View style={[styles.modalHeader, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={24} color={colors.foreground} /></TouchableOpacity><Text style={[styles.modalTitle, { color: colors.foreground }]}>{editing ? "تعديل أداة" : "أداة جديدة"}</Text><View style={{ width: 24 }} /></View><ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled"><Field label="اسم الأداة *" value={form.name} onChangeText={(name) => onChange((current) => ({ ...current, name }))} colors={colors} /><Field label="عدد القطع *" value={form.quantity} keyboardType="number-pad" onChangeText={(quantity) => onChange((current) => ({ ...current, quantity }))} colors={colors} /><Text style={[styles.label, { color: colors.foreground }]}>ارتباط الماركة</Text><View style={styles.modeRow}>{(["single", "multiple"] as WarehouseToolBrandMode[]).map((mode) => <TouchableOpacity key={mode} onPress={() => onChange((current) => ({ ...current, brandMode: mode, brandNames: mode === "single" ? current.brandNames.slice(0, 1) : current.brandNames }))} style={[styles.mode, { borderColor: form.brandMode === mode ? colors.primary : colors.border, backgroundColor: form.brandMode === mode ? colors.primary + "12" : colors.surface }]}><Text style={{ color: form.brandMode === mode ? colors.primary : colors.muted, fontWeight: "700" }}>{mode === "single" ? "ماركة واحدة" : "عدة ماركات"}</Text></TouchableOpacity>)}</View><Text style={[styles.help, { color: colors.muted }]}>{form.brandMode === "multiple" ? `يمكن اختيار حتى ${quantity || 0} ماركات بحسب عدد القطع.` : "اختر الماركة المرتبطة بهذه الأداة."}</Text><ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={styles.brandListContent} style={[styles.brandList, { borderColor: colors.border }]}>{brands.length ? brands.map((brand) => { const active = form.brandNames.includes(brand); return <TouchableOpacity key={brand} onPress={() => onToggleBrand(brand)} style={[styles.brandRow, { borderBottomColor: colors.border }]}><MaterialIcons name={active ? "check-box" : "check-box-outline-blank"} size={20} color={active ? colors.primary : colors.muted} /><Text style={[styles.brandName, { color: colors.foreground }]}>{brand}</Text></TouchableOpacity>; }) : <Text style={[styles.help, { color: colors.muted }]}>أضف ماركات من صفحة الماركات والمناطق أولاً.</Text>}</ScrollView><Text style={[styles.label, { color: colors.foreground }]}>حالة الأداة</Text><View style={styles.conditions}>{(["new", "good", "needs_repair"] as WarehouseToolCondition[]).map((condition) => { const meta = conditionMeta(condition); const active = form.condition === condition; return <TouchableOpacity key={condition} onPress={() => onChange((current) => ({ ...current, condition }))} style={[styles.conditionOption, { borderColor: active ? meta.color : colors.border, backgroundColor: active ? meta.color + "12" : colors.surface }]}><MaterialIcons name={meta.icon} size={17} color={meta.color} /><Text style={{ color: active ? meta.color : colors.muted, fontSize: 11, fontWeight: "700" }}>{meta.label}</Text></TouchableOpacity>; })}</View><Text style={[styles.label, { color: colors.foreground }]}>صورة الأداة <Text style={{ color: colors.muted, fontSize: 11 }}>(اختياري)</Text></Text>{form.imageUri ? <Image source={{ uri: form.imageUri }} style={styles.preview} /> : null}<View style={styles.imageActions}><TouchableOpacity onPress={onPickImage} style={[styles.imageButton, { borderColor: colors.primary, backgroundColor: colors.primary + "12" }]}><MaterialIcons name="add-photo-alternate" size={18} color={colors.primary} /><Text style={[styles.imageButtonText, { color: colors.primary }]}>{form.imageUri ? "تغيير الصورة" : "إضافة صورة"}</Text></TouchableOpacity>{form.imageUri ? <TouchableOpacity onPress={() => onChange((current) => ({ ...current, imageUri: undefined }))} style={[styles.imageButton, { borderColor: colors.error, backgroundColor: colors.error + "10" }]}><MaterialIcons name="delete-outline" size={18} color={colors.error} /><Text style={[styles.imageButtonText, { color: colors.error }]}>إزالة</Text></TouchableOpacity> : null}</View></ScrollView><View style={[styles.footer, { borderTopColor: colors.border }]}><TouchableOpacity onPress={onClose} style={[styles.footerButton, { borderColor: colors.border }]}><Text style={{ color: colors.foreground, fontWeight: "700" }}>إلغاء</Text></TouchableOpacity><TouchableOpacity onPress={onSave} style={[styles.footerButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={{ color: "#fff", fontWeight: "700" }}>حفظ</Text></TouchableOpacity></View></View></FloatingFormModal>;
}

function Field({ label, value, onChangeText, colors, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; colors: ReturnType<typeof useColors>; keyboardType?: "default" | "number-pad" }) { return <View><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType || "default"} textAlign="right" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>; }

const styles = StyleSheet.create({ root: { flex: 1 }, list: { padding: DESIGN.spacing.md, gap: DESIGN.spacing.sm }, emptyList: { flexGrow: 1 }, empty: { alignItems: "center", justifyContent: "center", padding: 48, gap: 8 }, emptyTitle: { fontSize: 16, fontWeight: "800" }, emptyText: { textAlign: "center", fontSize: 12, lineHeight: 19 }, card: { borderWidth: 1, borderRadius: DESIGN.radius.lg, padding: DESIGN.spacing.md, gap: DESIGN.spacing.sm }, topRow: { flexDirection: "row", alignItems: "center", gap: 10 }, image: { width: 52, height: 52, borderRadius: 13 }, icon: { width: 52, height: 52, borderRadius: 13, alignItems: "center", justifyContent: "center" }, copy: { flex: 1, gap: 4 }, name: { textAlign: "right", fontWeight: "800", fontSize: 15 }, quantity: { textAlign: "right", fontSize: 12 }, actions: { flexDirection: "row", gap: 6 }, iconButton: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" }, metaRow: { flexDirection: "row", alignItems: "center", gap: 8 }, condition: { paddingHorizontal: 8, minHeight: 28, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 4 }, conditionText: { fontSize: 10, fontWeight: "800" }, brands: { flex: 1, textAlign: "right", fontSize: 11 }, modalRoot: { flex: 1 }, modalHeader: { minHeight: DESIGN.control.large, paddingHorizontal: DESIGN.spacing.lg, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, modalTitle: { fontSize: 17, fontWeight: "800" }, form: { padding: DESIGN.spacing.lg, gap: DESIGN.spacing.sm, paddingBottom: DESIGN.spacing.xxl }, label: { textAlign: "right", fontWeight: "700", fontSize: 13, marginTop: 2 }, input: { borderWidth: 1, borderRadius: DESIGN.radius.md, minHeight: DESIGN.control.standard, paddingHorizontal: DESIGN.spacing.md, fontSize: 15 }, modeRow: { flexDirection: "row", gap: 8 }, mode: { flex: 1, minHeight: DESIGN.control.standard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: DESIGN.radius.md }, help: { textAlign: "right", fontSize: 11, lineHeight: 17 }, brandList: { borderWidth: 1, borderRadius: DESIGN.radius.md, maxHeight: 165 }, brandListContent: { paddingBottom: 1 }, brandRow: { minHeight: 43, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10 }, brandName: { flex: 1, textAlign: "right", fontWeight: "600", fontSize: 13 }, conditions: { flexDirection: "row", gap: 7 }, conditionOption: { flex: 1, minHeight: DESIGN.control.standard, paddingHorizontal: 5, borderWidth: 1, borderRadius: DESIGN.radius.md, alignItems: "center", justifyContent: "center", gap: 3 }, preview: { width: "100%", height: 160, borderRadius: 13 }, imageActions: { flexDirection: "row", gap: 8 }, imageButton: { minHeight: 42, paddingHorizontal: 12, borderWidth: 1, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, imageButtonText: { fontSize: 12, fontWeight: "800" }, footer: { padding: DESIGN.spacing.lg, borderTopWidth: 1, flexDirection: "row", gap: DESIGN.spacing.md }, footerButton: { flex: 1, minHeight: DESIGN.control.standard, borderRadius: DESIGN.radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" } });
