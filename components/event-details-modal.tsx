import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/use-colors";
import { getEventGoalTitle, loadEventGoals, type EventGoal } from "@/lib/event-goal-loader";
import { launchImageLibrary, type ImagePickerResponse } from "@/lib/media-picker";
import { MediaGalleryLightbox } from "./media-gallery-lightbox";
import { ConfirmDialog } from "./confirm-dialog";

interface EventDetailsModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
  onStatusChange: (newStatus: string) => void;
  onAddMedia: (uri: string, type: "image" | "video", metadata?: { fileName?: string | null; mimeType?: string | null }) => void;
  onDeleteMedia: (uri: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_OPTIONS = [
  { value: "planned", label: "مخططة", color: "#3B82F6", icon: "event-note" },
  { value: "ongoing", label: "جارية", color: "#F59E0B", icon: "bolt" },
  { value: "completed", label: "مكتملة", color: "#10B981", icon: "task-alt" },
  { value: "cancelled", label: "ملغاة", color: "#EF4444", icon: "cancel" },
] as const;

function getMediaType(uri: string): "image" | "video" {
  return /\.(mp4|mov|avi|mkv|webm|m4v|3gp|flv)(\?.*)?$/i.test(uri) ? "video" : "image";
}

function formatNumber(value: unknown): string {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("ar-SA") : "0";
}

export function EventDetailsModal({
  visible,
  event,
  onClose,
  onStatusChange,
  onAddMedia,
  onDeleteMedia,
  onEdit,
  onDelete,
}: EventDetailsModalProps) {
  const colors = useColors();
  const [goals, setGoals] = useState<EventGoal[]>([]);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const statusInfo = useMemo(
    () => STATUS_OPTIONS.find((status) => status.value === event?.status) || STATUS_OPTIONS[0],
    [event?.status],
  );
  const goalTitle = useMemo(() => getEventGoalTitle(goals, event?.goalId), [event?.goalId, goals]);

  useEffect(() => {
    if (!visible || !event?.goalId) {
      setGoals([]);
      return;
    }

    let active = true;
    void loadEventGoals()
      .then((items) => active && setGoals(items))
      .catch((error) => {
        console.error("خطأ في تحميل هدف الفعالية:", error);
        if (active) setGoals([]);
      });
    return () => {
      active = false;
    };
  }, [event?.goalId, visible]);

  const handleAddMedia = useCallback(
    (type: "image" | "video") => {
      void launchImageLibrary({ mediaType: type === "image" ? "photo" : "video", includeBase64: false }, (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert("تعذر إضافة الوسيط", "تأكد من منح إذن الوصول إلى الملفات ثم حاول مجدداً.");
          return;
        }

        const asset = response.assets?.[0];
        if (asset?.uri) {
          onAddMedia(asset.uri, type, { fileName: asset.fileName, mimeType: asset.mimeType });
        }
      });
    },
    [onAddMedia],
  );

  const handleDeleteEvent = useCallback(() => setDeleteConfirmationVisible(true), []);

  const mediaItems = useMemo(
    () => (event?.mediaUris || []).map((uri: string) => ({ uri, type: getMediaType(uri) })),
    [event?.mediaUris],
  );

  const metrics = [
    { icon: "groups", label: "الحضور", value: formatNumber(event?.attendeesCount), tone: colors.primary },
    { icon: "redeem", label: "الهدايا", value: formatNumber(event?.giftsDistributed), tone: colors.warning },
    { icon: "payments", label: "التكلفة", value: `${formatNumber(event?.actualCost || event?.budget)} ل.س`, tone: colors.success },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView edges={["top", "bottom", "left", "right"]} style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity accessibilityLabel="إغلاق التفاصيل" onPress={onClose} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="close" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>تفاصيل الفعالية</Text>
          <TouchableOpacity accessibilityLabel="تعديل الفعالية" onPress={onEdit} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="edit" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, { backgroundColor: statusInfo.color }]}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <MaterialIcons name={statusInfo.icon} size={23} color="#fff" />
              </View>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusPillText}>{statusInfo.label}</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{event?.title || "فعالية بلا عنوان"}</Text>
            <View style={styles.heroMetaRow}>
              <MaterialIcons name="calendar-today" size={15} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroMetaText}>{event?.eventDate || "غير محدد"}</Text>
              <View style={styles.heroMetaDivider} />
              <MaterialIcons name="location-on" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroMetaText}>{event?.region || event?.location || "غير محدد"}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            {metrics.map((metric) => (
              <View key={metric.label} style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.metricIcon, { backgroundColor: `${metric.tone}1A` }]}>
                  <MaterialIcons name={metric.icon as any} size={18} color={metric.tone} />
                </View>
                <Text style={[styles.metricValue, { color: colors.foreground }]} numberOfLines={1}>{metric.value}</Text>
                <Text style={[styles.metricLabel, { color: colors.muted }]}>{metric.label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>بيانات الفعالية</Text>
            <DetailRow icon="place" label="الموقع" value={event?.location || "غير محدد"} colors={colors} />
            <DetailRow icon="map" label="المنطقة" value={event?.region || "غير محددة"} colors={colors} />
            {event?.brandName ? <DetailRow icon="branding-watermark" label="الماركة" value={event.brandName} colors={colors} /> : null}
            {event?.detailedAddress ? <DetailRow icon="home-work" label="العنوان" value={event.detailedAddress} colors={colors} /> : null}
          </View>

          <View style={[styles.goalCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}35` }]}>
            <View style={[styles.goalIcon, { backgroundColor: `${colors.primary}20` }]}>
              <MaterialIcons name="flag" size={22} color={colors.primary} />
            </View>
            <View style={styles.goalTextGroup}>
              <Text style={[styles.goalLabel, { color: colors.muted }]}>الهدف المرتبط</Text>
              <Text style={[styles.goalTitle, { color: colors.foreground }]}>{!event?.goalId ? "بدون هدف" : goalTitle || "هدف غير متاح"}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>تحديث الحالة</Text>
            <Text style={[styles.sectionHint, { color: colors.muted }]}>اختر الحالة الحالية</Text>
          </View>
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map((status) => {
              const isSelected = event?.status === status.value;
              return (
                <TouchableOpacity
                  key={status.value}
                  onPress={() => onStatusChange(status.value)}
                  style={[styles.statusOption, { borderColor: isSelected ? status.color : colors.border, backgroundColor: isSelected ? `${status.color}18` : colors.surface }]}
                >
                  <MaterialIcons name={status.icon} size={18} color={isSelected ? status.color : colors.muted} />
                  <Text style={[styles.statusOptionText, { color: isSelected ? status.color : colors.foreground }]}>{status.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {event?.status === "completed" ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.documentationHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>التوثيق والوسائط</Text>
                  <Text style={[styles.documentationSubtitle, { color: colors.muted }]}>الصور والفيديوهات المرفقة بالفعالية</Text>
                </View>
                <View style={[styles.mediaCount, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.mediaCountText, { color: colors.primary }]}>{mediaItems.length}</Text>
                </View>
              </View>
              <MediaGalleryLightbox mediaItems={mediaItems} onDeleteMedia={onDeleteMedia} onAddMedia={(_uri, type) => handleAddMedia(type)} />
            </View>
          ) : null}

          {event?.notes ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>ملاحظات</Text>
              <Text style={[styles.notesText, { color: colors.foreground }]}>{event.notes}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={handleDeleteEvent} style={[styles.deleteButton, { borderColor: `${colors.error}70`, backgroundColor: `${colors.error}12` }]}>
            <MaterialIcons name="delete-outline" size={20} color={colors.error} />
            <Text style={[styles.deleteButtonText, { color: colors.error }]}>حذف</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} style={[styles.editButton, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="edit" size={19} color="#fff" />
            <Text style={styles.editButtonText}>تعديل الفعالية</Text>
          </TouchableOpacity>
        </View>
        <ConfirmDialog
          visible={deleteConfirmationVisible}
          title="حذف الفعالية"
          message={`سيتم حذف «${event?.title || "هذه الفعالية"}» نهائياً. لا يمكن التراجع عن ذلك.`}
          confirmText="حذف الفعالية"
          isDangerous
          icon="warning"
          onCancel={() => setDeleteConfirmationVisible(false)}
          onConfirm={() => { setDeleteConfirmationVisible(false); onDelete(); }}
        />
      </SafeAreaView>
    </Modal>
  );
}

function DetailRow({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <View style={styles.detailLabelGroup}>
        <View style={[styles.detailIcon, { backgroundColor: `${colors.primary}12` }]}>
          <MaterialIcons name={icon} size={16} color={colors.primary} />
        </View>
        <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 28, gap: 16 },
  hero: { borderRadius: 24, padding: 20, minHeight: 170, justifyContent: "space-between", shadowColor: "#000", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 5 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.20)" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" },
  statusPillText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  heroTitle: { color: "#fff", textAlign: "right", fontSize: 23, fontWeight: "800", lineHeight: 30, marginTop: 16 },
  heroMetaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 14 },
  heroMetaText: { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "600" },
  heroMetaDivider: { height: 15, width: 1, marginHorizontal: 4, backgroundColor: "rgba(255,255,255,0.45)" },
  metricsRow: { flexDirection: "row", gap: 9 },
  metricCard: { flex: 1, minHeight: 106, borderRadius: 18, borderWidth: 1, padding: 10, alignItems: "center", justifyContent: "center", gap: 4 },
  metricIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  metricValue: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  metricLabel: { fontSize: 11, fontWeight: "600" },
  card: { borderWidth: 1, borderRadius: 20, padding: 16 },
  cardTitle: { textAlign: "right", fontSize: 16, fontWeight: "800", marginBottom: 12 },
  detailRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  detailLabelGroup: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  detailIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  detailLabel: { fontSize: 12, fontWeight: "600" },
  detailValue: { flex: 1, textAlign: "left", fontSize: 13, fontWeight: "700" },
  goalCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  goalIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  goalTextGroup: { flex: 1, alignItems: "flex-end" },
  goalLabel: { fontSize: 11, fontWeight: "600", marginBottom: 3 },
  goalTitle: { textAlign: "right", fontSize: 14, fontWeight: "800" },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "baseline", justifyContent: "space-between", marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  sectionHint: { fontSize: 11 },
  statusGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  statusOption: { width: "48.5%", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, borderWidth: 1, borderRadius: 14 },
  statusOptionText: { fontSize: 13, fontWeight: "800" },
  documentationHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start" },
  documentationSubtitle: { fontSize: 11, textAlign: "right", marginTop: -7, marginBottom: 14 },
  mediaCount: { minWidth: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  mediaCountText: { fontSize: 12, fontWeight: "800" },
  notesText: { textAlign: "right", fontSize: 14, lineHeight: 22 },
  footer: { flexDirection: "row-reverse", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1 },
  editButton: { flex: 1, minHeight: 50, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 15 },
  editButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  deleteButton: { minWidth: 94, minHeight: 50, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 15 },
  deleteButtonText: { fontSize: 13, fontWeight: "800" },
});
