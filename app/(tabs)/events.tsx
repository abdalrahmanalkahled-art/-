import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { launchImageLibrary, launchCamera, type ImagePickerResponse } from "@/lib/media-picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenContainer } from "@/components/screen-container";
import { SkeletonList } from "@/components/ui/skeleton-loading";
import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { MediaSourcePickerModal } from "@/components/media-source-picker-modal";
import { useColors } from "@/hooks/use-colors";
import { useHasPermission } from "@/lib/app-context";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";
import { exportTabReportExcel, exportTabReportPdf } from "@/lib/tab-report-exporter";
import { ReportFab } from "@/components/report-fab";
import { SuccessModal } from "@/components/success-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CardActionModal } from "@/components/card-action-modal";
import { EventDetailsModal } from "@/components/event-details-modal";
import { ErrorHandler } from "@/lib/error-handler";
import { useAppError } from "@/hooks/use-app-error";
import { loadEventGoals, type EventGoal } from "@/lib/event-goal-loader";
import { persistEventMedia } from "@/lib/event-video-storage";
import { useOverlayBackHandler } from "@/lib/use-overlay-back-handler";
import { hasUnsavedFormChanges, snapshotFormState } from "@/lib/form-state";
import { useSingleFlight } from "@/lib/use-single-flight";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { logAudit } from "@/lib/audit-log";

interface EventItem {
  id: string;
  title: string;
  eventDate: string;
  startDate?: string;
  endDate?: string;
  region: string;
  detailedAddress: string;
  giftsDistributed: number;
  attendeesCount: number;
  status: "planned" | "ongoing" | "completed" | "cancelled";
  rating?: number;
  notes?: string;
  imageUri?: string;
  mediaUris?: string[];
  goalId?: string;
  brandName?: string;
  createdAt: string;
}

