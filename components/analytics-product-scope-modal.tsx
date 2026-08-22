import { MaterialIcons } from "@expo/vector-icons";
import { Modal, Pressable, SectionList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";

import { useColors } from "@/hooks/use-colors";
import { toWesternDigits } from "@/lib/analytics-number-format";
import type { AnalyticsProductOption } from "@/lib/advanced-analytics";

type ProductSection = {
  key: string;
  audience: "company" | "competitor";
  category: string;
  firstForAudience: boolean;
  allProducts: AnalyticsProductOption[];
  data: AnalyticsProductOption[];
};

function buildSections(products: AnalyticsProductOption[]): ProductSection[] {
  const grouped = new Map<string, AnalyticsProductOption[]>();
  products.forEach((product) => {
    const audience = product.type === "competitor" ? "competitor" : "company";
    const category = product.category?.trim() || "بدون صنف";
    const key = `${audience}:${category}`;
    grouped.set(key, [...(grouped.get(key) || []), product]);
  });
  const sections = Array.from(grouped.entries()).map(([key, allProducts]) => {
    const [audience, ...categoryParts] = key.split(":");
    return { key, audience: audience as ProductSection["audience"], category: categoryParts.join(":"), firstForAudience: false, allProducts: [...allProducts].sort((a, b) => a.name.localeCompare(b.name, "ar")), data: [] };
  }).sort((a, b) => a.audience === b.audience ? a.category.localeCompare(b.category, "ar") : a.audience === "company" ? -1 : 1);
  let previousAudience: ProductSection["audience"] | null = null;
  return sections.map((section) => {
    const firstForAudience = previousAudience !== section.audience;
    previousAudience = section.audience;
    return { ...section, firstForAudience };
  });
}

export function AnalyticsProductScopeModal({ visible, products, selectedIds, onToggleProduct, onSetCategory, onClear, onClose }: { visible: boolean; products: AnalyticsProductOption[]; selectedIds: string[]; onToggleProduct: (id: string) => void; onSetCategory: (ids: string[]) => void; onClear: () => void; onClose: () => void }) {
  const colors = useColors();
  const [openedCategories, setOpenedCategories] = useState<string[]>([]);
  const baseSections = buildSections(products);
  const sections = baseSections.map((section) => ({ ...section, data: openedCategories.includes(section.key) ? section.allProducts : [] }));
  const toggleCategory = (key: string) => setOpenedCategories((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.head}>
          <TouchableOpacity onPress={onClose} style={[styles.iconButton, { backgroundColor: colors.background }]}><MaterialIcons name="close" size={20} color={colors.muted} /></TouchableOpacity>
          <View style={styles.headCopy}><Text style={[styles.title, { color: colors.foreground }]}>نطاق المنتجات</Text><Text style={[styles.hint, { color: colors.muted }]}>اختر الصنف لعرض منتجاته، ثم حدّد الصنف كاملاً أو منتجات بعينها.</Text></View>
        </View>
        <View style={styles.actions}><TouchableOpacity onPress={onClear} style={[styles.clearButton, { backgroundColor: colors.background, borderColor: colors.border }]}><MaterialIcons name="restart-alt" size={17} color={colors.primary} /><Text style={[styles.clearText, { color: colors.primary }]}>كل المنتجات</Text></TouchableOpacity><Text style={[styles.count, { color: colors.muted }]}>{selectedIds.length ? `${toWesternDigits(String(selectedIds.length))} محدد` : "بدون تقييد"}</Text></View>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>لا توجد منتجات ضمن نطاق الاستبيان الحالي.</Text>}
          renderSectionHeader={({ section }) => {
            const selectedCount = section.allProducts.filter((item) => selectedIds.includes(item.id)).length;
            const allSelected = selectedCount === section.allProducts.length && section.allProducts.length > 0;
            const opened = openedCategories.includes(section.key);
            return <View>{section.firstForAudience ? <View style={[styles.audience, { backgroundColor: section.audience === "company" ? colors.primary + "14" : colors.warning + "16" }]}><MaterialIcons name={section.audience === "company" ? "business" : "people"} size={17} color={section.audience === "company" ? colors.primary : colors.warning} /><Text style={[styles.audienceText, { color: section.audience === "company" ? colors.primary : colors.warning }]}>{section.audience === "company" ? "منتجاتنا" : "منتجات المنافسين"}</Text></View> : null}<TouchableOpacity onPress={() => toggleCategory(section.key)} style={[styles.categoryHead, { backgroundColor: opened ? colors.primary + "0E" : colors.background, borderColor: opened ? colors.primary : colors.border }]}><MaterialIcons name={opened ? "expand-less" : "expand-more"} size={21} color={colors.primary} /><View style={styles.categoryCopy}><Text style={[styles.categoryTitle, { color: colors.foreground }]}>{toWesternDigits(section.category)}</Text><Text style={[styles.categoryHint, { color: colors.muted }]}>{toWesternDigits(String(section.allProducts.length))} منتج · {opened ? "المنتجات ظاهرة" : "اضغط لعرض المنتجات"}</Text></View><TouchableOpacity onPress={() => onSetCategory(section.allProducts.map((item) => item.id))} style={[styles.categoryAction, { backgroundColor: allSelected ? colors.primary : colors.surface, borderColor: allSelected ? colors.primary : colors.border }]}><MaterialIcons name={allSelected ? "check-box" : "select-all"} size={16} color={allSelected ? "#fff" : colors.primary} /><Text style={[styles.categoryActionText, { color: allSelected ? "#fff" : colors.primary }]}>{allSelected ? "الصنف محدد" : "تحديد الصنف"}</Text></TouchableOpacity></TouchableOpacity></View>;
          }}
          renderItem={({ item }) => { const active = selectedIds.includes(item.id); return <TouchableOpacity onPress={() => onToggleProduct(item.id)} style={[styles.product, { borderColor: colors.border, backgroundColor: active ? colors.primary + "10" : colors.surface }]}><MaterialIcons name={active ? "check-box" : "check-box-outline-blank"} size={20} color={active ? colors.primary : colors.muted} /><View style={styles.productCopy}><Text style={[styles.productName, { color: colors.foreground }]}>{toWesternDigits(item.name)}</Text><Text style={[styles.productBrand, { color: colors.muted }]}>{toWesternDigits(item.brandName || (item.type === "competitor" ? "منافس" : "منتج الشركة"))}</Text></View></TouchableOpacity>; }}
        />
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.42)", justifyContent: "center", padding: 18 },
  modal: { maxHeight: "84%", borderWidth: 1, borderRadius: 22, padding: 14, elevation: 10 },
  head: { flexDirection: "row-reverse", gap: 10, alignItems: "flex-start" }, iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }, headCopy: { flex: 1, gap: 3 }, title: { fontSize: 16, fontWeight: "800", textAlign: "right" }, hint: { fontSize: 11, lineHeight: 17, textAlign: "right" },
  actions: { marginTop: 12, marginBottom: 8, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, clearButton: { minHeight: 36, borderWidth: 1, borderRadius: 18, paddingHorizontal: 11, flexDirection: "row-reverse", alignItems: "center", gap: 5 }, clearText: { fontSize: 11, fontWeight: "800" }, count: { fontSize: 11, fontWeight: "700" }, list: { paddingBottom: 6, gap: 7 },
  audience: { minHeight: 34, borderRadius: 10, marginTop: 6, paddingHorizontal: 10, flexDirection: "row-reverse", alignItems: "center", gap: 6 }, audienceText: { fontSize: 12, fontWeight: "800" }, categoryHead: { minHeight: 58, marginTop: 7, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12, flexDirection: "row-reverse", alignItems: "center", gap: 8 }, categoryCopy: { flex: 1, gap: 2 }, categoryTitle: { fontSize: 13, fontWeight: "800", textAlign: "right" }, categoryHint: { fontSize: 10, textAlign: "right" }, categoryAction: { minHeight: 31, borderWidth: 1, borderRadius: 9, paddingHorizontal: 8, flexDirection: "row-reverse", alignItems: "center", gap: 4 }, categoryActionText: { fontSize: 10, fontWeight: "800" },
  product: { minHeight: 50, marginHorizontal: 5, paddingHorizontal: 9, borderBottomWidth: 1, flexDirection: "row-reverse", alignItems: "center", gap: 9 }, productCopy: { flex: 1, gap: 2 }, productName: { fontSize: 12, fontWeight: "700", textAlign: "right" }, productBrand: { fontSize: 10, textAlign: "right" }, empty: { textAlign: "center", paddingVertical: 30, fontSize: 12 },
});
