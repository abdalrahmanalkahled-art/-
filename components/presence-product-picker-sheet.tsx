import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";
import { filterPresenceProducts, type PresenceProductOption } from "@/lib/presence-product-picker-model";

interface PresenceProductPickerSheetProps {
  visible: boolean;
  products: readonly PresenceProductOption[];
  selectedProductId?: string;
  onClose: () => void;
  onSelect: (product: PresenceProductOption) => void;
}

export function PresenceProductPickerSheet({
  visible,
  products,
  selectedProductId,
  onClose,
  onSelect,
}: PresenceProductPickerSheetProps) {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const filteredProducts = useMemo(() => filterPresenceProducts(products, query), [products, query]);

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const renderProduct = ({ item }: { item: PresenceProductOption }) => {
    const isSelected = item.id === selectedProductId;
    return (
      <TouchableOpacity
        activeOpacity={0.72}
        onPress={() => onSelect(item)}
        style={[styles.productRow, { borderBottomColor: colors.border, backgroundColor: isSelected ? colors.primary + "12" : "transparent" }]}
      >
        <View style={[styles.selectionMark, { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}>
          {isSelected ? <MaterialIcons name="check" size={17} color="#FFFFFF" /> : null}
        </View>
        <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]} accessibilityLabel="إغلاق اختيار المنتج">
              <MaterialIcons name="close" size={21} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.titleArea}>
              <Text style={[styles.title, { color: colors.foreground }]}>اختر منتج مخطط التواجد</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>سيظهر تواجد المنتج المختار في الشاشة الرئيسية</Text>
            </View>
          </View>

          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="search" size={20} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث باسم المنتج"
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.foreground }]}
              textAlign="right"
              returnKeyType="search"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.resultsLabel, { color: colors.muted }]}>{filteredProducts.length} منتج</Text>
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            style={styles.list}
            contentContainerStyle={filteredProducts.length ? styles.listContent : styles.emptyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            ListEmptyComponent={<View style={styles.emptyState}><MaterialIcons name="search-off" size={32} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد منتجات مطابقة للبحث</Text></View>}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.44)" },
  sheet: { minHeight: 400, maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 9 },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 13 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 15 },
  closeButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  titleArea: { flex: 1, alignItems: "flex-end" },
  title: { fontSize: 16, fontWeight: "800" as any, textAlign: "right" },
  subtitle: { fontSize: 11, textAlign: "right", marginTop: 3 },
  searchBox: { height: 46, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, height: "100%", fontSize: 14, writingDirection: "rtl" },
  resultsLabel: { fontSize: 11, textAlign: "right", marginTop: 12, marginBottom: 4 },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: 22 },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  productRow: { minHeight: 54, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 4 },
  productName: { flex: 1, fontSize: 14, fontWeight: "700" as any, textAlign: "right", writingDirection: "rtl" },
  selectionMark: { width: 25, height: 25, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 46 },
  emptyText: { fontSize: 13, fontWeight: "600" as any },
});
