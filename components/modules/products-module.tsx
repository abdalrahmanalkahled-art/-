import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { useColors } from "@/hooks/use-colors";
import { useHasPermission } from "@/lib/app-context";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { FABMenu, type FABMenuItem } from "@/components/fab-menu";
import { SuccessModal } from "@/components/success-modal";
import { useState, useCallback, useEffect } from "react";
import { loadBrandRegionCatalog } from "@/lib/brand-region-repository";
import { createDefaultProductCategories, getProductCategoryId, getVisibleProductCategories } from "@/lib/product-category-recovery";

interface ProductCategory {
  id: string;
  name: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  type: "company" | "competitor";
  brandName?: string;
  competitorName?: string;
  createdAt: string;
}

interface CategoryWithProducts {
  category: ProductCategory;
  products: Product[];
  isExpanded: boolean;
}

export function ProductsModule() {
  const colors = useColors();
  const canCreate = useHasPermission("products", "create");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"company" | "competitor">("company");
  const [search, setSearch] = useState("");
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("");
  const [showSuccessAdd, setShowSuccessAdd] = useState(false);
  const [showSuccessDelete, setShowSuccessDelete] = useState(false);
  const [showSuccessCategoryAdd, setShowSuccessCategoryAdd] = useState(false);
  const [showSuccessCategoryDelete, setShowSuccessCategoryDelete] = useState(false);
  const [showSuccessCompetitorAdd, setShowSuccessCompetitorAdd] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ visible: boolean; categoryId: string }>({ visible: false, categoryId: "" });

  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    type: "company" as "company" | "competitor",
    brandName: "",
    competitorName: "",
  });

  const [categoryForm, setCategoryForm] = useState({ name: "" });
  const [competitorForm, setCompetitorForm] = useState({ name: "" });

  const loadData = useCallback(async () => {
    const [productsData, categoriesData, competitorsData, catalog] = await Promise.all([
      getItems<Product>(STORAGE_KEYS.PRODUCTS),
      getItems<ProductCategory>(STORAGE_KEYS.PRODUCT_CATEGORIES),
      getItems<string>(STORAGE_KEYS.COMPETITORS),
      loadBrandRegionCatalog(),
    ]);
    const resolvedCategories = categoriesData.length > 0 ? categoriesData : createDefaultProductCategories();
    if (categoriesData.length === 0) {
      await saveItems(STORAGE_KEYS.PRODUCT_CATEGORIES, resolvedCategories);
    }
    setProducts(productsData);
    setCategories(resolvedCategories);
    setCompetitors(competitorsData);
    setBrands(catalog.brands.filter((brand) => brand.isActive).map((brand) => brand.name));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddProduct = async () => {
    if (!form.name.trim() || !form.categoryId) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول");
      return;
    }

    if (form.type === "competitor" && !form.competitorName.trim()) {
      Alert.alert("خطأ", "يرجى تحديد المنافس");
      return;
    }
    if (form.type === "company" && !form.brandName.trim()) {
      Alert.alert("خطأ", "يرجى تحديد الماركة");
      return;
    }

    const category = categories.find((c) => c.id === form.categoryId);
    const newProduct: Product = {
      id: Date.now().toString(),
      name: form.name.trim(),
      categoryId: form.categoryId,
      categoryName: category?.name || "",
      type: form.type,
      brandName: form.type === "company" ? form.brandName : undefined,
      competitorName: form.type === "competitor" ? form.competitorName : undefined,
      createdAt: new Date().toISOString(),
    };

    await saveItems(STORAGE_KEYS.PRODUCTS, [...products, newProduct]);
    setForm({ name: "", categoryId: "", type: "company", brandName: "", competitorName: "" });
    setShowModal(false);
    setShowSuccessAdd(true);
    await loadData();
  };

  const handleDeleteProduct = (id: string) => {
    setDeleteConfirmation({ visible: true, categoryId: id });
  };

  const confirmDeleteProduct = async () => {
    const productId = deleteConfirmation.categoryId;
    try {
      const updatedProducts = products.filter((p) => p.id !== productId);
      await saveItems(STORAGE_KEYS.PRODUCTS, updatedProducts);
      setProducts(updatedProducts);
      setShowSuccessDelete(true);
      setDeleteConfirmation({ visible: false, categoryId: "" });
      setTimeout(() => setShowSuccessDelete(false), 2000);
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء حذف المنتج");
    }
  };

  const cancelDeleteProduct = () => {
    setDeleteConfirmation({ visible: false, categoryId: "" });
  }

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم التصنيف");
      return;
    }

    const newCategory: ProductCategory = {
      id: Date.now().toString(),
      name: categoryForm.name.trim(),
      createdAt: new Date().toISOString(),
    };

    await saveItems(STORAGE_KEYS.PRODUCT_CATEGORIES, [...categories, newCategory]);
    setCategoryForm({ name: "" });
    setShowCategoryModal(false);
    setShowSuccessCategoryAdd(true);
    await loadData();
  };

  const handleDeleteCategory = (id: string) => {
    setDeleteConfirmation({ visible: true, categoryId: id });
  };

  const confirmDeleteCategory = async () => {
    const categoryId = deleteConfirmation.categoryId;
    
    const productsUsingCategory = products.filter((p) => p.categoryId === categoryId);
    if (productsUsingCategory.length > 0) {
      Alert.alert(
        "لا يمكن حذف التصنيف",
        `هذا التصنيف يحتوي على ${productsUsingCategory.length} منتج${productsUsingCategory.length > 1 ? "ات" : ""}. يرجى حذف جميع المنتجات في هذا التصنيف أولاً.`
      );
      setDeleteConfirmation({ visible: false, categoryId: "" });
      return;
    }

    await saveItems(
      STORAGE_KEYS.PRODUCT_CATEGORIES,
      categories.filter((c) => c.id !== categoryId)
    );
    setDeleteConfirmation({ visible: false, categoryId: "" });
    setShowSuccessCategoryDelete(true);
    await loadData();
  };

  const handleEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name });
    setShowCategoryModal(true);
  };

  const handleUpdateCategory = async () => {
    if (!categoryForm.name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم التصنيف");
      return;
    }

    if (!editingCategory) return;

    const updated = categories.map((c) =>
      c.id === editingCategory.id ? { ...c, name: categoryForm.name.trim() } : c
    );

    await saveItems(STORAGE_KEYS.PRODUCT_CATEGORIES, updated);
    setCategoryForm({ name: "" });
    setEditingCategory(null);
    setShowCategoryModal(false);
    setShowSuccessCategoryAdd(true);
    await loadData();
  };

  const handleAddCompetitor = async () => {
    if (!competitorForm.name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم المنافس");
      return;
    }

    if (competitors.includes(competitorForm.name.trim())) {
      Alert.alert("خطأ", "المنافس موجود بالفعل");
      return;
    }

    await saveItems(STORAGE_KEYS.COMPETITORS, [...competitors, competitorForm.name.trim()]);
    setCompetitorForm({ name: "" });
    setShowCompetitorModal(false);
    setShowSuccessCompetitorAdd(true);
    await loadData();
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoriesWithProducts = (): CategoryWithProducts[] => {
    return getVisibleProductCategories(categories, products).map((cat) => ({
      category: cat,
      products: products.filter(
        (p) =>
          getProductCategoryId(p) === cat.id &&
          p.type === activeTab &&
          (activeTab === "competitor" ? p.competitorName === selectedCompetitor || selectedCompetitor === "" : true) &&
          p.name.includes(search)
      ),
      isExpanded: expandedCategories.has(cat.id),
    }));
  };

  const fabItems: FABMenuItem[] = canCreate ? [
    {
      id: "product",
      icon: "add",
      label: "منتج",
      onPress: () => {
        setForm({ name: "", categoryId: "", type: "company", brandName: "", competitorName: "" });
        setShowModal(true);
      },
    },
    {
      id: "competitor",
      icon: "business",
      label: "منافس",
      onPress: () => {
        setCompetitorForm({ name: "" });
        setShowCompetitorModal(true);
      },
    },
    {
      id: "category",
      icon: "category",
      label: "تصنيف",
      onPress: () => {
        setEditingCategory(null);
        setCategoryForm({ name: "" });
        setShowCategoryModal(true);
      },
    },
  ] : [];

  const renderCategorySection = ({ item }: { item: CategoryWithProducts }) => (
    <View style={[styles.categorySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={() => toggleCategory(item.category.id)}
      >
        <MaterialIcons
          name={item.isExpanded ? "expand-less" : "expand-more"}
          size={24}
          color={colors.primary}
        />
        <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
          {item.category.name}
        </Text>
        <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.categoryBadgeText}>{item.products.length}</Text>
        </View>
      </TouchableOpacity>

      {item.isExpanded && item.products.length > 0 && (
        <View style={[styles.productsContainer, { borderTopColor: colors.border }]}>
          {item.products.map((product) => (
            <View key={product.id} style={[styles.productItem, { borderBottomColor: colors.border }]}>
              <TouchableOpacity 
                onPress={() => handleDeleteProduct(product.id)}
                style={{ padding: 8, borderRadius: 4 }}
              >
                <MaterialIcons name="delete-outline" size={20} color={colors.error} />
              </TouchableOpacity>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                {product.competitorName && (
                  <Text style={[styles.competitorName, { color: colors.primary }]}> 
                    {product.competitorName}
                  </Text>
                )}
                {product.brandName && (
                  <Text style={[styles.competitorName, { color: colors.primary }]}>{product.brandName}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {item.isExpanded && item.products.length === 0 && (
        <View style={styles.emptyCategory}>
          <Text style={[styles.emptyCategoryText, { color: colors.muted }]}>لا توجد منتجات</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>إدارة المنتجات</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "company" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => {
            setActiveTab("company");
            setSelectedCompetitor("");
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === "company" ? colors.primary : colors.muted }]}>
            منتجات الشركة
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "competitor" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("competitor")}
        >
          <Text style={[styles.tabText, { color: activeTab === "competitor" ? colors.primary : colors.muted }]}>
            منتجات المنافسين
          </Text>
        </TouchableOpacity>
      </View>

      {/* Competitor Filter */}
      {activeTab === "competitor" && competitors.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.competitorFilter} contentContainerStyle={styles.competitorFilterContent}>
          <TouchableOpacity
            style={[styles.filterChip, selectedCompetitor === "" && { backgroundColor: colors.primary }]}
            onPress={() => setSelectedCompetitor("")}
          >
            <Text style={[styles.filterChipText, { color: selectedCompetitor === "" ? "#fff" : colors.foreground }]}>
              الكل
            </Text>
          </TouchableOpacity>
          {competitors.map((comp) => (
            <TouchableOpacity
              key={comp}
              style={[styles.filterChip, selectedCompetitor === comp && { backgroundColor: colors.primary }]}
              onPress={() => setSelectedCompetitor(comp)}
            >
              <Text style={[styles.filterChipText, { color: selectedCompetitor === comp ? "#fff" : colors.foreground }]}>
                {comp}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="ابحث عن منتج..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
        <MaterialIcons name="search" size={20} color={colors.muted} />
      </View>

      {/* Categories List */}
      <FlatList
        data={getCategoriesWithProducts()}
        keyExtractor={(item) => item.category.id}
        renderItem={renderCategorySection}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="inventory-2" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد منتجات</Text>
          </View>
        }
      />

      {/* FAB Menu */}
      <FABMenu items={fabItems} />

      {/* Add Product Modal */}
      <FloatingFormModal visible={showModal} onClose={() => setShowModal(false)} backgroundColor={colors.background}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, backgroundColor: colors.background }}
          >
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <MaterialIcons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>منتج جديد</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                {/* Type Selection */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>نوع المنتج</Text>
                  <View style={styles.typeOptions}>
                    <TouchableOpacity
                      style={[styles.typeOption, form.type === "company" && { backgroundColor: colors.primary }]}
                      onPress={() => setForm({ ...form, type: "company", competitorName: "" })}
                    >
                      <Text style={[styles.typeOptionText, { color: form.type === "company" ? "#fff" : colors.muted }]}>
                        منتج الشركة
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOption, form.type === "competitor" && { backgroundColor: colors.primary }]}
                      onPress={() => setForm({ ...form, type: "competitor", brandName: "" })}
                    >
                      <Text style={[styles.typeOptionText, { color: form.type === "competitor" ? "#fff" : colors.muted }]}>
                        منتج منافس
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Competitor Name */}
                {form.type === "competitor" && (
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>المنافس</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {competitors.map((comp) => (
                        <TouchableOpacity
                          key={comp}
                          style={[styles.competitorOption, form.competitorName === comp && { backgroundColor: colors.primary }]}
                          onPress={() => setForm({ ...form, competitorName: comp })}
                        >
                          <Text style={[styles.competitorOptionText, { color: form.competitorName === comp ? "#fff" : colors.muted }]}>
                            {comp}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {form.type === "company" && (
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>الماركة *</Text>
                    {brands.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {brands.map((brand) => (
                          <TouchableOpacity
                            key={brand}
                            style={[styles.competitorOption, form.brandName === brand && { backgroundColor: colors.primary }]}
                            onPress={() => setForm({ ...form, brandName: brand })}
                          >
                            <Text style={[styles.competitorOptionText, { color: form.brandName === brand ? "#fff" : colors.muted }]}>{brand}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : <Text style={[styles.emptyCategoryText, { color: colors.muted }]}>أضف ماركة أولاً من «الماركات والمناطق».</Text>}
                  </View>
                )}

                {/* Product Name */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>اسم المنتج *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                    value={form.name}
                    onChangeText={(v) => setForm({ ...form, name: v })}
                    placeholder="أدخل اسم المنتج"
                    placeholderTextColor={colors.muted}
                    textAlign="right"
                  />
                </View>

                {/* Category */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>التصنيف *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryOption, form.categoryId === cat.id && { backgroundColor: colors.primary }]}
                        onPress={() => setForm({ ...form, categoryId: cat.id })}
                      >
                        <Text style={[styles.categoryOptionText, { color: form.categoryId === cat.id ? "#fff" : colors.muted }]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddProduct} style={[styles.saveBtnBottom, { backgroundColor: colors.primary }]}>
                  <Text style={styles.saveBtnText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </FloatingFormModal>

      {/* Add Category Modal */}
      <FloatingFormModal visible={showCategoryModal} onClose={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: "" }); }} backgroundColor={colors.background}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, backgroundColor: colors.background }}
          >
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryForm({ name: "" });
                  }}
                >
                  <MaterialIcons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editingCategory ? "تعديل التصنيف" : "تصنيف جديد"}
                </Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>اسم التصنيف</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                    value={categoryForm.name}
                    onChangeText={(v) => setCategoryForm({ name: v })}
                    placeholder="مثل: مسحوق، سائل جلي..."
                    placeholderTextColor={colors.muted}
                    textAlign="right"
                  />
                </View>

                {/* Categories List */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>التصنيفات الموجودة</Text>
                  {categories.length > 0 ? (
                    <View>
                      {categories.map((cat) => (
                        <View
                          key={cat.id}
                          style={[
                            styles.categoryListItem,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                          ]}
                        >
                          <View style={styles.categoryListActions}>
                            <TouchableOpacity
                              onPress={() => handleDeleteCategory(cat.id)}
                              style={styles.categoryActionBtn}
                            >
                              <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleEditCategory(cat)}
                              style={styles.categoryActionBtn}
                            >
                              <MaterialIcons name="edit" size={18} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                          <Text style={[styles.categoryListItemText, { color: colors.foreground }]}>
                            {cat.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.emptyCategoryText, { color: colors.muted }]}>لا توجد تصنيفات</Text>
                  )}
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryForm({ name: "" });
                  }}
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={editingCategory ? handleUpdateCategory : handleAddCategory}
                  style={[styles.saveBtnBottom, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.saveBtnText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </FloatingFormModal>

      {/* Add Competitor Modal */}
      <FloatingFormModal visible={showCompetitorModal} onClose={() => setShowCompetitorModal(false)} backgroundColor={colors.background}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, backgroundColor: colors.background }}
          >
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowCompetitorModal(false)}>
                  <MaterialIcons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>منافس جديد</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>اسم المنافس</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                    value={competitorForm.name}
                    onChangeText={(v) => setCompetitorForm({ name: v })}
                    placeholder="أدخل اسم المنافس"
                    placeholderTextColor={colors.muted}
                    textAlign="right"
                  />
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TouchableOpacity onPress={() => setShowCompetitorModal(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddCompetitor} style={[styles.saveBtnBottom, { backgroundColor: colors.primary }]}>
                  <Text style={styles.saveBtnText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </FloatingFormModal>

      {/* Delete Confirmation Modal (Category or Product) */}
      <Modal visible={deleteConfirmation.visible} transparent={true} animationType="fade">
        <View style={styles.deleteConfirmOverlay}>
          <View style={[styles.deleteConfirmBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="warning" size={48} color={colors.error} style={{ marginBottom: 12 }} />
            <Text style={[styles.deleteConfirmTitle, { color: colors.foreground }]}>تأكيد الحذف</Text>
            <Text style={[styles.deleteConfirmMessage, { color: colors.muted }]}>هل أنت متأكد من حذف هذا العنصر؟</Text>
            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={[styles.deleteConfirmCancel, { backgroundColor: colors.muted + "20" }]}
                onPress={() => setDeleteConfirmation({ visible: false, categoryId: "" })}
              >
                <Text style={[styles.deleteConfirmCancelText, { color: colors.foreground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmDelete, { backgroundColor: colors.error }]}
                onPress={() => {
                  const isCategory = categories.some((c) => c.id === deleteConfirmation.categoryId);
                  if (isCategory) {
                    confirmDeleteCategory();
                  } else {
                    confirmDeleteProduct();
                  }
                }}
              >
                <Text style={styles.deleteConfirmDeleteText}>حذف</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modals */}
      <SuccessModal visible={showSuccessAdd} message="تم إضافة بنجاح" onClose={() => setShowSuccessAdd(false)} />
      <SuccessModal visible={showSuccessDelete} message="تم الحذف بنجاح" onClose={() => setShowSuccessDelete(false)} />
      <SuccessModal visible={showSuccessCategoryAdd} message="تم حفظ التصنيف بنجاح" onClose={() => setShowSuccessCategoryAdd(false)} />
      <SuccessModal visible={showSuccessCategoryDelete} message="تم حذف التصنيف بنجاح" onClose={() => setShowSuccessCategoryDelete(false)} />
      <SuccessModal visible={showSuccessCompetitorAdd} message="تم إضافة المنافس بنجاح" onClose={() => setShowSuccessCompetitorAdd(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", alignSelf: "stretch" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", padding: 16, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: "700" as any },
  tabsContainer: { flexDirection: "row", borderBottomWidth: 0.5 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 14, fontWeight: "600" as any },
  competitorFilter: { width: "100%", alignSelf: "stretch", flexGrow: 0, flexShrink: 0, paddingVertical: 8 },
  competitorFilterContent: { flexGrow: 0, flexShrink: 1, flexDirection: "row", paddingHorizontal: 12, gap: 8, alignItems: "center" },
  filterChip: { alignSelf: "flex-start", flexGrow: 0, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#E5E7EB" },
  filterChipText: { fontSize: 12, fontWeight: "500" as any },
  searchBar: { alignSelf: "stretch", width: "auto", flexDirection: "row", alignItems: "center", margin: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  list: { width: "100%", alignSelf: "stretch", padding: 12, gap: 10, paddingBottom: 100 },
  categorySection: { width: "100%", alignSelf: "stretch", borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  categoryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", padding: 14, gap: 12 },
  categoryTitle: { fontSize: 16, fontWeight: "700" as any, flex: 1, textAlign: "right" },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, minWidth: 32, alignItems: "center" },
  categoryBadgeText: { fontSize: 12, fontWeight: "600" as any, color: "#fff" },
  productsContainer: { borderTopWidth: 1 },
  productItem: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", padding: 12, gap: 12, borderBottomWidth: 1 },
  productInfo: { flex: 1, alignItems: "flex-end" },
  productName: { fontSize: 14, fontWeight: "600" as any },
  competitorName: { fontSize: 12, marginTop: 4, fontWeight: "500" as any },
  emptyCategory: { padding: 16, alignItems: "center" },
  emptyCategoryText: { fontSize: 13 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 17, fontWeight: "700" as any },
  modalContent: { flex: 1, padding: 16 },
  modalFooter: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, justifyContent: "space-between" },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontWeight: "600" as any, fontSize: 16 },
  saveBtnBottom: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#fff", fontWeight: "600" as any },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600" as any, marginBottom: 8, textAlign: "right" },
  formInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  typeOptions: { flexDirection: "row", gap: 10 },
  typeOption: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#E5E7EB", alignItems: "center" },
  typeOptionText: { fontSize: 14, fontWeight: "600" as any },
  competitorOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#E5E7EB", marginRight: 8 },
  competitorOptionText: { fontSize: 12, fontWeight: "600" as any },
  categoryOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#E5E7EB", marginRight: 8 },
  categoryOptionText: { fontSize: 12, fontWeight: "600" as any },
  deleteConfirmOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center" },
  deleteConfirmBox: { borderRadius: 16, padding: 20, width: "80%", alignItems: "center", borderWidth: 1 },
  deleteConfirmTitle: { fontSize: 18, fontWeight: "700" as any, marginBottom: 8 },
  deleteConfirmMessage: { fontSize: 14, marginBottom: 20, textAlign: "center" },
  deleteConfirmButtons: { flexDirection: "row", gap: 12, width: "100%" },
  deleteConfirmCancel: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  deleteConfirmCancelText: { fontWeight: "600" as any },
  deleteConfirmDelete: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  deleteConfirmDeleteText: { color: "#fff", fontWeight: "600" as any },
  categoryListItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  categoryListItemText: { fontSize: 14, fontWeight: "500" as any, flex: 1, textAlign: "right", marginRight: 12 },
  categoryListActions: { flexDirection: "row", gap: 8 },
  categoryActionBtn: { padding: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
