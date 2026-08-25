import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useColors } from "@/hooks/use-colors";
import { DEFAULT_MARKET_VISIT_REPORT_ORDER, MARKET_VISIT_TEMPLATE_TAGS, getMarketVisitCycleResults, normalizeMarketVisitPriorityOptions, pruneMarketVisitOrder, sortMarketVisitStores, type MarketVisitImageCompression, type MarketVisitImageFit, type MarketVisitReportOrder, type MarketVisitReportTemplate, type MarketVisitSlideRepeatMode } from "@/lib/market-visit-report-model";
import { deleteMarketVisitTemplateFile, generateAndShareMarketVisitPptx, persistMarketVisitTemplate, toPptxImages } from "@/lib/market-visit-report-service";
import { calculateMarketVisitProductMetrics, marketVisitProductMetricTags } from "@/lib/market-visit-product-metrics";
import { DEFAULT_STORE_CATEGORIES, getManagedCategories, type ManagedCategory } from "@/lib/category-management";
import { loadBrandRegionCatalog } from "@/lib/brand-region-repository";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { openFileWithCompatibleApp } from "@/lib/open-file-with-app";
import type { SurveyCycle, SurveyResult } from "@/lib/types/survey-types";

type Panel = "templates" | "cycles" | "settings" | null;
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const IMAGE_FIT_OPTIONS: Array<{ value: MarketVisitImageFit; title: string; detail: string }> = [
  { value: "fill", title: "ملء المساحة", detail: "يحافظ على نسبة الصورة ويقص الحواف الزائدة بتوازن." },
  { value: "fit-height", title: "ملاءمة الارتفاع", detail: "يصل ارتفاع الصورة إلى حد الإطار مع عرض متناسب دون مطّ." },
  { value: "fit-width", title: "ملاءمة العرض", detail: "يصل عرض الصورة إلى حد الإطار مع ارتفاع متناسب دون مطّ." },
];
const IMAGE_COMPRESSION_OPTIONS: Array<{ value: MarketVisitImageCompression; title: string; detail: string }> = [
  { value: "compressed", title: "ضغط الصور للتقرير", detail: "يحوّل الصور إلى JPEG بحجم مناسب لتقليل حجم الملف وتسريع المشاركة." },
  { value: "original", title: "الحفاظ على الصور الأصلية", detail: "يضمّن الصور كما هي؛ مناسب للتفاصيل العالية لكنه يزيد حجم التقرير ووقت إنشائه." },
];
const SLIDE_REPEAT_OPTIONS: Array<{ value: MarketVisitSlideRepeatMode; title: string; detail: string }> = [
  { value: "second-slide", title: "الشريحة الثانية تلقائياً", detail: "للقالب البسيط: مقدمة ثم شريحة محل ثم خاتمة." },
  { value: "repeat-tag", title: "وسم تكرار محل", detail: "ضع {{تكرار_محل}} مرة واحدة في أي شريحة تريد تكرارها ضمن قالب متعدد الشرائح." },
];

