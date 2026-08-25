import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { useHasPermission } from "@/lib/app-context";
import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { SuccessModal } from "@/components/success-modal";
import { CategoryManagerModal } from "@/components/category-manager-modal";
import { DEFAULT_WAREHOUSE_CATEGORIES, getFallbackCategoryId, getManagedCategories, type ManagedCategory } from "@/lib/category-management";
import { removeWarehouseItemAndMovements } from "@/lib/warehouse-management";
import { WarehouseToolsTab } from "@/components/warehouse-tools-tab";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReportFab } from "@/components/report-fab";
import { WarehouseReportSettingsSheet } from "@/components/warehouse-report-settings-sheet";
import { buildWarehouseReportData } from "@/lib/warehouse-report-data";
import { exportWarehouseReport } from "@/lib/warehouse-report-exporter";
import { loadWarehouseReportSettings, saveWarehouseReportSettings } from "@/lib/warehouse-report-settings";
import { DEFAULT_WAREHOUSE_REPORT_SETTINGS, type WarehouseReportSettings } from "@/lib/warehouse-report-settings-model";
import type { WarehouseTool } from "@/lib/warehouse-tools";
import { DESIGN } from "@/lib/design-system";
import { WarehouseMaterialDetailsSheet } from "@/components/warehouse-detail-sheets";
import { calculateMovementPieces, calculatePackagePieces, formatMovementQuantity, formatWarehouseQuantity, getPiecesPerPackage, type WarehouseMovementUnit } from "@/lib/warehouse-quantity";


interface WarehouseItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  minimumQuantity: number;
  packageCount?: number;
  piecesPerPackage?: number;
  description: string;
  isActive: boolean;
  createdAt: string;
}

interface Movement {
  id: string;
  itemId: string;
  itemName: string;
  movementType: "in" | "out";
  quantity: number;
  movementUnit?: WarehouseMovementUnit;
  enteredQuantity?: number;
  relatedEventId?: string;
  notes: string;
  movementDate: string;
  createdAt: string;
}

const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIsoDate = (value: string) => value ? new Date(`${value}T12:00:00`) : null;

