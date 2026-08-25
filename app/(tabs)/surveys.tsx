import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  Switch,
  Pressable,
  Image,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { launchImageLibrary, launchCamera, type ImagePickerResponse } from "@/lib/media-picker";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useColors } from "@/hooks/use-colors";
import { useHasPermission } from "@/lib/app-context";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { deleteSurveyResultCascade, deleteSurveyTemplateCascade, loadSurveyScreenData, saveSurveyTemplateWithActiveCycleSync } from "@/lib/survey-storage";
import { SurveyAnalyticsModule } from "@/components/modules/survey-analytics-module";
import { ReportFab } from "@/components/report-fab";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { exportTabReportExcel, exportTabReportPdf } from "@/lib/tab-report-exporter";
import { ErrorHandler } from "@/lib/error-handler";
import { SuccessModal } from "@/components/success-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SurveyResultDetailScreen } from "@/components/survey-result-detail-screen";
import { CardActionModal } from "@/components/card-action-modal";
import { SurveyPageSheetModal } from "@/components/surveys/survey-page-sheet-modal";
import { SurveyTemplateProductSelector } from "@/components/surveys/survey-template-product-selector";
import { StorePhotosEditor } from "@/components/surveys/store-photos-editor";
import { AddQuestionModal } from "@/components/surveys/add-question-modal";
import { SurveyResultCard, SurveyTemplateCard } from "@/components/surveys/survey-list-cards";
import { deleteUnreferencedSurveyStorePhotos } from "@/lib/survey-store-photos";
import { createSurveyTemplateExport, createSurveyTemplateImportPlan, applySurveyTemplateImport, reconcileProductCategories, type SurveyTemplateImportPlan } from "@/lib/survey-template-transfer";
import { exportSurveyTemplateFile, readSurveyTemplateFile } from "@/lib/survey-template-transfer-service";
import { createSurveyResultsExport } from "@/lib/survey-results-transfer";
import { exportSurveyResultsFile } from "@/lib/survey-results-transfer-service";
import { getSurveyOverlayToClose } from "@/lib/survey-overlay-state";
import { useOverlayBackHandler } from "@/lib/use-overlay-back-handler";
import { shouldShowProductPrice, shouldShowShelfPercentage } from "@/lib/survey-product-fields";
import {
  addResultToActiveSurveyCycle,
  closeActiveSurveyCycle,
  getActiveSurveyCycleResults,
  getSurveyCycleSummary,
  getSurveyResultDisplayName,
  isStoreUsedInActiveSurveyCycle,
  sortSurveyCyclesNewestFirst,
} from "@/lib/survey-cycle-manager";
import type { Product, Question, Store, SurveyCycle, SurveyResult, SurveyTemplate, SurveyNoteType } from "@/lib/types/survey-types";
import { calculateShelfPercentage, normalizeShelfValue, orderSurveyProducts } from "@/lib/survey-order-and-shelves";

const getPermissionErrorMessage = (errorCode: string): string => {
  if (errorCode === 'permission') {
    return 'لم يتم منح الإذن للوصول إلى المعرض أو الكاميرا';
  }
  if (errorCode === 'others') {
    return 'حدث خطأ غير متوقع';
  }
  return `حدث خطأ: ${errorCode}`;
};

function mergeStoredItems<T extends { id: string }>(memoryItems: T[], storedItems: T[]): T[] {
  const merged = new Map(memoryItems.map((item) => [item.id, item]));
  storedItems.forEach((item) => merged.set(item.id, item));
  return [...merged.values()];
}

