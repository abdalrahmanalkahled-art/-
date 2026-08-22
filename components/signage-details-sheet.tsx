import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/use-colors";
import { canOpenSignageImage } from "@/lib/signage-details-helpers";

type SignageType = "store" | "road" | "wall" | "island";
type StandCondition = "good" | "damaged" | "needs_repair";

export interface SignageDetailsData {
  id: string;
  type: SignageType;
  storeName?: string;
  region?: string;
  address?: string;
  responsible?: string;
  brand?: string;
  frontBrand?: string;
  backBrand?: string;
  sides?: 1 | 2;
  frontImageUri?: string;
  backImageUri?: string;
  widthCm?: number;
  heightCm?: number;
  boardType?: string;
  rating?: string;
  brandHistory?: Array<{ id: string; face: "front" | "back"; brand: string; installedAt: string; archivedAt: string }>;
  islandCount?: number | string;
  installDate: string;
  contractEndDate?: string;
  imageUri?: string;
  notes?: string;
}

export interface StandDetailsData {
  id: string;
  storeName?: string;
  brand?: string;
  condition: StandCondition;
  installDate: string;
  imageUri?: string;
  notes?: string;
  maintenanceHistory?: {
    id: string;
    date: string;
    type: "repair" | "replacement" | "maintenance";
    description: string;
    status: "pending" | "in_progress" | "completed";
  }[];
}

interface SignageDetailsSheetProps {
  visible: boolean;
  kind: "signage" | "stand";
  signage?: SignageDetailsData | null;
  stand?: StandDetailsData | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const signageTypes: Record<SignageType, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  store: { label: "لوحة محل", icon: "store", color: "#3B82F6" },
  road: { label: "لوحة طرقية", icon: "directions", color: "#7C3AED" },
  wall: { label: "لوحة جدارية", icon: "crop-landscape", color: "#DC2626" },
  island: { label: "لوحة منصف", icon: "location-city", color: "#0E9F6E" },
};

const standConditions: Record<StandCondition, { label: string; color: string }> = {
  good: { label: "جيد", color: "#10B981" },
  damaged: { label: "تالف", color: "#EF4444" },
  needs_repair: { label: "يحتاج إصلاح", color: "#F59E0B" },
};

const maintenanceTypeLabels = {
  repair: "إصلاح",
  replacement: "استبدال",
  maintenance: "صيانة",
};

const maintenanceStatusLabels = {
  pending: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
};

function DetailCell({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.detailCell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.detailIcon, { backgroundColor: colors.primary + "14" }]}>
        <MaterialIcons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.detailCellText}>
        <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