export default function WarehouseModule() {
  const colors = useColors();
  const canCreate = useHasPermission("warehouse", "create");
  const canEdit = useHasPermission("warehouse", "edit");
  const canDelete = useHasPermission("warehouse", "delete");
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [categories, setCategories] = useState<ManagedCategory[]>(DEFAULT_WAREHOUSE_CATEGORIES);
  const [activeTab, setActiveTab] = useState<"tools" | "items" | "movements">("tools");
  const [toolOpenSignal, setToolOpenSignal] = useState(0);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showMovementDatePicker, setShowMovementDatePicker] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<WarehouseItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", category: "gifts", packageCount: "", piecesPerPackage: "", minimumQuantity: "5", description: "" });
  const [movementForm, setMovementForm] = useState({ movementType: "in" as "in" | "out", movementUnit: "package" as WarehouseMovementUnit, quantity: "", notes: "", movementDate: new Date().toISOString().split("T")[0] });
  const [successMessage, setSuccessMessage] = useState({ visible: false, message: "" });
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [itemPendingDelete, setItemPendingDelete] = useState<WarehouseItem | null>(null);
  const [itemActionTarget, setItemActionTarget] = useState<WarehouseItem | null>(null);
  const [itemDetails, setItemDetails] = useState<WarehouseItem | null>(null);
  const [movementSavePending, setMovementSavePending] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [reportSettings, setReportSettings] = useState<WarehouseReportSettings>(DEFAULT_WAREHOUSE_REPORT_SETTINGS);
  const [reportSettingsOpen, setReportSettingsOpen] = useState(false);
  const [notice, setNotice] = useState({ visible: false, title: "", message: "", icon: "info" });

  const showNotice = (title: string, message: string, icon = "info") => {
    setNotice({ visible: true, title, message, icon });
  };

  const loadData = useCallback(async () => {
    const [itemData, movementData, storedCategories] = await Promise.all([
      getItems<WarehouseItem>(STORAGE_KEYS.WAREHOUSE_ITEMS),
      getItems<Movement>(STORAGE_KEYS.WAREHOUSE_MOVEMENTS),
      getItems<ManagedCategory>(STORAGE_KEYS.WAREHOUSE_CATEGORIES),
    ]);
    const resolvedCategories = getManagedCategories(storedCategories, DEFAULT_WAREHOUSE_CATEGORIES);
    if (storedCategories.length === 0) await saveItems(STORAGE_KEYS.WAREHOUSE_CATEGORIES, resolvedCategories);
    setItems(itemData.filter((i) => i.isActive));
    setMovements(movementData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setCategories(resolvedCategories);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { void loadWarehouseReportSettings().then(setReportSettings); }, []);

  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) { showNotice("بيانات ناقصة", "أدخل اسم المادة قبل الحفظ.", "inventory"); return; }
    if (!editingItem && (!Number.isInteger(Number(itemForm.packageCount)) || Number(itemForm.packageCount) <= 0 || !Number.isInteger(Number(itemForm.piecesPerPackage)) || Number(itemForm.piecesPerPackage) <= 0)) {
      showNotice("بيانات ناقصة", "أدخل عدد الطرود وعدد القطع في الطرد كأرقام صحيحة أكبر من صفر.", "inventory");
      return;
    }
    const allItems = await getItems<WarehouseItem>(STORAGE_KEYS.WAREHOUSE_ITEMS);
    if (editingItem) {
      const updated = allItems.map((i) => i.id === editingItem.id ? { ...i, name: itemForm.name.trim(), category: itemForm.category, unit: "طرد", piecesPerPackage: parseInt(itemForm.piecesPerPackage) || getPiecesPerPackage(i), packageCount: Math.floor(i.currentQuantity / (parseInt(itemForm.piecesPerPackage) || getPiecesPerPackage(i))), minimumQuantity: parseInt(itemForm.minimumQuantity) || 5, description: itemForm.description } : i);
      await saveItems(STORAGE_KEYS.WAREHOUSE_ITEMS, updated);
    } else {
      const packageCount = parseInt(itemForm.packageCount);
      const piecesPerPackage = parseInt(itemForm.piecesPerPackage);
      const newItem: WarehouseItem = { id: Date.now().toString(), name: itemForm.name.trim(), category: itemForm.category, unit: "طرد", packageCount, piecesPerPackage, currentQuantity: calculatePackagePieces(packageCount, piecesPerPackage), minimumQuantity: parseInt(itemForm.minimumQuantity) || 5, description: itemForm.description, isActive: true, createdAt: new Date().toISOString() };
      await saveItems(STORAGE_KEYS.WAREHOUSE_ITEMS, [...allItems, newItem]);
    }
    setShowItemModal(false);
    setSuccessMessage({ visible: true, message: editingItem ? "تم تعديل المادة بنجاح" : "تمت إضافة المادة بنجاح" });
    await loadData();
  };

  const handleSaveMovement = async () => {
    if (!selectedItemForMovement || !movementForm.quantity) { showNotice("بيانات ناقصة", "اختر المادة وأدخل الكمية قبل الحفظ.", "swap-horiz"); return; }
    const qty = calculateMovementPieces(movementForm.quantity, movementForm.movementUnit, selectedItemForMovement);
    if (movementForm.movementType === "out" && qty > selectedItemForMovement.currentQuantity) {
      showNotice("كمية غير متاحة", "الكمية المطلوبة أكبر من المخزون المتاح لهذه المادة.", "warning");
      return;
    }
    const allItems = await getItems<WarehouseItem>(STORAGE_KEYS.WAREHOUSE_ITEMS);
    const allMovements = await getItems<Movement>(STORAGE_KEYS.WAREHOUSE_MOVEMENTS);
    const updatedItems = allItems.map((i) => {
      if (i.id === selectedItemForMovement.id) {
        const newQty = movementForm.movementType === "in" ? i.currentQuantity + qty : i.currentQuantity - qty;
        return { ...i, currentQuantity: newQty, packageCount: Math.floor(newQty / getPiecesPerPackage(i)) };
      }
      return i;
    });
    const newMovement: Movement = {
      id: Date.now().toString(),
      itemId: selectedItemForMovement.id,
      itemName: selectedItemForMovement.name,
      movementType: movementForm.movementType,
      quantity: qty,
      movementUnit: movementForm.movementUnit,
      enteredQuantity: parseInt(movementForm.quantity),
      notes: movementForm.notes,
      movementDate: movementForm.movementDate,
      createdAt: new Date().toISOString(),
    };
    await Promise.all([
      saveItems(STORAGE_KEYS.WAREHOUSE_ITEMS, updatedItems),
      saveItems(STORAGE_KEYS.WAREHOUSE_MOVEMENTS, [...allMovements, newMovement]),
    ]);
    setSuccessMessage({ visible: true, message: "تم تسجيل الحركة بنجاح" });
    setShowMovementModal(false);
    setSelectedItemForMovement(null);
    loadData();
  };

  const requestSaveMovement = () => {
    const enteredQuantity = Number(movementForm.quantity);
    const quantityInPieces = selectedItemForMovement ? calculateMovementPieces(enteredQuantity, movementForm.movementUnit, selectedItemForMovement) : 0;
    if (!selectedItemForMovement || !Number.isInteger(enteredQuantity) || enteredQuantity <= 0 || quantityInPieces <= 0) {
      showNotice("بيانات ناقصة", "اختر المادة وأدخل كمية صحيحة قبل التأكيد.", "swap-horiz");
      return;
    }
    if (movementForm.movementType === "out" && quantityInPieces > selectedItemForMovement.currentQuantity) {
      showNotice("كمية غير متاحة", "الكمية المطلوبة أكبر من المخزون المتاح لهذه المادة.", "warning");
      return;
    }
    setMovementSavePending(true);
  };

  const getCategoryInfo = (cat: string) => categories.find((category) => category.id === cat) ?? categories[0] ?? DEFAULT_WAREHOUSE_CATEGORIES[0];
  const lowStockItems = items.filter((i) => i.currentQuantity <= i.minimumQuantity);
  const selectedCategory = getCategoryInfo(itemForm.category);

  const saveCategory = async (category: ManagedCategory) => {
    const updated = categories.some((item) => item.id === category.id)
      ? categories.map((item) => item.id === category.id ? category : item)
      : [...categories, category];
    await saveItems(STORAGE_KEYS.WAREHOUSE_CATEGORIES, updated);
    setCategories(updated);
  };

  const deleteCategory = async (category: ManagedCategory) => {
    if (categories.length < 2) {
      showNotice("لا يمكن الحذف", "يجب أن تبقى فئة واحدة على الأقل.", "category");
      return;
    }
    const fallbackId = getFallbackCategoryId(categories, category.id);
    if (!fallbackId) return;
    const allItems = await getItems<WarehouseItem>(STORAGE_KEYS.WAREHOUSE_ITEMS);
    const updatedCategories = categories.filter((item) => item.id !== category.id);
    await Promise.all([
      saveItems(STORAGE_KEYS.WAREHOUSE_CATEGORIES, updatedCategories),
      saveItems(STORAGE_KEYS.WAREHOUSE_ITEMS, allItems.map((item) => item.category === category.id ? { ...item, category: fallbackId } : item)),
    ]);
    if (itemForm.category === category.id) setItemForm((current) => ({ ...current, category: fallbackId }));
    await loadData();
  };

  const handleDeleteItem = (item: WarehouseItem) => setItemPendingDelete(item);
  const beginEditItem = (item: WarehouseItem) => {
    setEditingItem(item);
    setItemForm({ name: item.name, category: item.category, packageCount: String(item.packageCount ?? Math.floor(item.currentQuantity / getPiecesPerPackage(item))), piecesPerPackage: String(getPiecesPerPackage(item)), minimumQuantity: item.minimumQuantity.toString(), description: item.description || "" });
    setShowCategoryMenu(false);
    setItemActionTarget(null);
    setShowItemModal(true);
  };
  const confirmDeleteItem = async () => {
    if (!itemPendingDelete) return;
    const [allItems, allMovements] = await Promise.all([
      getItems<WarehouseItem>(STORAGE_KEYS.WAREHOUSE_ITEMS),
      getItems<Movement>(STORAGE_KEYS.WAREHOUSE_MOVEMENTS),
    ]);
    const outcome = removeWarehouseItemAndMovements(allItems, allMovements, itemPendingDelete.id);
    await Promise.all([
      saveItems(STORAGE_KEYS.WAREHOUSE_ITEMS, outcome.items),
      saveItems(STORAGE_KEYS.WAREHOUSE_MOVEMENTS, outcome.movements),
    ]);
    setItemPendingDelete(null);
    setSuccessMessage({ visible: true, message: "تم حذف المادة وسجل الحركة المرتبط بها" });
    await loadData();
  };
  const exportUnifiedWarehouseReport = async (format: "pdf" | "excel") => {
    setExporting(format);
    try {
      const tools = await getItems<WarehouseTool>(STORAGE_KEYS.WAREHOUSE_TOOLS);
      const report = buildWarehouseReportData({ materials: items, tools, movements, categories }, reportSettings);
      await exportWarehouseReport(format, report, reportSettings);
    } finally { setExporting(null); }
  };
  const saveReportSettings = async (settings: WarehouseReportSettings) => {
    const saved = await saveWarehouseReportSettings(settings);
    setReportSettings(saved);
    setReportSettingsOpen(false);
  };

  return (
    <View style={styles.container}>
      {lowStockItems.length > 0 && (
        <View style={[styles.alertBanner, { backgroundColor: colors.warning + "20" }]}>
          <MaterialIcons name="warning" size={16} color={colors.warning} />
          <Text style={[styles.alertText, { color: colors.warning }]}>
            {lowStockItems.length} مادة بمخزون منخفض
          </Text>
        </View>
      )}

      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "movements" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("movements")}
        >
          <Text style={[styles.tabText, { color: activeTab === "movements" ? colors.primary : colors.muted }]}>سجل الحركة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "items" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("items")}
        >
          <Text style={[styles.tabText, { color: activeTab === "items" ? colors.primary : colors.muted }]}>المواد</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "tools" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("tools")}
        >
          <Text style={[styles.tabText, { color: activeTab === "tools" ? colors.primary : colors.muted }]}>الأدوات</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "tools" ? <WarehouseToolsTab openSignal={toolOpenSignal} /> : activeTab === "items" ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const catInfo = getCategoryInfo(item.category);
            const isLow = item.currentQuantity <= item.minimumQuantity;
            return (
              <TouchableOpacity onPress={() => setItemDetails(item)} onLongPress={() => setItemActionTarget(item)} delayLongPress={380} activeOpacity={0.82} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: isLow ? colors.warning : colors.border }]}> 
                <View style={styles.itemTopRow}>
                  <View style={styles.itemRight}>
                    <View style={[styles.catIcon, { backgroundColor: catInfo.color + "20" }]}>
                      <MaterialIcons name={catInfo.icon as keyof typeof MaterialIcons.glyphMap} size={21} color={catInfo.color} />
                    </View>
                    <View style={styles.itemText}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                      <Text style={[styles.itemCat, { color: colors.muted }]}>{catInfo.label}</Text>
                    </View>
                  </View>
                  <View style={[styles.holdHint, { backgroundColor: colors.background }]}><MaterialIcons name="touch-app" size={15} color={colors.muted} /><Text style={[styles.holdHintText, { color: colors.muted }]}>اضغط مطولاً</Text></View>
                </View>
                <View style={[styles.stockRow, { backgroundColor: isLow ? colors.warning + "12" : colors.background }]}>
                  <View style={styles.stockLabelRow}>{isLow ? <MaterialIcons name="warning" size={16} color={colors.warning} /> : <MaterialIcons name="inventory-2" size={16} color={colors.muted} />}<Text style={[styles.stockLabel, { color: colors.muted }]}>{isLow ? "مخزون منخفض" : "المخزون المتاح"}</Text></View>
                  <Text style={[styles.itemQty, { color: isLow ? colors.warning : colors.foreground }]}>{formatWarehouseQuantity(item.currentQuantity, item)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="inventory" size={40} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد مواد</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.movementCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: item.movementType === "in" ? colors.success : colors.error }]}>
              <View style={styles.movementRight}>
                <Text style={[styles.movementItem, { color: colors.foreground }]}>{item.itemName}</Text>
                <Text style={[styles.movementDate, { color: colors.muted }]}>{item.movementDate}</Text>
                {item.notes ? <Text style={[styles.movementNotes, { color: colors.muted }]}>{item.notes}</Text> : null}
              </View>
              <View style={styles.movementLeft}>
                <Text style={[styles.movementQty, { color: item.movementType === "in" ? colors.success : colors.error }]}>
                  {item.movementType === "in" ? "+" : "-"}{formatMovementQuantity(item, items.find((material) => material.id === item.itemId))}
                </Text>
                <Text style={[styles.movementType, { color: item.movementType === "in" ? colors.success : colors.error }]}>
                  {item.movementType === "in" ? "إدخال" : "إخراج"}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="swap-horiz" size={40} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد حركات</Text>
            </View>
          }
        />
      )}

      <WarehouseMaterialDetailsSheet visible={Boolean(itemDetails)} item={itemDetails} category={itemDetails ? getCategoryInfo(itemDetails.category) : undefined} movements={itemDetails ? movements.filter((movement) => movement.itemId === itemDetails.id) : []} onClose={() => setItemDetails(null)} />

      {/* Item Modal */}
      <FloatingFormModal visible={showItemModal} onClose={() => setShowItemModal(false)} backgroundColor={colors.background}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowItemModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingItem ? "تعديل المادة" : "مادة جديدة"}</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {[
              { key: "name", label: "اسم المادة *", placeholder: "أدخل اسم المادة" },
              ...(!editingItem ? [{ key: "packageCount", label: "عدد الطرود *", placeholder: "مثال: 10", keyboardType: "numeric" as const }] : []),
              { key: "piecesPerPackage", label: "عدد القطع في الطرد الواحد *", placeholder: "مثال: 24", keyboardType: "numeric" as const },
              { key: "minimumQuantity", label: "الحد الأدنى للتنبيه (بالقطع)", placeholder: "5", keyboardType: "numeric" as const },
            ].map((field) => (
              <View key={field.key} style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>{field.label}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  value={(itemForm as any)[field.key]}
                  onChangeText={(v) => setItemForm((f) => ({ ...f, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.muted}
                  keyboardType={field.keyboardType || "default"}
                  textAlign="right"
                />
              </View>
            ))}
            <View style={[styles.packageHint, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "26" }]}>
              <MaterialIcons name="inventory-2" size={18} color={colors.primary} />
              <Text style={[styles.packageHintText, { color: colors.primary }]}>تعتمد المادة على الطرد دائماً، ويُحتسب المخزون داخلياً بإجمالي القطع لضمان دقة الإدخال والإخراج.</Text>
            </View>
            <View style={styles.formGroup}>
              <View style={styles.categoryLabelRow}>
                <TouchableOpacity onPress={() => setShowCategoryManager(true)}><Text style={[styles.manageCategoriesText, { color: colors.primary }]}>إدارة الفئات</Text></TouchableOpacity>
                <Text style={[styles.formLabel, { color: colors.foreground, marginBottom: 0 }]}>الفئة</Text>
              </View>
              <View style={[styles.categoryDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.categoryDropdownButton} onPress={() => setShowCategoryMenu((current) => !current)}>
                  <MaterialIcons name={showCategoryMenu ? "expand-less" : "expand-more"} size={22} color={colors.primary} />
                  <View style={styles.categorySelection}><MaterialIcons name={selectedCategory.icon as keyof typeof MaterialIcons.glyphMap} size={18} color={selectedCategory.color} /><Text style={[styles.categorySelectionText, { color: colors.foreground }]}>{selectedCategory.label}</Text></View>
                </TouchableOpacity>
                {showCategoryMenu ? <ScrollView style={[styles.categoryDropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                  {categories.map((category) => <TouchableOpacity key={category.id} style={styles.categoryDropdownItem} onPress={() => { setItemForm((current) => ({ ...current, category: category.id })); setShowCategoryMenu(false); }}><MaterialIcons name={category.id === itemForm.category ? "check-circle" : "radio-button-unchecked"} size={19} color={category.id === itemForm.category ? category.color : colors.muted} /><Text style={[styles.categoryDropdownText, { color: colors.foreground }]}>{category.label}</Text></TouchableOpacity>)}
                </ScrollView> : null}
              </View>
            </View>
          </ScrollView>
          {/* Bottom Buttons */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowItemModal(false)}
            >
              <Text style={[styles.footerBtnText, { color: colors.foreground }]}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveItem}
            >
              <Text style={[styles.footerBtnText, { color: "#fff" }]}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </View>
        </SafeAreaView>
      </FloatingFormModal>

      {/* Movement Modal */}
      <FloatingFormModal visible={showMovementModal} onClose={() => setShowMovementModal(false)} backgroundColor={colors.background}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowMovementModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>حركة مخزون</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>نوع الحركة</Text>
              <View style={styles.movTypeRow}>
                <TouchableOpacity
                  style={[styles.movTypeBtn, movementForm.movementType === "out" && { backgroundColor: colors.error }]}
                  onPress={() => setMovementForm((f) => ({ ...f, movementType: "out" }))}
                >
                  <Text style={[styles.movTypeBtnText, { color: movementForm.movementType === "out" ? "#fff" : colors.muted }]}>إخراج</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.movTypeBtn, movementForm.movementType === "in" && { backgroundColor: colors.success }]}
                  onPress={() => setMovementForm((f) => ({ ...f, movementType: "in" }))}
                >
                  <Text style={[styles.movTypeBtnText, { color: movementForm.movementType === "in" ? "#fff" : colors.muted }]}>إدخال</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>المادة *</Text>
              <ScrollView style={styles.itemSelector} nestedScrollEnabled>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemSelectorOption, selectedItemForMovement?.id === item.id && { backgroundColor: colors.primary + "20" }, { borderBottomColor: colors.border }]}
                    onPress={() => setSelectedItemForMovement(item)}
                  >
                    <Text style={[styles.itemSelectorQty, { color: colors.muted }]}>{formatWarehouseQuantity(item.currentQuantity, item)}</Text>
                    <Text style={[styles.itemSelectorName, { color: colors.foreground }]}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>وحدة الحركة</Text>
              <View style={styles.movTypeRow}>
                <TouchableOpacity style={[styles.movTypeBtn, movementForm.movementUnit === "piece" && { backgroundColor: colors.primary }]} onPress={() => setMovementForm((form) => ({ ...form, movementUnit: "piece" }))}>
                  <Text style={[styles.movTypeBtnText, { color: movementForm.movementUnit === "piece" ? "#fff" : colors.muted }]}>قطعة</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.movTypeBtn, movementForm.movementUnit === "package" && { backgroundColor: colors.primary }]} onPress={() => setMovementForm((form) => ({ ...form, movementUnit: "package" }))}>
                  <Text style={[styles.movTypeBtnText, { color: movementForm.movementUnit === "package" ? "#fff" : colors.muted }]}>طرد</Text>
                </TouchableOpacity>
              </View>
              {selectedItemForMovement ? <Text style={[styles.unitHelperText, { color: colors.muted }]}>الطرد الواحد = {getPiecesPerPackage(selectedItemForMovement)} قطعة.</Text> : null}
            </View>

            {[
              { key: "quantity", label: `الكمية (${movementForm.movementUnit === "package" ? "طرود" : "قطع"}) *`, placeholder: "0", keyboardType: "numeric" as const },
              { key: "notes", label: "ملاحظات", placeholder: "سبب الحركة..." },
            ].map((field) => (
              <View key={field.key} style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>{field.label}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  value={(movementForm as any)[field.key]}
                  onChangeText={(v) => setMovementForm((f) => ({ ...f, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.muted}
                  keyboardType={field.keyboardType || "default"}
                  textAlign="right"
                />
               </View>
            ))}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>تاريخ الحركة</Text>
              <TouchableOpacity onPress={() => setShowMovementDatePicker(true)} style={[styles.formInput, styles.datePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                <Text style={[styles.datePickerText, { color: movementForm.movementDate ? colors.foreground : colors.muted }]}>{movementForm.movementDate || "اختر تاريخ الحركة"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          {/* Bottom Buttons */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowMovementModal(false)}
            >
              <Text style={[styles.footerBtnText, { color: colors.foreground }]}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.primary }]}
              onPress={requestSaveMovement}
            >
              <Text style={[styles.footerBtnText, { color: "#fff" }]}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </View>
        </SafeAreaView>
      </FloatingFormModal>
      <DateRangePickerModal visible={showMovementDatePicker} startDate={fromIsoDate(movementForm.movementDate)} endDate={fromIsoDate(movementForm.movementDate)} selectionMode="single" title="تاريخ حركة المخزون" onCancel={() => setShowMovementDatePicker(false)} onConfirm={(date) => { setMovementForm((current) => ({ ...current, movementDate: toIsoDate(date) })); setShowMovementDatePicker(false); }} />

      {/* Success Modal */}
      <SuccessModal
        visible={successMessage.visible}
        message={successMessage.message}
        onClose={() => setSuccessMessage({ visible: false, message: "" })}
      />
      <CategoryManagerModal
        visible={showCategoryManager}
        title="فئات المستودع"
        categories={categories}
        onClose={() => setShowCategoryManager(false)}
        onSave={saveCategory}
        onDelete={deleteCategory}
      />
      <ConfirmDialog
        visible={Boolean(itemPendingDelete)}
        title="حذف المادة"
        message={itemPendingDelete ? `سيتم حذف «${itemPendingDelete.name}»${movements.filter((movement) => movement.itemId === itemPendingDelete.id).length ? " وسجل الحركة المرتبط بها" : ""}. لا يمكن التراجع عن ذلك.` : ""}
        confirmText="حذف المادة"
        isDangerous
        icon="warning"
        onCancel={() => setItemPendingDelete(null)}
        onConfirm={() => void confirmDeleteItem()}
      />
      <ConfirmDialog
        visible={movementSavePending}
        title="تأكيد حركة المخزون"
        message={selectedItemForMovement ? `سيتم ${movementForm.movementType === "in" ? "إدخال" : "إخراج"} ${movementForm.quantity} ${movementForm.movementUnit === "package" ? "طرد" : "قطعة"} من مادة «${selectedItemForMovement.name}».` : ""}
        confirmText="تأكيد الحركة"
        icon="swap-horiz"
        onCancel={() => setMovementSavePending(false)}
        onConfirm={() => { setMovementSavePending(false); void handleSaveMovement(); }}
      />
      <Modal visible={Boolean(itemActionTarget)} transparent animationType="fade" onRequestClose={() => setItemActionTarget(null)}>
        <View style={styles.actionOverlay}>
          <View style={[styles.actionSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.actionSheetIcon, { backgroundColor: colors.primary + "16" }]}><MaterialIcons name="inventory-2" size={25} color={colors.primary} /></View>
            <Text style={[styles.actionSheetTitle, { color: colors.foreground }]}>{itemActionTarget?.name}</Text>
            <Text style={[styles.actionSheetHint, { color: colors.muted }]}>اختر الإجراء المطلوب لهذه المادة</Text>
            {canEdit ? <TouchableOpacity onPress={() => itemActionTarget && beginEditItem(itemActionTarget)} style={[styles.actionSheetButton, { backgroundColor: colors.primary }]}><MaterialIcons name="edit" size={19} color="#fff" /><Text style={styles.actionSheetButtonText}>تعديل المادة</Text></TouchableOpacity> : null}
            {canDelete ? <TouchableOpacity onPress={() => { if (itemActionTarget) handleDeleteItem(itemActionTarget); setItemActionTarget(null); }} style={[styles.actionSheetButton, { backgroundColor: colors.error + "12", borderWidth: 1, borderColor: colors.error + "34" }]}><MaterialIcons name="delete-outline" size={19} color={colors.error} /><Text style={[styles.actionSheetButtonText, { color: colors.error }]}>حذف المادة وسجلها</Text></TouchableOpacity> : null}
            <TouchableOpacity onPress={() => setItemActionTarget(null)} style={styles.actionSheetCancel}><Text style={[styles.actionSheetCancelText, { color: colors.muted }]}>إلغاء</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ConfirmDialog
        visible={notice.visible}
        title={notice.title}
        message={notice.message}
        confirmText="حسنًا"
        cancelText="إغلاق"
        confirmColor={colors.primary}
        icon={notice.icon}
        onCancel={() => setNotice({ visible: false, title: "", message: "", icon: "info" })}
        onConfirm={() => setNotice({ visible: false, title: "", message: "", icon: "info" })}
      />

      <WarehouseReportSettingsSheet visible={reportSettingsOpen} value={reportSettings} onClose={() => setReportSettingsOpen(false)} onSave={(settings) => void saveReportSettings(settings)} />
      <ReportFab
        module="warehouse"
        addLabel={activeTab === "tools" ? "أداة جديدة" : activeTab === "items" ? "إضافة مادة" : "حركة مخزون"}
        onAdd={canCreate ? () => {
          if (activeTab === "tools") { setToolOpenSignal((value) => value + 1); return; }
          if (activeTab === "movements") { setMovementForm({ movementType: "in", movementUnit: "package", quantity: "", notes: "", movementDate: new Date().toISOString().split("T")[0] }); setShowMovementModal(true); return; }
          setEditingItem(null); setItemForm({ name: "", category: categories[0]?.id || "gifts", packageCount: "", piecesPerPackage: "", minimumQuantity: "5", description: "" }); setShowItemModal(true);
        } : undefined}
        onSettings={() => setReportSettingsOpen(true)}
        onExport={(format) => void exportUnifiedWarehouseReport(format)}
        exporting={exporting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  alertBanner: { flexDirection: "row", alignItems: "center", padding: 10, gap: 8, justifyContent: "center" },
  alertText: { fontSize: 13, fontWeight: "600" as any },
  tabBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 0.5 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 14, fontWeight: "600" as any },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  list: { padding: 12, gap: 8 },
  itemCard: { borderRadius: 15, padding: 12, borderWidth: 1, gap: 12 },
  itemTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemText: { flex: 1 },
  holdHint: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  holdHintText: { fontSize: 10, fontWeight: "700" as any },
  actionOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end", padding: 14 }, actionSheet: { borderRadius: 24, padding: 20, alignItems: "center" }, actionSheetIcon: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" }, actionSheetTitle: { fontSize: 16, fontWeight: "800" as any, marginTop: 10, textAlign: "center" }, actionSheetHint: { fontSize: 12, marginTop: 4, marginBottom: 16, textAlign: "center" }, actionSheetButton: { width: "100%", minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 8 }, actionSheetButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" as any }, actionSheetCancel: { minHeight: 40, marginTop: 8, justifyContent: "center", paddingHorizontal: 18 }, actionSheetCancelText: { fontSize: 13, fontWeight: "700" as any },
  catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  itemName: { fontSize: 14, fontWeight: "600" as any },
  itemCat: { fontSize: 12, marginTop: 2 },
  stockRow: { minHeight: 42, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stockLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stockLabel: { fontSize: 12, fontWeight: "600" as any },
  itemQty: { fontSize: 20, fontWeight: "800" as any },
  itemUnit: { fontSize: 12 },
  movementCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 12, borderWidth: 1, borderLeftWidth: 4 },
  movementRight: { flex: 1 },
  movementItem: { fontSize: 14, fontWeight: "600" as any, textAlign: "right" },
  movementDate: { fontSize: 12, textAlign: "right" },
  movementNotes: { fontSize: 11, textAlign: "right" },
  movementLeft: { alignItems: "flex-end" },
  movementQty: { fontSize: 18, fontWeight: "800" as any },
  movementType: { fontSize: 11, fontWeight: "600" as any },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14 },
  modal: { flex: 1 },
  modalHeader: { minHeight: DESIGN.control.large, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: DESIGN.spacing.lg, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 17, fontWeight: "700" as any },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontWeight: "600" as any },
  modalContent: { flex: 1, padding: DESIGN.spacing.lg },
  formGroup: { marginBottom: DESIGN.spacing.lg },
  formLabel: { fontSize: 14, fontWeight: "600" as any, marginBottom: DESIGN.spacing.sm, textAlign: "right" },
  packageHint: { borderWidth: 1, borderRadius: DESIGN.radius.sm, minHeight: 58, padding: DESIGN.spacing.md, marginBottom: DESIGN.spacing.lg, flexDirection: "row", alignItems: "center", gap: 9 },
  packageHintText: { flex: 1, fontSize: 11, fontWeight: "600" as any, textAlign: "right", lineHeight: 17 },
  formInput: { borderWidth: 1, borderRadius: DESIGN.radius.sm, padding: DESIGN.spacing.md, minHeight: DESIGN.control.standard, fontSize: 15 },
  datePickerButton: { minHeight: DESIGN.control.standard, borderRadius: DESIGN.radius.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  datePickerText: { fontSize: 15, fontWeight: "600" as any },
  categoryLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: DESIGN.spacing.sm },
  manageCategoriesText: { fontSize: 13, fontWeight: "700" as any },
  categoryDropdown: { borderRadius: DESIGN.radius.sm, borderWidth: 1 },
  categoryDropdownButton: { minHeight: DESIGN.control.standard, paddingHorizontal: DESIGN.spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  categorySelection: { flexDirection: "row", alignItems: "center", gap: 8 },
  categorySelectionText: { fontSize: 15, fontWeight: "600" as any },
  categoryDropdownMenu: { borderTopWidth: 1, maxHeight: 210 },
  categoryDropdownItem: { minHeight: 44, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  categoryDropdownText: { fontSize: 14, fontWeight: "600" as any },
  movTypeRow: { flexDirection: "row", gap: 10 },
  movTypeBtn: { flex: 1, minHeight: DESIGN.control.standard, borderRadius: DESIGN.radius.sm, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  movTypeBtnText: { fontSize: 14, fontWeight: "600" as any },
  unitHelperText: { marginTop: 7, fontSize: 11, textAlign: "right" },
  itemSelector: { maxHeight: 150, borderWidth: 1, borderRadius: DESIGN.radius.sm, borderColor: "#E5E7EB" },
  itemSelectorOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, borderBottomWidth: 0.5 },
  itemSelectorName: { fontSize: 14, fontWeight: "500" as any },
  itemSelectorQty: { fontSize: 12 },
  modalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: DESIGN.spacing.lg, gap: DESIGN.spacing.md, borderTopWidth: 0.5 },
  footerBtn: { flex: 1, minHeight: DESIGN.control.standard, borderRadius: DESIGN.radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  footerBtnText: { fontSize: 15, fontWeight: '600' },
});