export default function SurveysScreen() {
  const colors = useColors();
  const canCreate = useHasPermission("surveys", "create");
  const canEdit = useHasPermission("surveys", "edit");
  const canDelete = useHasPermission("surveys", "delete");
  const [activeTab, setActiveTab] = useState<"templates" | "results" | "analytics">("templates");
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [results, setResults] = useState<SurveyResult[]>([]);
  const [cycles, setCycles] = useState<SurveyCycle[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [exportingTemplateId, setExportingTemplateId] = useState<string | null>(null);
  const [showResultsExportModal, setShowResultsExportModal] = useState(false);
  const [resultsExportTemplateId, setResultsExportTemplateId] = useState("");
  const [resultsExportCycleId, setResultsExportCycleId] = useState<string | "all">("all");
  const [isExportingResultsFile, setIsExportingResultsFile] = useState(false);
  const [pendingTemplateImport, setPendingTemplateImport] = useState<SurveyTemplateImportPlan | null>(null);
  const [pendingTemplateImportName, setPendingTemplateImportName] = useState("");
  const [isImportingTemplate, setIsImportingTemplate] = useState(false);
  
  // معالج زر الرجوع للهاتف - سيتم إضافته بعد تعريف جميع الحالات
  
  // Create Template Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Map<string, boolean>>(new Map());
  const [showShelfPercentage, setShowShelfPercentage] = useState(false);
  const [showProductPrice, setShowProductPrice] = useState(false);
  const [allowStorePhoto, setAllowStorePhoto] = useState(false);
  
  // Use Template Modal
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SurveyTemplate | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [surveyData, setSurveyData] = useState<Map<string, { present?: boolean; shelfPercentage?: number; shelfOccupied?: number; price?: number; answers?: string[] }>>(new Map());
  const [totalShelves, setTotalShelves] = useState("");
  const [storePhotoUris, setStorePhotoUris] = useState<string[]>([]);
  const [surveyNotes, setSurveyNotes] = useState("");
  const [surveyNoteType, setSurveyNoteType] = useState<SurveyNoteType>("positive");
  
  // Edit Template Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SurveyTemplate | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editSelectedProducts, setEditSelectedProducts] = useState<Map<string, boolean>>(new Map());
  const [editShowShelfPercentage, setEditShowShelfPercentage] = useState(false);
  const [editShowProductPrice, setEditShowProductPrice] = useState(false);
  const [editAllowStorePhoto, setEditAllowStorePhoto] = useState(false);
  const [showEditCategoryDropdown, setShowEditCategoryDropdown] = useState(false);
  const [editExpandedCategories, setEditExpandedCategories] = useState<Set<string>>(new Set());
  
  // Delete Template Confirmation Modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  
  // Delete Result Confirmation Modal
  const [showDeleteResultConfirm, setShowDeleteResultConfirm] = useState(false);
  const [deleteResultId, setDeleteResultId] = useState<string | null>(null);
  const [showCloseCycleConfirm, setShowCloseCycleConfirm] = useState(false);
  const [templateToCloseCycle, setTemplateToCloseCycle] = useState<SurveyTemplate | null>(null);
  const [templateActionTarget, setTemplateActionTarget] = useState<SurveyTemplate | null>(null);
  const [resultActionTarget, setResultActionTarget] = useState<SurveyResult | null>(null);
  const [storeSearchText, setStoreSearchText] = useState('');
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [showSurveySuccess, setShowSurveySuccess] = useState(false);
  const [showSurveyError, setShowSurveyError] = useState(false);
  const [surveyErrorMessage, setSurveyErrorMessage] = useState('');
  

  // Results Filter by Template
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string | null>(null);
  const [showTemplateFilterMenu, setShowTemplateFilterMenu] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [showCycleFilterMenu, setShowCycleFilterMenu] = useState(false);
  
  // Analytics - Selected Template
  const [selectedAnalysisTemplate, setSelectedAnalysisTemplate] = useState<string | null>(null);
  const [showAnalysisTemplateMenu, setShowAnalysisTemplateMenu] = useState(false);
  
  // Analytics - Cycle Filter
  const [selectedAnalysisCycleId, setSelectedAnalysisCycleId] = useState<string | null>(null);
  const [showAnalysisCycleMenu, setShowAnalysisCycleMenu] = useState(false);
  
  // Edit Result
  const [editingResult, setEditingResult] = useState<SurveyResult | null>(null);
  const [isEditingResult, setIsEditingResult] = useState(false);
  
  // Survey Result Detail Screen
  const [showResultDetail, setShowResultDetail] = useState(false);
  const [selectedResultForDetail, setSelectedResultForDetail] = useState<SurveyResult | null>(null);
  
  // Store Details Screen
  const [showStoreDetails, setShowStoreDetails] = useState(false);
  const [, setSelectedStoreForDetails] = useState<Store | null>(null);
  const [allStoresForDetails, setAllStoresForDetails] = useState<Store[]>([]);
  
  // Success Modals
  const [showSuccessCreate, setShowSuccessCreate] = useState(false);
  const [showSuccessDelete, setShowSuccessDelete] = useState(false);
  const [showSuccessUpdate, setShowSuccessUpdate] = useState(false);
  const [showSuccessAddQuestion, setShowSuccessAddQuestion] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [searchText] = useState("");
  
  // Category Dropdown for Product Selection
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Pagination and Caching
  const [templatePageSize] = useState(10);
  const [error, setError] = useState<string | Error | null>(null);
  const showError = useCallback((err: unknown) => {
    setError(err instanceof Error || typeof err === "string" ? err : "حدث خطأ غير متوقع");
  }, []);
  const dismissError = () => setError(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  
  // Questions for Create Template
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  // Questions for Edit Template
  const [editQuestions, setEditQuestions] = useState<Question[]>([]);
  const [, setShowAddEditQuestion] = useState(false);
  

  const handleSurveyOverlayBack = useCallback(() => {
    const overlay = getSurveyOverlayToClose({
      showResultDetail,
      showStoreDetails,
      showCreateModal,
      showUseModal,
      showEditModal,
      showDateRangePicker: false,
      showDeleteConfirm,
      showDeleteResultConfirm,
      showCloseCycleConfirm,
      showAddQuestion,
    });
    if (overlay === "resultDetail") setShowResultDetail(false);
    else if (overlay === "storeDetails") setShowStoreDetails(false);
    else if (overlay === "create") setShowCreateModal(false);
    else if (overlay === "use") setShowUseModal(false);
    else if (overlay === "edit") setShowEditModal(false);
    else if (overlay === "deleteTemplate") setShowDeleteConfirm(false);
    else if (overlay === "deleteResult") setShowDeleteResultConfirm(false);
    else if (overlay === "closeCycle") setShowCloseCycleConfirm(false);
    else if (overlay === "addQuestion") setShowAddQuestion(false);
    return overlay !== null;
  }, [showResultDetail, showStoreDetails, showCreateModal, showUseModal, showEditModal, showDeleteConfirm, showDeleteResultConfirm, showCloseCycleConfirm, showAddQuestion]);
  useOverlayBackHandler(handleSurveyOverlayBack);

  const handleExportSurveys = async (format: "pdf" | "excel") => {
    setExporting(format);
    const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId && cycle.closedAt);
    const report = activeTab === "templates" ? { title: "تقرير قوالب الاستبيانات", filename: "قوالب_الاستبيانات", columns: ["الاستبيان", "تاريخ الإنشاء", "عدد المنتجات", "نسبة الظهور", "سعر المنتج", "التعليقات"], rows: templates.map((template) => ({ الاستبيان: template.name, "تاريخ الإنشاء": template.createdAt, "عدد المنتجات": template.products.length, "نسبة الظهور": template.showShelfPercentage === false ? "غير مفعلة" : "مفعلة", "سعر المنتج": template.showProductPrice ? "مفعل" : "غير مفعل", التعليقات: template.hasNotes ? "مفعلة" : "غير مفعلة" })) } : { title: selectedCycle ? `تقرير نتائج ${selectedCycle.name}` : "تقرير نتائج الاستبيانات", filename: selectedCycle ? `نتائج_${selectedCycle.name}` : "نتائج_الاستبيانات", columns: ["الدورة", "المحل", "المنطقة", "التاريخ", "نسبة التواجد", "المنتجات الموجودة", "المنتجات غير الموجودة", "الملاحظات", "تصنيف التعليق"], rows: (selectedCycle ? results.filter((result) => result.cycleId === selectedCycle.id) : results).map((result) => { const presentCount = result.data.filter((product) => product.present).length; const presencePercentage = result.data.length ? Math.round((presentCount / result.data.length) * 100) : 0; return { الدورة: getSurveyResultDisplayName(result), المحل: result.storeName, المنطقة: result.storeRegion, التاريخ: result.surveyDate, "نسبة التواجد": `${presencePercentage}%`, "المنتجات الموجودة": result.data.filter((product) => product.present).map((product) => product.productName).join("، ") || "—", "المنتجات غير الموجودة": result.data.filter((product) => !product.present).map((product) => product.productName).join("، ") || "—", الملاحظات: result.notes || "—", "تصنيف التعليق": result.noteType || "—" }; }) };
    try { if (format === "pdf") await exportTabReportPdf(report); else await exportTabReportExcel(report); } finally { setExporting(null); }
  };

  const openResultsExport = () => {
    const fallbackTemplateId = selectedTemplateFilter || templates.find((template) => results.some((result) => result.templateId === template.id))?.id || "";
    setResultsExportTemplateId(fallbackTemplateId);
    setResultsExportCycleId("all");
    setShowResultsExportModal(true);
  };

  const exportResultsFile = async () => {
    const template = templates.find((item) => item.id === resultsExportTemplateId);
    if (!template) { Alert.alert("اختر استبياناً", "اختر الاستبيان الذي تريد تصدير نتائجه أولاً."); return; }
    setIsExportingResultsFile(true);
    try {
      const payload = createSurveyResultsExport(template, products, cycles, results, resultsExportCycleId);
      await exportSurveyResultsFile(payload);
      setShowResultsExportModal(false);
      setSuccessMessage("تم تصدير نتائج الاستبيان بنجاح");
      setShowSuccessUpdate(true);
    } catch (error) {
      Alert.alert("تعذر تصدير النتائج", error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء ملف النتائج.");
    } finally { setIsExportingResultsFile(false); }
  };

  const pickImage = (setImageUri: (uri: string) => void) => {
    try {
      launchImageLibrary(
        {
          mediaType: 'mixed',
          quality: 0.8,
          includeBase64: false,
        },
        (response: ImagePickerResponse) => {
          if (response.errorCode) {
            const errorMessage = getPermissionErrorMessage(response.errorCode);
            Alert.alert('خطأ', errorMessage);
          } else if (!response.didCancel && response.assets && response.assets.length > 0) {
            const mediaUri = response.assets[0].uri;
            if (mediaUri) {
              setImageUri(mediaUri);
            }
          }
        }
      );
    } catch (error) {
      Alert.alert('خطأ', 'فشل في اختيار الملف');
    }
  };

  const takePhoto = (setImageUri: (uri: string) => void) => {
    try {
      launchCamera(
        {
          mediaType: 'mixed',
          quality: 0.8,
          includeBase64: false,
        },
        (response: ImagePickerResponse) => {
          if (response.errorCode) {
            const errorMessage = getPermissionErrorMessage(response.errorCode);
            Alert.alert('خطأ', errorMessage);
          } else if (!response.didCancel && response.assets && response.assets.length > 0) {
            const mediaUri = response.assets[0].uri;
            if (mediaUri) {
              setImageUri(mediaUri);
            }
          }
        }
      );
    } catch (error) {
      Alert.alert('خطأ', 'فشل في التقاط الملف');
    }
  };

  const showImagePickerOptions = (setImageUri: (uri: string) => void) => {
    Alert.alert('اختر صورة', 'اختر من أين تريد الصورة', [
      { text: 'الكاميرا', onPress: () => takePhoto(setImageUri) },
      { text: 'المعرض', onPress: () => pickImage(setImageUri) },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  };

  const loadData = useCallback(async () => {
    try {
      const data = await loadSurveyScreenData();
      setTemplates(data.templates);
      setResults(data.results);
      setCycles(data.cycles);
      setStores(data.stores);
      setAllStoresForDetails(data.stores);
      setProducts(data.products);
    } catch (err) {
      const appError = ErrorHandler.parse(err);
      showError(appError.message);
    }
  }, [showError]);

  useEffect(() => {
    if (storeSearchText.trim()) {
      const filtered = stores.filter(
        (store) =>
          store.name.toLowerCase().includes(storeSearchText.toLowerCase()) ||
          store.region.toLowerCase().includes(storeSearchText.toLowerCase())
      );
      setFilteredStores(filtered);
    } else {
      setFilteredStores(stores);
    }
  }, [storeSearchText, stores]);

  // Pagination for Templates
  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchText.toLowerCase())
  );
  const templatesPagination = usePaginatedData(filteredTemplates, { initialPageSize: templatePageSize });

  // Pagination for Results
  const closedCycles = sortSurveyCyclesNewestFirst(cycles.filter((cycle) => Boolean(cycle.closedAt)));
  const selectedCycle = closedCycles.find((cycle) => cycle.id === selectedCycleId) ?? null;
  const selectedCycleSummary = selectedCycle ? getSurveyCycleSummary(selectedCycle.id, results) : null;
  const filteredResults = results.filter((r) =>
    (selectedTemplateFilter ? r.templateId === selectedTemplateFilter : true) &&
    (selectedCycleId ? r.cycleId === selectedCycleId : true) &&
    getSurveyResultDisplayName(r).toLowerCase().includes(searchText.toLowerCase())
  );
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Create Template
  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم الاستبيان");
      return;
    }
    if (selectedProducts.size === 0) {
      Alert.alert("خطأ", "يرجى اختيار منتج واحد على الأقل");
      return;
    }

    const templateProducts = Array.from(selectedProducts.keys())
      .map((productId) => {
        const product = products.find((p) => p.id === productId);
        return {
          productId,
          productName: product?.name || "",
          type: product?.type || "company",
          competitorName: product?.competitorName,
          category: product?.categoryName || "بدون تصنيف",
        };
      });
    const newTemplate: SurveyTemplate = {
      id: Date.now().toString(),
      name: templateName,
      createdAt: new Date().toISOString(),
      products: orderSurveyProducts(templateProducts),
      showShelfPercentage,
      showProductPrice,
      allowStorePhoto,
      questions: questions.length > 0 ? questions : undefined,
    };

    const allTemplates = await getItems<SurveyTemplate>(STORAGE_KEYS.SURVEY_TEMPLATES);
    await saveItems(STORAGE_KEYS.SURVEY_TEMPLATES, [...allTemplates, newTemplate]);

    setTemplates((current) => [...current, newTemplate]);
    setShowCreateModal(false);
    setTemplateName("");
    setSelectedProducts(new Map());
    setShowShelfPercentage(false);
    setShowProductPrice(false);
    setAllowStorePhoto(false);
    setSuccessMessage("تم إنشاء الاستبيان بنجاح");
    setShowSuccessCreate(true);
    setQuestions([]);
    setTimeout(() => setShowSuccessCreate(false), 900);
    void loadData();
  };

  // Use Template
  const handleStartSurvey = (template: SurveyTemplate) => {
    setSelectedTemplate(template);
    setSelectedStore(null);
    setSurveyData(new Map());
    setTotalShelves("");
    setStorePhotoUris([]);
    setShowUseModal(true);
  };

  const handleEditSurveyResult = (result: SurveyResult) => {
    const template = templates.find((item) => item.id === result.templateId);
    const store = stores.find((item) => item.id === result.storeId);
    if (!template || !store) {
      setSurveyErrorMessage("تعذر فتح التعديل لأن قالب الاستبيان أو المحل لم يعد متاحاً.");
      setShowSurveyError(true);
      return;
    }

    const restoredData = new Map<string, { present?: boolean; shelfPercentage?: number; shelfOccupied?: number; price?: number; answers?: string[] }>();
    result.data.forEach((item) => restoredData.set(item.productId, { present: item.present, shelfPercentage: item.shelfPercentage, shelfOccupied: item.shelfOccupied ?? item.shelfPercentage, price: item.price }));
    (result.questions || []).forEach((question) => restoredData.set(question.questionId, { answers: question.answer ? question.answer.split(", ") : [] }));

    setSelectedTemplate(template);
    setSelectedStore(store);
    setSurveyData(restoredData);
    setTotalShelves(result.totalShelves === undefined ? "" : String(result.totalShelves));
    setStorePhotoUris(result.storePhotoUris?.length ? result.storePhotoUris : result.storePhotoUri ? [result.storePhotoUri] : []);
    setSurveyNotes(result.notes || "");
    setSurveyNoteType(result.noteType || "positive");
    setEditingResult(result);
    setIsEditingResult(true);
    setShowUseModal(true);
  };

  const handleSelectStoreForSurvey = (store: Store) => {
    if (!selectedTemplate) return;
    const resultsForCheck = isEditingResult && editingResult
      ? results.filter((result) => result.id !== editingResult.id)
      : results;

    if (isStoreUsedInActiveSurveyCycle(selectedTemplate.id, store.id, resultsForCheck, cycles)) {
      setSurveyErrorMessage("لا يمكن أخذ الاستبيان لهذا المحل أكثر من مرة في الدورة الحالية. اضغط «انتهى الاستبيان» لبدء دورة جديدة.");
      setShowSurveyError(true);
      return;
    }
    setSelectedStore(store);
  };

  const requestCloseSurveyCycle = (template: SurveyTemplate) => {
    setTemplateToCloseCycle(template);
    setShowCloseCycleConfirm(true);
  };

  const confirmCloseSurveyCycle = async () => {
    if (!templateToCloseCycle) return;

    const [allResults, allCycles] = await Promise.all([
      getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS),
      getItems<SurveyCycle>(STORAGE_KEYS.SURVEY_CYCLES),
    ]);
    const outcome = closeActiveSurveyCycle(templateToCloseCycle, allResults, allCycles);

    if (!outcome.didClose || !outcome.cycle) {
      setShowCloseCycleConfirm(false);
      setTemplateToCloseCycle(null);
      setSurveyErrorMessage("لا توجد نتائج في الدورة الحالية قابلة للإغلاق.");
      setShowSurveyError(true);
      return;
    }

    await Promise.all([
      saveItems(STORAGE_KEYS.SURVEY_RESULTS, outcome.results),
      saveItems(STORAGE_KEYS.SURVEY_CYCLES, outcome.cycles),
    ]);
    setResults(outcome.results);
      setCycles(outcome.cycles);
      setShowCloseCycleConfirm(false);
    setTemplateToCloseCycle(null);
    setSuccessMessage(`تم إنهاء دورة ${outcome.cycle.name}`);
    setShowSuccessUpdate(true);
  };

  const handleSaveSurvey = async () => {
    if (!selectedStore || !selectedTemplate) {
      setSurveyErrorMessage("يرجى اختيار المحل");
      setShowSurveyError(true);
      setTimeout(() => setShowSurveyError(false), 3000);
      return;
    }

    const normalizedTotalShelves = normalizeShelfValue(totalShelves);
    if (shouldShowShelfPercentage(selectedTemplate.showShelfPercentage) && normalizedTotalShelves <= 0) {
      setSurveyErrorMessage("يرجى إدخال إجمالي رفوف المحل قبل حفظ الاستبيان.");
      setShowSurveyError(true);
      return;
    }
    const surveyResultData = orderSurveyProducts(selectedTemplate.products).map((product) => {
      const data = surveyData.get(product.productId) || { present: false, shelfOccupied: 0, shelfPercentage: 0, price: undefined };
      const occupiedShelves = normalizeShelfValue(data.shelfOccupied ?? data.shelfPercentage);
      return {
        productId: product.productId,
        productName: product.productName,
        present: data.present || false,
        shelfOccupied: shouldShowShelfPercentage(selectedTemplate.showShelfPercentage) ? occupiedShelves : undefined,
        shelfPercentage: shouldShowShelfPercentage(selectedTemplate.showShelfPercentage) ? calculateShelfPercentage(occupiedShelves, normalizedTotalShelves) : 0,
        price: shouldShowProductPrice(selectedTemplate.showProductPrice) ? data.price || 0 : undefined,
      };
    });

    const questionAnswers = new Map<string, { answers: string[] }>();
    const questions: { questionId: string; question: string; answer: string }[] = [];
    
    if (selectedTemplate.questions && selectedTemplate.questions.length > 0) {
      selectedTemplate.questions.forEach((question) => {
        const answer = surveyData.get(question.id);
        if (answer) {
          questionAnswers.set(question.id, { answers: answer.answers || [] });
          questions.push({
            questionId: question.id,
            question: question.text,
            answer: Array.isArray(answer.answers) ? answer.answers.join(', ') : String(answer.answers || '')
          });
        }
      });
    }

    const newResult: SurveyResult = {
      id: Date.now().toString(),
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      cycleId: editingResult?.cycleId,
      cycleName: editingResult?.cycleName,
      hasShelfPercentage: shouldShowShelfPercentage(selectedTemplate.showShelfPercentage),
      hasProductPrice: shouldShowProductPrice(selectedTemplate.showProductPrice),
      allowStorePhoto: Boolean(selectedTemplate.allowStorePhoto),
      totalShelves: shouldShowShelfPercentage(selectedTemplate.showShelfPercentage) ? normalizedTotalShelves : undefined,
      storePhotoUri: selectedTemplate.allowStorePhoto ? storePhotoUris[0] : undefined,
      storePhotoUris: selectedTemplate.allowStorePhoto && storePhotoUris.length ? storePhotoUris : undefined,
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      storeRegion: selectedStore.region,
      surveyDate: new Date().toISOString().split("T")[0],
      data: surveyResultData,
      questions: questions.length > 0 ? questions : undefined,
      questionAnswers: questionAnswers.size > 0 ? questionAnswers : undefined,
      notes: surveyNotes,
      noteType: surveyNoteType,
      createdAt: new Date().toISOString(),
    };

    const [allResults, allCycles] = await Promise.all([
      getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS),
      getItems<SurveyCycle>(STORAGE_KEYS.SURVEY_CYCLES),
    ]);
    
    if (isEditingResult && editingResult) {
      // تعديل النتيجة الموجودة
      const updatedResults = allResults.map(r => r.id === editingResult.id ? { ...newResult, id: editingResult.id, createdAt: editingResult.createdAt } : r);
      await saveItems(STORAGE_KEYS.SURVEY_RESULTS, updatedResults);
      setResults(updatedResults);
    } else {
      if (isStoreUsedInActiveSurveyCycle(selectedTemplate.id, selectedStore.id, allResults, allCycles)) {
        setSurveyErrorMessage("لا يمكن حفظ الاستبيان لأن هذا المحل مسجل مسبقاً في الدورة الحالية.");
        setShowSurveyError(true);
        return;
      }

      const cycleMutation = addResultToActiveSurveyCycle(selectedTemplate, newResult, allResults, allCycles);
      await Promise.all([
        saveItems(STORAGE_KEYS.SURVEY_RESULTS, cycleMutation.results),
        saveItems(STORAGE_KEYS.SURVEY_CYCLES, cycleMutation.cycles),
      ]);
      setResults(cycleMutation.results);
      setCycles(cycleMutation.cycles);
    }

    // حفظ الملاحظات الثانوي لا ينبغي أن يؤخر عودة المستخدم إلى قائمة النتائج.
    if (surveyNotes.trim()) {
      void (async () => {
        try {
        const surveysData = await AsyncStorage.getItem("surveys") || "[]";
        const surveys = JSON.parse(surveysData);
        const typeMap: { [key: string]: string } = {
          positive: "إيجابي",
          negative: "سلبي",
          complaint: "شكوى",
          suggestion: "اقتراح",
          recommendation: "تزكية",
        };
        surveys.push({
          id: newResult.id,
          storeId: selectedStore.id,
          notes: surveyNotes,
          type: typeMap[surveyNoteType],
          date: new Date().toISOString(),
          surveyId: newResult.id,
        });
        await AsyncStorage.setItem("surveys", JSON.stringify(surveys));
        } catch (error) {
          console.error("خطأ في حفظ الملاحظات:", error);
        }
      })();
    }

    setShowSurveySuccess(true);
    setShowUseModal(false);
    setSurveyData(new Map());
    setTotalShelves("");
    setStorePhotoUris([]);
    setSurveyNotes("");
    setSurveyNoteType("positive");
    setEditingResult(null);
    setIsEditingResult(false);
    setTimeout(() => setShowSurveySuccess(false), 900);
    void loadData();
  };

  const handleEditTemplate = (template: SurveyTemplate) => {
    setEditingTemplate(template);
    setEditTemplateName(template.name);
    setEditShowShelfPercentage(shouldShowShelfPercentage(template.showShelfPercentage));
    setEditShowProductPrice(shouldShowProductPrice(template.showProductPrice));
    setEditAllowStorePhoto(Boolean(template.allowStorePhoto));
    const productMap = new Map<string, boolean>();
    template.products.forEach((p) => productMap.set(p.productId, true));
    setEditSelectedProducts(productMap);
    setEditQuestions(template.questions || []);
    setShowEditModal(true);
  };

  const handleSaveEditTemplate = async () => {
    if (!editingTemplate || !editTemplateName.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم الاستبيان");
      return;
    }
    if (editSelectedProducts.size === 0) {
      Alert.alert("خطأ", "يرجى اختيار منتج واحد على الأقل");
      return;
    }

    try {
      const templateProducts = Array.from(editSelectedProducts.keys())
        .map((productId) => {
          const product = products.find((p) => p.id === productId);
          return {
            productId,
            productName: product?.name || "",
            type: product?.type || "company",
            competitorName: product?.competitorName,
            category: product?.categoryName,
          };
        });

      const updatedTemplate: SurveyTemplate = {
        ...editingTemplate,
        name: editTemplateName,
        products: orderSurveyProducts(templateProducts),
        showShelfPercentage: editShowShelfPercentage,
        showProductPrice: editShowProductPrice,
        allowStorePhoto: editAllowStorePhoto,
        questions: editQuestions.length > 0 ? editQuestions : undefined,
      };

      const synchronized = await saveSurveyTemplateWithActiveCycleSync(updatedTemplate);
      setTemplates(synchronized.templates);
      setResults(synchronized.results);
      setShowEditModal(false);
      setSuccessMessage("تم تحديث الاستبيان بنجاح");
      setShowSuccessUpdate(true);
    } catch (error) {
      console.error('Save edit error:', error);
      Alert.alert("خطأ", "حدث خطأ أثناء تحديث الاستبيان");
    }
  };

  const handleDeleteTemplate = (id: string) => {
    setDeleteTemplateId(id);
    setShowDeleteConfirm(true);
  };

  const handleExportTemplate = async (template: SurveyTemplate) => {
    setExportingTemplateId(template.id);
    try {
      const currentProducts = await getItems<Product>(STORAGE_KEYS.PRODUCTS);
      await exportSurveyTemplateFile(createSurveyTemplateExport(template, currentProducts));
      setSuccessMessage(`تم إصدار قالب «${template.name}» في ملف JSON قابل للاستيراد`);
      setShowSuccessUpdate(true);
    } catch (error) {
      Alert.alert("تعذر إصدار الاستبيان", error instanceof Error ? error.message : "تعذر إنشاء ملف الاستبيان.");
    } finally { setExportingTemplateId(null); }
  };

  const pickSurveyTemplateForImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/json", "text/plain"], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const [payload, currentCategories] = await Promise.all([
        readSurveyTemplateFile(asset.uri),
        getItems<{ id: string; name: string; createdAt: string }>(STORAGE_KEYS.PRODUCT_CATEGORIES),
      ]);
      setPendingTemplateImport(createSurveyTemplateImportPlan(payload, templates, products, currentCategories));
      setPendingTemplateImportName(asset.name || "قالب استبيان JSON");
    } catch (error) {
      setPendingTemplateImport(null); setPendingTemplateImportName("");
      Alert.alert("تعذر قراءة الاستبيان", error instanceof Error ? error.message : "تعذر التحقق من ملف الاستبيان.");
    }
  };

  const confirmTemplateImport = async () => {
    if (!pendingTemplateImport) return;
    setIsImportingTemplate(true);
    try {
      const [storedTemplates, storedProducts, storedCategories] = await Promise.all([
        getItems<SurveyTemplate>(STORAGE_KEYS.SURVEY_TEMPLATES),
        getItems<Product>(STORAGE_KEYS.PRODUCTS),
        getItems<{ id: string; name: string; createdAt: string }>(STORAGE_KEYS.PRODUCT_CATEGORIES),
      ]);
      const currentTemplates = mergeStoredItems(templates, storedTemplates);
      const currentProducts = mergeStoredItems(products, storedProducts);
      const reconciledCatalog = reconcileProductCategories(currentProducts, mergeStoredItems([], storedCategories));
      const refreshedPlan = createSurveyTemplateImportPlan(pendingTemplateImport.payload, currentTemplates, reconciledCatalog.products, reconciledCatalog.categories);
      const outcome = applySurveyTemplateImport(refreshedPlan, currentTemplates, reconciledCatalog.products, reconciledCatalog.categories);
      await Promise.all([
        saveItems(STORAGE_KEYS.SURVEY_TEMPLATES, outcome.templates),
        saveItems(STORAGE_KEYS.PRODUCTS, outcome.products),
        saveItems(STORAGE_KEYS.PRODUCT_CATEGORIES, outcome.categories),
      ]);
      setTemplates(outcome.templates); setProducts(outcome.products);
      setPendingTemplateImport(null); setPendingTemplateImportName("");
      setSuccessMessage(outcome.addedTemplate ? `تم استيراد «${outcome.templateName}» وإضافة ${outcome.addedCategories} أصناف و${outcome.addedProducts} منتجات جديدة` : `القالب «${outcome.templateName}» موجود مسبقاً؛ أضيف فقط ${outcome.addedCategories} أصناف و${outcome.addedProducts} منتجات غير مكررة`);
      setShowSuccessCreate(true);
    } catch (error) {
      Alert.alert("تعذر استيراد الاستبيان", error instanceof Error ? error.message : "لم تتغير بيانات الاستبيانات.");
    } finally { setIsImportingTemplate(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTemplateId) return;
    try {
      const outcome = await deleteSurveyTemplateCascade(deleteTemplateId);
      await deleteUnreferencedSurveyStorePhotos(results.filter((result) => outcome.deletedResultIds.includes(result.id)), outcome.results);
      setTemplates(outcome.templates);
      setResults(outcome.results);
      setCycles(outcome.cycles);
      setShowDeleteConfirm(false);
      setDeleteTemplateId(null);
      setSuccessMessage(`تم حذف الاستبيان وكل بياناته المرتبطة (${outcome.deletedResultIds.length} نتيجة) نهائياً`);
      setShowSuccessDelete(true);
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert("خطأ", "حدث خطأ أثناء حذف الاستبيان");
    }
  };

  const handleDeleteResult = (id: string) => {
    setDeleteResultId(id);
    setShowDeleteResultConfirm(true);
  };

  const confirmDeleteResult = async () => {
    if (!deleteResultId) return;
    try {
      const outcome = await deleteSurveyResultCascade(deleteResultId);
      await deleteUnreferencedSurveyStorePhotos(results.filter((result) => outcome.deletedResultIds.includes(result.id)), outcome.results);
      setResults(outcome.results);
      setCycles(outcome.cycles);
      setShowDeleteResultConfirm(false);
      setDeleteResultId(null);
      setSuccessMessage("تم حذف النتيجة بنجاح");
      setShowSuccessDelete(true);
    } catch (error) {
      console.error('Delete result error:', error);
      Alert.alert("خطأ", "حدث خطأ أثناء حذف النتيجة");
    }
  };
  const getSortedResults = () => {
    let filtered = [...results];
    
    // Filter by selected template
    if (selectedTemplateFilter) {
      filtered = filtered.filter(r => r.templateId === selectedTemplateFilter);
    }
    if (selectedCycleId) {
      filtered = filtered.filter(r => r.cycleId === selectedCycleId);
    }
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const renderTemplate = (info: { item: SurveyTemplate }) => {
    const item = info.item as SurveyTemplate;
    const activeCycleResults = getActiveSurveyCycleResults(item.id, results, cycles);
    return <SurveyTemplateCard template={item} activeCycleResultCount={activeCycleResults.length} onStart={() => handleStartSurvey(item)} onLongPress={() => setTemplateActionTarget(item)} />;
  };

  const renderResult = (info: { item: SurveyResult }) => {
    const item = info.item as SurveyResult;
    return <SurveyResultCard result={item} displayName={getSurveyResultDisplayName(item)} onPress={() => { setSelectedResultForDetail(item); setShowResultDetail(true); }} onLongPress={() => setResultActionTarget(item)} />;
  };

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
      {activeTab === "templates" && (
        <ReportFab module="surveys" addLabel="إضافة استبيان" onAdd={canCreate ? () => setShowCreateModal(true) : undefined} onImport={canCreate ? () => void pickSurveyTemplateForImport() : undefined} exporting={exporting} onExport={handleExportSurveys} />
      )}
      {activeTab === "results" && (
        <ReportFab module="surveys" exporting={exporting} extraActions={[{ icon: "file-upload", label: "تصدير النتائج", color: colors.success, onPress: openResultsExport }]} onExport={handleExportSurveys} />
      )}
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, flex: 1, textAlign: "center" }]}>
          {activeTab === "templates" ? `الاستبيانات (${templates.length})` : activeTab === "results" ? "النتائج" : "التحليلات"}
        </Text>
        {/* ExportButton منقول إلى FABMenu */}
      </View>

      {/* Tab Buttons */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("templates")}
          style={[
            styles.tabBtn,
            activeTab === "templates" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "templates" ? colors.primary : colors.muted },
            ]}
          >
            قوالب
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("results")}
          style={[
            styles.tabBtn,
            activeTab === "results" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "results" ? colors.primary : colors.muted },
            ]}
          >
            النتائج
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("analytics")}
          style={[
            styles.tabBtn,
            activeTab === "analytics" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "analytics" ? colors.primary : colors.muted },
            ]}
          >
            التحليلات
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === "templates" ? (
        <>
          <FlatList
            data={templatesPagination.paginatedData}
            keyExtractor={(item) => item.id}
            renderItem={renderTemplate}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="assignment" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                لا توجد قوالب استبيان
              </Text>
            </View>
          }
          />
          {templatesPagination.pagination.totalPages > 1 && (
            <PaginationControls
              pagination={templatesPagination.pagination}
              onPrevPage={templatesPagination.prevPage}
              onNextPage={templatesPagination.nextPage}
              onGoToPage={templatesPagination.goToPage}
              hasPrevPage={templatesPagination.pagination.page > 1}
              hasNextPage={templatesPagination.pagination.page < templatesPagination.pagination.totalPages}
            />
          )}
        </>
      ) : activeTab === "results" ? (
        <>
          <View style={[styles.sortContainer, { backgroundColor: colors.surface }]}> 
            {/* Template Filter */}
            <TouchableOpacity
              onPress={() => setShowTemplateFilterMenu(!showTemplateFilterMenu)}
              style={[styles.sortDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.sortDropdownContent}>
                <MaterialIcons name="filter-list" size={20} color={colors.primary} />
                <Text style={[styles.sortDropdownText, { color: colors.foreground }]}>
                  {selectedTemplateFilter ? templates.find(t => t.id === selectedTemplateFilter)?.name : 'جميع الاستبيانات'}
                </Text>
              </View>
              <MaterialIcons 
                name={showTemplateFilterMenu ? "expand-less" : "expand-more"} 
                size={20} 
                color={colors.primary} 
              />
            </TouchableOpacity>
            
            {showTemplateFilterMenu && (
              <ScrollView style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTemplateFilter(null);
                    setShowTemplateFilterMenu(false);
                  }}
                  style={[styles.sortMenuItem, !selectedTemplateFilter && { backgroundColor: colors.primary + "20" }]}
                >
                  <MaterialIcons 
                    name={!selectedTemplateFilter ? "check-circle" : "radio-button-unchecked"} 
                    size={18} 
                    color={!selectedTemplateFilter ? colors.primary : colors.muted}
                  />
                  <Text style={[styles.sortMenuItemText, { color: colors.foreground }]}>جميع الاستبيانات</Text>
                </TouchableOpacity>
                
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    onPress={() => {
                      setSelectedTemplateFilter(template.id);
                      setShowTemplateFilterMenu(false);
                    }}
                    style={[styles.sortMenuItem, selectedTemplateFilter === template.id && { backgroundColor: colors.primary + "20" }]}
                  >
                    <MaterialIcons 
                      name={selectedTemplateFilter === template.id ? "check-circle" : "radio-button-unchecked"} 
                      size={18} 
                      color={selectedTemplateFilter === template.id ? colors.primary : colors.muted}
                    />
                    <Text style={[styles.sortMenuItemText, { color: colors.foreground }]}>{template.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          {closedCycles.length > 0 && (
            <View style={[styles.sortContainer, { backgroundColor: colors.surface }]}> 
              <TouchableOpacity
                onPress={() => setShowCycleFilterMenu(!showCycleFilterMenu)}
                style={[styles.sortDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.sortDropdownContent}>
                  <MaterialIcons name="event-note" size={20} color={colors.primary} />
                  <Text style={[styles.sortDropdownText, { color: colors.foreground }]} numberOfLines={1}>
                    {selectedCycle ? selectedCycle.name : "كل الدورات"}
                  </Text>
                </View>
                <MaterialIcons name={showCycleFilterMenu ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
              </TouchableOpacity>

              {showCycleFilterMenu && (
                <ScrollView style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator> 
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCycleId(null);
                      setShowCycleFilterMenu(false);
                    }}
                    style={[styles.sortMenuItem, !selectedCycleId && { backgroundColor: colors.primary + "20" }]}
                  >
                    <MaterialIcons name={!selectedCycleId ? "check-circle" : "radio-button-unchecked"} size={18} color={!selectedCycleId ? colors.primary : colors.muted} />
                    <Text style={[styles.sortMenuItemText, { color: colors.foreground }]}>كل الدورات</Text>
                  </TouchableOpacity>
                  {closedCycles.map((cycle) => (
                    <TouchableOpacity
                      key={cycle.id}
                      onPress={() => {
                        setSelectedCycleId(cycle.id);
                        setSelectedTemplateFilter(cycle.templateId);
                        setShowCycleFilterMenu(false);
                      }}
                      style={[styles.sortMenuItem, selectedCycleId === cycle.id && { backgroundColor: colors.primary + "20" }]}
                    >
                      <MaterialIcons name={selectedCycleId === cycle.id ? "check-circle" : "radio-button-unchecked"} size={18} color={selectedCycleId === cycle.id ? colors.primary : colors.muted} />
                      <Text style={[styles.sortMenuItemText, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>{cycle.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
          {selectedCycle && selectedCycleSummary && (
            <View style={[styles.cycleSummaryCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "35" }]}> 
              <View style={styles.cycleSummaryHeader}>
                <MaterialIcons name="insights" size={20} color={colors.primary} />
                <Text style={[styles.cycleSummaryTitle, { color: colors.foreground }]} numberOfLines={1}>{selectedCycle.name}</Text>
              </View>
              <View style={styles.cycleStatsRow}>
                <Text style={[styles.cycleStatText, { color: colors.foreground }]}>{selectedCycleSummary.storeCount} محل</Text>
                <View style={[styles.cycleStatDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.cycleStatText, { color: colors.foreground }]}>{selectedCycleSummary.averagePresencePercentage}% متوسط التواجد</Text>
              </View>
            </View>
          )}
          <FlatList
            data={filteredResults}
            keyExtractor={(item) => item.id}
            renderItem={renderResult}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialIcons name="assignment" size={48} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  لا توجد نتائج استبيان
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <View style={styles.analyticsContainer}>
          {results.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="analytics" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                لا توجد بيانات للتحليل
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.sortContainer, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                  onPress={() => setShowAnalysisTemplateMenu(!showAnalysisTemplateMenu)}
                  style={[styles.sortDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.sortDropdownContent}>
                    <MaterialIcons name="filter-list" size={20} color={colors.primary} />
                    <Text style={[styles.sortDropdownText, { color: colors.foreground }]}>
                      {selectedAnalysisTemplate ? templates.find(t => t.id === selectedAnalysisTemplate)?.name : 'جميع الاستبيانات'}
                    </Text>
                  </View>
                  <MaterialIcons 
                    name={showAnalysisTemplateMenu ? "expand-less" : "expand-more"} 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                
                {showAnalysisTemplateMenu && (
                  <ScrollView style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedAnalysisTemplate(null);
                        setShowAnalysisTemplateMenu(false);
                      }}
                      style={[styles.sortMenuItem, !selectedAnalysisTemplate && { backgroundColor: colors.primary + "20" }]}
                    >
                      <MaterialIcons 
                        name={!selectedAnalysisTemplate ? "check-circle" : "radio-button-unchecked"} 
                        size={18} 
                        color={!selectedAnalysisTemplate ? colors.primary : colors.muted}
                      />
                      <Text style={[styles.sortMenuItemText, { color: colors.foreground }]}>جميع الاستبيانات</Text>
                    </TouchableOpacity>
                    
                    {templates.map((template) => (
                      <TouchableOpacity
                        key={template.id}
                          onPress={() => {
                            setSelectedAnalysisTemplate(template.id);
                            setShowAnalysisTemplateMenu(false);
                          }}
                          style={[styles.sortMenuItem, selectedAnalysisTemplate === template.id && { backgroundColor: colors.primary + "20" }]}
                        >
                          <MaterialIcons 
                            name={selectedAnalysisTemplate === template.id ? "check-circle" : "radio-button-unchecked"} 
                            size={18} 
                            color={selectedAnalysisTemplate === template.id ? colors.primary : colors.muted}
                          />
                          <Text style={[styles.sortMenuItemText, { color: colors.foreground }]}>{template.name}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                )}
              </View>
              
              <View style={[styles.sortContainer, { backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => setShowAnalysisCycleMenu((visible) => !visible)} style={[styles.sortDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sortDropdownContent}><MaterialIcons name="event-note" size={20} color={colors.primary} /><Text style={[styles.sortDropdownText, { color: colors.foreground }]} numberOfLines={1}>{selectedAnalysisCycleId ? closedCycles.find((cycle) => cycle.id === selectedAnalysisCycleId)?.name || "اختر دورة الاستبيان" : "كل الدورات"}</Text></View>
                  <MaterialIcons name={showAnalysisCycleMenu ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
                </TouchableOpacity>
                {showAnalysisCycleMenu && <ScrollView style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                  <TouchableOpacity onPress={() => { setSelectedAnalysisCycleId(null); setShowAnalysisCycleMenu(false); }} style={[styles.sortMenuItem, !selectedAnalysisCycleId && { backgroundColor: colors.primary + "20" }]}><MaterialIcons name={!selectedAnalysisCycleId ? "check-circle" : "radio-button-unchecked"} size={18} color={!selectedAnalysisCycleId ? colors.primary : colors.muted} /><Text style={[styles.sortMenuItemText, { color: colors.foreground }]}>كل الدورات</Text></TouchableOpacity>
                  {closedCycles.filter((cycle) => !selectedAnalysisTemplate || cycle.templateId === selectedAnalysisTemplate).map((cycle) => <TouchableOpacity key={cycle.id} onPress={() => { setSelectedAnalysisCycleId(cycle.id); setSelectedAnalysisTemplate(cycle.templateId); setShowAnalysisCycleMenu(false); }} style={[styles.sortMenuItem, selectedAnalysisCycleId === cycle.id && { backgroundColor: colors.primary + "20" }]}><MaterialIcons name={selectedAnalysisCycleId === cycle.id ? "check-circle" : "radio-button-unchecked"} size={18} color={selectedAnalysisCycleId === cycle.id ? colors.primary : colors.muted} /><Text style={[styles.sortMenuItemText, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>{cycle.name}</Text></TouchableOpacity>)}
                </ScrollView>}
              </View>
              
              <SurveyAnalyticsModule 
                surveys={(
                  selectedAnalysisTemplate ? results.filter((result) => result.templateId === selectedAnalysisTemplate) : results
                ).filter((result) => !selectedAnalysisCycleId || result.cycleId === selectedAnalysisCycleId)}
                products={products} 
              />
            </>
          )}
        </View>
      )}

      {/* Create Template Modal */}
      <SurveyPageSheetModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        backgroundColor={colors.background}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>إنشاء استبيان جديد</Text>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Template Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>اسم الاستبيان</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="مثال: استبيان منطقة دمشق"
                placeholderTextColor={colors.muted}
                value={templateName}
                onChangeText={setTemplateName}
              />
            </View>

            <View style={[styles.optionalFieldsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.optionalFieldsTitle, { color: colors.foreground }]}>بيانات المنتج الاختيارية</Text>
              <View style={styles.optionalFieldRow}>
                <Text style={[styles.optionalFieldLabel, { color: colors.foreground }]}>مع نسبة الظهور</Text>
                <Switch
                  value={showShelfPercentage}
                  onValueChange={setShowShelfPercentage}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={showShelfPercentage ? colors.primary : colors.muted}
                />
              </View>
              <View style={[styles.optionalFieldRow, { borderTopColor: colors.border, borderTopWidth: 0.5 }]}>
                <Text style={[styles.optionalFieldLabel, { color: colors.foreground }]}>مع سعر المنتج</Text>
                <Switch
                  value={showProductPrice}
                  onValueChange={setShowProductPrice}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={showProductPrice ? colors.primary : colors.muted}
                />
              </View>
              <View style={[styles.optionalFieldRow, { borderTopColor: colors.border, borderTopWidth: 0.5 }]}> 
                <Text style={[styles.optionalFieldLabel, { color: colors.foreground }]}>السماح بصورة المحل</Text>
                <Switch
                  value={allowStorePhoto}
                  onValueChange={setAllowStorePhoto}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={allowStorePhoto ? colors.primary : colors.muted}
                />
              </View>
            </View>

            <SurveyTemplateProductSelector
              products={products}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
              showCategories={showCategoryDropdown}
              setShowCategories={setShowCategoryDropdown}
              expandedCategories={expandedCategories}
              setExpandedCategories={setExpandedCategories}
              colors={colors}
            />

            {/* Add Questions Section */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الأسئلة الإضافية</Text>
            
            {/* Questions List */}
            {questions.map((question, index) => (
              <View key={question.id} style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Text style={[styles.questionText, { color: colors.foreground, flex: 1 }]}>{question.text}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const newQuestions = questions.filter((_, i) => i !== index);
                      setQuestions(newQuestions);
                    }}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons name="close" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.questionMeta, { color: colors.muted }]}>
                  {question.options.length} خيارات {question.allowMultiple ? '(متعدد)' : '(واحد فقط)'}
                </Text>
              </View>
            ))}
            
            {/* Add Question Button */}
            <TouchableOpacity
              onPress={() => setShowAddQuestion(true)}
              style={[styles.addQuestionBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
            >
              <MaterialIcons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addQuestionBtnText, { color: colors.primary }]}>إضافة سؤال</Text>
            </TouchableOpacity>

            <View style={styles.modalPadding} />
          </ScrollView>
          
          {/* Footer Buttons */}
          <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={[styles.cancelBtn, { backgroundColor: colors.muted + '20' }]}
            >
              <MaterialIcons name="close" size={20} color={colors.foreground} />
              <Text style={[styles.buttonText, { color: colors.foreground }]}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreateTemplate}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={[styles.buttonText, { color: '#fff', fontWeight: '600' }]}>حفظ</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </SurveyPageSheetModal>

      {/* Edit Template Modal */}
      <SurveyPageSheetModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        backgroundColor={colors.background}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>تعديل الاستبيان</Text>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Template Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>اسم الاستبيان</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="مثال: استبيان منطقة دمشق"
                placeholderTextColor={colors.muted}
                value={editTemplateName}
                onChangeText={setEditTemplateName}
              />
            </View>

            <View style={[styles.optionalFieldsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.optionalFieldsTitle, { color: colors.foreground }]}>بيانات المنتج الاختيارية</Text>
              <View style={styles.optionalFieldRow}>
                <Text style={[styles.optionalFieldLabel, { color: colors.foreground }]}>مع نسبة الظهور</Text>
                <Switch
                  value={editShowShelfPercentage}
                  onValueChange={setEditShowShelfPercentage}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={editShowShelfPercentage ? colors.primary : colors.muted}
                />
              </View>
              <View style={[styles.optionalFieldRow, { borderTopColor: colors.border, borderTopWidth: 0.5 }]}>
                <Text style={[styles.optionalFieldLabel, { color: colors.foreground }]}>مع سعر المنتج</Text>
                <Switch
                  value={editShowProductPrice}
                  onValueChange={setEditShowProductPrice}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={editShowProductPrice ? colors.primary : colors.muted}
                />
              </View>
              <View style={[styles.optionalFieldRow, { borderTopColor: colors.border, borderTopWidth: 0.5 }]}> 
                <Text style={[styles.optionalFieldLabel, { color: colors.foreground }]}>السماح بصورة المحل</Text>
                <Switch
                  value={editAllowStorePhoto}
                  onValueChange={setEditAllowStorePhoto}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={editAllowStorePhoto ? colors.primary : colors.muted}
                />
              </View>
            </View>

            {/* Select Products by Category */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>اختر المنتجات حسب التصنيف</Text>
            
            {/* Category Dropdown Button */}
            <TouchableOpacity
              onPress={() => setShowEditCategoryDropdown(!showEditCategoryDropdown)}
              style={[styles.dropdownButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.dropdownButtonText, { color: colors.foreground }]}>
                {showEditCategoryDropdown ? "إغلاق التصنيفات" : "فتح التصنيفات"}
              </Text>
              <MaterialIcons
                name={showEditCategoryDropdown ? "expand-less" : "expand-more"}
                size={20}
                color={colors.foreground}
              />
            </TouchableOpacity>

            {/* Categories List */}
            {showEditCategoryDropdown && (
              <ScrollView style={styles.categoriesContainer} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                {Array.from(new Set(products.map(p => p.categoryName))).map((category) => {
                  const categoryProducts = products.filter((p) => p.categoryName === category);
                  const selectedCount = categoryProducts.filter((p) => editSelectedProducts.has(p.id)).length;
                  const isExpanded = editExpandedCategories.has(category);

                  return (
                    <View key={category}>
                      <TouchableOpacity
                        onPress={() => {
                          const newExpanded = new Set(editExpandedCategories);
                          if (isExpanded) {
                            newExpanded.delete(category);
                          } else {
                            newExpanded.add(category);
                          }
                          setEditExpandedCategories(newExpanded);
                        }}
                        style={[styles.categoryHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <MaterialIcons
                          name={isExpanded ? "expand-less" : "expand-more"}
                          size={20}
                          color={colors.foreground}
                        />
                        <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
                          {category}
                        </Text>
                        <Text style={[styles.categoryCount, { color: colors.muted }]}>
                          ({selectedCount}/{categoryProducts.length})
                        </Text>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.productsInCategory}>
                          {categoryProducts.map((product) => {
                            const isSelected = editSelectedProducts.has(product.id);
                            return (
                              <TouchableOpacity
                                key={product.id}
                                onPress={() => {
                                  const newSelected = new Map(editSelectedProducts);
                                  if (isSelected) {
                                    newSelected.delete(product.id);
                                  } else {
                                    newSelected.set(product.id, true);
                                  }
                                  setEditSelectedProducts(newSelected);
                                }}
                                style={[styles.productCheckbox, { backgroundColor: colors.surface, borderColor: colors.border }]}
                              >
                                <MaterialIcons
                                  name={isSelected ? "check-circle" : "radio-button-unchecked"}
                                  size={18}
                                  color={isSelected ? colors.primary : colors.muted}
                                />
                                <Text style={[styles.productCheckboxText, { color: colors.foreground }]}>
                                  {product.name}
                                </Text>
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

            {/* Questions Section */}
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>الأسئلة</Text>
            {editQuestions && editQuestions.length > 0 ? (
              editQuestions.map((question, index) => (
                <View key={question.id} style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.questionHeader}>
                    <Text style={[styles.questionNumber, { color: colors.primary }]}>السؤال {index + 1}</Text>
                    <TouchableOpacity onPress={() => {
                      setEditQuestions(editQuestions.filter((q) => q.id !== question.id));
                    }}>
                      <MaterialIcons name="delete" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.questionText, { color: colors.foreground }]}>{question.text}</Text>
                  <Text style={[styles.questionOptions, { color: colors.muted }]}>
                    {question.options.length} خيارات {question.allowMultiple ? "(متعدد)" : "(واحد)"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.noQuestionsText, { color: colors.muted }]}>لا توجد أسئلة</Text>
            )}

            {/* Add Question Button */}
            <TouchableOpacity
              onPress={() => setShowAddEditQuestion(true)}
              style={[styles.addQuestionBtn, { backgroundColor: colors.primary + "20", borderColor: colors.primary }]}
            >
              <MaterialIcons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addQuestionBtnText, { color: colors.primary }]}>إضافة سؤال</Text>
            </TouchableOpacity>

            <View style={styles.modalPadding} />
          </ScrollView>
          
          {/* Footer Buttons */}
          <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={[styles.cancelBtn, { backgroundColor: colors.muted + '20' }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={20} color={colors.foreground} />
              <Text style={[styles.buttonText, { color: colors.foreground, fontWeight: '600' }]}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveEditTemplate}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={[styles.buttonText, { color: '#fff', fontWeight: '600' }]}>حفظ</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </SurveyPageSheetModal>

      <Modal transparent visible={Boolean(templateActionTarget)} animationType="fade" onRequestClose={() => setTemplateActionTarget(null)}>
        <View style={styles.templateActionOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTemplateActionTarget(null)} />
          <View style={[styles.templateActionSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.templateActionTitle, { color: colors.foreground }]} numberOfLines={1}>{templateActionTarget?.name || "إجراءات الاستبيان"}</Text>
            <Text style={[styles.templateActionHint, { color: colors.muted }]}>اضغط أحد الإجراءات التالية</Text>
            {canEdit ? <TouchableOpacity onPress={() => { const target = templateActionTarget; setTemplateActionTarget(null); if (target) handleEditTemplate(target); }} style={[styles.templateActionRow, { borderColor: colors.border }]}><MaterialIcons name="edit" size={21} color={colors.primary} /><Text style={[styles.templateActionText, { color: colors.foreground }]}>تعديل الاستبيان</Text><MaterialIcons name="chevron-left" size={21} color={colors.muted} /></TouchableOpacity> : null}
            <TouchableOpacity disabled={exportingTemplateId === templateActionTarget?.id} onPress={() => { const target = templateActionTarget; setTemplateActionTarget(null); if (target) void handleExportTemplate(target); }} style={[styles.templateActionRow, { borderColor: colors.border }, exportingTemplateId === templateActionTarget?.id && { opacity: 0.55 }]}><MaterialIcons name="file-upload" size={21} color={colors.success} /><Text style={[styles.templateActionText, { color: colors.foreground }]}>{exportingTemplateId === templateActionTarget?.id ? "جارٍ إصدار الملف..." : "إصدار الاستبيان"}</Text><MaterialIcons name="chevron-left" size={21} color={colors.muted} /></TouchableOpacity>
            <TouchableOpacity onPress={() => { const target = templateActionTarget; setTemplateActionTarget(null); if (target) requestCloseSurveyCycle(target); }} style={[styles.templateActionRow, { borderColor: colors.border }]}><MaterialIcons name="event-available" size={21} color={colors.warning} /><Text style={[styles.templateActionText, { color: colors.foreground }]}>انتهى الاستبيان</Text><MaterialIcons name="chevron-left" size={21} color={colors.muted} /></TouchableOpacity>
            {canDelete ? <TouchableOpacity onPress={() => { const target = templateActionTarget; setTemplateActionTarget(null); if (target) handleDeleteTemplate(target.id); }} style={[styles.templateActionRow, { borderColor: colors.border }]}><MaterialIcons name="delete-outline" size={21} color={colors.error} /><Text style={[styles.templateActionText, { color: colors.error }]}>حذف الاستبيان</Text><MaterialIcons name="chevron-left" size={21} color={colors.muted} /></TouchableOpacity> : null}
          </View>
        </View>
      </Modal>
      <Modal transparent visible={showResultsExportModal} animationType="fade" onRequestClose={() => !isExportingResultsFile && setShowResultsExportModal(false)}>
        <View style={styles.templateActionOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !isExportingResultsFile && setShowResultsExportModal(false)} />
          <View style={[styles.resultsExportModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.resultsExportHeader}><TouchableOpacity disabled={isExportingResultsFile} onPress={() => setShowResultsExportModal(false)}><MaterialIcons name="close" size={22} color={colors.muted} /></TouchableOpacity><Text style={[styles.templateActionTitle, { color: colors.foreground }]}>تصدير نتائج الاستبيان</Text></View>
            <Text style={[styles.resultsExportHint, { color: colors.muted }]}>اختر الاستبيان ثم دورة محددة أو كل الدورات. سيتم إنشاء ملف JSON قابل للتحليل لاحقاً.</Text>
            <Text style={[styles.resultsExportLabel, { color: colors.foreground }]}>الاستبيان</Text>
            <ScrollView style={[styles.resultsExportOptions, { borderColor: colors.border }]} nestedScrollEnabled showsVerticalScrollIndicator>
              {templates.filter((template) => results.some((result) => result.templateId === template.id)).map((template) => <TouchableOpacity key={template.id} onPress={() => { setResultsExportTemplateId(template.id); setResultsExportCycleId("all"); }} style={[styles.resultsExportOption, { borderColor: colors.border }, resultsExportTemplateId === template.id && { backgroundColor: colors.primary + "12" }]}><MaterialIcons name={resultsExportTemplateId === template.id ? "check-circle" : "radio-button-unchecked"} size={19} color={resultsExportTemplateId === template.id ? colors.primary : colors.muted} /><Text style={[styles.resultsExportOptionText, { color: colors.foreground }]}>{template.name}</Text></TouchableOpacity>)}
            </ScrollView>
            <Text style={[styles.resultsExportLabel, { color: colors.foreground }]}>الدورة</Text>
            <ScrollView style={[styles.resultsExportOptions, { borderColor: colors.border }]} nestedScrollEnabled showsVerticalScrollIndicator>
              <TouchableOpacity onPress={() => setResultsExportCycleId("all")} style={[styles.resultsExportOption, { borderColor: colors.border }, resultsExportCycleId === "all" && { backgroundColor: colors.primary + "12" }]}><MaterialIcons name={resultsExportCycleId === "all" ? "check-circle" : "radio-button-unchecked"} size={19} color={resultsExportCycleId === "all" ? colors.primary : colors.muted} /><Text style={[styles.resultsExportOptionText, { color: colors.foreground }]}>كل الدورات</Text></TouchableOpacity>
              {sortSurveyCyclesNewestFirst(cycles.filter((cycle) => cycle.templateId === resultsExportTemplateId)).map((cycle) => <TouchableOpacity key={cycle.id} onPress={() => setResultsExportCycleId(cycle.id)} style={[styles.resultsExportOption, { borderColor: colors.border }, resultsExportCycleId === cycle.id && { backgroundColor: colors.primary + "12" }]}><MaterialIcons name={resultsExportCycleId === cycle.id ? "check-circle" : "radio-button-unchecked"} size={19} color={resultsExportCycleId === cycle.id ? colors.primary : colors.muted} /><Text style={[styles.resultsExportOptionText, { color: colors.foreground }]}>{cycle.name}</Text></TouchableOpacity>)}
            </ScrollView>
            <View style={styles.resultsExportFooter}><TouchableOpacity disabled={isExportingResultsFile} onPress={() => setShowResultsExportModal(false)} style={[styles.resultsExportCancel, { backgroundColor: colors.muted + "18" }]}><Text style={[styles.resultsExportCancelText, { color: colors.foreground }]}>إلغاء</Text></TouchableOpacity><TouchableOpacity disabled={isExportingResultsFile || !resultsExportTemplateId} onPress={() => void exportResultsFile()} style={[styles.resultsExportSave, { backgroundColor: colors.primary }, (!resultsExportTemplateId || isExportingResultsFile) && { opacity: 0.55 }]}><MaterialIcons name="file-upload" size={19} color="#fff" /><Text style={styles.resultsExportSaveText}>{isExportingResultsFile ? "جارٍ التصدير..." : "تصدير النتائج"}</Text></TouchableOpacity></View>
          </View>
        </View>
      </Modal>
      <CardActionModal visible={Boolean(resultActionTarget)} title={resultActionTarget?.storeName || "إجراءات النتيجة"} description="اختر الإجراء المطلوب لهذه النتيجة" onClose={() => setResultActionTarget(null)} actions={[...(canEdit ? [{ id: "edit", label: "تعديل النتيجة", icon: "edit" as const, onPress: () => { const target = resultActionTarget; setResultActionTarget(null); if (target) handleEditSurveyResult(target); } }] : []), ...(canDelete ? [{ id: "delete", label: "حذف النتيجة", icon: "delete-outline" as const, tone: "danger" as const, onPress: () => { const target = resultActionTarget; setResultActionTarget(null); if (target) handleDeleteResult(target.id); } }] : [])]} />

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="حذف الاستبيان"
        message="هل أنت متأكد من حذف هذا الاستبيان؟ لا يمكن التراجع عن هذه العملية."
        confirmText="حذف"
        isDangerous
        icon="warning"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        visible={showDeleteResultConfirm}
        title="حذف النتيجة"
        message="هل أنت متأكد من حذف هذه النتيجة؟ لا يمكن التراجع عن هذه العملية."
        confirmText="حذف"
        isDangerous
        icon="warning"
        onCancel={() => setShowDeleteResultConfirm(false)}
        onConfirm={() => void confirmDeleteResult()}
      />

      <ConfirmDialog
        visible={showCloseCycleConfirm}
        title="إنهاء دورة الاستبيان"
        message={templateToCloseCycle
          ? `سيتم حفظ نتائج الدورة الحالية باسم زمني، ثم يصبح «${templateToCloseCycle.name}» متاحاً مباشرةً لدورة جديدة.`
          : "سيتم حفظ نتائج الدورة الحالية وبدء دورة جديدة."}
        confirmText="إنهاء الدورة"
        icon="event-available"
        onCancel={() => {
          setShowCloseCycleConfirm(false);
          setTemplateToCloseCycle(null);
        }}
        onConfirm={() => void confirmCloseSurveyCycle()}
      />
      <ConfirmDialog
        visible={Boolean(pendingTemplateImport)}
        title="تأكيد استيراد الاستبيان"
        message={pendingTemplateImport ? `الملف: ${pendingTemplateImportName}\n\nالقالب: ${pendingTemplateImport.templateName}\nالمنتجات: ${pendingTemplateImport.productCount} • الأسئلة: ${pendingTemplateImport.questionCount}\nسيُضاف فقط ${pendingTemplateImport.missingCategoryCount} أصناف و${pendingTemplateImport.missingProductCount} منتجات غير موجودة. ${pendingTemplateImport.templateAlreadyExists ? "القالب مطابق لموجود سابقاً ولن يُكرر." : "سيُنشأ قالب استبيان جديد."}` : ""}
        confirmText="استيراد الآن"
        isSubmitting={isImportingTemplate}
        icon="file-download"
        onCancel={() => !isImportingTemplate && (setPendingTemplateImport(null), setPendingTemplateImportName(""))}
        onConfirm={() => void confirmTemplateImport()}
      />

      {/* Use Template Modal */}
      <SurveyPageSheetModal
        visible={showUseModal}
        onClose={() => setShowUseModal(false)}
        backgroundColor={colors.background}
      >
          <View style={[styles.modal, { backgroundColor: colors.background }]}> 
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}> 
            <Text style={[styles.modalTitle, { color: colors.foreground }]}> 
              {selectedTemplate?.name}
            </Text>
          </View>
          {showSurveyError ? <View style={[styles.inPageSurveyAlert, { backgroundColor: colors.error + "16", borderColor: colors.error }]}> 
            <MaterialIcons name="error-outline" size={20} color={colors.error} />
            <Text style={[styles.inPageSurveyAlertText, { color: colors.foreground }]}>{surveyErrorMessage}</Text>
            <TouchableOpacity onPress={() => setShowSurveyError(false)} accessibilityLabel="إغلاق التنبيه"><MaterialIcons name="close" size={20} color={colors.error} /></TouchableOpacity>
          </View> : null}

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Store Selection */}
            {!selectedStore ? (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>اختر المحل</Text>
                {/* Search Bar */}
                <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.searchInput, { color: colors.foreground }]}
                    placeholder="ابحث عن محل..."
                    placeholderTextColor={colors.muted}
                    value={storeSearchText}
                    onChangeText={setStoreSearchText}
                    textAlign="right"
                  />
                  <MaterialIcons name="search" size={20} color={colors.muted} />
                </View>
                <View style={{ height: 12 }} />

                {filteredStores.map((store) => (
                  <TouchableOpacity
                    key={store.id}
                    onPress={() => handleSelectStoreForSurvey(store)}
                    style={[styles.storeOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.storeOptionName, { color: colors.foreground }]}>{store.name}</Text>
                    <Text style={[styles.storeOptionRegion, { color: colors.muted }]}>{store.region}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View>
                {/* Selected Store */}
                <View
                  style={[
                    styles.selectedStoreCard,
                    { backgroundColor: colors.primary + "10", borderColor: colors.primary },
                  ]}
                >
                  <TouchableOpacity onPress={() => setSelectedStore(null)}>
                    <MaterialIcons name="edit" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <View style={styles.selectedStoreInfo}>
                    <Text style={[styles.selectedStoreName, { color: colors.foreground }]}>
                      {selectedStore.name}
                    </Text>
                    <Text style={[styles.selectedStoreRegion, { color: colors.muted }]}>
                      {selectedStore.region}
                    </Text>
                  </View>
                </View>

                {/* Products Survey */}
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>بيانات المنتجات</Text>
                {selectedTemplate && shouldShowShelfPercentage(selectedTemplate.showShelfPercentage) && (
                  <View style={[styles.shelfTotalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.shelfTotalTitle, { color: colors.foreground }]}>إجمالي رفوف المحل</Text>
                    <Text style={[styles.shelfTotalHint, { color: colors.muted }]}>أدخل العدد الكلي مرة واحدة، ثم أدخل الرفوف المشغولة لكل منتج.</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                      value={totalShelves}
                      onChangeText={setTotalShelves}
                      keyboardType="number-pad"
                      placeholder="مثال: 10"
                      placeholderTextColor={colors.muted}
                    />
                  </View>
                )}
                {(() => {
                  if (!selectedTemplate) return null;
                  const groupedByCategory: { [key: string]: typeof selectedTemplate.products } = {};
                  selectedTemplate.products.forEach((product) => {
                    const category = product.category || 'بدون تصنيف';
                    if (!groupedByCategory[category]) {
                      groupedByCategory[category] = [];
                    }
                    groupedByCategory[category].push(product);
                  });
                  
                  const sortedCategories = Array.from(new Set(orderSurveyProducts(selectedTemplate.products).map((product) => product.category || "بدون تصنيف")));
                  return sortedCategories.map((category) => {
                    const products = groupedByCategory[category];
                    return (
                    <View key={category}>
                      <Text style={[styles.categoryTitle, { color: colors.primary, marginTop: 16, marginBottom: 12 }]}>
                        {category}
                      </Text>
                      {products.map((product) => {
                  const data = surveyData.get(product.productId) || { present: false, shelfOccupied: 0, shelfPercentage: 0, price: undefined };
                  return (
                    <View
                      key={product.productId}
                      style={[
                        styles.surveyProductItem,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.productHeader}>
                        <Switch
                          value={data.present}
                          onValueChange={(v) => {
                            const newData = new Map(surveyData);
                            newData.set(product.productId, { ...data, present: v });
                            setSurveyData(newData);
                          }}
                          trackColor={{ false: colors.border, true: colors.success + "50" }}
                          thumbColor={data.present ? colors.success : colors.muted}
                        />
                        <Text style={[styles.productName, { color: colors.foreground }]}>
                          {product.productName}
                        </Text>
                      </View>
                      {data.present && shouldShowShelfPercentage(selectedTemplate.showShelfPercentage) && (
                        <View style={styles.shelfInput}>
                          <Text style={[styles.shelfLabel, { color: colors.muted }]}>الرفوف المشغولة</Text>
                          <TextInput
                            style={[
                              styles.shelfInputField,
                              { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
                            ]}
                            value={(data.shelfOccupied ?? 0).toString()}
                            onChangeText={(v) => {
                              const newData = new Map(surveyData);
                              newData.set(product.productId, { ...data, shelfOccupied: normalizeShelfValue(v) });
                              setSurveyData(newData);
                            }}
                            keyboardType="number-pad"
                            maxLength={3}
                            placeholder="0"
                            placeholderTextColor={colors.muted}
                          />
                          <Text style={[styles.calculatedShelfText, { color: colors.primary }]}>النسبة المحسوبة: {calculateShelfPercentage(data.shelfOccupied ?? data.shelfPercentage ?? 0, normalizeShelfValue(totalShelves))}%</Text>
                        </View>
                      )}
                      {data.present && shouldShowProductPrice(selectedTemplate.showProductPrice) && (
                        <View style={styles.shelfInput}>
                          <Text style={[styles.shelfLabel, { color: colors.muted }]}>سعر المنتج</Text>
                          <TextInput
                            style={[
                              styles.shelfInputField,
                              { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
                            ]}
                            value={data.price === undefined ? "" : data.price.toString()}
                            onChangeText={(value) => {
                              const newData = new Map(surveyData);
                              newData.set(product.productId, { ...data, price: Number.parseFloat(value) || 0 });
                              setSurveyData(newData);
                            }}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={colors.muted}
                          />
                        </View>
                      )}
                    </View>
                      );
                      })}
                    </View>
                    );
                  });
                })()}

                {/* Questions Section */}
                {selectedTemplate?.questions && selectedTemplate.questions.length > 0 && (
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الأسئلة</Text>
                    {selectedTemplate.questions.map((question) => (
                      <View
                        key={question.id}
                        style={[
                          styles.surveyProductItem,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                      >
                        <Text style={[styles.productName, { color: colors.foreground, marginBottom: 12 }]}>
                          {question.text}
                        </Text>
                        {question.options.map((option, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => {
                              const currentAnswers = surveyData.get(question.id) || { answers: [] };
                              let newAnswers = [...(currentAnswers.answers || [])];
                              if (question.allowMultiple) {
                                if (newAnswers.includes(option)) {
                                  newAnswers = newAnswers.filter(a => a !== option);
                                } else {
                                  newAnswers.push(option);
                                }
                              } else {
                                newAnswers = [option];
                              }
                              const newData = new Map(surveyData);
                              newData.set(question.id, { ...currentAnswers, answers: newAnswers });
                              setSurveyData(newData);
                            }}
                            style={[
                              styles.optionBtn,
                              { backgroundColor: colors.background, borderColor: colors.border },
                              surveyData.get(question.id)?.answers?.includes(option) && {
                                backgroundColor: colors.primary,
                                borderColor: colors.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                { color: colors.foreground },
                                surveyData.get(question.id)?.answers?.includes(option) && {
                                  color: colors.background,
                                  fontWeight: '600',
                                },
                              ]}
                            >
                              {option}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                {/* Store Photo Section: between questions and notes */}
                {selectedTemplate?.allowStorePhoto ? <StorePhotosEditor photos={storePhotoUris} onChange={setStorePhotoUris} /> : null}

                {/* Notes Section */}
                <View style={[styles.notesSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.notesHeaderContainer}>
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                    <Text style={[styles.notesLabel, { color: colors.foreground }]}>الملاحظات</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.notesInput,
                      { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
                    ]}
                    value={surveyNotes}
                    onChangeText={setSurveyNotes}
                    placeholder="أضف ملاحظاتك هنا..."
                    placeholderTextColor={colors.muted}
                    multiline
                    numberOfLines={4}
                  />

                  <View style={styles.notesHeaderContainer}>
                    <Ionicons name="pricetag" size={20} color={colors.primary} />
                    <Text style={[styles.notesLabel, { color: colors.foreground }]}>تصنيف الملاحظة</Text>
                  </View>
                  <View style={styles.noteTypesContainer}>
                    {[
                      { key: "positive", label: "إيجابي", icon: "thumb-up", color: colors.success },
                      { key: "negative", label: "سلبي", icon: "thumb-down", color: colors.error },
                      { key: "complaint", label: "شكوى", icon: "alert-circle", color: colors.warning },
                      { key: "suggestion", label: "اقتراح", icon: "lightbulb", color: colors.primary },
                      { key: "recommendation", label: "تزكية", icon: "star", color: "#FFB800" },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        onPress={() => setSurveyNoteType(type.key as any)}
                        style={[
                          styles.noteTypeBtn,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          surveyNoteType === type.key && { backgroundColor: type.color + '20', borderColor: type.color },
                        ]}
                      >
                        <MaterialIcons
                          name={type.icon as any}
                          size={18}
                          color={surveyNoteType === type.key ? type.color : colors.muted}
                        />
                        <Text
                          style={[
                            styles.noteTypeLabel,
                            { color: surveyNoteType === type.key ? type.color : colors.foreground, fontWeight: surveyNoteType === type.key ? '600' : '500' },
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalPadding} />
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowUseModal(false)}
              style={[styles.cancelBtn, { backgroundColor: colors.muted + '20' }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={20} color={colors.foreground} />
              <Text style={[styles.buttonText, { color: colors.foreground, fontWeight: '600' }]}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveSurvey}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={[styles.buttonText, { color: '#fff', fontWeight: '600' }]}>حفظ</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </SurveyPageSheetModal>
      
      <AddQuestionModal
        visible={showAddQuestion}
        onClose={() => setShowAddQuestion(false)}
        onAdd={(question) => {
          setQuestions((current) => [...current, question]);
          setSuccessMessage("تم إضافة السؤال بنجاح");
          setShowSuccessAddQuestion(true);
        }}
      />

      {/* Success Modals */}
      <SuccessModal
        visible={showSuccessCreate}
        message={successMessage}
        onClose={() => setShowSuccessCreate(false)}
        duration={2000}
      />
      
      <SuccessModal
        visible={showSuccessDelete}
        message={successMessage}
        onClose={() => setShowSuccessDelete(false)}
        duration={2000}
      />
      
      <SuccessModal
        visible={showSuccessUpdate}
        message={successMessage}
        onClose={() => setShowSuccessUpdate(false)}
        duration={2000}
      />
      
      <SuccessModal
        visible={showSuccessAddQuestion}
        message={successMessage}
        onClose={() => setShowSuccessAddQuestion(false)}
        duration={2000}
      />
      
      {/* Survey Success Modal */}
      <SuccessModal
        visible={showSurveySuccess}
        message="تم حفظ الاستبيان بنجاح"
        onClose={() => setShowSurveySuccess(false)}
        duration={2500}
      />
      
      {/* Survey Error Modal */}
      {showSurveyError && !showUseModal && (
        <View style={[styles.confirmOverlay, { zIndex: 9999 }]}>
          <View style={[styles.confirmModal, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <MaterialIcons name="error" size={24} color={colors.error} />
              <Text style={[styles.confirmTitle, { color: colors.foreground, flex: 1, marginBottom: 0 }]}>تنبيه</Text>
            </View>
            <Text style={[styles.confirmMessage, { color: colors.foreground }]}>{surveyErrorMessage}</Text>
            <TouchableOpacity
              onPress={() => setShowSurveyError(false)}
              style={[styles.confirmBtn, { backgroundColor: colors.error }]}
            >
              <Text style={[styles.confirmBtnText, { color: '#fff' }]}>حسناً</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Survey Result Detail Screen */}
      {selectedResultForDetail && (
        <SurveyResultDetailScreen
          result={selectedResultForDetail}
          visible={showResultDetail}
          onClose={() => setShowResultDetail(false)}
          onViewStoreDetails={(storeId) => {
            const store = allStoresForDetails.find((s) => s.id === storeId);
            if (store) {
              setSelectedStoreForDetails(store as any);
              setShowStoreDetails(true);
            }
          }}
        />
      )}
      

      
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: "700" as any, flex: 1, textAlign: "center" },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 0, marginVertical: 0, borderRadius: 0, borderWidth: 0, borderBottomWidth: 0, backgroundColor: "#FCD34D" },
  searchInput: { flex: 1, fontSize: 14, paddingHorizontal: 8 },
  tabsContainer: { flexDirection: "row", borderBottomWidth: 0.5 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 0 },
  tabText: { fontSize: 14, fontWeight: "600" as any },
  list: { padding: 12, gap: 12 },
  card: { borderRadius: 12, padding: 12, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "700" as any },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  useBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  cardActions: { flexDirection: "row", gap: 8, paddingTop: 12, borderTopWidth: 0.5 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: "600" as any },
  templateActionOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.42)", alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  templateActionSheet: { width: "100%", maxWidth: 420, borderRadius: 20, borderWidth: 1, padding: 16, elevation: 12 },
  templateActionTitle: { fontSize: 17, fontWeight: "900" as any, textAlign: "right" },
  templateActionHint: { fontSize: 11, textAlign: "right", marginTop: 4, marginBottom: 12 },
  templateActionRow: { minHeight: 54, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 10 },
  templateActionText: { flex: 1, fontSize: 14, fontWeight: "800" as any, textAlign: "right" },
  resultsExportModal: { width: "100%", maxWidth: 470, maxHeight: "82%", borderRadius: 20, borderWidth: 1, padding: 16, gap: 10, elevation: 12 },
  resultsExportHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultsExportHint: { fontSize: 11, lineHeight: 17, textAlign: "right" },
  resultsExportLabel: { fontSize: 13, fontWeight: "800" as any, textAlign: "right", marginTop: 4 },
  resultsExportOptions: { maxHeight: 146, borderWidth: 1, borderRadius: 13 },
  resultsExportOption: { minHeight: 46, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  resultsExportOptionText: { flex: 1, fontSize: 13, fontWeight: "700" as any, textAlign: "right" },
  resultsExportFooter: { flexDirection: "row", gap: 9, marginTop: 6 },
  resultsExportCancel: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  resultsExportCancelText: { fontSize: 13, fontWeight: "800" as any },
  resultsExportSave: { flex: 1.5, minHeight: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  resultsExportSaveText: { color: "#fff", fontSize: 13, fontWeight: "800" as any },
  closeCycleBtn: { minHeight: 42, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  closeCycleBtnText: { fontSize: 14, fontWeight: "700" as any },

  percentageBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  percentageText: { fontSize: 12, fontWeight: "700" as any },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 40 },
  emptyText: { fontSize: 16 },
  modal: { flex: 1 },
  questionModal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 17, fontWeight: "700" as any },
  questionCloseButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  questionHeaderGap: { width: 28 },
  saveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontWeight: "700" as any, fontSize: 14 },
  modalContent: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: "600" as any, marginBottom: 6 },
  formInput: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  optionalFieldsCard: { borderRadius: 10, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  optionalFieldsTitle: { fontSize: 13, fontWeight: "700" as any, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  optionalFieldRow: { minHeight: 48, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionalFieldLabel: { fontSize: 14, fontWeight: "600" as any },
  sectionTitle: { fontSize: 15, fontWeight: "700" as any, marginBottom: 12, marginTop: 16 },
  categoryTitle: { fontSize: 14, fontWeight: "600" as any, marginBottom: 8 },
  productOption: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  productOptionInfo: { flex: 1 },
  productOptionName: { fontSize: 14, fontWeight: "600" as any },
  productOptionCategory: { fontSize: 12, marginTop: 2 },
  storeOption: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  storeOptionName: { fontSize: 14, fontWeight: "600" as any },
  storeOptionRegion: { fontSize: 12, marginTop: 2 },
  selectedStoreCard: { borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  selectedStoreInfo: { flex: 1 },
  selectedStoreName: { fontSize: 14, fontWeight: "700" as any },
  selectedStoreRegion: { fontSize: 12, marginTop: 2 },
  surveyProductItem: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  productHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  productName: { fontSize: 14, fontWeight: "600" as any, flex: 1 },
  shelfInput: { marginTop: 10, gap: 6 },
  shelfLabel: { fontSize: 12 },
  shelfInputField: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, borderWidth: 1 },
  shelfTotalCard: { borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1 },
  shelfTotalTitle: { fontSize: 14, fontWeight: "700" as any, marginBottom: 4 },
  shelfTotalHint: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  calculatedShelfText: { fontSize: 12, fontWeight: "700" as any },
  storePhotoSection: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1.5 },
  photoToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  photoToggleLabel: { fontSize: 14, fontWeight: "700" as any },
  storePhotoPreview: { width: "100%", height: 190, borderRadius: 10, marginBottom: 10 },
  photoActionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  photoAction: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  photoActionText: { fontSize: 12, fontWeight: "700" as any },
  inPageSurveyAlert: { borderWidth: 1, borderRadius: 10, marginHorizontal: 16, marginTop: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  inPageSurveyAlertText: { flex: 1, textAlign: "right", fontSize: 12, lineHeight: 18, fontWeight: "600" as any },
  analyticsContainer: { flex: 1 },
  notesSection: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1.5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  notesHeaderContainer: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  notesLabel: { fontSize: 14, fontWeight: "700" as any, flex: 1 },
  notesInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, textAlignVertical: "top", marginBottom: 14 },
  noteTypesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, justifyContent: "space-between" },
  noteTypeBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center", gap: 4, minHeight: 60, marginBottom: 6, width: "48%" },
  noteTypeLabel: { fontSize: 11, fontWeight: "600" as any, textAlign: "center" },
  modalPadding: { height: 30 },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  confirmModal: { borderRadius: 12, padding: 20, minWidth: "80%", maxWidth: "90%" },
  confirmTitle: { fontSize: 18, fontWeight: "700" as any, marginBottom: 12, textAlign: "center" },
  confirmMessage: { fontSize: 14, marginBottom: 20, textAlign: "center" },
  confirmButtons: { flexDirection: "row", gap: 12, justifyContent: "center" },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  confirmBtnText: { fontSize: 14, fontWeight: "600" as any },
  sortContainer: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  sortDropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  sortDropdownContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  sortDropdownText: { fontSize: 14, fontWeight: "600" as any },
  sortMenu: { marginTop: 8, borderRadius: 8, borderWidth: 1, overflow: "hidden", maxHeight: 230 },
  sortMenuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  sortMenuItemText: { fontSize: 14, fontWeight: "500" as any },
  cycleSummaryCard: { marginHorizontal: 12, marginTop: 4, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  cycleSummaryHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cycleSummaryTitle: { flex: 1, fontSize: 14, fontWeight: "700" as any },
  cycleStatsRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 10 },
  cycleStatText: { fontSize: 13, fontWeight: "600" as any },
  cycleStatDivider: { width: 1, height: 16 },
  imagePreview: { position: "relative" as const, borderRadius: 10, overflow: "hidden", marginBottom: 12, width: "100%" },
  previewImage: { width: "100%", height: 200, borderRadius: 10 },
  removeImageBtn: { position: "absolute" as const, top: 8, right: 8, width: 32, height: 32, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const, zIndex: 10 },
  imagePickerBtn: { borderWidth: 2, borderRadius: 10, borderStyle: "dashed" as const, paddingVertical: 32, paddingHorizontal: 16, alignItems: "center" as const, justifyContent: "center" as const, gap: 12, width: "100%" },
  imagePickerText: { fontSize: 14, fontWeight: "600" as any },
  dropdownBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  dropdownBtnText: { fontSize: 14, fontWeight: "600" as any },
  dropdownMenu: { borderRadius: 8, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  categoryItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  categoryItemText: { fontSize: 14, fontWeight: "600" as any },
  questionCard: { borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1 },
  questionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  questionNumber: { fontSize: 13, fontWeight: "700" as any },
  questionText: { fontSize: 14, fontWeight: "600" as any, marginBottom: 8 },
  questionOptions: { fontSize: 12 },
  questionMeta: { fontSize: 12 },
  noQuestionsText: { fontSize: 14, textAlign: "center", marginVertical: 12 },
  dropdownButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  dropdownButtonText: { fontSize: 14, fontWeight: "600" as any },
  categoriesContainer: { marginBottom: 12, maxHeight: 280 },
  categoryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  categoryHeaderText: { fontSize: 15, fontWeight: "700" as any },
  categoryCount: { fontSize: 12, fontWeight: "500" as any },
  productsInCategory: { paddingLeft: 16, gap: 8, marginBottom: 8 },
  productCheckbox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  productCheckboxText: { fontSize: 13, fontWeight: "500" as any },
  addQuestionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  addQuestionBtnText: { fontSize: 14, fontWeight: "600" as any },
  modalFooter: { flexDirection: "row", padding: 16, gap: 12, borderTopWidth: 1, justifyContent: "space-between" },
  cancelBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10 },
  buttonText: { fontSize: 14, fontWeight: "600" as any },
  optionBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  optionText: { fontSize: 13, fontWeight: "500" as any },
  clearFilterBtn: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  errorContainer: { paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  errorBox: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 },
  errorText: { flex: 1, fontSize: 14, fontWeight: "500" as any },
  errorCloseBtn: { marginLeft: 12 },
});