interface EventForm {
  title: string;
  eventDate: string;
  region: string;
  detailedAddress: string;
  giftsDistributed: string;
  attendeesCount: string;
  status: EventItem["status"];
  notes: string;
  imageUri: string;
  mediaUris: string[];
  goalId: string;
  brandName: string;
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

const STATUS_OPTIONS = [
  { value: "planned", label: "مخططة", color: "#F59E0B" },
  { value: "ongoing", label: "جارية", color: "#3B82F6" },
  { value: "completed", label: "مكتملة", color: "#10B981" },
  { value: "cancelled", label: "ملغاة", color: "#EF4444" },
];

const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIsoDate = (value: string) => value ? new Date(`${value}T12:00:00`) : null;
const createEmptyEventForm = (): EventForm => ({ title: "", eventDate: new Date().toISOString().split("T")[0], region: "", detailedAddress: "", giftsDistributed: "", attendeesCount: "", status: "planned", notes: "", imageUri: "", mediaUris: [], goalId: "", brandName: "" });

export default function EventsScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const canCreate = useHasPermission("events", "create");
  const canEdit = useHasPermission("events", "edit");
  const canDelete = useHasPermission("events", "delete");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ visible: boolean; eventId: string }>({ visible: false, eventId: "" });
  const [eventActionTarget, setEventActionTarget] = useState<EventItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<{ visible: boolean; message: string }>({ visible: false, message: "" });
  const [showGoalSelector, setShowGoalSelector] = useState(false);
  const [goals, setGoals] = useState<EventGoal[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [form, setForm] = useState<EventForm>(createEmptyEventForm);
  const formSnapshot = useRef(snapshotFormState(createEmptyEventForm()));
  const [showDiscardChanges, setShowDiscardChanges] = useState(false);
  const { isRunning: isSaving, run: runSave } = useSingleFlight();

  const loadEvents = useCallback(async () => {
    try {
      const data = await getItems<EventItem>(STORAGE_KEYS.EVENTS);
      setEvents(data.map((event) => ({ ...event, eventDate: event.eventDate || event.startDate || event.endDate || "" })).sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()));
    } finally { setIsInitialLoading(false); }
  }, []);

  const refreshGoals = useCallback(async () => {
    try {
      setGoals(await loadEventGoals());
    } catch (error) {
      console.error('خطأ في تحميل الأهداف:', error);
      setGoals([]);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useEffect(() => {
    if (!params.eventId || events.length === 0) return;
    const targetEvent = events.find((event) => event.id === params.eventId);
    if (targetEvent) {
      setSelectedEvent(targetEvent);
      setShowEventDetails(true);
    }
  }, [events, params.eventId]);

  useEffect(() => {
    const loadGoalsAndRegions = async () => {
      try {
        const goalsData = await getItems<any>(STORAGE_KEYS.MARKETING_GOALS);
        setGoals(goalsData);
        
        const savedRegions = await AsyncStorage.getItem('store_regions');
        if (savedRegions) {
          setRegions(JSON.parse(savedRegions));
        } else {
          const storesData = await getItems<any>(STORAGE_KEYS.STORES);
          const uniqueRegions = Array.from(new Set(storesData.map((s: any) => s.region).filter(Boolean)));
          setRegions(uniqueRegions as string[]);
        }
      } catch (error) {
        console.error('خطأ في تحميل المناطق:', error);
      }
    };
    loadGoalsAndRegions();
  }, []);

  const filtered = events.filter((e) => {
    const matchSearch = e.title.includes(search) || e.region.includes(search) || (e.detailedAddress || "").includes(search);
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const resetEventForm = useCallback(() => {
    const next = createEmptyEventForm();
    formSnapshot.current = snapshotFormState(next);
    setForm(next);
    setEditingEvent(null);
    setShowRegionDropdown(false);
  }, []);

  const requestCloseEventForm = useCallback((discard = false) => {
    if (!discard && !isSaving && hasUnsavedFormChanges(formSnapshot.current, form)) {
      setShowDiscardChanges(true);
      return;
    }
    setShowDiscardChanges(false);
    setShowModal(false);
    resetEventForm();
  }, [form, isSaving, resetEventForm]);

  const handleEventOverlayBack = useCallback(() => {
    if (showGoalSelector) { setShowGoalSelector(false); return true; }
    if (showEventDatePicker) { setShowEventDatePicker(false); return true; }
    if (showImagePickerModal) { setShowImagePickerModal(false); return true; }
    if (showRegionDropdown) { setShowRegionDropdown(false); return true; }
    if (deleteConfirmation.visible) { setDeleteConfirmation({ visible: false, eventId: "" }); return true; }
    if (eventActionTarget) { setEventActionTarget(null); return true; }
    if (showModal) { requestCloseEventForm(); return true; }
    if (showEventDetails) { setShowEventDetails(false); return true; }
    return false;
  }, [showGoalSelector, showEventDatePicker, showImagePickerModal, showRegionDropdown, deleteConfirmation.visible, eventActionTarget, showModal, showEventDetails, requestCloseEventForm]);
  useOverlayBackHandler(handleEventOverlayBack);

  const openCreateModal = useCallback(async () => {
    resetEventForm();
    await refreshGoals();
    setShowGoalSelector(true);
  }, [refreshGoals, resetEventForm]);

  const openEditModal = useCallback((event: EventItem) => {
    setEditingEvent(event);
    const next: EventForm = {
      title: event.title,
      eventDate: event.eventDate || event.startDate || event.endDate || "",
      region: event.region || "",
      giftsDistributed: event.giftsDistributed?.toString() || "",
      attendeesCount: event.attendeesCount?.toString() || "",
      status: event.status,
      notes: event.notes || "",
      imageUri: event.imageUri || "",
      detailedAddress: event.detailedAddress || "",
      mediaUris: event.mediaUris || [],
      goalId: event.goalId || "",
      brandName: event.brandName || "",
    };
    formSnapshot.current = snapshotFormState(next);
    setForm(next);
    setShowModal(true);
  }, []);

  const handleExportEvents = async (format: "pdf" | "excel") => {
    setExporting(format);
    const statusLabel = (status: string) => STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
    const report = { title: "تقرير الفعاليات", filename: "الفعاليات", columns: ["الفعالية", "التاريخ", "المنطقة", "العنوان", "الماركة", "الهدف", "الحالة", "الحضور", "الهدايا", "الملاحظات"], rows: events.map((event) => ({ الفعالية: event.title, التاريخ: event.eventDate || "—", المنطقة: event.region || "—", العنوان: event.detailedAddress || "—", الماركة: event.brandName || "—", الهدف: goals.find((goal) => goal.id === event.goalId)?.title || "—", الحالة: statusLabel(event.status), الحضور: event.attendeesCount || "0", الهدايا: event.giftsDistributed || "0", الملاحظات: event.notes || "—" })) };
    try { if (format === "pdf") await exportTabReportPdf(report); else await exportTabReportExcel(report); } finally { setExporting(null); }
  };

  const pickImage = useCallback(() => {
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
      Alert.alert('خطأ', 'حدث خطأ في اختيار الملف');
    }
  }, [form]);

  const takePhoto = useCallback(() => {
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
      Alert.alert('خطأ', 'حدث خطأ في التقاط الملف');
    }
  }, [form]);

  const showImagePickerOptions = useCallback(() => {
    setShowImagePickerModal(true);
  }, []);

  const handleCameraPress = async () => {
    setShowImagePickerModal(false);
    await takePhoto();
  };

  const handleGalleryPress = async () => {
    setShowImagePickerModal(false);
    await pickImage();
  };

  const { showError } = useAppError();

  const handleSave = () => void runSave(async () => {
    if (!form.title.trim()) {
      showError("يرجى إدخال عنوان الفعالية");
      return;
    }
    const wasEditing = Boolean(editingEvent);
    try {
      const allEvents = await getItems<EventItem>(STORAGE_KEYS.EVENTS);
      const next = { ...form, giftsDistributed: parseInt(form.giftsDistributed) || 0, attendeesCount: parseInt(form.attendeesCount) || 0, imageUri: form.imageUri };
    if (editingEvent) {
      const updated = allEvents.map((e) =>
        e.id === editingEvent.id
          ? (() => { const { startDate, endDate, period, ...withoutLegacyTimeline } = e; return { ...withoutLegacyTimeline, ...next }; })()
          : e
      );
      await saveItems(STORAGE_KEYS.EVENTS, updated);
    } else {
      const newEvent: EventItem = {
        id: Date.now().toString(),
        title: form.title,
        eventDate: form.eventDate,
        region: form.region,
        detailedAddress: form.detailedAddress,
        giftsDistributed: parseInt(form.giftsDistributed) || 0,
        attendeesCount: parseInt(form.attendeesCount) || 0,
        status: form.status,
        notes: form.notes,
        imageUri: form.imageUri,
        mediaUris: form.mediaUris,
        goalId: form.goalId,
        brandName: form.brandName || undefined,
        createdAt: new Date().toISOString(),
      };
      if (form.status === "completed" && form.goalId) {
        const goals = await getItems<any>(STORAGE_KEYS.MARKETING_GOALS);
        const updatedGoals = goals.map((g: any) => {
          if (g.id === form.goalId) {
            return { ...g, currentValue: (g.currentValue || 0) + 1, completionPercentage: Math.min(((g.currentValue || 0) + 1) / (g.targetValue || 1) * 100, 100) };
          }
          return g;
        });
        await saveItems(STORAGE_KEYS.MARKETING_GOALS, updatedGoals);
      }
      await saveItems(STORAGE_KEYS.EVENTS, [...allEvents, newEvent]);
      }
      await logAudit(wasEditing ? "UPDATE" : "CREATE", "الفعاليات", wasEditing ? `تم تعديل الفعالية: ${form.title}` : `تمت إضافة فعالية: ${form.title}`);
      resetEventForm();
      setShowModal(false);
      void loadEvents();
      setSuccessMessage({ visible: true, message: wasEditing ? "تم تحديث الفعالية بنجاح" : "تم إضافة فعالية جديدة بنجاح" });
    } catch (err) {
      const appError = ErrorHandler.parse(err);
      showError(appError.message);
    }
  });

  const handleDelete = (id: string) => {
    setDeleteConfirmation({ visible: true, eventId: id });
  };

  const confirmDelete = async () => {
    try {
      const { eventId } = deleteConfirmation;
      const allEvents = await getItems<EventItem>(STORAGE_KEYS.EVENTS);
      const removedEvent = allEvents.find((event) => event.id === eventId);
      await saveItems(STORAGE_KEYS.EVENTS, allEvents.filter((event) => event.id !== eventId));
      await logAudit("DELETE", "الفعاليات", `تم حذف الفعالية: ${removedEvent?.title || "غير معروفة"}`);
      setDeleteConfirmation({ visible: false, eventId: "" });
      loadEvents();
      setSuccessMessage({ visible: true, message: "تم حذف الفعالية بنجاح" });
    } catch (err) {
      const appError = ErrorHandler.parse(err);
      showError(appError.message);
    }
  };

  const getStatusInfo = (status: string) => STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

  const handleViewEventDetails = (event: EventItem) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedEvent) return;
    const allEvents = await getItems<EventItem>(STORAGE_KEYS.EVENTS);
    const oldStatus = selectedEvent.status;
    
    const updated = allEvents.map((e) =>
      e.id === selectedEvent.id ? { ...e, status: newStatus as EventItem["status"] } : e
    );
    await saveItems(STORAGE_KEYS.EVENTS, updated);
    
    if (selectedEvent.goalId) {
      const goalsData = await getItems<any>(STORAGE_KEYS.MARKETING_GOALS);
      const updatedGoals = goalsData.map((g: any) => {
        if (g.id === selectedEvent.goalId) {
          let newValue = g.currentValue || 0;
          
          if (oldStatus === "completed" && newStatus !== "completed") {
            newValue = Math.max(0, newValue - 1);
          } else if (newStatus === "completed" && oldStatus !== "completed") {
            newValue = newValue + 1;
          }
          
          return {
            ...g,
            currentValue: newValue,
            completionPercentage: Math.min((newValue / (g.targetValue || 1)) * 100, 100),
          };
        }
        return g;
      });
      await saveItems(STORAGE_KEYS.MARKETING_GOALS, updatedGoals);
    }
    
    setSelectedEvent({ ...selectedEvent, status: newStatus as EventItem["status"] });
    loadEvents();
  };

  const handleAddMedia = async (
    uri: string,
    type: "image" | "video",
    metadata?: { fileName?: string | null; mimeType?: string | null },
  ) => {
    try {
      if (!selectedEvent) {
        Alert.alert("خطأ", "لم يتم تحديد فعالية");
        return;
      }
      
      if (!uri || uri.trim() === "") {
        Alert.alert("خطأ", "عنوان الملف غير صحيح");
        return;
      }
      
      const storedMedia = await persistEventMedia(uri, selectedEvent.id, type, metadata?.fileName);
      const storedUri = storedMedia.localUri;
      const allEvents = await getItems<EventItem>(STORAGE_KEYS.EVENTS);
      const mediaUris = selectedEvent.mediaUris || [];
      
      if (mediaUris.includes(storedUri)) {
        Alert.alert("تنبيه", "هذا الملف موجود بالفعل");
        return;
      }
      
      const updated = allEvents.map((e) =>
        e.id === selectedEvent.id
          ? { ...e, mediaUris: [...mediaUris, storedUri] }
          : e
      );
      
      await saveItems(STORAGE_KEYS.EVENTS, updated);
      setSelectedEvent({ ...selectedEvent, mediaUris: [...mediaUris, storedUri] });
      loadEvents();
      const mediaLabel = type === "video" ? "الفيديو" : "الصورة";
      Alert.alert(
        `تم حفظ ${mediaLabel}`,
        storedMedia.copiedToUserFolder
          ? `تم التحقق من النسخة المحلية (${Math.round(storedMedia.size / 1024)} كيلوبايت) وحفظ نسخة مرئية في مجلد Madar Marketing Documentation الذي اخترته.`
          : `تم حفظ نسخة تشغيل داخل التطبيق بحجم ${Math.round(storedMedia.size / 1024)} كيلوبايت. اختر مجلداً من مدير الملفات عند إضافة توثيق لاحقاً لحفظ نسخة ظاهرة خارجه.`,
      );
    } catch (error) {
      console.error("خطأ في إضافة الملف:", error);
      Alert.alert("خطأ", "فشل إضافة الملف");
    }
  };

  const handleDeleteMedia = async (uri: string) => {
    try {
      if (!selectedEvent) {
        Alert.alert("خطأ", "لم يتم تحديد فعالية");
        return;
      }
      
      if (!uri || uri.trim() === "") {
        Alert.alert("خطأ", "عنوان الملف غير صحيح");
        return;
      }
      
      const allEvents = await getItems<EventItem>(STORAGE_KEYS.EVENTS);
      const updated = allEvents.map((e) =>
        e.id === selectedEvent.id
          ? { ...e, mediaUris: (e.mediaUris || []).filter((m) => m !== uri) }
          : e
      );
      
      await saveItems(STORAGE_KEYS.EVENTS, updated);
      const newMediaUris = (selectedEvent.mediaUris || []).filter((m) => m !== uri);
      setSelectedEvent({ ...selectedEvent, mediaUris: newMediaUris });
      loadEvents();
    } catch (error) {
      console.error("خطأ في حذف الملف:", error);
      Alert.alert("خطأ", "فشل حذف الملف");
    }
  };

  const handleDeleteEvent = async () => {
    try {
      if (!selectedEvent) {
        Alert.alert("خطأ", "لم يتم تحديد فعالية");
        return;
      }
      const allEvents = await getItems<EventItem>(STORAGE_KEYS.EVENTS);
      await saveItems(STORAGE_KEYS.EVENTS, allEvents.filter((e) => e.id !== selectedEvent.id));
      setShowEventDetails(false);
      loadEvents();
      setSuccessMessage({ visible: true, message: "تم حذف الفعالية بنجاح" });
    } catch (error) {
      console.error("خطأ في حذف الفعالية:", error);
      Alert.alert("خطأ", "فشل حذف الفعالية");
    }
  };

  const handleEditEvent = () => {
    setShowEventDetails(false);
    if (selectedEvent) {
      openEditModal(selectedEvent);
    }
  };

  const renderEvent = ({ item }: { item: EventItem }) => {
    const statusInfo = getStatusInfo(item.status);
    return (
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleViewEventDetails(item)}
        onLongPress={() => setEventActionTarget(item)}
        delayLongPress={350}
        activeOpacity={0.7}
      >
        <View style={styles.eventCardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "20" }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
          <Text style={[styles.eventTitle, { color: colors.foreground }]}>{item.title}</Text>
        </View>
        <View style={[styles.eventMeta, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12, marginBottom: 12 }]}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>{item.attendeesCount}</Text>
            <Text style={[styles.metaLabel, { color: colors.muted }]}>حاضر</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>{item.giftsDistributed}</Text>
            <Text style={[styles.metaLabel, { color: colors.muted }]}>هدية</Text>
          </View>
        </View>
        <View style={styles.eventFooter}>
          <View style={styles.eventLocation}>
            <Text style={[styles.locationText, { color: colors.muted }]}>{item.region}</Text>
            <MaterialIcons name="location-on" size={14} color={colors.muted} />
          </View>
          <Text style={[styles.eventDate, { color: colors.muted }]}>{item.eventDate}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>إدارة الفعاليات</Text>
      </View>

      {isInitialLoading ? <SkeletonList rows={4} /> : <>
      <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="بحث..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
        <MaterialIcons name="search" size={20} color={colors.muted} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {[{ value: "all", label: "الكل" }, ...STATUS_OPTIONS].map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterChip, filterStatus === opt.value && { backgroundColor: colors.primary }]}
            onPress={() => setFilterStatus(opt.value)}
          >
            <Text style={[styles.filterChipText, { color: filterStatus === opt.value ? "#fff" : colors.muted }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="event-busy" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد فعاليات</Text>

          </View>
        }
      />
      </>}

      <FloatingFormModal visible={showModal} onClose={requestCloseEventForm} backgroundColor={colors.background} isLoading={isInitialLoading} isDismissDisabled={isSaving}>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}> 
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={requestCloseEventForm} disabled={isSaving} accessibilityLabel="إغلاق نموذج الفعالية">
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingEvent ? "تعديل الفعالية" : "فعالية جديدة"}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="always" keyboardDismissMode="none" nestedScrollEnabled showsVerticalScrollIndicator onScrollBeginDrag={() => setShowRegionDropdown(false)}>
            {[
              { key: "title", label: "عنوان الفعالية *", placeholder: "أدخل عنوان الفعالية", keyboardType: "default" as const },
            ].map((field: any) => (
              <View key={field.key} style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>{field.label}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  value={(form as any)[field.key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.muted}
                  keyboardType={field.keyboardType || "default"}
                  textAlign="right"                />
              </View>
            ))}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>تاريخ الفعالية</Text>
              <TouchableOpacity onPress={() => setShowEventDatePicker(true)} style={[styles.formInput, styles.eventDatePicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                <Text style={[styles.eventDatePickerText, { color: form.eventDate ? colors.foreground : colors.muted }]}>{form.eventDate || "اختر تاريخ الفعالية"}</Text>
              </TouchableOpacity>
            </View>

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
                  <ScrollView style={[styles.regionDropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border, zIndex: 1000 }]} nestedScrollEnabled keyboardShouldPersistTaps="always" showsVerticalScrollIndicator>
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
                  </ScrollView>
                )}
              </View>
            </View>

            {[
              { key: "detailedAddress", label: "العنوان بالتفصيل", placeholder: "أدخل العنوان المفصل", keyboardType: "default" as const },
              { key: "giftsDistributed", label: "عدد الهدايا", placeholder: "0", keyboardType: "numeric" as const },
              { key: "attendeesCount", label: "عدد الحضور", placeholder: "0", keyboardType: "numeric" as const },
            ].map((field: any) => (
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

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>الحالة</Text>
              <View style={styles.statusOptions}>
                {STATUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.statusOption, form.status === opt.value && { backgroundColor: opt.color }]}
                    onPress={() => setForm((f) => ({ ...f, status: opt.value as EventItem["status"] }))}
                  >
                    <Text style={[styles.statusOptionText, { color: form.status === opt.value ? "#fff" : colors.muted }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>ملاحظات</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                placeholder="ملاحظات إضافية..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                textAlign="right"
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TouchableOpacity 
              onPress={requestCloseEventForm}
              disabled={isSaving}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveBtnBottom, { backgroundColor: colors.primary }, isSaving && { opacity: 0.65 }]}
            >
              <Text style={styles.saveBtnText}>{isSaving ? "جارٍ الحفظ..." : "حفظ"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        </SafeAreaView>
      </FloatingFormModal>
      <UnsavedChangesDialog visible={showDiscardChanges} onKeepEditing={() => setShowDiscardChanges(false)} onDiscard={() => requestCloseEventForm(true)} />
      <DateRangePickerModal
        visible={showEventDatePicker}
        startDate={fromIsoDate(form.eventDate)}
        endDate={fromIsoDate(form.eventDate)}
        selectionMode="single"
        title="تاريخ الفعالية"
        onCancel={() => setShowEventDatePicker(false)}
        onConfirm={(date) => {
          setForm((current) => ({ ...current, eventDate: toIsoDate(date) }));
          setShowEventDatePicker(false);
        }}
      />

      <MediaSourcePickerModal
        visible={showImagePickerModal}
        title="إضافة صورة أو فيديو"
        description="اختر طريقة إضافة توثيق الفعالية"
        cameraLabel="التقاط توثيق"
        libraryLabel="اختيار من المعرض"
        onClose={() => setShowImagePickerModal(false)}
        onCamera={() => void takePhoto()}
        onLibrary={() => void pickImage()}
      />

      <ConfirmDialog
        visible={deleteConfirmation.visible}
        title="حذف الفعالية"
        message="هل أنت متأكد من حذف هذه الفعالية؟ لا يمكن التراجع عن هذه العملية."
        confirmText="حذف"
        isDangerous
        icon="warning"
        onCancel={() => setDeleteConfirmation({ visible: false, eventId: "" })}
        onConfirm={() => void confirmDelete()}
      />
      <CardActionModal visible={Boolean(eventActionTarget)} title={eventActionTarget?.title || "إجراءات الفعالية"} description="اختر الإجراء المطلوب لهذه الفعالية" onClose={() => setEventActionTarget(null)} actions={[...(canEdit ? [{ id: "edit", label: "تعديل الفعالية", icon: "edit" as const, onPress: () => { const target = eventActionTarget; setEventActionTarget(null); if (target) openEditModal(target); } }] : []), ...(canDelete ? [{ id: "delete", label: "حذف الفعالية", icon: "delete-outline" as const, tone: "danger" as const, onPress: () => { const target = eventActionTarget; setEventActionTarget(null); if (target) handleDelete(target.id); } }] : [])]} />

      {/* Goal Selector Modal */}
      <Modal transparent visible={showGoalSelector} animationType="fade" onRequestClose={() => setShowGoalSelector(false)} statusBarTranslucent>
        <View style={styles.goalSelectorOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowGoalSelector(false)} />
          <View style={[styles.goalSelectorDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={[styles.goalSelectorHeader, { borderBottomColor: colors.border }]}> 
              <TouchableOpacity onPress={() => setShowGoalSelector(false)} style={[styles.goalSelectorClose, { backgroundColor: colors.background }]} accessibilityLabel="إغلاق اختيار الهدف">
                <MaterialIcons name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <View style={styles.goalSelectorHeaderCopy}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>اختر الهدف</Text>
                <Text style={[styles.goalSelectorSubtitle, { color: colors.muted }]}>سيتم ربط الفعالية بالهدف وماركته تلقائياً</Text>
              </View>
            </View>
            <ScrollView style={styles.goalSelectorList} contentContainerStyle={styles.goalSelectorListContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {goals.length === 0 ? (
              <View style={styles.empty}>
                <MaterialIcons name="flag" size={40} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد أهداف</Text>
              </View>
            ) : (
              goals.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[styles.goalItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    const next = { ...form, goalId: goal.id, brandName: goal.brandName || "" };
                    formSnapshot.current = snapshotFormState(next);
                    setForm(next);
                    setShowGoalSelector(false);
                    setShowModal(true);
                  }}
                >
                  <View style={styles.goalItemContent}>
                    <Text style={[styles.goalItemTitle, { color: colors.foreground }]}>{goal.title}</Text>
                    <Text style={[styles.goalItemKpi, { color: colors.muted }]}>{goal.kpi}</Text>
                    <View style={styles.goalItemProgress}>
                      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressFill, { width: `${goal.completionPercentage || 0}%`, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={[styles.progressText, { color: colors.muted }]}>{Math.round(goal.completionPercentage || 0)}%</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <SuccessModal
        visible={successMessage.visible}
        message={successMessage.message}
        onClose={() => setSuccessMessage({ visible: false, message: "" })}
      />

      {/* FAB Menu */}
      <EventDetailsModal
        visible={showEventDetails}
        event={selectedEvent}
        onClose={() => setShowEventDetails(false)}
        onAddMedia={handleAddMedia}
        onDeleteMedia={handleDeleteMedia}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      <ReportFab module="events" addLabel="إضافة فعالية" onAdd={canCreate ? openCreateModal : undefined} exporting={exporting} onExport={handleExportEvents} />
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
  list: { padding: 12, gap: 10 },
  eventCard: { borderRadius: 14, padding: 14, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  eventCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10, marginBottom: 10 },
  eventTitle: { fontSize: 15, fontWeight: "700" as any, flex: 1, textAlign: "right" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: "600" as any },
  eventMeta: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginBottom: 10 },
  metaItem: { alignItems: "center" },
  metaValue: { fontSize: 16, fontWeight: "700" as any },
  metaLabel: { fontSize: 11 },
  eventFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventDate: { fontSize: 12 },
  eventLocation: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, justifyContent: "center" },
  locationText: { fontSize: 12 },
  deleteBtn: { padding: 4 },
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
  modalContent: { flex: 1 },
  modalScrollContent: { padding: 16, paddingBottom: 28 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600" as any, marginBottom: 8, textAlign: "right" },
  formInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  eventDatePicker: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventDatePickerText: { fontSize: 15, fontWeight: "600" as any },
  periodSummary: { minHeight: 62, borderWidth: 1, borderRadius: 15, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, marginTop: -4, marginBottom: 16 },
  periodSummaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  periodSummaryCopy: { flex: 1, alignItems: "flex-end" },
  periodSummaryLabel: { fontSize: 11, fontWeight: "600" as any, textAlign: "right" },
  periodSummaryValue: { fontSize: 15, fontWeight: "800" as any, textAlign: "right", marginTop: 2 },
  textArea: { height: 100 },
  statusOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#E5E7EB" },
  statusOptionText: { fontSize: 13, fontWeight: "500" as any },
  imagePreview: { position: "relative" as const, borderRadius: 10, overflow: "hidden", marginBottom: 12, width: "100%" },
  previewImage: { width: "100%", height: 200, borderRadius: 10 },
  removeImageBtn: { position: "absolute" as const, top: 8, right: 8, width: 32, height: 32, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const, zIndex: 10 },
  regionList: { marginBottom: 8 },
  regionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#E5E7EB", marginRight: 8 },
  regionChipText: { fontSize: 13, fontWeight: "500" as any },
  regionOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#E5E7EB", marginRight: 8 },
  regionOptionText: { fontSize: 12, fontWeight: "600" as any },
  imagePickerBtn: { borderWidth: 2, borderRadius: 10, borderStyle: "dashed" as const, paddingVertical: 32, paddingHorizontal: 16, alignItems: "center" as const, justifyContent: "center" as const, gap: 12, width: "100%" },
  imagePickerText: { fontSize: 14, fontWeight: "600" as any },
  regionDropdown: { borderWidth: 1, borderRadius: 10, overflow: "hidden" as const },
  regionDropdownButton: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12 },
  regionDropdownText: { fontSize: 15, fontWeight: "500" as any },
  regionDropdownMenu: { maxHeight: 200, borderTopWidth: 1 },
  regionDropdownItem: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  regionDropdownItemText: { fontSize: 14, fontWeight: "500" as any },
  imagePickerOverlay: { flex: 1, alignItems: "center" as const, justifyContent: "flex-end" as const },
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
  goalItem: { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  goalSelectorOverlay: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 20, backgroundColor: "rgba(15, 23, 42, 0.28)" },
  goalSelectorDialog: { width: "100%", maxWidth: 460, maxHeight: "78%", borderRadius: 22, borderWidth: 1, overflow: "hidden" as const, elevation: 12 },
  goalSelectorHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  goalSelectorClose: { width: 36, height: 36, borderRadius: 18, alignItems: "center" as const, justifyContent: "center" as const },
  goalSelectorHeaderCopy: { flex: 1, alignItems: "flex-end" as const },
  goalSelectorSubtitle: { marginTop: 3, fontSize: 11, textAlign: "right" as const },
  goalSelectorList: { maxHeight: 430 },
  goalSelectorListContent: { padding: 14, paddingBottom: 6 },
  goalItemContent: { gap: 8 },
  goalItemTitle: { fontSize: 15, fontWeight: "700" as any },
  goalItemKpi: { fontSize: 13 },
  goalItemProgress: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" as const },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: "600" as any, minWidth: 35 },
});