export default function ReportsModule() {
  const colors = useColors();
  const [templates, setTemplates] = useState<MarketVisitReportTemplate[]>([]);
  const [cycles, setCycles] = useState<SurveyCycle[]>([]);
  const [surveyResults, setSurveyResults] = useState<SurveyResult[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [removingTemplate, setRemovingTemplate] = useState<MarketVisitReportTemplate | null>(null);
  const [order, setOrder] = useState<MarketVisitReportOrder>(DEFAULT_MARKET_VISIT_REPORT_ORDER);
  const [orderChoices, setOrderChoices] = useState({ categories: [] as string[], regions: [] as string[] });
  const [showTags, setShowTags] = useState(false);
  const [showMetricProducts, setShowMetricProducts] = useState(false);
  const [showProductTags, setShowProductTags] = useState(false);
  const [metricSearch, setMetricSearch] = useState("");

  const load = useCallback(async () => {
    const [savedTemplates, savedCycles, savedSettings, stores, results, savedCategories, catalog] = await Promise.all([
      getItems<MarketVisitReportTemplate>(STORAGE_KEYS.MARKET_VISIT_REPORT_TEMPLATES),
      getItems<SurveyCycle>(STORAGE_KEYS.SURVEY_CYCLES),
      getItems<MarketVisitReportOrder>(STORAGE_KEYS.MARKET_VISIT_REPORT_SETTINGS),
      getItems<any>(STORAGE_KEYS.STORES),
      getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS),
      getItems<ManagedCategory>(STORAGE_KEYS.STORE_CATEGORIES),
      loadBrandRegionCatalog(),
    ]);
    const choices = {
      categories: normalizeMarketVisitPriorityOptions([...getManagedCategories(savedCategories, DEFAULT_STORE_CATEGORIES).map((category) => category.label), ...stores.map((store) => store.category || store.classification)]),
      regions: normalizeMarketVisitPriorityOptions([...catalog.regions.filter((region) => region.isActive).map((region) => region.name), ...stores.map((store) => store.region)]),
    };
    const next = pruneMarketVisitOrder({ ...DEFAULT_MARKET_VISIT_REPORT_ORDER, ...(savedSettings[0] || {}) }, choices.categories, choices.regions);
    setTemplates(savedTemplates); setCycles(savedCycles); setSurveyResults(results); setOrder(next); setOrderChoices(choices);
    await saveItems(STORAGE_KEYS.MARKET_VISIT_REPORT_SETTINGS, [next]);
    setSelectedTemplateId((current) => current || savedTemplates[0]?.id || null);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) || null;
  const selectedCycle = cycles.find((item) => item.id === selectedCycleId) || null;
  const cycleResults = useMemo(() => selectedCycle ? getMarketVisitCycleResults(selectedCycle, surveyResults) : [], [selectedCycle, surveyResults]);
  const metricOptions = useMemo(() => Array.from(new Map(cycleResults.flatMap((result) => result.data.map((item) => [item.productId, { id: item.productId, name: item.productName }]))).values()).sort((left, right) => left.name.localeCompare(right.name, "ar")), [cycleResults]);
  const selectedMetricIds = (order.productMetricIds || []).filter((id) => metricOptions.some((option) => option.id === id));
  const selectedMetrics = calculateMarketVisitProductMetrics(cycleResults, selectedMetricIds);
  const productTags = marketVisitProductMetricTags(selectedMetrics);
  const saveOrder = async (next: MarketVisitReportOrder) => { setOrder(next); await saveItems(STORAGE_KEYS.MARKET_VISIT_REPORT_SETTINGS, [next]); };

  const uploadTemplate = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: [PPTX_MIME, "application/octet-stream"], copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    if (!file.name.toLowerCase().endsWith(".pptx")) { Alert.alert("نوع الملف غير مدعوم", "اختر قالب PowerPoint بصيغة PPTX فقط."); return; }
    try {
      const template = await persistMarketVisitTemplate(file.uri, file.name, file.size);
      const next = [template, ...templates];
      await saveItems(STORAGE_KEYS.MARKET_VISIT_REPORT_TEMPLATES, next);
      setTemplates(next); setSelectedTemplateId(template.id); setPanel(null);
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : "تعذر نسخ القالب إلى تخزين التطبيق.";
      Alert.alert("تعذر حفظ القالب", `${reason}\n\nتأكد من أن الملف بصيغة PPTX وأن مساحة الجهاز الفعلية متاحة، ثم حاول مجدداً.`);
    }
  };

  const generate = async () => {
    if (!selectedTemplate || !selectedCycle) { Alert.alert("اختر القالب والدورة", "حدد قالب PowerPoint ثم دورة الاستبيان المراد تضمين محلاتها."); return; }
    setIsGenerating(true);
    try {
      const [latestResults, stores] = await Promise.all([getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS), getItems<any>(STORAGE_KEYS.STORES)]);
      const latestCycleResults = getMarketVisitCycleResults(selectedCycle, latestResults);
      const visits = await Promise.all(latestCycleResults.map(async (result) => {
        const store = stores.find((item) => item.id === result.storeId) || {};
        const photoUris = result.storePhotoUris?.length ? result.storePhotoUris : result.storePhotoUri ? [result.storePhotoUri] : [];
        return { id: result.id, surveyDate: result.surveyDate, storeName: result.storeName, category: store.category || store.classification || "غير مصنف", region: result.storeRegion || store.region || "غير محددة", notes: result.notes || "لا توجد ملاحظات", images: await toPptxImages(photoUris, order.imageCompression || "compressed") };
      }));
      if (!visits.length) { Alert.alert("لا توجد نتائج", "لا توجد محلات أُخذ لها استبيان ضمن الدورة المختارة."); return; }
      const metricIds = (order.productMetricIds || []).filter((id) => latestCycleResults.some((result) => result.data.some((item) => item.productId === id)));
      await generateAndShareMarketVisitPptx(selectedTemplate, selectedCycle.name, sortMarketVisitStores(visits, order), order.imageFit || "fill", order.slideRepeatMode || "second-slide", calculateMarketVisitProductMetrics(latestCycleResults, metricIds));
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : "حدث خطأ غير متوقع أثناء تجهيز الملف.";
      const guidance = (order.slideRepeatMode || "second-slide") === "repeat-tag" ? "تأكد من وجود وسم {{تكرار_محل}} مرة واحدة في شريحة المحل." : "تُكرر الشريحة الثانية تلقائياً لكل محلات الدورة.";
      Alert.alert("تعذر إنشاء التقرير", `${reason}\n\n${guidance} الصور غير المتاحة تُتجاوز فقط.`);
    } finally { setIsGenerating(false); }
  };

  const togglePriority = async (field: "category" | "region", value: string) => {
    const key = field === "category" ? "categoryPriority" : "regionPriority";
    await saveOrder({ ...order, [key]: order[key].includes(value) ? order[key].filter((item) => item !== value) : [...order[key], value] });
  };
  const toggleMetricProduct = async (productId: string) => await saveOrder({ ...order, productMetricIds: selectedMetricIds.includes(productId) ? selectedMetricIds.filter((id) => id !== productId) : [...selectedMetricIds, productId] });
  const removeTemplate = async () => {
    if (!removingTemplate) return;
    const next = templates.filter((item) => item.id !== removingTemplate.id);
    try {
      await deleteMarketVisitTemplateFile(removingTemplate); await saveItems(STORAGE_KEYS.MARKET_VISIT_REPORT_TEMPLATES, next);
      setTemplates(next); if (selectedTemplateId === removingTemplate.id) setSelectedTemplateId(next[0]?.id || null); setRemovingTemplate(null);
    } catch { Alert.alert("تعذر حذف القالب", "تعذر حذف ملف القالب من تخزين الهاتف. لم تُزل بياناته من القائمة."); }
  };
  const openTemplate = async (template: MarketVisitReportTemplate) => {
    try {
      await openFileWithCompatibleApp(template.uri, template.name);
    } catch (error) {
      Alert.alert("تعذر فتح القالب", error instanceof Error ? error.message : "تعذر إظهار التطبيقات المتوافقة مع قالب PowerPoint.");
    }
  };

  return <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}><MaterialIcons name="map" size={25} color="#fff" /><View style={styles.heroText}><Text style={styles.heroTitle}>تقارير زيارة السوق</Text><Text style={styles.heroBody}>{(order.slideRepeatMode || "second-slide") === "repeat-tag" ? "تُكرر الشريحة الحاوية على وسم تكرار محل لكل محلات الدورة." : "تُكرر الشريحة الثانية تلقائياً لكل محل في دورة الاستبيان المختارة."}</Text></View></View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>إعداد التقرير</Text>
      <Selector icon="dashboard-customize" label="قالب PowerPoint" value={selectedTemplate?.name || "ارفع قالباً أولاً"} colors={colors} onPress={() => setPanel("templates")} />
      <Selector icon="event-note" label="دورة الاستبيان" value={selectedCycle?.name || "اختر دورة لإدراج محلاتها"} colors={colors} onPress={() => setPanel("cycles")} />
      <TouchableOpacity disabled={isGenerating} onPress={() => void generate()} style={[styles.generate, { backgroundColor: colors.primary }, isGenerating && styles.disabled]}><MaterialIcons name="slideshow" size={20} color="#fff" /><Text style={styles.generateText}>{isGenerating ? "جارٍ إنشاء التقرير..." : "إنشاء تقرير زيارة السوق"}</Text></TouchableOpacity>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>القوالب المحفوظة</Text>
      {templates.length ? templates.slice(0, 3).map((template) => <View key={template.id} style={[styles.templateRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><TouchableOpacity onPress={() => setRemovingTemplate(template)}><MaterialIcons name="delete-outline" size={20} color={colors.error} /></TouchableOpacity><TouchableOpacity style={styles.templateMain} onPress={() => void openTemplate(template)}><Text style={[styles.value, { color: colors.foreground }]}>{template.name}</Text><Text style={[styles.label, { color: colors.muted }]}>{template.id === selectedTemplateId ? "القالب المحدد · اضغط لفتحه" : "اضغط لفتحه بتطبيق PowerPoint أو عارض متوافق"}</Text></TouchableOpacity><MaterialIcons name="open-in-new" size={20} color={colors.primary} /></View>) : <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.label, { color: colors.muted }]}>لم ترفع قالب PowerPoint بعد.</Text></View>}
    </ScrollView>
    {fabOpen ? <View style={[styles.fabMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}><FabItem icon="add" label="رفع قالب PowerPoint" colors={colors} onPress={() => { setFabOpen(false); void uploadTemplate(); }} /><FabItem icon="settings" label="الإعدادات" colors={colors} onPress={() => { setFabOpen(false); void load(); setPanel("settings"); }} /></View> : null}
    <TouchableOpacity onPress={() => setFabOpen((value) => !value)} style={[styles.fab, { backgroundColor: colors.primary }]}><MaterialIcons name={fabOpen ? "close" : "more-horiz"} size={27} color="#fff" /></TouchableOpacity>
    <FloatingModal visible={panel === "templates"} colors={colors} onClose={() => setPanel(null)}><Text style={[styles.modalTitle, { color: colors.foreground }]}>اختيار قالب PowerPoint</Text><Text style={[styles.modalBody, { color: colors.muted }]}>اختر القالب الذي سيُستخدم لإعداد تقرير زيارة السوق، أو ارفع قالباً جديداً من الهاتف.</Text><FlatList data={templates} keyExtractor={(item) => item.id} style={styles.selectionList} ListHeaderComponent={<TouchableOpacity onPress={() => void uploadTemplate()} style={[styles.generate, { backgroundColor: colors.primary, marginBottom: 9 }]}><MaterialIcons name="upload-file" size={19} color="#fff" /><Text style={styles.generateText}>رفع قالب جديد</Text></TouchableOpacity>} ListEmptyComponent={<Text style={[styles.emptySearch, { color: colors.muted }]}>لا توجد قوالب محفوظة بعد.</Text>} renderItem={({ item }) => <TouchableOpacity onPress={() => { setSelectedTemplateId(item.id); setPanel(null); }} style={[styles.selectionRow, { borderColor: colors.border, backgroundColor: item.id === selectedTemplateId ? colors.primary + "12" : colors.background }]}><View style={[styles.selectionIcon, { backgroundColor: item.id === selectedTemplateId ? colors.primary + "1A" : colors.border + "55" }]}><MaterialIcons name="description" size={20} color={colors.primary} /></View><View style={styles.selectorText}><Text style={[styles.value, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.label, { color: colors.muted }]}>{item.id === selectedTemplateId ? "القالب المحدد حالياً" : "اضغط لاختيار هذا القالب"}</Text></View><MaterialIcons name={item.id === selectedTemplateId ? "check-circle" : "chevron-left"} size={21} color={item.id === selectedTemplateId ? colors.success : colors.muted} /></TouchableOpacity>} /></FloatingModal>
    <FloatingModal visible={panel === "cycles"} colors={colors} onClose={() => setPanel(null)}><Text style={[styles.modalTitle, { color: colors.foreground }]}>اختيار دورة الاستبيان</Text><Text style={[styles.modalBody, { color: colors.muted }]}>حدد الدورة التي تُدرج محلاتها ونتائجها داخل تقرير زيارة السوق.</Text><FlatList data={cycles} keyExtractor={(item) => item.id} style={styles.selectionList} ListEmptyComponent={<Text style={[styles.emptySearch, { color: colors.muted }]}>لا توجد دورات استبيان متاحة بعد.</Text>} renderItem={({ item }) => <TouchableOpacity onPress={() => { setSelectedCycleId(item.id); setPanel(null); }} style={[styles.selectionRow, { borderColor: colors.border, backgroundColor: item.id === selectedCycleId ? colors.primary + "12" : colors.background }]}><View style={[styles.selectionIcon, { backgroundColor: item.id === selectedCycleId ? colors.primary + "1A" : colors.border + "55" }]}><MaterialIcons name="event-note" size={20} color={colors.primary} /></View><View style={styles.selectorText}><Text style={[styles.value, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.label, { color: colors.muted }]}>{item.id === selectedCycleId ? "الدورة المحددة حالياً" : "اضغط لاختيار هذه الدورة"}</Text></View><MaterialIcons name={item.id === selectedCycleId ? "check-circle" : "chevron-left"} size={21} color={item.id === selectedCycleId ? colors.success : colors.muted} /></TouchableOpacity>} /></FloatingModal>
    <FloatingModal visible={panel === "settings"} colors={colors} onClose={() => setPanel(null)}><ReportSettingsPanel colors={colors} order={order} choices={orderChoices} metricCount={selectedMetricIds.length} onToggle={togglePriority} onPrimary={(primary) => void saveOrder({ ...order, primary })} onImageFit={(imageFit) => void saveOrder({ ...order, imageFit })} onImageCompression={(imageCompression) => void saveOrder({ ...order, imageCompression })} onSlideRepeatMode={(slideRepeatMode) => void saveOrder({ ...order, slideRepeatMode })} onTags={() => setShowTags(true)} onMetricProducts={() => { if (!selectedCycle) { Alert.alert("اختر الدورة أولاً", "اختر دورة الاستبيان لتظهر منتجاتها القابلة للقياس."); return; } setShowMetricProducts(true); }} /></FloatingModal>
    <FloatingModal visible={showTags} colors={colors} onClose={() => setShowTags(false)}><Text style={[styles.modalTitle, { color: colors.foreground }]}>الوسوم الأساسية</Text><Text style={[styles.modalBody, { color: colors.muted }]}>اضغط أي وسم لنسخه، ثم الصقه داخل مربع نص أو إطار الصورة في PowerPoint.</Text><ScrollView>{MARKET_VISIT_TEMPLATE_TAGS.map((item) => <TagRow key={item.tag} item={item} colors={colors} />)}</ScrollView></FloatingModal>
    <FloatingModal visible={showMetricProducts} colors={colors} onClose={() => setShowMetricProducts(false)}><Text style={[styles.modalTitle, { color: colors.foreground }]}>منتجات مؤشرات التقرير</Text><Text style={[styles.modalBody, { color: colors.muted }]}>اضغط المنتجات بالترتيب المطلوب؛ يمنح التطبيق كل اختيار رقم وسومه داخل القالب.</Text><View style={[styles.search, { backgroundColor: colors.background, borderColor: colors.border }]}><MaterialIcons name="search" size={20} color={colors.muted} /><TextInput value={metricSearch} onChangeText={setMetricSearch} placeholder="ابحث عن منتج" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} textAlign="right" /></View><FlatList data={metricOptions.filter((option) => option.name.toLocaleLowerCase("ar").includes(metricSearch.trim().toLocaleLowerCase("ar")))} keyExtractor={(item) => item.id} style={styles.metricList} renderItem={({ item }) => { const index = selectedMetricIds.indexOf(item.id); return <TouchableOpacity onPress={() => void toggleMetricProduct(item.id)} style={[styles.metricProduct, { borderColor: colors.border, backgroundColor: index >= 0 ? colors.primary + "12" : "transparent" }]}><View style={[styles.metricBadge, { backgroundColor: index >= 0 ? colors.primary : colors.border }]}><Text style={[styles.metricBadgeText, { color: index >= 0 ? "#fff" : colors.muted }]}>{index >= 0 ? index + 1 : "+"}</Text></View><Text style={[styles.value, { color: colors.foreground, flex: 1 }]}>{item.name}</Text></TouchableOpacity>; }} ListEmptyComponent={<Text style={[styles.emptySearch, { color: colors.muted }]}>لا توجد منتجات مطابقة ضمن نتائج هذه الدورة.</Text>} /><TouchableOpacity disabled={!productTags.length} onPress={() => setShowProductTags(true)} style={[styles.productTagsButton, { backgroundColor: productTags.length ? colors.primary + "12" : colors.border + "55", borderColor: productTags.length ? colors.primary : colors.border }]}><MaterialIcons name="sell" size={19} color={productTags.length ? colors.primary : colors.muted} /><Text style={[styles.tagsButtonText, { color: productTags.length ? colors.primary : colors.muted }]}>وسوم المنتجات المختارة</Text><MaterialIcons name="chevron-left" size={20} color={productTags.length ? colors.primary : colors.muted} /></TouchableOpacity></FloatingModal>
    <FloatingModal visible={showProductTags} colors={colors} onClose={() => setShowProductTags(false)}><Text style={[styles.modalTitle, { color: colors.foreground }]}>وسوم المنتجات المختارة</Text><Text style={[styles.modalBody, { color: colors.muted }]}>تظهر وسوم المنتجات وفق ترتيب اختيارك. اضغط أي وسم لنسخه إلى القالب.</Text><ScrollView>{productTags.map((item) => <TagRow key={item.tag} item={item} colors={colors} />)}</ScrollView></FloatingModal>
    <ConfirmDialog visible={Boolean(removingTemplate)} title="حذف قالب التقرير" message="سيحذف ملف القالب المحفوظ نهائياً من الهاتف ولن يمكن استعادته من التطبيق." confirmText="حذف القالب" isDangerous icon="delete-outline" onCancel={() => setRemovingTemplate(null)} onConfirm={() => void removeTemplate()} />
  </View>;
}

