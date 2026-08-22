import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { launchImageLibrary, launchCamera, type ImagePickerResponse } from "@/lib/media-picker";
import { ScreenContainer } from "@/components/screen-container";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { MediaSourcePickerModal } from "@/components/media-source-picker-modal";
import { useColors } from "@/hooks/use-colors";
import { useHasPermission } from "@/lib/app-context";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { deleteStoreSurveyDataCascade } from "@/lib/survey-storage";
import { OptimizedImage } from "@/components/ui/optimized-image";

import { exportTabReportExcel, exportTabReportPdf } from "@/lib/tab-report-exporter";
import { ErrorHandler } from "@/lib/error-handler";
import { ReportFab } from "@/components/report-fab";
import { SuccessModal } from "@/components/success-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StoreDetailsScreen } from "@/components/store-details-screen";
import { CardActionModal } from "@/components/card-action-modal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAnalytics, EventType } from "@/lib/analytics";
import { getKeyboardAvoidingBehavior } from "@/lib/keyboard-layout";
import { getRegionUsage, loadBrandRegionCatalog, saveRegions } from "@/lib/brand-region-repository";
import { CategoryManagerModal } from "@/components/category-manager-modal";
import { DEFAULT_STORE_CATEGORIES, getFallbackCategoryId, getManagedCategories, type ManagedCategory } from "@/lib/category-management";
interface StoreItem {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  region: string;
  address: string;
  category: string;
  notes: string;
  imageUri?: string;
  isActive: boolean;
  createdAt: string;
}

const getPermissionErrorMessage = (errorCode: string): string => {
  if (errorCode === 'permission') {
    return 'لم يتم منح الإذن للوصول إلى المعرض أو الكاميرا';
  }
  if (errorCode === 'others') {
    return 'حدث خطأ غير متوقع';
  }
  return `حدث خطأ: ${errorCode}`;
};

