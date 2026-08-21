import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  FlatList,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { NotesDetailsScreen } from "./notes-details-screen";
import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import { FloatingFormModal } from "@/components/floating-form-modal";
import { useColors } from "@/hooks/use-colors";
import { getItems, STORAGE_KEYS } from "@/lib/storage";

const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIsoDate = (value: string) => value ? new Date(`${value}T12:00:00`) : null;

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

interface SurveyResult {
  id: string;
  storeId: string;
  surveyDate: string;
  data: {
    productName: string;
    present: boolean;
    shelfPercentage: number;
    price?: number;
  }[];
  hasShelfPercentage?: boolean;
  hasProductPrice?: boolean;
  notes?: string;
  noteType?: string;
}

interface StoreDetailsScreenProps {
  store: StoreItem;
  visible: boolean;
  onClose: () => void;
  onEdit: (store: StoreItem) => void;
}

export function StoreDetailsScreen({ store, visible, onClose, onEdit }: StoreDetailsScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [surveys, setSurveys] = useState<SurveyResult[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredSurveys, setFilteredSurveys] = useState<SurveyResult[]>([]);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSurveys();
    }
  }, [visible, store.id]);

  const loadSurveys = async () => {
    try {
      const results = await getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS);
      const storeSurveys = results.filter((r) => r.storeId === store.id).sort((a, b) => new Date(b.surveyDate).getTime() - new Date(a.surveyDate).getTime());
      setSurveys(storeSurveys);
      setFilteredSurveys(storeSurveys);
    } catch (error) {
      console.error("خطأ في تحميل الاستبيانات:", error);
    }
  };

  const applyDateFilter = () => {
    let filtered = surveys;
    if (startDate) {
      filtered = filtered.filter((s) => new Date(s.surveyDate) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter((s) => new Date(s.surveyDate) <= new Date(endDate));
    }
    setFilteredSurveys(filtered);
    setShowDateFilter(false);
  };

  const getLastVisitDate = () => {
    if (surveys.length === 0) return "لم يتم زيارة";
    const lastSurvey = surveys[0];
    return new Date(lastSurvey.surveyDate).toLocaleDateString("ar-SA");
  };

  const getAttendanceStats = () => {
    if (surveys.length === 0) return { present: 0, absent: 0, percentage: 0 };
    let presentCount = 0;
    let totalProducts = 0;

    surveys.forEach((survey) => {
      survey.data.forEach((product) => {
        if (product.present) presentCount++;
        totalProducts++;
      });
    });

    return {
      present: presentCount,
      absent: totalProducts - presentCount,
      percentage: totalProducts > 0 ? Math.round((presentCount / totalProducts) * 100) : 0,
    };
  };

  const getNotesSummary = () => {
    const notes = surveys.filter((s) => s.notes).map((s) => ({ text: s.notes, type: s.noteType }));
    return notes;
  };

  const stats = getAttendanceStats();
  const notesSummary = getNotesSummary();

  const renderSurveyItem = ({ item }: { item: SurveyResult }) => (
    <View style={[styles.surveyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.surveyHeader}>
        <Text style={[styles.surveyDate, { color: colors.foreground }]}>{new Date(item.surveyDate).toLocaleDateString("ar-SA")}</Text>
        <View style={[styles.surveyBadge, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.surveyBadgeText, { color: colors.primary }]}>{item.data.filter((d) => d.present).length} منتجات</Text>
        </View>
      </View>
      {item.notes && (
        <Text style={[styles.surveyNote, { color: colors.muted }]}>
          📝 {item.notes}
        </Text>
      )}
      <View style={styles.surveyProducts}>
        {item.data.map((product, idx) => (
          <View key={idx} style={styles.productItem}>
            <MaterialIcons name={product.present ? "check-circle" : "cancel"} size={16} color={product.present ? colors.success : colors.error} />
            <Text style={[styles.productName, { color: colors.foreground }]}>{product.productName}</Text>
            {product.present && item.hasShelfPercentage !== false && (
              <Text style={[styles.shelfPercentage, { color: colors.muted }]}>{product.shelfPercentage}%</Text>
            )}
            {product.present && item.hasProductPrice && (
              <Text style={[styles.shelfPercentage, { color: colors.muted }]}>{product.price ?? 0}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>تفاصيل المحل</Text>
          <TouchableOpacity onPress={() => { onEdit(store); onClose(); }}>
            <MaterialIcons name="edit" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
          {/* صورة المحل */}
          {store.imageUri && (
            <Image source={{ uri: store.imageUri }} style={styles.storeImage} />
          )}

          {/* بيانات المحل */}
          <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: "center" }]}>معلومات المحل</Text>
            <View style={styles.infoGrid}>
              <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.primary + "15" }]}>
                  <MaterialIcons name="store" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.infoCardLabel, { color: colors.muted }]}>اسم المحل</Text>
                <Text style={[styles.infoCardValue, { color: colors.foreground }]} numberOfLines={2}>{store.name}</Text>
              </View>
              {store.ownerName && (
                <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={[styles.infoIconBox, { backgroundColor: colors.primary + "15" }]}>
                    <MaterialIcons name="person" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.infoCardLabel, { color: colors.muted }]}>المالك</Text>
                  <Text style={[styles.infoCardValue, { color: colors.foreground }]} numberOfLines={2}>{store.ownerName}</Text>
                </View>
              )}
            </View>
            <View style={styles.infoGrid}>
              {store.phone && (
                <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={[styles.infoIconBox, { backgroundColor: colors.primary + "15" }]}>
                    <MaterialIcons name="phone" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.infoCardLabel, { color: colors.muted }]}>الهاتف</Text>
                  <Text style={[styles.infoCardValue, { color: colors.foreground }]} numberOfLines={2}>{store.phone}</Text>
                </View>
              )}
              {store.region && (
                <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={[styles.infoIconBox, { backgroundColor: colors.primary + "15" }]}>
                    <MaterialIcons name="location-on" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.infoCardLabel, { color: colors.muted }]}>المنطقة</Text>
                  <Text style={[styles.infoCardValue, { color: colors.foreground }]} numberOfLines={2}>{store.region}</Text>
                </View>
              )}
            </View>
            {store.address && (
              <View style={[styles.addressCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.primary + "15" }]}>
                  <MaterialIcons name="location-city" size={24} color={colors.primary} />
                </View>
                <View style={styles.addressContent}>
                  <Text style={[styles.infoCardLabel, { color: colors.muted }]}>العنوان التفصيلي</Text>
                  <Text style={[styles.infoCardValue, { color: colors.foreground }]}>{store.address}</Text>
                </View>
              </View>
            )}
            <View style={[styles.categoryCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary }]}>
              <MaterialIcons name="category" size={24} color={colors.primary} />
              <Text style={[styles.categoryLabel, { color: colors.muted }]}>التصنيف</Text>
              <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.categoryValue}>{store.category}</Text>
              </View>
            </View>
            {store.notes && (
              <View style={[styles.notesCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary }]}>
                <MaterialIcons name="note" size={24} color={colors.primary} />
                <View style={styles.notesContent}>
                  <Text style={[styles.notesLabel, { color: colors.muted }]}>الملاحظات</Text>
                  <Text style={[styles.notesValue, { color: colors.foreground }]}>
                    {store.notes}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* إحصائيات الزيارات */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>إحصائيات الزيارات</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <MaterialIcons name="calendar-today" size={24} color={colors.primary} />
                <Text style={[styles.statLabel, { color: colors.muted }]}>آخر زيارة</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{getLastVisitDate()}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                <Text style={[styles.statLabel, { color: colors.muted }]}>نسبة التواجد</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>{stats.percentage}%</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <MaterialIcons name="assessment" size={24} color={colors.primary} />
                <Text style={[styles.statLabel, { color: colors.muted }]}>عدد الزيارات</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{surveys.length}</Text>
              </View>
            </View>
          </View>

          {/* الملاحظات */}
          {notesSummary.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.notesHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الملاحظات</Text>
                <TouchableOpacity onPress={() => setShowAllNotes(true)} style={[styles.viewMoreBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.viewMoreBtnText}>عرض المزيد</Text>
                  <MaterialIcons name="arrow-forward" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              {notesSummary.slice(-2).map((note, idx) => (
                <View key={idx} style={[styles.noteItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <MaterialIcons name="note" size={18} color={colors.primary} />
                  <Text style={[styles.noteText, { color: colors.foreground }]}>{note.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* الزيارات */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.visitsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الزيارات</Text>
              <TouchableOpacity onPress={() => setShowDateFilter(true)} style={[styles.filterBtn, { backgroundColor: colors.primary + "20" }]}>
                <MaterialIcons name="filter-list" size={18} color={colors.primary} />
                <Text style={[styles.filterBtnText, { color: colors.primary }]}>تصفية</Text>
              </TouchableOpacity>
            </View>
            {filteredSurveys.length > 0 ? (
              <FlatList
                data={filteredSurveys.slice(-2)}
                keyExtractor={(item) => item.id}
                renderItem={renderSurveyItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            ) : (
              <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد زيارات</Text>
            )}
          </View>
        </ScrollView>

        {/* نافذة عائمة لتصفية التاريخ */}
        <FloatingFormModal visible={showDateFilter} onClose={() => setShowDateFilter(false)} backgroundColor={colors.background}>
          <SafeAreaView edges={["top", "left", "right", "bottom"]} style={[styles.filterModal, { backgroundColor: colors.background }]}> 
            <View style={[styles.filterHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                <MaterialIcons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.filterTitle, { color: colors.foreground }]}>تصفية حسب التاريخ</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.filterContent} keyboardDismissMode="none" keyboardShouldPersistTaps="always">
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>فترة الزيارات</Text>
                <TouchableOpacity
                  style={[styles.datePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowDateRangePicker(true)}
                >
                  <Text style={[styles.datePickerText, { color: startDate && endDate ? colors.foreground : colors.muted }]}> 
                    {startDate && endDate ? `${startDate} ← ${endDate}` : "اختر نطاق التاريخ"}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={[styles.filterFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => {
                  setStartDate("");
                  setEndDate("");
                  setFilteredSurveys(surveys);
                  setShowDateFilter(false);
                }}
                style={[styles.cancelBtn, { backgroundColor: colors.muted + "20" }]}
              >
                <MaterialIcons name="close" size={20} color={colors.foreground} />
                <Text style={[styles.buttonText, { color: colors.foreground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyDateFilter} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={[styles.buttonText, { color: "#fff" }]}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </FloatingFormModal>
        <DateRangePickerModal
          visible={showDateRangePicker}
          startDate={fromIsoDate(startDate)}
          endDate={fromIsoDate(endDate)}
          onCancel={() => setShowDateRangePicker(false)}
          onConfirm={(rangeStart, rangeEnd) => {
            setStartDate(toIsoDate(rangeStart));
            setEndDate(toIsoDate(rangeEnd));
            setShowDateRangePicker(false);
          }}
        />

        {/* Notes Details Screen */}
        <NotesDetailsScreen visible={showAllNotes} storeId={store.id} onClose={() => setShowAllNotes(false)} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" as any },
  content: { flex: 1, padding: 16, paddingBottom: 0 },
  storeImage: { width: "100%", height: 250, borderRadius: 12, marginBottom: 16 },
  section: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as any, marginBottom: 12 },
  infoSection: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  infoGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  infoCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1 },
  infoIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  infoCardLabel: { fontSize: 11, fontWeight: "600" as any, marginBottom: 6, textAlign: "center" },
  infoCardValue: { fontSize: 13, fontWeight: "700" as any, textAlign: "center" },
  addressCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1 },
  addressContent: { flex: 1 },
  categoryCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, padding: 12, borderWidth: 2, marginBottom: 12 },
  categoryLabel: { fontSize: 12, fontWeight: "600" as any, flex: 1 },
  categoryBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  categoryValue: { color: "#fff", fontWeight: "700" as any, fontSize: 12 },
  notesCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 12, padding: 12, borderWidth: 2, marginBottom: 12 },
  notesContent: { flex: 1 },
  notesLabel: { fontSize: 12, fontWeight: "600" as any, marginBottom: 6 },
  notesValue: { fontSize: 13, fontWeight: "500" as any, lineHeight: 20 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 10, padding: 12, alignItems: "center", borderWidth: 1 },
  statLabel: { fontSize: 11, fontWeight: "600" as any, marginTop: 8 },
  statValue: { fontSize: 16, fontWeight: "700" as any, marginTop: 4 },
  noteItem: { borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 13, fontWeight: "500" as any },
  surveyCard: { borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1 },
  surveyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  surveyDate: { fontSize: 14, fontWeight: "700" as any },
  surveyBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  surveyBadgeText: { fontSize: 12, fontWeight: "600" as any },
  surveyNote: { fontSize: 12, marginBottom: 8, fontStyle: "italic" },
  surveyProducts: { gap: 6 },
  productItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  productName: { flex: 1, fontSize: 12, fontWeight: "500" as any },
  shelfPercentage: { fontSize: 11, fontWeight: "600" as any },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 20 },
  visitsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  filterBtnText: { fontSize: 12, fontWeight: "600" as any },
  filterModal: { flex: 1 },
  filterHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  filterTitle: { fontSize: 16, fontWeight: "700" as any },
  filterContent: { flex: 1, padding: 16 },
  filterFooter: { flexDirection: "row", padding: 16, gap: 12, borderTopWidth: 1, justifyContent: "space-between", paddingBottom: Platform.OS === "ios" ? 32 : 16 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600" as any, marginBottom: 8 },
  formInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  datePickerButton: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  datePickerText: { fontSize: 14, fontWeight: "500" as any },
  cancelBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10 },
  saveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10 },
  buttonText: { fontSize: 14, fontWeight: "600" as any },
  calendarModal: { flex: 1 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  calendarTitle: { fontSize: 16, fontWeight: "700" as any },
  calendarContent: { flex: 1, padding: 16 },
  dateInputContainer: { marginBottom: 20 },
  dateInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, textAlign: "right" },
  monthSelector: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  monthButton: { flex: 1, minWidth: "30%", borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center", justifyContent: "center" },
  monthText: { fontSize: 13, fontWeight: "600" as any, textAlign: "center" },
  calendarFooter: { flexDirection: "row", padding: 16, borderTopWidth: 1, paddingBottom: Platform.OS === "ios" ? 32 : 16 },
  calendarBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  calendarBtnText: { fontSize: 14, fontWeight: "600" as any },
  viewAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, paddingVertical: 8 },
  viewAllText: { fontSize: 12, fontWeight: "600" as any },
  notesHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  viewMoreBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  viewMoreBtnText: { fontSize: 12, fontWeight: "600" as any, color: "#fff" }
});
