import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CardActionModal } from "@/components/card-action-modal";
import { FABMenu } from "@/components/fab-menu";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { MoreModuleEmptyState, MoreModuleTabs } from "@/components/more-module-ui";
import { SkeletonList } from "@/components/ui/skeleton-loading";
import { useColors } from "@/hooks/use-colors";
import { useHasPermission } from "@/lib/app-context";
import {
  type BrandReference, type BrandRegionCatalog, type RegionRating, type RegionReference,
  getBrandUsage, getRegionUsage, loadBrandRegionCatalog, saveBrands, saveRatings, saveRegions,
} from "@/lib/brand-region-repository";

type Tab = "brands" | "regions" | "ratings";
type EditingTarget = { kind: "brand"; item: BrandReference } | { kind: "region"; item: RegionReference } | { kind: "rating"; item: RegionRating } | null;
type ReferenceRow = BrandReference | RegionReference | RegionRating;

export function BrandsRegionsModule() {
  const colors = useColors();
  const canCreate = useHasPermission("products", "create");
  const canEdit = useHasPermission("products", "edit");
  const canDelete = useHasPermission("products", "delete");
  const [tab, setTab] = useState<Tab>("brands");
  const [catalog, setCatalog] = useState<BrandRegionCatalog>({ brands: [], regions: [], ratings: [] });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [editing, setEditing] = useState<EditingTarget>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [name, setName] = useState("");
  const [ratingId, setRatingId] = useState("");
  const [ratingColor, setRatingColor] = useState("#2563EB");
  const [deleteTarget, setDeleteTarget] = useState<EditingTarget>(null);
  const [actionTarget, setActionTarget] = useState<EditingTarget>(null);

  const load = useCallback(async () => {
    try { setCatalog(await loadBrandRegionCatalog()); } finally { setIsInitialLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setRatingId(catalog.ratings[0]?.id || "rating-a");
    setRatingColor("#2563EB");
    setShowEditor(true);
  };
  const openEdit = (target: NonNullable<EditingTarget>) => {
    setEditing(target);
    setName(target.kind === "rating" ? target.item.label : target.item.name);
    setRatingId(target.kind === "region" ? target.item.ratingId : catalog.ratings[0]?.id || "rating-a");
    setRatingColor(target.kind === "rating" ? target.item.color : "#2563EB");
    setShowEditor(true);
  };

  const save = async () => {
    const cleanName = name.trim();
    if (!cleanName) { Alert.alert("تنبيه", "أدخل اسماً أولاً"); return; }
    const now = new Date().toISOString();
    if (tab === "brands") {
      const duplicate = catalog.brands.some((item) => item.name.toLocaleLowerCase("ar") === cleanName.toLocaleLowerCase("ar") && item.id !== (editing?.kind === "brand" ? editing.item.id : ""));
      if (duplicate) { Alert.alert("تنبيه", "هذه الماركة موجودة بالفعل"); return; }
      const brands = editing?.kind === "brand" ? catalog.brands.map((item) => item.id === editing.item.id ? { ...item, name: cleanName } : item) : [...catalog.brands, { id: `brand-${Date.now()}`, name: cleanName, isActive: true, createdAt: now }];
      await saveBrands(brands); 
    } else if (tab === "regions") {
      const duplicate = catalog.regions.some((item) => item.name.toLocaleLowerCase("ar") === cleanName.toLocaleLowerCase("ar") && item.id !== (editing?.kind === "region" ? editing.item.id : ""));
      if (duplicate) { Alert.alert("تنبيه", "هذه المنطقة موجودة بالفعل"); return; }
      const regions = editing?.kind === "region" ? catalog.regions.map((item) => item.id === editing.item.id ? { ...item, name: cleanName, ratingId } : item) : [...catalog.regions, { id: `region-${Date.now()}`, name: cleanName, ratingId, isActive: true, createdAt: now }];
      await saveRegions(regions);
    } else {
      const duplicate = catalog.ratings.some((item) => item.label.toLocaleLowerCase("ar") === cleanName.toLocaleLowerCase("ar") && item.id !== (editing?.kind === "rating" ? editing.item.id : ""));
      if (duplicate) { Alert.alert("تنبيه", "هذا التقييم موجود بالفعل"); return; }
      const ratings = editing?.kind === "rating" ? catalog.ratings.map((item) => item.id === editing.item.id ? { ...item, label: cleanName, color: ratingColor } : item) : [...catalog.ratings, { id: `rating-${Date.now()}`, label: cleanName, color: ratingColor, priority: catalog.ratings.length + 1, createdAt: now }];
      await saveRatings(ratings);
    }
    setShowEditor(false);
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "brand") {
      const usage = await getBrandUsage(deleteTarget.item.name);
      if (usage.products + usage.events + usage.signages + usage.stands + usage.shelves + usage.advertisingVehicles > 0) {
        Alert.alert("لا يمكن الحذف", "هذه الماركة مرتبطة ببيانات قائمة. عدّل اسمها أو أزل الارتباطات أولاً.");
      } else await saveBrands(catalog.brands.filter((item) => item.id !== deleteTarget.item.id));
    } else if (deleteTarget.kind === "region") {
      const usage = await getRegionUsage(deleteTarget.item.name);
      if (usage.stores + usage.events + usage.surveys > 0) {
        Alert.alert("لا يمكن الحذف", "هذه المنطقة مرتبطة بمحلات أو فعاليات أو استبيانات قائمة.");
      } else await saveRegions(catalog.regions.filter((item) => item.id !== deleteTarget.item.id));
    } else {
      const used = catalog.regions.some((region) => region.ratingId === deleteTarget.item.id);
      if (used) Alert.alert("لا يمكن الحذف", "هذا التقييم مستخدم في مناطق حالياً. غيّر تقييم المناطق أولاً.");
      else await saveRatings(catalog.ratings.filter((item) => item.id !== deleteTarget.item.id));
    }
    setDeleteTarget(null);
    await load();
  };

  const ratingFor = (region: RegionReference) => catalog.ratings.find((rating) => rating.id === region.ratingId) || catalog.ratings[0];
  const rows: ReferenceRow[] = tab === "brands" ? catalog.brands.filter((item) => item.isActive) : tab === "regions" ? catalog.regions.filter((item) => item.isActive) : catalog.ratings;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MoreModuleTabs items={[{ id: "brands", label: "الماركات" }, { id: "regions", label: "المناطق" }, { id: "ratings", label: "التقييمات" }]} selectedId={tab} onSelect={(id) => setTab(id as Tab)} />
      {isInitialLoading ? <SkeletonList rows={4} /> : <FlatList<ReferenceRow>
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const target = tab === "brands" ? { kind: "brand" as const, item: item as BrandReference } : tab === "regions" ? { kind: "region" as const, item: item as RegionReference } : { kind: "rating" as const, item: item as RegionRating };
          const rating = target.kind === "region" ? ratingFor(target.item) : undefined;
          return <TouchableOpacity onLongPress={() => setActionTarget(target)} delayLongPress={350} activeOpacity={0.82} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{target.kind === "rating" ? target.item.label : target.item.name}</Text>
              {target.kind === "region" && rating ? <View style={[styles.ratingBadge, { backgroundColor: `${rating.color}20` }]}><Text style={{ color: rating.color, fontWeight: "800" as any }}>التقييم {rating.label}</Text></View> : null}
              {target.kind === "rating" ? <View style={[styles.colorDot, { backgroundColor: target.item.color }]} /> : null}
            </View>
          </TouchableOpacity>;
        }}
        ListEmptyComponent={<MoreModuleEmptyState icon={tab === "brands" ? "branding-watermark" : tab === "regions" ? "location-on" : "grade"} title="لا توجد بيانات بعد" description="أضف سجلاً جديداً من الزر العائم للبدء." />}
      />}
      <FABMenu items={canCreate ? [{ id: "add-reference", icon: "add", label: tab === "brands" ? "ماركة جديدة" : tab === "regions" ? "منطقة جديدة" : "تقييم جديد", onPress: openCreate }] : []} />
      <FloatingFormModal visible={showEditor} onClose={() => setShowEditor(false)} backgroundColor={colors.background} isLoading={isInitialLoading}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flex: 1 }}>
            <View style={[styles.modalHeader, { borderColor: colors.border }]}><TouchableOpacity onPress={() => setShowEditor(false)}><MaterialIcons name="close" size={24} color={colors.foreground} /></TouchableOpacity><Text style={[styles.modalTitle, { color: colors.foreground }]}>{editing ? "تعديل" : "إضافة"} {tab === "brands" ? "ماركة" : tab === "regions" ? "منطقة" : "تقييم"}</Text><View style={{ width: 24 }} /></View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.foreground }]}>{tab === "ratings" ? "رمز أو اسم التقييم" : "الاسم"}</Text>
              <TextInput value={name} onChangeText={setName} placeholder={tab === "brands" ? "مثال: مدار" : tab === "regions" ? "مثال: دمشق" : "مثال: A"} placeholderTextColor={colors.muted} textAlign="right" style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} />
              {tab === "regions" ? <><Text style={[styles.label, { color: colors.foreground }]}>تقييم المنطقة</Text><View style={styles.choices}>{catalog.ratings.map((rating) => <TouchableOpacity key={rating.id} onPress={() => setRatingId(rating.id)} style={[styles.choice, { borderColor: rating.color }, ratingId === rating.id && { backgroundColor: rating.color }]}><Text style={{ color: ratingId === rating.id ? "#fff" : rating.color, fontWeight: "800" as any }}>{rating.label}</Text></TouchableOpacity>)}</View></> : null}
              {tab === "ratings" ? <><Text style={[styles.label, { color: colors.foreground }]}>اللون</Text><View style={styles.choices}>{["#16A34A", "#2563EB", "#F59E0B", "#EF4444", "#7C3AED"].map((color) => <TouchableOpacity key={color} onPress={() => setRatingColor(color)} style={[styles.colorChoice, { backgroundColor: color }, ratingColor === color && styles.selectedColor]} />)}</View></> : null}
            </ScrollView>
            <View style={[styles.footer, { borderColor: colors.border }]}><TouchableOpacity onPress={() => setShowEditor(false)} style={[styles.footerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ color: colors.foreground }}>إلغاء</Text></TouchableOpacity><TouchableOpacity onPress={save} style={[styles.footerButton, { backgroundColor: colors.primary }]}><Text style={{ color: "#fff", fontWeight: "700" as any }}>حفظ</Text></TouchableOpacity></View>
          </View>
        </SafeAreaView>
      </FloatingFormModal>
      <ConfirmDialog visible={Boolean(deleteTarget)} title="تأكيد الحذف" message="هل تريد حذف هذا العنصر؟" confirmText="حذف" cancelText="إلغاء" icon="delete" isDangerous onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      <CardActionModal visible={Boolean(actionTarget)} title={actionTarget ? (actionTarget.kind === "rating" ? actionTarget.item.label : actionTarget.item.name) : "إجراءات العنصر"} onClose={() => setActionTarget(null)} actions={[...(canEdit ? [{ id: "edit", label: "تعديل", icon: "edit" as const, onPress: () => { const target = actionTarget; setActionTarget(null); if (target) openEdit(target); } }] : []), ...(canDelete ? [{ id: "delete", label: "حذف", icon: "delete-outline" as const, tone: "danger" as const, onPress: () => { const target = actionTarget; setActionTarget(null); if (target) setDeleteTarget(target); } }] : [])]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, list: { paddingHorizontal: 12, paddingBottom: 100, gap: 10 }, card: { minHeight: 72, borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center" }, actions: { flexDirection: "row", gap: 4 }, iconButton: { padding: 7 }, cardText: { flex: 1, alignItems: "flex-end", gap: 6 }, cardTitle: { fontSize: 16, fontWeight: "800" as any }, ratingBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 }, colorDot: { width: 12, height: 12, borderRadius: 6 }, modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 0.5 }, modalTitle: { fontSize: 17, fontWeight: "700" as any }, form: { padding: 16 }, label: { fontSize: 14, fontWeight: "600" as any, textAlign: "right", marginBottom: 8, marginTop: 6 }, input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 }, choices: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 9 }, choice: { minWidth: 50, alignItems: "center", borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14 }, colorChoice: { width: 38, height: 38, borderRadius: 19 }, selectedColor: { borderWidth: 3, borderColor: "#111827" }, footer: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 0.5 }, footerButton: { flex: 1, alignItems: "center", borderRadius: 10, borderWidth: 1, paddingVertical: 12 },
});