export default function StoresScreen() {
  const colors = useColors();
  const canCreate = useHasPermission("stores", "create"); const canEdit = useHasPermission("stores", "edit"); const canDelete = useHasPermission("stores", "delete");
  const analytics = useAnalytics();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  // تسجيل عرض الصفحة
  useEffect(() => {
    analytics.trackPageView('StoresScreen');
  }, [analytics]);
  const [filterCategory, setFilterCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreItem | null>(null);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ visible: boolean; storeId: string }>({ visible: false, storeId: "" });
  const [storeActionTarget, setStoreActionTarget] = useState<StoreItem | null>(null);
  const [showSuccessAdd, setShowSuccessAdd] = useState(false);
  const [showSuccessDelete, setShowSuccessDelete] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [regions, setRegions] = useState<string[]>(["منطقة 1", "منطقة 2", "منطقة 3"]);
  const [storeCategories, setStoreCategories] = useState<ManagedCategory[]>(DEFAULT_STORE_CATEGORIES);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showAddRegionModal, setShowAddRegionModal] = useState(false);
  const [newRegion, setNewRegion] = useState("");
  const [showSuccessRegionAdd, setShowSuccessRegionAdd] = useState(false);
  const [showSuccessRegionDelete, setShowSuccessRegionDelete] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<string | null>(null);
  const [showDeleteRegionConfirm, setShowDeleteRegionConfirm] = useState(false);
  const [showDetailsScreen, setShowDetailsScreen] = useState(false);
  const [selectedStoreForDetails, setSelectedStoreForDetails] = useState<StoreItem | null>(null);
  const [showSuccessUpdate, setShowSuccessUpdate] = useState(false);
  const [error, setError] = useState<string | Error | null>(null);
  const showError = useCallback((err: unknown) => {
    setError(err instanceof Error || typeof err === "string" ? err : "حدث خطأ غير متوقع");
  }, []);
  const dismissError = () => setError(null);
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    phone: "",
    region: "",
    address: "",
    category: "عادي",
    notes: "",
    imageUri: "",
  });
  const STORE_DRAFT_KEY = "@madar_store_form_draft";
  const emptyStoreForm = useCallback(() => ({ name: "", ownerName: "", phone: "", region: "", address: "", category: storeCategories.find((category) => category.label === "عادي")?.label ?? storeCategories[0]?.label ?? "", notes: "", imageUri: "" }), [storeCategories]);

  useEffect(() => {
    if (!showModal || editingStore) return;
    const restoreDraft = async () => {
      const draft = await AsyncStorage.getItem(STORE_DRAFT_KEY);
      if (draft) setForm(JSON.parse(draft));
    };
    void restoreDraft();
  }, [editingStore, showModal]);

  useEffect(() => {
    if (!showModal || editingStore) return;
    const draftTimer = setTimeout(() => {
      void AsyncStorage.setItem(STORE_DRAFT_KEY, JSON.stringify(form));
    }, 350);
    return () => clearTimeout(draftTimer);
  }, [editingStore, form, showModal]);

  const loadStores = useCallback(async () => {
    try {
      const startTime = Date.now();
      const data = await getItems<StoreItem>(STORAGE_KEYS.STORES);
      const filteredData = data.filter((s) => s.isActive);
      setStores(filteredData);
      
      analytics.track(EventType.ACTION, 'Load Stores', {
        count: filteredData.length,
        success: true,
      }, Date.now() - startTime);
    } catch (err) {
      const appError = ErrorHandler.parse(err);
      showError(appError);
      analytics.trackError('Load Stores', err as Error);
    }
  }, [showError, analytics]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // تحميل المناطق من المصدر الموحد مع إبقاء القائمة الحالية داخل نموذج المحل.
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const catalog = await loadBrandRegionCatalog();
        setRegions(catalog.regions.filter((region) => region.isActive).map((region) => region.name));
      } catch (error) {
        console.error("خطأ في تحميل المناطق:", error);
      }
    };
    loadRegions();
  }, []);

  useEffect(() => {
    const loadStoreCategories = async () => {
      const stored = await getItems<ManagedCategory>(STORAGE_KEYS.STORE_CATEGORIES);
      const resolved = getManagedCategories(stored, DEFAULT_STORE_CATEGORIES);
      if (!stored.length) await saveItems(STORAGE_KEYS.STORE_CATEGORIES, resolved);
      setStoreCategories(resolved);
    };
    void loadStoreCategories();
  }, []);

  // استخدام useMemo لتجنب إعادة الحساب في كل render
  const filtered = useMemo(() => stores.filter((s) => {
    const matchSearch = s.name.includes(search) || s.region.includes(search) || s.ownerName.includes(search);
    const matchCat = filterCategory === "all" || s.category === filterCategory;
    return matchSearch && matchCat;
  }), [stores, search, filterCategory]);

  const pickImage = () => {
    try {
      launchImageLibrary(
        {
          mediaType: 'mixed',
          quality: 0.8,
          includeBase64: false,
        },
        (response: ImagePickerResponse) => {
          if (response.didCancel) {
            console.log('تم إلغاء اختيار الملف');
          } else if (response.errorCode) {
            const errorMessage = getPermissionErrorMessage(response.errorCode);
            Alert.alert('خطأ', errorMessage);
          } else if (response.assets && response.assets.length > 0) {
            const mediaUri = response.assets[0].uri;
            if (mediaUri) {
              setForm({ ...form, imageUri: mediaUri });
              const mediaType = response.assets[0].type === 'video' ? 'الفيديو' : 'الصورة';
              Alert.alert('نجاح', `تم اختيار ${mediaType} بنجاح`);
            }
          }
        }
      );
    } catch (error) {
      console.error('خطأ في اختيار الملف:', error);
      Alert.alert('خطأ', 'فشل في اختيار الملف');
    }
  };

  const takePhoto = () => {
    try {
      launchCamera(
        {
          mediaType: 'mixed',
          quality: 0.8,
          includeBase64: false,
        },
        (response: ImagePickerResponse) => {
          if (response.didCancel) {
            console.log('تم إلغاء التقاط الملف');
          } else if (response.errorCode) {
            const errorMessage = getPermissionErrorMessage(response.errorCode);
            Alert.alert('خطأ', errorMessage);
          } else if (response.assets && response.assets.length > 0) {
            const mediaUri = response.assets[0].uri;
            if (mediaUri) {
              setForm({ ...form, imageUri: mediaUri });
              const mediaType = response.assets[0].type === 'video' ? 'الفيديو' : 'الصورة';
              Alert.alert('نجاح', `تم التقاط ${mediaType} بنجاح`);
            }
          }
        }
      );
    } catch (error) {
      console.error('خطأ في التقاط الملف:', error);
      Alert.alert('خطأ', 'فشل في التقاط الملف');
    }
  };

  const showImagePickerOptions = () => {
    setShowImagePickerModal(true);
  };

  const handleCameraPress = async () => {
    setShowImagePickerModal(false);
    await takePhoto();
  };

  const handleGalleryPress = async () => {
    setShowImagePickerModal(false);
    await pickImage();
  };

  const openAddModal = () => {
    setEditingStore(null);
    setForm(emptyStoreForm());
    setShowCategoryDropdown(false);
    setShowModal(true);
  };

  const openEditModal = (store: StoreItem) => {
    setEditingStore(store);
    setForm({ name: store.name, ownerName: store.ownerName || "", phone: store.phone || "", region: store.region || "", address: store.address || "", category: store.category, notes: store.notes || "", imageUri: store.imageUri || "" });
    setShowModal(true);
  };

  const handleSave = useCallback(async () => {
    try {
      if (!form.name.trim()) {
        Alert.alert("خطأ", "يرجى إدخال اسم المحل");
        return;
      }
      const allStores = await getItems<StoreItem>(STORAGE_KEYS.STORES);
      if (editingStore) {
        const updated = allStores.map((s) => (s.id === editingStore.id ? { ...s, ...form } : s));
        await saveItems(STORAGE_KEYS.STORES, updated);
      } else {
        const newStore: StoreItem = {
          id: Date.now().toString(),
          ...form,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        await saveItems(STORAGE_KEYS.STORES, [...allStores, newStore]);
      }
      await AsyncStorage.removeItem(STORE_DRAFT_KEY);
      if (!editingStore) setForm(emptyStoreForm());
      setEditingStore(null);
      setShowCategoryDropdown(false);
      setShowModal(false);
      await loadStores();
      if (editingStore) {
        setShowSuccessUpdate(true);
      } else {
        setShowSuccessAdd(true);
      }
    } catch (err) {
      const appError = ErrorHandler.parse(err);
      showError(appError.message);
    }
  }, [form, editingStore, emptyStoreForm, loadStores, showError]);

  const handleDelete = (id: string) => {
    setDeleteConfirmation({ visible: true, storeId: id });
  };

  const confirmDelete = async () => {
    try {
      const { storeId } = deleteConfirmation;
      await deleteStoreSurveyDataCascade(storeId);
      setDeleteConfirmation({ visible: false, storeId: "" });
      setShowSuccessDelete(true);
      await loadStores();
    } catch (err) {
      const appError = ErrorHandler.parse(err);
      showError(appError.message);
    }
  };

  const handleDeleteRegion = (region: string) => {
    setRegionToDelete(region);
    setShowDeleteRegionConfirm(true);
  };

  const confirmDeleteRegion = async () => {
    if (!regionToDelete) return;
    const usage = await getRegionUsage(regionToDelete);
    if (usage.stores + usage.events + usage.surveys > 0) {
      Alert.alert("لا يمكن الحذف", "هذه المنطقة مرتبطة ببيانات قائمة. عدّل الارتباطات أولاً.");
      setShowDeleteRegionConfirm(false);
      setRegionToDelete(null);
      return;
    }
    const catalog = await loadBrandRegionCatalog();
    const updatedRegions = catalog.regions.filter((region) => region.name !== regionToDelete);
    await saveRegions(updatedRegions);
    setRegions(updatedRegions.filter((region) => region.isActive).map((region) => region.name));
    setShowDeleteRegionConfirm(false);
    setRegionToDelete(null);
    setShowSuccessRegionDelete(true);
  };

  const handleAddRegion = async () => {
    const regionName = newRegion.trim();
    if (!regionName) return;
    const catalog = await loadBrandRegionCatalog();
    if (catalog.regions.some((region) => region.name.toLocaleLowerCase("ar") === regionName.toLocaleLowerCase("ar"))) {
      Alert.alert("تنبيه", "هذه المنطقة موجودة بالفعل");
      return;
    }
    const updatedRegions = [...catalog.regions, { id: `region-${Date.now()}`, name: regionName, ratingId: catalog.ratings[0]?.id || "rating-a", isActive: true, createdAt: new Date().toISOString() }];
    await saveRegions(updatedRegions);
    setRegions(updatedRegions.filter((region) => region.isActive).map((region) => region.name));
    setShowAddRegionModal(false);
    setNewRegion("");
    setShowSuccessRegionAdd(true);
  };

  const getCategoryColor = (cat: string) => {
    return storeCategories.find((category) => category.label === cat)?.color ?? colors.warning;
  };

  const saveStoreCategory = async (category: ManagedCategory) => {
    const previous = storeCategories.find((item) => item.id === category.id);
    const next = previous ? storeCategories.map((item) => item.id === category.id ? category : item) : [...storeCategories, category];
    await saveItems(STORAGE_KEYS.STORE_CATEGORIES, next);
    if (previous && previous.label !== category.label) {
      const allStores = await getItems<StoreItem>(STORAGE_KEYS.STORES);
      await saveItems(STORAGE_KEYS.STORES, allStores.map((store) => store.category === previous.label ? { ...store, category: category.label } : store));
      if (form.category === previous.label) setForm((current) => ({ ...current, category: category.label }));
      await loadStores();
    }
    setStoreCategories(next);
  };

  const deleteStoreCategory = async (category: ManagedCategory) => {
    if (storeCategories.length < 2) { Alert.alert("لا يمكن الحذف", "يجب أن يبقى تصنيف واحد على الأقل."); return; }
    const fallbackId = getFallbackCategoryId(storeCategories, category.id);
    const fallback = storeCategories.find((item) => item.id === fallbackId);
    if (!fallback) return;
    const allStores = await getItems<StoreItem>(STORAGE_KEYS.STORES);
    const next = storeCategories.filter((item) => item.id !== category.id);
    await Promise.all([
      saveItems(STORAGE_KEYS.STORE_CATEGORIES, next),
      saveItems(STORAGE_KEYS.STORES, allStores.map((store) => store.category === category.label ? { ...store, category: fallback.label } : store)),
    ]);
    if (form.category === category.label) setForm((current) => ({ ...current, category: fallback.label }));
    setStoreCategories(next);
    await loadStores();
  };

  const openDetailsScreen = (store: StoreItem) => {
    setSelectedStoreForDetails(store);
    setShowDetailsScreen(true);
  };

  const handleExportStores = async (format: "pdf" | "excel") => {
    setExporting(format);
    const report = { title: "تقرير المحلات", filename: "المحلات", columns: ["اسم المحل", "المالك", "رقم التواصل", "المنطقة", "العنوان", "التصنيف", "الحالة", "الملاحظات"], rows: stores.map((store) => ({ "اسم المحل": store.name, المالك: store.ownerName, "رقم التواصل": store.phone, المنطقة: store.region, العنوان: store.address, التصنيف: store.category, الحالة: store.isActive ? "نشط" : "غير نشط", الملاحظات: store.notes })) };
    try { if (format === "pdf") await exportTabReportPdf(report); else await exportTabReportExcel(report); } finally { setExporting(null); }
  };

  // معالج زر الرجوع للهاتف
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showDetailsScreen) {
        setShowDetailsScreen(false);
        return true;
      }
      if (showModal) {
        setShowModal(false);
        return true;
      }
      if (showImagePickerModal) {
        setShowImagePickerModal(false);
        return true;
      }
      if (showAddRegionModal) {
        setShowAddRegionModal(false);
        setNewRegion("");
        return true;
      }
      if (showDeleteRegionConfirm) {
        setShowDeleteRegionConfirm(false);
        return true;
      }
      return false;
    });
    
    return () => backHandler.remove();
  }, [showDetailsScreen, showModal, showImagePickerModal, showAddRegionModal, showDeleteRegionConfirm]);



  const renderStore = ({ item }: { item: StoreItem }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => openDetailsScreen(item)}
      onLongPress={() => setStoreActionTarget(item)}
      delayLongPress={350}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <View style={[styles.catBadge, { backgroundColor: getCategoryColor(item.category) + "20" }]}>
            <Text style={[styles.catText, { color: getCategoryColor(item.category) }]}>{item.category}</Text>
          </View>
        </View>
        <View style={styles.cardTitleSection}>
          <Text style={[styles.storeName, { color: colors.foreground }]}>{item.name}</Text>
        </View>
        <View style={[styles.storeIcon, { backgroundColor: colors.primary + "20" }]}>
          <MaterialIcons name="store" size={16} color={colors.primary} />
        </View>
      </View>
      <View style={[styles.cardBody, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12, marginBottom: 12 }]}>
        {item.ownerName ? (
          <View style={styles.infoRow}>
            <Text style={[styles.infoText, { color: colors.muted }]}>{item.ownerName}</Text>
            <MaterialIcons name="person" size={14} color={colors.muted} />
          </View>
        ) : null}
        {item.phone ? (
          <View style={styles.infoRow}>
            <Text style={[styles.infoText, { color: colors.muted }]}>{item.phone}</Text>
            <MaterialIcons name="phone" size={14} color={colors.muted} />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {error && (
        <View style={styles.errorContainer}>
          <View style={[styles.errorBox, { backgroundColor: colors.error }]}>
            <Text style={[styles.errorText, { color: colors.background }]}>
              {typeof error === 'string' ? error : error.message || 'حدث خطأ'}
            </Text>
            <TouchableOpacity onPress={dismissError} style={styles.errorCloseBtn}>
              <MaterialIcons name="close" size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, flex: 1, textAlign: "center" }]}>إدارة المحلات ({stores.length})</Text>
      </View>
      <ReportFab module="stores" addLabel="إضافة محل" onAdd={canCreate ? openAddModal : undefined} exporting={exporting} onExport={handleExportStores} />

      <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="بحث بالاسم أو المنطقة..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
        <MaterialIcons name="search" size={20} color={colors.muted} />
      </View>

      <View style={[styles.filterDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.filterDropdownButton} onPress={() => setShowFilterDropdown(!showFilterDropdown)}>
          <Text style={[styles.filterDropdownText, { color: colors.foreground }]}>{filterCategory === "all" ? "الكل" : filterCategory}</Text>
          <MaterialIcons name={showFilterDropdown ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
        </TouchableOpacity>
        {showFilterDropdown && (
          <ScrollView style={[styles.filterDropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
            {[{ value: "all", label: "الكل" }, ...storeCategories.map((category) => ({ value: category.label, label: category.label }))].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterDropdownItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setFilterCategory(opt.value);
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={[styles.filterDropdownItemText, { color: colors.foreground }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderStore}
        contentContainerStyle={styles.list}
        numColumns={1}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="store" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد محلات</Text>
            <TouchableOpacity onPress={openAddModal} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.emptyBtnText}>إضافة محل</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <FloatingFormModal visible={showModal} onClose={() => setShowModal(false)} backgroundColor={colors.background}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
          <KeyboardAvoidingView
            behavior={getKeyboardAvoidingBehavior(Platform.OS)}
            style={{ flex: 1, backgroundColor: colors.background }}
          >
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <MaterialIcons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingStore ? "تعديل المحل" : "محل جديد"}</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                {[
                  { key: "name", label: "اسم المحل *", placeholder: "أدخل اسم المحل" },
                  { key: "ownerName", label: "اسم المالك", placeholder: "أدخل اسم المالك" },
                  { key: "phone", label: "رقم الهاتف", placeholder: "أدخل رقم الهاتف", keyboardType: "phone-pad" as const },
                ].map((field) => (
                  <View key={field.key} style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.foreground }]}>{field.label}</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                      value={(form as any)[field.key]}
                      onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.muted}
                      keyboardType={field.keyboardType || "default"}
                      textAlign="right"
                    />
                  </View>
                ))}

                <View style={[styles.formGroup, { marginTop: 8, zIndex: 1000 }]}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>المنطقة *</Text>
                  <View style={[styles.regionDropdown, { backgroundColor: colors.surface, borderColor: colors.border, zIndex: 1000 }]}>
                    <TouchableOpacity style={styles.regionDropdownButton} onPress={() => setShowRegionDropdown(!showRegionDropdown)}>
                      <Text style={[styles.regionDropdownText, { color: form.region ? colors.foreground : colors.muted }]}>
                        {form.region || "اختر المنطقة"}
                      </Text>
                      <MaterialIcons name={showRegionDropdown ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
                    </TouchableOpacity>
                    {showRegionDropdown && (
                      <ScrollView style={[styles.regionDropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border, zIndex: 1000 }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                        {regions.map((region) => (
                          <TouchableOpacity
                            key={region}
                            style={[styles.regionDropdownItem, { borderBottomColor: colors.border }]}
                            onPress={() => {
                              setForm((f) => ({ ...f, region }));
                              setShowRegionDropdown(false);
                            }}
                          >
                            <Text style={[styles.regionDropdownItemText, { color: colors.foreground }]}>{region}</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          style={[styles.regionDropdownItem, { borderBottomColor: colors.border }]}
                          onPress={() => {
                            setShowRegionDropdown(false);
                            setShowAddRegionModal(true);
                          }}
                        >
                          <Text style={[styles.regionDropdownItemText, { color: colors.primary, fontWeight: "600" as any }]}>+ إضافة منطقة جديدة</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    )}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>العنوان التفصيلي</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                    value={form.address}
                    onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                    placeholder="أدخل العنوان"
                    placeholderTextColor={colors.muted}
                    textAlign="right"
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.categoryHeading}>
                    <TouchableOpacity onPress={() => setShowCategoryManager(true)}><Text style={[styles.manageCategories, { color: colors.primary }]}>إدارة التصنيفات</Text></TouchableOpacity>
                    <Text style={[styles.formLabel, { color: colors.foreground, marginBottom: 0 }]}>التصنيف</Text>
                  </View>
                  <View style={[styles.categoryDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity onPress={() => setShowCategoryDropdown((value) => !value)} style={styles.categoryDropdownButton}>
                      <MaterialIcons name={showCategoryDropdown ? "expand-less" : "expand-more"} size={22} color={colors.primary} />
                      <Text style={[styles.categoryDropdownText, { color: colors.foreground }]}>{form.category || "اختر التصنيف"}</Text>
                    </TouchableOpacity>
                    {showCategoryDropdown ? <ScrollView nestedScrollEnabled style={[styles.categoryDropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>{storeCategories.map((category) => <TouchableOpacity key={category.id} onPress={() => { setForm((current) => ({ ...current, category: category.label })); setShowCategoryDropdown(false); }} style={[styles.categoryDropdownItem, { borderBottomColor: colors.border }]}><MaterialIcons name={form.category === category.label ? "check-circle" : "radio-button-unchecked"} size={19} color={form.category === category.label ? category.color : colors.muted} /><Text style={[styles.categoryDropdownItemText, { color: colors.foreground }]}>{category.label}</Text></TouchableOpacity>)}</ScrollView> : null}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>الصورة (اختيارية)</Text>
                  {form.imageUri ? (
                    <View style={styles.imagePreview}>
                      <OptimizedImage uri={form.imageUri} width="100%" height={200} contentFit="cover" />
                      <TouchableOpacity
                        onPress={() => setForm((f) => ({ ...f, imageUri: "" }))}
                        style={[styles.removeImageBtn, { backgroundColor: colors.error }]}
                      >
                        <MaterialIcons name="close" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => showImagePickerOptions()}
                      style={[styles.imagePickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <MaterialIcons name="add-a-photo" size={24} color={colors.primary} />
                      <Text style={[styles.imagePickerText, { color: colors.primary }]}>اختر صورة</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>ملاحظات</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                    value={form.notes}
                    onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                    placeholder="ملاحظات..."
                    placeholderTextColor={colors.muted}
                    multiline
                    numberOfLines={3}
                    textAlign="right"
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={[styles.saveBtnBottom, { backgroundColor: colors.primary }]}>
                  <Text style={styles.saveBtnText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </FloatingFormModal>

      <MediaSourcePickerModal
        visible={showImagePickerModal}
        title="إضافة صورة المحل"
        description="اختر تصوير المحل أو اختيار صورة محفوظة"
        onClose={() => setShowImagePickerModal(false)}
        onCamera={() => void handleCameraPress()}
        onLibrary={() => void handleGalleryPress()}
      />

      <ConfirmDialog
        visible={deleteConfirmation.visible}
        title="حذف المحل"
        message="هل أنت متأكد من حذف هذا المحل؟ لا يمكن التراجع عن هذه العملية."
        confirmText="حذف"
        isDangerous
        icon="warning"
        onCancel={() => setDeleteConfirmation({ visible: false, storeId: "" })}
        onConfirm={() => void confirmDelete()}
      />
      <CardActionModal visible={Boolean(storeActionTarget)} title={storeActionTarget?.name || "إجراءات المحل"} description="اختر الإجراء المطلوب لهذا المحل" onClose={() => setStoreActionTarget(null)} actions={[...(canEdit ? [{ id: "edit", label: "تعديل المحل", icon: "edit" as const, onPress: () => { const target = storeActionTarget; setStoreActionTarget(null); if (target) openEditModal(target); } }] : []), ...(canDelete ? [{ id: "delete", label: "حذف المحل", icon: "delete-outline" as const, tone: "danger" as const, onPress: () => { const target = storeActionTarget; setStoreActionTarget(null); if (target) handleDelete(target.id); } }] : [])]} />

      {/* Modal لإضافة منطقة جديدة */}
      <Modal
        visible={showAddRegionModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddRegionModal(false);
          setNewRegion("");
        }}
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView behavior={getKeyboardAvoidingBehavior(Platform.OS)} style={{ flex: 1 }}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddRegionModal(false);
                  setNewRegion("");
                }}
              >
                <MaterialIcons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>إضافة منطقة جديدة</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>اسم المنطقة *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  value={newRegion}
                  onChangeText={setNewRegion}
                  placeholder="أدخل اسم المنطقة"
                  placeholderTextColor={colors.muted}
                  textAlign="right"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>المناطق الحالية</Text>
                {regions.map((region) => (
                  <View key={region} style={[styles.regionItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity onPress={() => handleDeleteRegion(region)} style={styles.deleteRegionBtn}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                    <Text style={[styles.regionItemText, { color: colors.foreground }]}>{region}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <View style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setShowAddRegionModal(false);
                  setNewRegion("");
                }}
              >
                <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtnBottom, { backgroundColor: newRegion.trim() ? colors.primary : colors.muted }]}
                onPress={handleAddRegion}
                disabled={!newRegion.trim()}
              >
                <Text style={[styles.saveBtnText, { color: "#fff" }]}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Delete Region Confirmation Modal */}
      <Modal visible={showDeleteRegionConfirm} transparent={true} animationType="fade" onRequestClose={() => setShowDeleteRegionConfirm(false)}>
        <View style={styles.deleteConfirmOverlay}>
          <View style={[styles.deleteConfirmBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="warning" size={48} color={colors.error} style={{ marginBottom: 12 }} />
            <Text style={[styles.deleteConfirmTitle, { color: colors.foreground }]}>حذف المنطقة</Text>
            <Text style={[styles.deleteConfirmMessage, { color: colors.muted }]}>{`هل أنت متأكد من حذف المنطقة "${regionToDelete}"؟`}</Text>
            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={[styles.deleteConfirmCancel, { backgroundColor: colors.muted + "20" }]}
                onPress={() => {
                  setShowDeleteRegionConfirm(false);
                  setRegionToDelete(null);
                }}
              >
                <Text style={[styles.deleteConfirmCancelText, { color: colors.foreground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteConfirmDelete, { backgroundColor: colors.error }]} onPress={confirmDeleteRegion}>
                <Text style={styles.deleteConfirmDeleteText}>حذف</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SuccessModal visible={showSuccessAdd} message="تم إضافة المحل بنجاح" onClose={() => setShowSuccessAdd(false)} />
      <SuccessModal visible={showSuccessDelete} message="تم حذف المحل بنجاح" onClose={() => setShowSuccessDelete(false)} />
      <SuccessModal visible={showSuccessUpdate} message="تم تحديث بيانات المحل بنجاح" onClose={() => setShowSuccessUpdate(false)} />
      <SuccessModal visible={showSuccessRegionAdd} message="تم إضافة المنطقة بنجاح" onClose={() => setShowSuccessRegionAdd(false)} />
      <SuccessModal visible={showSuccessRegionDelete} message="تم حذف المنطقة بنجاح" onClose={() => setShowSuccessRegionDelete(false)} />
      <CategoryManagerModal
        visible={showCategoryManager}
        title="تصنيفات المحلات"
        categories={storeCategories}
        onClose={() => setShowCategoryManager(false)}
        onSave={saveStoreCategory}
        onDelete={deleteStoreCategory}
      />

      {selectedStoreForDetails && (
        <StoreDetailsScreen
          store={selectedStoreForDetails}
          visible={showDetailsScreen}
          onClose={() => setShowDetailsScreen(false)}
          onEdit={(store) => {
            setEditingStore(store);
            setForm({ name: store.name, ownerName: store.ownerName || "", phone: store.phone || "", region: store.region || "", address: store.address || "", category: store.category, notes: store.notes || "", imageUri: store.imageUri || "" });
            setShowModal(true);
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: "700" as any },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", margin: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { maxHeight: 44 },
  filterContent: { paddingHorizontal: 12, gap: 8, alignItems: "center" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#E5E7EB" },
  filterChipText: { fontSize: 13, fontWeight: "500" as any },
  filterDropdown: { marginHorizontal: 16, marginVertical: 12, borderRadius: 10, borderWidth: 1, overflow: "hidden" as const },
  filterDropdownButton: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 16, paddingVertical: 12 },
  filterDropdownText: { fontSize: 15, fontWeight: "600" as any },
  filterDropdownMenu: { borderTopWidth: 1, maxHeight: 210 },
  filterDropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  filterDropdownItemText: { fontSize: 14, fontWeight: "500" as any },
  regionDropdown: { marginHorizontal: 0, marginVertical: 0, borderRadius: 10, borderWidth: 1, overflow: "hidden" as const },
  regionDropdownButton: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 12, paddingVertical: 12 },
  regionDropdownText: { fontSize: 15, fontWeight: "600" as any },
  regionDropdownMenu: { borderTopWidth: 1, maxHeight: 210 },
  regionDropdownItem: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  regionDropdownItemText: { fontSize: 14, fontWeight: "500" as any },
  regionItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10, justifyContent: "space-between" },
  regionItemText: { fontSize: 14, fontWeight: "500" as any, flex: 1, marginRight: 12 },
  deleteRegionBtn: { padding: 8 },
  list: { padding: 12, gap: 10 },
  card: { borderRadius: 14, padding: 14, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 },
  cardTopLeft: { flex: 0 },
  cardTitleSection: { flex: 1 },
  storeName: { fontSize: 15, fontWeight: "700" as any, flex: 1, textAlign: "left" },
  storeIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", justifyContent: "center" },
  catText: { fontSize: 12, fontWeight: "600" as any, textAlign: "center" },
  cardBody: { gap: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 6 },
  infoText: { fontSize: 13 },
  cardFooter: { flexDirection: "row", justifyContent: "flex-start" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  deleteBtnText: { fontSize: 14, fontWeight: "600" as any },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16 },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: "#fff", fontWeight: "600" as any },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 17, fontWeight: "700" as any },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontWeight: "600" as any },
  modalFooter: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, justifyContent: "space-between" },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontWeight: "600" as any, fontSize: 16 },
  saveBtnBottom: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modalContent: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600" as any, marginBottom: 8, textAlign: "left" },
  formInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  textArea: { height: 80 },
  categoryHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  manageCategories: { fontSize: 13, fontWeight: "700" as any },
  categoryDropdown: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  categoryDropdownButton: { minHeight: 48, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  categoryDropdownText: { fontSize: 15, fontWeight: "600" as any },
  categoryDropdownMenu: { maxHeight: 210, borderTopWidth: 1 },
  categoryDropdownItem: { minHeight: 44, paddingHorizontal: 12, borderBottomWidth: 0.5, flexDirection: "row", alignItems: "center", gap: 9 },
  categoryDropdownItemText: { fontSize: 14, fontWeight: "600" as any },
  imagePreview: { position: "relative" as const, borderRadius: 10, overflow: "hidden", marginBottom: 12, width: "100%" },
  previewImage: { width: "100%", height: 200, borderRadius: 10 },
  removeImageBtn: { position: "absolute" as const, top: 8, right: 8, width: 32, height: 32, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const, zIndex: 10 },
  imagePickerBtn: { borderWidth: 2, borderRadius: 10, borderStyle: "dashed" as const, paddingVertical: 32, paddingHorizontal: 16, alignItems: "center" as const, justifyContent: "center" as const, gap: 12, width: "100%" },
  imagePickerText: { fontSize: 14, fontWeight: "600" as any },
  imagePickerOverlay: { flex: 1, alignItems: "center" as const, justifyContent: "flex-start" as const },
  imagePickerContent: { width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, paddingVertical: 16, paddingHorizontal: 16 },
  imagePickerTitle: { fontSize: 18, fontWeight: "700" as any, marginBottom: 16, textAlign: "center" },
  imagePickerOption: { flexDirection: "row" as const, alignItems: "center" as const, paddingVertical: 16, paddingHorizontal: 12, gap: 16, borderBottomWidth: 1 },
  imagePickerOptionText: { fontSize: 16, fontWeight: "500" as any },
  imagePickerCancel: { marginTop: 12, paddingVertical: 12, borderRadius: 10, alignItems: "center" as const },
  imagePickerCancelText: { fontSize: 16, fontWeight: "600" as any },
  deleteConfirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center" as const, justifyContent: "center" as const },
  deleteConfirmBox: { borderRadius: 16, padding: 24, alignItems: "center" as const, width: "80%", borderWidth: 1 },
  deleteConfirmTitle: { fontSize: 18, fontWeight: "700" as any, marginBottom: 12 },
  deleteConfirmMessage: { fontSize: 14, marginBottom: 24, textAlign: "center" as const },
  deleteConfirmButtons: { flexDirection: "row" as const, gap: 12, width: "100%" },
  deleteConfirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" as const },
  deleteConfirmCancelText: { fontSize: 16, fontWeight: "600" as any },
  deleteConfirmDelete: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" as const },
  deleteConfirmDeleteText: { fontSize: 16, fontWeight: "600" as any, color: "#fff" },
  errorContainer: { paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  errorBox: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 },
  errorText: { flex: 1, fontSize: 14, fontWeight: "500" as any },
  errorCloseBtn: { marginLeft: 12 },
});
