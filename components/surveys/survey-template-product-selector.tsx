import { MaterialIcons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  getSurveyProductCategories,
  toggleSurveyCategory,
  toggleSurveyProductSelection,
} from "@/lib/survey-template-selection";
import type { Product } from "@/lib/types/survey-types";

interface SurveyTemplateProductSelectorProps {
  products: Product[];
  selectedProducts: Map<string, boolean>;
  setSelectedProducts: Dispatch<SetStateAction<Map<string, boolean>>>;
  showCategories: boolean;
  setShowCategories: Dispatch<SetStateAction<boolean>>;
  expandedCategories: Set<string>;
  setExpandedCategories: Dispatch<SetStateAction<Set<string>>>;
  colors: { background: string; border: string; foreground: string; muted: string; primary: string; surface: string };
}

export function SurveyTemplateProductSelector({
  products,
  selectedProducts,
  setSelectedProducts,
  showCategories,
  setShowCategories,
  expandedCategories,
  setExpandedCategories,
  colors,
}: SurveyTemplateProductSelectorProps) {
  const categories = getSurveyProductCategories(products);

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>اختر المنتجات حسب التصنيف</Text>
      <TouchableOpacity
        onPress={() => setShowCategories(!showCategories)}
        style={[styles.dropdownBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[styles.dropdownBtnText, { color: colors.foreground }]}>
          {showCategories ? "إغلاق التصنيفات" : "اختر التصنيف"}
        </Text>
        <MaterialIcons name={showCategories ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
      </TouchableOpacity>
      {showCategories && (
        <ScrollView style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          {categories.map((category) => {
            const categoryProducts = products.filter((product) => product.categoryName === category);
            const isExpanded = expandedCategories.has(category);
            const selectedCount = categoryProducts.filter((product) => selectedProducts.has(product.id)).length;
            return (
              <View key={category}>
                <TouchableOpacity
                  onPress={() => {
                    setExpandedCategories(toggleSurveyCategory(expandedCategories, category));
                  }}
                  style={[styles.categoryItem, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.categoryItemText, { color: colors.foreground }]}>
                      {category} {selectedCount > 0 && `(${selectedCount})`}
                    </Text>
                  </View>
                  <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={{ paddingLeft: 16, backgroundColor: colors.background }}>
                    {categoryProducts.map((product) => {
                      const isSelected = selectedProducts.has(product.id);
                      return (
                        <TouchableOpacity
                          key={product.id}
                          onPress={() => {
                            setSelectedProducts(toggleSurveyProductSelection(selectedProducts, product.id));
                          }}
                          style={[
                            styles.productOption,
                            { backgroundColor: colors.surface, borderColor: colors.border, marginVertical: 6 },
                            isSelected && { backgroundColor: colors.primary + "10", borderColor: colors.primary },
                          ]}
                        >
                          <MaterialIcons name={isSelected ? "check-circle" : "radio-button-unchecked"} size={20} color={isSelected ? colors.primary : colors.muted} />
                          <View style={styles.productOptionInfo}>
                            <Text style={[styles.productOptionName, { color: colors.foreground }]}>{product.name}</Text>
                            {product.competitorName && <Text style={[styles.productOptionCategory, { color: colors.muted }]}>{product.competitorName}</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: "700" as const, marginBottom: 12, marginTop: 16 },
  dropdownBtn: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  dropdownBtnText: { fontSize: 14, fontWeight: "600" as const },
  dropdownMenu: { borderRadius: 8, borderWidth: 1, marginBottom: 12, overflow: "hidden" as const, maxHeight: 280 },
  categoryItem: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  categoryItemText: { fontSize: 14, fontWeight: "600" as const },
  productOption: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
  productOptionInfo: { flex: 1 },
  productOptionName: { fontSize: 14, fontWeight: "600" as const },
  productOptionCategory: { fontSize: 12, marginTop: 2 },
});