function Selector({ icon, label, value, colors, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; colors: any; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name={icon} size={20} color={colors.primary} /><View style={styles.selectorText}><Text style={[styles.label, { color: colors.muted }]}>{label}</Text><Text style={[styles.value, { color: colors.foreground }]}>{value}</Text></View><MaterialIcons name="chevron-left" size={22} color={colors.muted} /></TouchableOpacity>; }
function FabItem({ icon, label, colors, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; colors: any; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.fabItem}><MaterialIcons name={icon} size={19} color={colors.primary} /><Text style={[styles.fabItemText, { color: colors.foreground }]}>{label}</Text></TouchableOpacity>; }
function TagRow({ item, colors }: { item: { tag: string; description: string }; colors: any }) { return <TouchableOpacity onPress={() => void Clipboard.setStringAsync(item.tag)} style={[styles.tagRow, { borderColor: colors.border }]}><MaterialIcons name="content-copy" size={18} color={colors.primary} /><View style={styles.selectorText}><Text style={[styles.value, { color: colors.foreground }]}>{item.tag}</Text><Text style={[styles.label, { color: colors.muted }]}>{item.description}</Text></View></TouchableOpacity>; }
function FloatingModal({ visible, colors, onClose, children }: { visible: boolean; colors: any; onClose: () => void; children: React.ReactNode }) { return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={[styles.overlay, styles.floatingOverlay]}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={[styles.sheet, styles.floatingSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}><TouchableOpacity onPress={onClose} style={styles.close}><MaterialIcons name="close" size={22} color={colors.muted} /></TouchableOpacity>{children}</View></View></Modal>; }
function ReportSettingsPanel({ colors, order, choices, metricCount, onToggle, onPrimary, onImageFit, onImageCompression, onSlideRepeatMode, onTags, onMetricProducts }: { colors: any; order: MarketVisitReportOrder; choices: { categories: string[]; regions: string[] }; metricCount: number; onToggle: (field: "category" | "region", value: string) => Promise<void>; onPrimary: (value: "category" | "region") => void; onImageFit: (value: MarketVisitImageFit) => void; onImageCompression: (value: MarketVisitImageCompression) => void; onSlideRepeatMode: (value: MarketVisitSlideRepeatMode) => void; onTags: () => void; onMetricProducts: () => void }) {
  const chips = (field: "category" | "region", items: string[]) => <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{items.map((value) => { const priority = order[field === "category" ? "categoryPriority" : "regionPriority"].indexOf(value); return <TouchableOpacity key={value} onPress={() => void onToggle(field, value)} style={[styles.chip, { borderColor: colors.primary, backgroundColor: priority >= 0 ? colors.primary + "18" : "transparent" }]}><Text style={[styles.chipText, { color: colors.primary }]}>{priority >= 0 ? `${priority + 1} ` : ""}{value}</Text></TouchableOpacity>; })}</ScrollView>;
  return <ScrollView contentContainerStyle={styles.settingsContent}><Text style={[styles.modalTitle, { color: colors.foreground }]}>إعدادات تقرير زيارة السوق</Text><SettingsButton icon="sell" title="الوسوم والتعليمات" colors={colors} onPress={onTags} /><Text style={[styles.sectionLabel, { color: colors.muted }]}>مؤشرات تواجد المنتجات</Text><SettingsButton icon="leaderboard" title={metricCount ? `المنتجات المختارة: ${metricCount}` : "اختيار منتجات التقرير"} colors={colors} onPress={onMetricProducts} /><Text style={[styles.sectionLabel, { color: colors.muted }]}>طريقة تحديد شريحة المحل</Text><ChoiceRows options={SLIDE_REPEAT_OPTIONS} value={order.slideRepeatMode || "second-slide"} colors={colors} onChange={onSlideRepeatMode} /><Text style={[styles.sectionLabel, { color: colors.muted }]}>ترتيب محلات التقرير</Text><Text style={[styles.modalBody, { color: colors.muted }]}>اضغط التصنيفات والمناطق بالترتيب المطلوب؛ أول اختيار يأخذ الأولوية الأعلى.</Text><View style={styles.row}><TouchableOpacity onPress={() => onPrimary("category")} style={[styles.choice, { borderColor: colors.primary, backgroundColor: order.primary === "category" ? colors.primary + "12" : "transparent" }]}><Text style={{ color: colors.primary }}>التصنيف أولاً</Text></TouchableOpacity><TouchableOpacity onPress={() => onPrimary("region")} style={[styles.choice, { borderColor: colors.primary, backgroundColor: order.primary === "region" ? colors.primary + "12" : "transparent" }]}><Text style={{ color: colors.primary }}>المنطقة أولاً</Text></TouchableOpacity></View><Text style={[styles.label, { color: colors.muted }]}>أولوية التصنيفات:</Text>{chips("category", choices.categories)}<Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>أولوية المناطق:</Text>{chips("region", choices.regions)}<Text style={[styles.sectionLabel, { color: colors.muted }]}>توزيع صور المحلات</Text><ChoiceRows options={IMAGE_FIT_OPTIONS} value={order.imageFit || "fill"} colors={colors} onChange={onImageFit} /><Text style={[styles.sectionLabel, { color: colors.muted }]}>حجم الصور في التقرير</Text><ChoiceRows options={IMAGE_COMPRESSION_OPTIONS} value={order.imageCompression || "compressed"} colors={colors} onChange={onImageCompression} /></ScrollView>;
}
function SettingsButton({ icon, title, colors, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; colors: any; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.tagsButton, { backgroundColor: colors.primary + "12", borderColor: colors.primary }]}><MaterialIcons name={icon} size={19} color={colors.primary} /><Text style={[styles.tagsButtonText, { color: colors.primary }]}>{title}</Text><MaterialIcons name="chevron-left" size={20} color={colors.primary} /></TouchableOpacity>; }
function ChoiceRows<T extends string>({ options, value, colors, onChange }: { options: Array<{ value: T; title: string; detail: string }>; value: T; colors: any; onChange: (value: T) => void }) { return <>{options.map((option) => <TouchableOpacity key={option.value} onPress={() => onChange(option.value)} style={[styles.imageChoice, { borderColor: colors.border, backgroundColor: value === option.value ? colors.primary + "12" : "transparent" }]}><MaterialIcons name={value === option.value ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={colors.primary} /><View style={styles.selectorText}><Text style={[styles.value, { color: colors.foreground }]}>{option.title}</Text><Text style={[styles.label, { color: colors.muted }]}>{option.detail}</Text></View></TouchableOpacity>)}</>; }

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 12, gap: 10, paddingBottom: 104 }, hero: { borderRadius: 18, padding: 16, flexDirection: "row", gap: 12, alignItems: "flex-start" }, heroText: { flex: 1 }, heroTitle: { color: "#fff", fontSize: 18, fontWeight: "900", textAlign: "right" }, heroBody: { color: "#fff", fontSize: 12, opacity: 0.92, textAlign: "right", lineHeight: 18, marginTop: 3 }, sectionTitle: { fontWeight: "900", textAlign: "right", fontSize: 15, marginTop: 7 }, sectionLabel: { fontSize: 12, fontWeight: "900", textAlign: "right", marginTop: 17, marginBottom: 7 }, selector: { minHeight: 67, borderRadius: 15, borderWidth: 1, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" }, selectorText: { flex: 1, alignItems: "flex-end" }, label: { fontSize: 11, textAlign: "right" }, value: { fontSize: 13, fontWeight: "800", textAlign: "right" }, generate: { minHeight: 49, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 14 }, generateText: { color: "#fff", fontSize: 14, fontWeight: "900" }, disabled: { opacity: 0.6 }, templateRow: { minHeight: 57, borderWidth: 1, borderRadius: 13, flexDirection: "row", gap: 11, padding: 11, alignItems: "center" }, templateMain: { flex: 1, alignItems: "flex-end" }, empty: { borderWidth: 1, padding: 18, borderRadius: 13, alignItems: "center" }, fab: { position: "absolute", right: 18, bottom: 19, width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", elevation: 5 }, fabMenu: { position: "absolute", right: 18, bottom: 87, minWidth: 220, borderRadius: 16, borderWidth: 1, paddingVertical: 6, elevation: 6 }, fabItem: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13 }, fabItemText: { fontSize: 12, fontWeight: "800" }, overlay: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" }, floatingOverlay: { justifyContent: "center", alignItems: "center", padding: 18 }, sheet: { maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingTop: 36 }, floatingSheet: { width: "100%", maxWidth: 500, maxHeight: "82%", borderRadius: 22, borderWidth: 1, padding: 18, paddingTop: 38 }, close: { position: "absolute", top: 11, left: 14, zIndex: 2 }, modalTitle: { fontSize: 17, fontWeight: "900", textAlign: "right", marginBottom: 6 }, modalBody: { fontSize: 12, textAlign: "right", lineHeight: 19, marginBottom: 12 }, selectionList: { maxHeight: 460 }, selectionRow: { minHeight: 67, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 9 }, selectionIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" }, settingsContent: { paddingBottom: 6 }, tagsButton: { minHeight: 49, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 11 }, productTagsButton: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }, tagsButtonText: { flex: 1, textAlign: "right", fontSize: 13, fontWeight: "800" }, search: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }, searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 }, metricList: { maxHeight: 350 }, metricProduct: { minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10 }, metricBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" }, metricBadgeText: { fontSize: 11, fontWeight: "800" as any }, emptySearch: { padding: 22, textAlign: "center", fontSize: 12 }, tagRow: { borderBottomWidth: 1, minHeight: 62, paddingVertical: 9, flexDirection: "row", gap: 9, alignItems: "center" }, imageChoice: { borderWidth: 1, borderRadius: 12, minHeight: 70, padding: 11, flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 9 }, row: { flexDirection: "row", gap: 8, marginBottom: 14 }, choice: { flex: 1, borderWidth: 1, borderRadius: 11, minHeight: 42, alignItems: "center", justifyContent: "center" }, chips: { flexDirection: "row", gap: 7, marginTop: 8, paddingHorizontal: 1, paddingBottom: 2 }, chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6 }, chipText: { fontSize: 11, fontWeight: "800" },
});