export function SignageDetailsSheet({
  visible,
  kind,
  signage,
  stand,
  onClose,
  onEdit,
  onDelete,
}: SignageDetailsSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showFullImage, setShowFullImage] = useState(false);
  const isSignage = kind === "signage" && signage;
  const storeBoard = isSignage && signage.type === "store" ? signage : null;
  const isStoreBoard = Boolean(storeBoard);
  const imageUri = isSignage ? signage.frontImageUri || signage.imageUri : stand?.imageUri;
  const canOpenImage = canOpenSignageImage(imageUri);
  const title = isStoreBoard ? "تفاصيل لوحة المحل" : isSignage ? signageTypes[signage.type].label : "تفاصيل الستاند";
  const accentColor = isSignage ? signageTypes[signage.type].color : standConditions[stand?.condition ?? "good"].color;
  const heroIcon = isSignage ? signageTypes[signage.type].icon : "location-city";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={["top", "left", "right"]} style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerAction} accessibilityLabel="إغلاق التفاصيل">
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
          {isSignage ? (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onEdit} style={styles.headerAction} accessibilityLabel="تعديل">
                <MaterialIcons name="edit" size={21} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} style={styles.headerAction} accessibilityLabel="حذف">
                <MaterialIcons name="delete-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : <View style={styles.headerAction} />}
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          <Pressable
            disabled={!canOpenImage}
            onPress={() => setShowFullImage(true)}
            style={({ pressed }) => [styles.hero, { backgroundColor: accentColor + "16" }, pressed && canOpenImage && { opacity: 0.86 }]}
          >
            {canOpenImage && imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
                <View style={styles.imageHint}>
                  <MaterialIcons name="fullscreen" size={18} color="#fff" />
                  <Text style={styles.imageHintText}>عرض الصورة كاملة</Text>
                </View>
              </>
            ) : (
              <View style={styles.placeholder}>
                <View style={[styles.placeholderIcon, { backgroundColor: accentColor + "20" }]}>
                  <MaterialIcons name={heroIcon} size={34} color={accentColor} />
                </View>
                <Text style={[styles.placeholderTitle, { color: colors.foreground }]}>{title}</Text>
                <Text style={[styles.placeholderText, { color: colors.muted }]}>لا توجد صورة مرفقة</Text>
              </View>
            )}
          </Pressable>

          {isStoreBoard ? (
            <View style={[styles.storeContractHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.storeContractTop}>
                <View style={styles.storeContractCopy}><Text style={[styles.storeContractTitle, { color: colors.foreground }]}>{storeBoard?.storeName || "لوحة محل"}</Text><Text style={[styles.storeContractSubtitle, { color: colors.muted }]}>{storeBoard?.region || "منطقة غير محددة"}{storeBoard?.address ? ` · ${storeBoard.address}` : ""}</Text></View>
                <View style={[styles.statusPill, { backgroundColor: accentColor + "18" }]}><Text style={[styles.statusPillText, { color: accentColor }]}>لوحة محل</Text></View>
                <View style={[styles.identityIcon, { backgroundColor: accentColor }]}><MaterialIcons name="store" size={22} color="#fff" /></View>
              </View>
              <View style={[styles.storeMetrics, { borderTopColor: colors.border }]}>
                <View style={styles.storeMetric}><Text style={[styles.storeMetricValue, { color: colors.foreground }]} numberOfLines={1}>{storeBoard?.frontBrand || storeBoard?.brand || "—"}</Text><Text style={[styles.storeMetricLabel, { color: colors.muted }]}>الماركة</Text></View>
                <View style={[styles.storeMetricDivider, { backgroundColor: colors.border }]} />
                <View style={styles.storeMetric}><Text style={[styles.storeMetricValue, { color: colors.foreground }]}>{storeBoard?.rating || "—"}</Text><Text style={[styles.storeMetricLabel, { color: colors.muted }]}>التقييم</Text></View>
                <View style={[styles.storeMetricDivider, { backgroundColor: colors.border }]} />
                <View style={styles.storeMetric}><Text style={[styles.storeMetricValue, { color: colors.foreground }]}>{storeBoard?.installDate || "—"}</Text><Text style={[styles.storeMetricLabel, { color: colors.muted }]}>تاريخ التركيب</Text></View>
              </View>
            </View>
          ) : <View style={styles.identityRow}>
            <View style={[styles.identityIcon, { backgroundColor: accentColor }]}>
              <MaterialIcons name={heroIcon} size={22} color="#fff" />
            </View>
            <View style={styles.identityText}>
              <Text style={[styles.identityTitle, { color: colors.foreground }]}>{isSignage ? signage.frontBrand || signage.brand || title : stand?.brand || "ستاند بدون ماركة"}</Text>
              <Text style={[styles.identitySubtitle, { color: colors.muted }]}>{isSignage ? signage.storeName || signage.region || "بيانات موقع غير متاحة" : stand?.storeName || "بدون محل"}</Text>
            </View>
            {isSignage ? (
              <View style={[styles.statusPill, { backgroundColor: accentColor + "18" }]}>
                <Text style={[styles.statusPillText, { color: accentColor }]}>{signageTypes[signage.type].label}</Text>
              </View>
            ) : stand ? (
              <View style={[styles.statusPill, { backgroundColor: accentColor + "18" }]}>
                <Text style={[styles.statusPillText, { color: accentColor }]}>{standConditions[stand.condition].label}</Text>
              </View>
            ) : null}
          </View>}

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{isStoreBoard ? "تفاصيل اللوحة الفعلية" : "المعلومات"}</Text>
          {isSignage ? (
            <View style={styles.detailGrid}>
              <DetailCell icon="category" label="النوع" value={signageTypes[signage.type].label} />
              <DetailCell icon="calendar-today" label="تاريخ التركيب" value={signage.installDate} />
              {signage.storeName ? <DetailCell icon="store" label="المحل" value={signage.storeName} /> : null}
              {signage.frontBrand || signage.brand ? <DetailCell icon="sell" label={signage.sides === 2 ? "ماركة الوجه الأول" : "الماركة"} value={signage.frontBrand || signage.brand || "—"} /> : null}
              {signage.sides === 2 && signage.backBrand ? <DetailCell icon="sell" label="ماركة الوجه الثاني" value={signage.backBrand} /> : null}
              {signage.sides ? <DetailCell icon="flip" label="الوجوه" value={signage.sides === 2 ? "وجهان" : "وجه واحد"} /> : null}
              {signage.boardType ? <DetailCell icon="category" label="نوع اللوحة" value={signage.boardType} /> : null}
              {signage.rating ? <DetailCell icon="grade" label="تقييم اللوحة" value={signage.rating} /> : null}
              {signage.widthCm || signage.heightCm ? <DetailCell icon="aspect-ratio" label="الأبعاد" value={`${signage.widthCm || "—"} × ${signage.heightCm || "—"} سم`} /> : null}
              {signage.region ? <DetailCell icon="location-on" label="المنطقة" value={signage.region} /> : null}
              {signage.address ? <DetailCell icon="place" label="العنوان" value={signage.address} /> : null}
              {signage.responsible ? <DetailCell icon="person" label="المسؤول" value={signage.responsible} /> : null}
              {signage.contractEndDate ? <DetailCell icon="event" label="نهاية العقد" value={signage.contractEndDate} /> : null}
              {signage.islandCount ? <DetailCell icon="numbers" label="عدد اللوحات" value={String(signage.islandCount)} /> : null}
            </View>
          ) : stand ? (
            <View style={styles.detailGrid}>
              <DetailCell icon="store" label="المحل" value={stand.storeName || "بدون محل"} />
              <DetailCell icon="sell" label="الماركة" value={stand.brand || "بدون ماركة"} />
              <DetailCell icon="info" label="الحالة" value={standConditions[stand.condition].label} />
              <DetailCell icon="calendar-today" label="تاريخ التركيب" value={stand.installDate} />
            </View>
          ) : null}

          {(isSignage ? signage.notes : stand?.notes) ? (
            <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <View style={styles.notesHeader}>
                <MaterialIcons name="notes" size={19} color={colors.primary} />
                <Text style={[styles.notesTitle, { color: colors.foreground }]}>ملاحظات</Text>
              </View>
              <Text style={[styles.notesText, { color: colors.muted }]}>{isSignage ? signage.notes : stand?.notes}</Text>
            </View>
          ) : null}

          {isSignage && signage.sides === 2 && signage.backImageUri ? (
            <View style={[styles.secondaryImageCard, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
              <Text style={[styles.secondaryImageLabel, { color: colors.foreground }]}>صورة الوجه الثاني</Text>
              <Image source={{ uri: signage.backImageUri }} style={styles.secondaryImage} resizeMode="cover" />
            </View>
          ) : null}

          {isSignage && signage.brandHistory?.length ? (
            <View style={[styles.brandHistoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <View style={styles.notesHeader}><MaterialIcons name="history" size={19} color={colors.primary} /><Text style={[styles.notesTitle, { color: colors.foreground }]}>أرشيف الماركات</Text></View>
              {signage.brandHistory.map((entry) => <View key={entry.id} style={[styles.brandHistoryRow, { borderTopColor: colors.border }]}><View style={styles.brandHistoryCopy}><Text style={[styles.brandHistoryBrand, { color: colors.foreground }]}>{entry.brand}</Text><Text style={[styles.brandHistoryDate, { color: colors.muted }]}>{entry.installedAt} ← {entry.archivedAt}</Text></View><Text style={[styles.brandHistoryFace, { color: colors.primary }]}>{entry.face === "back" ? "الوجه الثاني" : "الوجه الأول"}</Text></View>)}
            </View>
          ) : null}

          {!isSignage && stand?.maintenanceHistory && stand.maintenanceHistory.length > 0 ? (
            <View style={[styles.maintenanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.notesHeader}>
                <MaterialIcons name="build" size={19} color={colors.primary} />
                <Text style={[styles.notesTitle, { color: colors.foreground }]}>سجل الصيانة</Text>
              </View>
              {stand.maintenanceHistory.map((record) => {
                const statusColor = record.status === "completed" ? colors.success : record.status === "in_progress" ? colors.primary : colors.warning;
                return (
                  <View key={record.id} style={[styles.maintenanceRow, { borderTopColor: colors.border }]}>
                    <View style={[styles.maintenanceMark, { backgroundColor: statusColor }]} />
                    <View style={styles.maintenanceText}>
                      <Text style={[styles.maintenanceTitle, { color: colors.foreground }]}>{maintenanceTypeLabels[record.type]}</Text>
                      <Text style={[styles.maintenanceDescription, { color: colors.muted }]}>{record.description}</Text>
                    </View>
                    <View style={styles.maintenanceMeta}>
                      <Text style={[styles.maintenanceStatus, { color: statusColor }]}>{maintenanceStatusLabels[record.status]}</Text>
                      <Text style={[styles.maintenanceDate, { color: colors.muted }]}>{record.date}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showFullImage} transparent animationType="fade" onRequestClose={() => setShowFullImage(false)}>
        <View style={styles.fullImageBackdrop}>
          <SafeAreaView style={styles.fullImageSafeArea}>
            <TouchableOpacity onPress={() => setShowFullImage(false)} style={styles.fullImageClose} accessibilityLabel="إغلاق الصورة">
              <MaterialIcons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.fullImage} resizeMode="contain" /> : null}
          </SafeAreaView>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 60, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5 },
  headerAction: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" as any },
  headerActions: { flexDirection: "row", alignItems: "center" },
  content: { padding: 16 },
  hero: { minHeight: 190, borderRadius: 18, overflow: "hidden", marginBottom: 16 },
  heroImage: { width: "100%", height: 230 },
  imageHint: { position: "absolute", bottom: 12, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.58)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18 },
  imageHintText: { color: "#fff", fontSize: 12, fontWeight: "600" as any },
  placeholder: { minHeight: 190, alignItems: "center", justifyContent: "center", gap: 7 },
  placeholderIcon: { width: 66, height: 66, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  placeholderTitle: { fontSize: 17, fontWeight: "700" as any },
  placeholderText: { fontSize: 13 },
  identityRow: { flexDirection: "row", alignItems: "center", marginBottom: 22, gap: 10 },
  identityIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  identityText: { flex: 1 },
  storeContractHero: { marginBottom: 20, borderWidth: 1, borderRadius: 17, padding: 14 },
  storeContractTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  storeContractCopy: { flex: 1, alignItems: "flex-end" },
  storeContractTitle: { fontSize: 17, fontWeight: "800" as any, textAlign: "right" },
  storeContractSubtitle: { fontSize: 11, marginTop: 3, textAlign: "right" },
  storeMetrics: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  storeMetric: { flex: 1, alignItems: "center" },
  storeMetricValue: { fontSize: 12, fontWeight: "800" as any, maxWidth: 86 },
  storeMetricLabel: { fontSize: 9, marginTop: 4 },
  storeMetricDivider: { width: StyleSheet.hairlineWidth, height: 28 },
  identityTitle: { fontSize: 16, fontWeight: "700" as any },
  identitySubtitle: { fontSize: 13, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusPillText: { fontSize: 12, fontWeight: "700" as any },
  sectionTitle: { fontSize: 16, fontWeight: "700" as any, marginBottom: 10 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailCell: { width: "48.5%", minHeight: 76, borderRadius: 14, borderWidth: 1, padding: 10, flexDirection: "row", gap: 8 },
  detailIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  detailCellText: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: "600" as any },
  detailValue: { fontSize: 13, fontWeight: "700" as any, marginTop: 3 },
  notesCard: { marginTop: 18, borderRadius: 14, borderWidth: 1, padding: 14 },
  notesHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  notesTitle: { fontSize: 15, fontWeight: "700" as any },
  notesText: { fontSize: 14, lineHeight: 21, marginTop: 10 },
  secondaryImageCard: { marginTop: 18, borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  secondaryImageLabel: { padding: 12, textAlign: "right", fontWeight: "700" as any, fontSize: 13 },
  secondaryImage: { width: "100%", height: 190 },
  brandHistoryCard: { marginTop: 18, borderRadius: 14, borderWidth: 1, padding: 14 },
  brandHistoryRow: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10 },
  brandHistoryCopy: { flex: 1, alignItems: "flex-end" },
  brandHistoryBrand: { fontSize: 13, fontWeight: "700" as any },
  brandHistoryDate: { fontSize: 11, marginTop: 2 },
  brandHistoryFace: { fontSize: 11, fontWeight: "700" as any, marginLeft: 10 },
  maintenanceCard: { marginTop: 18, borderRadius: 14, borderWidth: 1, padding: 14 },
  maintenanceRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingTop: 11, marginTop: 11, borderTopWidth: 0.5 },
  maintenanceMark: { width: 8, height: 8, borderRadius: 4 },
  maintenanceText: { flex: 1 },
  maintenanceTitle: { fontSize: 13, fontWeight: "700" as any },
  maintenanceDescription: { fontSize: 12, marginTop: 2 },
  maintenanceMeta: { alignItems: "flex-end" },
  maintenanceStatus: { fontSize: 11, fontWeight: "700" as any },
  maintenanceDate: { fontSize: 11, marginTop: 3 },
  fullImageBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)" },
  fullImageSafeArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  fullImageClose: { position: "absolute", top: 12, right: 16, zIndex: 2, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center" },
  fullImage: { width: "100%", height: "88%" },
});
