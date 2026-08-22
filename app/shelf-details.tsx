import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { type ShelfBrandAllocation, type ShelfInstallation } from "@/lib/shelves";
import { getItems, STORAGE_KEYS } from "@/lib/storage";

export default function ShelfDetailsScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const shelfId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [shelf, setShelf] = useState<ShelfInstallation | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const transition = useRef(new Animated.Value(0)).current;

  const loadShelf = useCallback(async () => {
    const entries = await getItems<ShelfInstallation>(STORAGE_KEYS.SHELVES);
    setShelf(entries.find((entry) => entry.id === shelfId) || null);
  }, [shelfId]);

  useFocusEffect(useCallback(() => {
    void loadShelf();
  }, [loadShelf]));

  useFocusEffect(useCallback(() => {
    setIsClosing(false);
    transition.setValue(0);
    const animation = Animated.timing(transition, {
      toValue: 1,
      duration: 230,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [transition]));

  const totalShelves = useMemo(
    () => shelf?.brandAllocations.reduce((sum, allocation) => sum + allocation.shelfCount, 0) || 0,
    [shelf],
  );

  const closeDetail = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    Animated.timing(transition, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => router.back());
  }, [isClosing, transition]);

  const pageStyle = {
    opacity: transition,
    transform: [
      { translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
      { scale: transition.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
    ],
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <Animated.View style={[styles.page, pageStyle]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            disabled={isClosing}
            onPress={closeDetail}
            style={[styles.back, { backgroundColor: colors.surface, opacity: isClosing ? 0.55 : 1 }]}
            accessibilityLabel="العودة إلى الستاندات"
          >
            <MaterialIcons name="arrow-forward" size={21} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.foreground }]}>تفاصيل الأرفف</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>تركيب الأرفف وتوزيع الماركات داخل المحل</Text>
          </View>
        </View>

        {!shelf ? (
          <View style={styles.empty}>
            <MaterialIcons name="find-in-page" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>تعذر العثور على الأرفف</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>قد تكون البيانات قد حُذفت نهائياً.</Text>
          </View>
        ) : (
          <FlatList
            data={shelf.brandAllocations}
            keyExtractor={(item, index) => `${item.brand}-${index}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                <View style={[styles.hero, { backgroundColor: colors.primary }]}>
                  <View style={styles.heroTop}>
                    <View style={styles.heroIcon}>
                      <MaterialIcons name="view-quilt" size={28} color="#fff" />
                    </View>
                    <View style={styles.heroCopy}>
                      <Text style={styles.heroEyebrow}>تركيب أرفف داخل محل</Text>
                      <Text style={styles.heroTitle} numberOfLines={1}>{shelf.storeName}</Text>
                      <Text style={styles.heroDates}>{shelf.region || "منطقة غير محددة"} · {shelf.installDate}</Text>
                    </View>
                  </View>
                  <View style={styles.heroMetrics}>
                    <Metric value={String(totalShelves)} label="إجمالي الأرفف" />
                    <View style={styles.heroDivider} />
                    <Metric value={String(shelf.brandAllocations.length)} label="ماركات مركبة" />
                    <View style={styles.heroDivider} />
                    <View style={styles.heroMetric}>
                      <View style={styles.activeBadge}><Text style={[styles.activeBadgeText, { color: colors.success }]}>مركّب</Text></View>
                      <Text style={styles.heroMetricLabel}>حالة التركيب</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.overview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <InfoRow icon="store" value={shelf.storeName} label="المحل" colors={colors} />
                  <View style={[styles.overviewLine, { backgroundColor: colors.border }]} />
                  <InfoRow icon="location-on" value={shelf.region || "منطقة غير محددة"} label="المنطقة" colors={colors} />
                  <View style={[styles.overviewLine, { backgroundColor: colors.border }]} />
                  <InfoRow icon="calendar-today" value={shelf.installDate} label="تاريخ تركيب الأرفف" colors={colors} />
                </View>

                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>صورة الأرفف</Text>
                {shelf.imageUri ? (
                  <TouchableOpacity
                    onPress={() => setActiveImage(shelf.imageUri || null)}
                    style={[styles.imageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    accessibilityLabel="عرض صورة الأرفف كاملة"
                  >
                    <Image source={{ uri: shelf.imageUri }} style={styles.shelfImage} resizeMode="cover" />
                    <View style={styles.imageLabel}>
                      <MaterialIcons name="fullscreen" size={15} color="#fff" />
                      <Text style={styles.imageLabelText}>عرض الصورة كاملة</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.placeholderIcon, { backgroundColor: colors.primary + "14" }]}>
                      <MaterialIcons name="image" size={28} color={colors.primary} />
                    </View>
                    <Text style={[styles.placeholderTitle, { color: colors.foreground }]}>لا توجد صورة مرفقة</Text>
                    <Text style={[styles.placeholderText, { color: colors.muted }]}>يمكن إضافتها عند تعديل بيانات الأرفف بالضغط المطوّل على البطاقة.</Text>
                  </View>
                )}

                <View style={styles.allocationsHeading}>
                  <Text style={[styles.allocationCount, { color: colors.primary }]}>{totalShelves} رفوف</Text>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>توزيع الأرفف على الماركات</Text>
                </View>
              </>
            }
            renderItem={({ item, index }) => <AllocationCard allocation={item} index={index} colors={colors} />}
            ListFooterComponent={
              shelf.notes ? (
                <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.notesHeader}>
                    <MaterialIcons name="notes" size={19} color={colors.primary} />
                    <Text style={[styles.notesTitle, { color: colors.foreground }]}>ملاحظات</Text>
                  </View>
                  <Text style={[styles.notesText, { color: colors.muted }]}>{shelf.notes}</Text>
                </View>
              ) : <View style={styles.footerSpace} />
            }
          />
        )}
      </Animated.View>

      {activeImage ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setActiveImage(null)}>
          <View style={styles.viewerBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveImage(null)} />
            <View style={[styles.viewer, { backgroundColor: colors.surface }]}>
              <View style={styles.viewerHeader}>
                <TouchableOpacity onPress={() => setActiveImage(null)} style={[styles.viewerClose, { backgroundColor: colors.background }]}>
                  <MaterialIcons name="close" size={21} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.viewerTitle, { color: colors.foreground }]}>صورة الأرفف</Text>
              </View>
              <Image source={{ uri: activeImage }} resizeMode="contain" style={styles.fullImage} />
            </View>
          </View>
        </Modal>
      ) : null}
    </ScreenContainer>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.heroMetric}><Text style={styles.heroMetricValue}>{value}</Text><Text style={styles.heroMetricLabel}>{label}</Text></View>;
}

function InfoRow({ icon, value, label, colors }: { icon: keyof typeof MaterialIcons.glyphMap; value: string; label: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.overviewRow}><MaterialIcons name={icon} size={18} color={colors.primary} /><View style={styles.overviewCopy}><Text style={[styles.overviewValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.overviewLabel, { color: colors.muted }]}>{label}</Text></View></View>;
}

function AllocationCard({ allocation, index, colors }: { allocation: ShelfBrandAllocation; index: number; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.allocationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.allocationNumber, { backgroundColor: colors.primary + "14" }]}><Text style={[styles.allocationNumberText, { color: colors.primary }]}>{index + 1}</Text></View>
      <View style={styles.allocationCopy}><Text style={[styles.allocationBrand, { color: colors.foreground }]}>{allocation.brand}</Text><Text style={[styles.allocationHint, { color: colors.muted }]}>عدد الأرفف المخصصة لهذه الماركة</Text></View>
      <View style={[styles.shelfCount, { backgroundColor: colors.primary + "10" }]}><Text style={[styles.shelfCountValue, { color: colors.primary }]}>{allocation.shelfCount}</Text><Text style={[styles.shelfCountLabel, { color: colors.primary }]}>رفوف</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { minHeight: 73, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "flex-end" },
  title: { fontSize: 17, fontWeight: "800" as any },
  subtitle: { fontSize: 10, marginTop: 3, textAlign: "right" },
  list: { padding: 16, paddingBottom: 32 },
  hero: { borderRadius: 22, padding: 17, marginBottom: 12 },
  heroTop: { flexDirection: "row", gap: 11, alignItems: "center" },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1, alignItems: "flex-end" },
  heroEyebrow: { color: "rgba(255,255,255,0.78)", fontSize: 10, fontWeight: "700" as any },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "800" as any, textAlign: "right", marginTop: 2 },
  heroDates: { color: "rgba(255,255,255,0.84)", fontSize: 10, marginTop: 4, textAlign: "right" },
  heroMetrics: { flexDirection: "row", marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.22)" },
  heroMetric: { flex: 1, alignItems: "center" },
  heroMetricValue: { color: "#fff", fontSize: 16, fontWeight: "900" as any },
  heroMetricLabel: { color: "rgba(255,255,255,0.8)", fontSize: 9, marginTop: 4, textAlign: "center" },
  heroDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.22)" },
  activeBadge: { minWidth: 56, minHeight: 29, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  activeBadgeText: { fontSize: 13, fontWeight: "900" as any },
  overview: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, marginBottom: 18 },
  overviewRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 9 },
  overviewCopy: { flex: 1, alignItems: "flex-end" },
  overviewValue: { fontSize: 12, fontWeight: "800" as any, textAlign: "right" },
  overviewLabel: { fontSize: 9, marginTop: 3 },
  overviewLine: { height: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: 15, fontWeight: "800" as any, textAlign: "right", marginBottom: 10 },
  imageCard: { height: 228, borderWidth: 1, borderRadius: 17, overflow: "hidden", marginBottom: 20 },
  shelfImage: { width: "100%", height: "100%" },
  imageLabel: { position: "absolute", bottom: 10, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.62)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4 },
  imageLabelText: { color: "#fff", fontSize: 10, fontWeight: "700" as any },
  imagePlaceholder: { minHeight: 156, borderWidth: 1, borderRadius: 17, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, marginBottom: 20 },
  placeholderIcon: { width: 54, height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  placeholderTitle: { fontSize: 13, fontWeight: "800" as any, marginTop: 9 },
  placeholderText: { fontSize: 10, textAlign: "center", marginTop: 4, lineHeight: 16 },
  allocationsHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  allocationCount: { fontSize: 11, fontWeight: "800" as any },
  allocationCard: { minHeight: 78, borderWidth: 1, borderRadius: 17, marginBottom: 9, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  allocationNumber: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  allocationNumberText: { fontSize: 12, fontWeight: "900" as any },
  allocationCopy: { flex: 1, alignItems: "flex-end" },
  allocationBrand: { fontSize: 14, fontWeight: "800" as any, textAlign: "right" },
  allocationHint: { fontSize: 10, marginTop: 3, textAlign: "right" },
  shelfCount: { minWidth: 50, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  shelfCountValue: { fontSize: 16, fontWeight: "900" as any },
  shelfCountLabel: { fontSize: 8, fontWeight: "800" as any, marginTop: 1 },
  notesCard: { marginTop: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  notesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 7 },
  notesTitle: { fontSize: 14, fontWeight: "800" as any },
  notesText: { fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 10 },
  footerSpace: { height: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "800" as any },
  emptyText: { fontSize: 11, textAlign: "center" },
  viewerBackdrop: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(0,0,0,0.72)" },
  viewer: { borderRadius: 22, overflow: "hidden", maxHeight: "88%" },
  viewerHeader: { minHeight: 56, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewerClose: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  viewerTitle: { fontSize: 14, fontWeight: "800" as any, textAlign: "right" },
  fullImage: { height: 480, width: "100%" },
});
