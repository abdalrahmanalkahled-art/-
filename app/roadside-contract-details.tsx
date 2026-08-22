import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { loadAppSettings } from "@/lib/app-settings";
import { getRoadsideBoardBackBrand, getRoadsideBoardFrontBrand, getRoadsideBoardFrontImage, getRoadsideBoardRatingCounts, getRoadsideContractAlert, type RoadsideContract } from "@/lib/roadside-contracts";
import { getItems, STORAGE_KEYS } from "@/lib/storage";

export default function RoadsideContractDetailsScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const contractId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [contract, setContract] = useState<RoadsideContract | null>(null);
  const [reminderDays, setReminderDays] = useState<15 | 30 | 60>(30);
  const [activeImage, setActiveImage] = useState<{ uri: string; label: string } | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const transition = useRef(new Animated.Value(0)).current;

  const loadContract = useCallback(async () => {
    const [contracts, settings] = await Promise.all([
      getItems<RoadsideContract>(STORAGE_KEYS.ROAD_SIGNAGE_CONTRACTS),
      loadAppSettings(),
    ]);
    setContract(contracts.find((item) => item.id === contractId) || null);
    setReminderDays(settings.roadsideContractReminderDays);
  }, [contractId]);

  useEffect(() => { void loadContract(); }, [loadContract]);
  useEffect(() => {
    transition.setValue(0);
    const animation = Animated.timing(transition, { toValue: 1, duration: 230, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [transition]);

  const alert = useMemo(() => contract ? getRoadsideContractAlert(contract, new Date(), reminderDays) : null, [contract, reminderDays]);
  const isWall = contract?.type === "wall";
  const isIsland = contract?.type === "island";
  const isArchived = contract?.status !== "active";
  const itemLabel = isWall ? "اللوحة الجدارية" : isIsland ? "عقد المنصفات" : "عقد اللوحات";
  const archiveLabel = contract?.archiveReason === "renewed" ? "مجدَّد ومؤرشف" : "ملغى ومؤرشف";
  const alertColor = isArchived ? contract?.archiveReason === "renewed" ? colors.success : colors.error : alert?.state === "expired" ? colors.error : alert?.state === "upcoming" ? colors.warning : colors.success;
  const stateLabel = isArchived ? archiveLabel : alert?.state === "expired" ? "منتهٍ" : alert?.state === "upcoming" ? `${alert.daysRemaining} يوم` : "سارٍ";
  const stateDescription = isArchived ? `أُرشف في ${contract?.archivedAt?.slice(0, 10) || "—"} مع الاحتفاظ بكامل بيانات العقد واللوحات` : alert?.state === "expired" ? `انتهت فترة ${isWall ? "عرض اللوحة" : isIsland ? "عقد المنصفات" : "العقد"}` : alert?.state === "upcoming" ? `ينتهي خلال ${alert.daysRemaining} يوم` : `ساري حتى ${contract?.endDate || ""}`;
  const ratingCounts = useMemo(() => {
    if (!contract) return [];
    if (contract.type === "island" && contract.boards[0]?.rating?.trim()) return [{ rating: contract.boards[0].rating.trim(), count: contract.totalBoards }];
    return getRoadsideBoardRatingCounts(contract.boards);
  }, [contract]);

  const closeDetail = () => {
    if (isClosing) return;
    setIsClosing(true);
    Animated.timing(transition, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => router.back());
  };

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
          <TouchableOpacity disabled={isClosing} onPress={closeDetail} style={[styles.back, { backgroundColor: colors.surface, opacity: isClosing ? 0.55 : 1 }]}>
            <MaterialIcons name="arrow-forward" size={21} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.foreground }]}>{isWall ? "تفاصيل اللوحة الجدارية" : isIsland ? "تفاصيل عقد المنصفات" : "تفاصيل عقد اللوحات"}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{isWall ? "بيانات اللوحة والمسؤول وخصائص العرض" : isIsland ? "نطاق المنصف وخصائص النموذج الموحد" : "اللوحات الفعلية وتوزيعها وخصائصها"}</Text>
          </View>
        </View>

        {!contract ? (
          <View style={styles.empty}>
            <MaterialIcons name="find-in-page" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>تعذر العثور على العقد</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>قد يكون العقد قد حُذف نهائياً.</Text>
          </View>
        ) : (
          <FlatList
            data={contract.boards}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <>
                <View style={[styles.hero, { backgroundColor: colors.primary }]}>
                  <View style={styles.heroTop}>
                    <View style={styles.heroIcon}><MaterialIcons name={isWall ? "crop-landscape" : isIsland ? "location-city" : "directions"} size={28} color="#fff" /></View>
                    <View style={styles.heroCopy}>
                      <Text style={styles.heroEyebrow}>{isArchived ? `${isWall ? "لوحة جدارية" : isIsland ? "عقد منصفات" : "عقد لوحات"} مؤرشف` : isWall ? "لوحة جدارية" : isIsland ? "عقد منصفات" : "عقد لوحات طرقية"}</Text>
                      <Text style={styles.heroTitle}>{contract.ownerCompany}</Text>
                      <Text style={styles.heroDates}>{contract.startDate} ← {contract.endDate}</Text>
                    </View>
                  </View>
                  <View style={styles.heroMetrics}>
                    <Metric value={String(contract.totalBoards)} label={isWall ? "لوحة جدارية" : isIsland ? "منصف مستأجر" : "لوحة مستأجرة"} />
                    <View style={styles.heroDivider} />
                    <Metric value={String(contract.boards.length)} label={isWall ? "منطقة محددة" : isIsland ? "نموذج موحد" : "لوحة موزعة"} />
                    <View style={styles.heroDivider} />
                    <View style={styles.heroMetric}>
                      <View style={[styles.contractStateBadge, { borderColor: alertColor + "55" }]}>
                        <Text style={[styles.contractStateText, { color: alertColor }]}>{stateLabel}</Text>
                      </View>
                      <Text style={styles.heroMetricLabel}>{isArchived || alert?.state === "safe" ? "حالة العقد" : "حتى النهاية"}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.overview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <InfoRow icon={isWall ? "person" : "business"} iconColor={colors.primary} value={contract.ownerCompany} label={isWall ? "الشخص المسؤول" : "الشركة المالكة"} colors={colors} />
                  {isIsland ? <><View style={[styles.overviewLine, { backgroundColor: colors.border }]} /><InfoRow icon="location-city" iconColor={colors.primary} value={contract.boards[0]?.linkedRegions?.join(" ← ") || contract.boards[0]?.region || "—"} label="نطاق المنصف" colors={colors} /></> : null}
                  {isWall && contract.responsiblePhone ? <><View style={[styles.overviewLine, { backgroundColor: colors.border }]} /><InfoRow icon="phone" iconColor={colors.primary} value={contract.responsiblePhone} label="رقم هاتف المسؤول" colors={colors} /></> : null}
                  <View style={[styles.overviewLine, { backgroundColor: colors.border }]} />
                  <InfoRow icon={isArchived ? "inventory-2" : "info-outline"} iconColor={alertColor} value={stateDescription} label={isArchived ? "حالة الأرشفة" : `تنبيه ${isWall ? "اللوحة" : "العقد"} · مضبوط قبل ${reminderDays} يوماً`} colors={colors} />
                </View>

                {ratingCounts.length ? (
                  <View style={[styles.ratingsSummary, { backgroundColor: colors.primary + "0C", borderColor: colors.primary + "28" }]}>
                    <View style={styles.ratingsHeading}><MaterialIcons name="grade" size={18} color={colors.primary} /><Text style={[styles.ratingsTitle, { color: colors.foreground }]}>{isIsland ? "توزيع تقييم المنصفات" : "توزيع تقييم اللوحات"}</Text></View>
                    <View style={styles.ratingChips}>
                      {ratingCounts.map((item) => <View key={item.rating} style={[styles.ratingChip, { backgroundColor: colors.background, borderColor: colors.primary + "36" }]}><Text style={[styles.ratingChipValue, { color: colors.primary }]}>{item.count}</Text><Text style={[styles.ratingChipLabel, { color: colors.foreground }]}>{item.rating}</Text></View>)}
                    </View>
                  </View>
                ) : null}

                <View style={styles.boardHeading}><Text style={[styles.boardCount, { color: colors.primary }]}>{isIsland ? `${contract.totalBoards} منصف` : `${contract.boards.length} ${isWall ? "لوحة جدارية" : "لوحة"}`}</Text><Text style={[styles.boardHeadingTitle, { color: colors.foreground }]}>{isWall ? "تفاصيل اللوحة" : isIsland ? "تفاصيل المنصف الفعلي" : "اللوحات الفعلية"}</Text></View>
              </>
            }
            renderItem={({ item, index }) => {
              const frontImage = getRoadsideBoardFrontImage(item);
              const faceCount = item.sides === 2 ? 2 : 1;
              return (
                <View style={[styles.boardCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.imagesRow}>
                    {frontImage ? <BoardImage uri={frontImage} label={faceCount === 2 ? "الوجه الأول" : "استعراض الصورة"} onPress={() => setActiveImage({ uri: frontImage, label: faceCount === 2 ? "الوجه الأول" : "صورة اللوحة" })} /> : <ImagePlaceholder color={colors.primary} />}
                    {faceCount === 2 ? item.backImageUri ? <BoardImage uri={item.backImageUri} label="الوجه الثاني" onPress={() => setActiveImage({ uri: item.backImageUri!, label: "الوجه الثاني" })} /> : <ImagePlaceholder color={colors.primary} label="لم تُضف صورة الوجه الثاني" muted={colors.muted} /> : null}
                  </View>
                  <View style={styles.boardBody}>
                    <View style={styles.boardTop}><View style={[styles.boardNumber, { backgroundColor: colors.primary + "14" }]}><Text style={[styles.boardNumberText, { color: colors.primary }]}>{index + 1}</Text></View><View style={styles.boardTitleCopy}><Text style={[styles.boardTitle, { color: colors.foreground }]}>{isWall ? "لوحة جدارية" : isIsland ? "منصف فعلي" : "لوحة طرقية"}</Text><Text style={[styles.boardRegion, { color: colors.muted }]}>{item.linkedRegions?.join(" ← ") || item.region}</Text></View><MaterialIcons name={isWall ? "crop-landscape" : isIsland ? "location-city" : "location-on"} size={20} color={colors.primary} /></View>
                    <View style={styles.boardInfoGrid}>
                      <BoardInfo color={colors.muted} icon="business" value={faceCount === 2 ? `الأول: ${getRoadsideBoardFrontBrand(item)}` : getRoadsideBoardFrontBrand(item)} />
                      {faceCount === 2 ? <BoardInfo color={colors.muted} icon="business" value={`الثاني: ${getRoadsideBoardBackBrand(item)}`} /> : null}
                      <BoardInfo color={colors.muted} icon="flip" value={faceCount === 2 ? "وجهان" : "وجه واحد"} />
                      {item.boardType ? <BoardInfo color={colors.muted} icon="category" value={item.boardType} /> : null}
                      {item.rating ? <BoardInfo color={colors.primary} icon="grade" value={`تقييم ${item.rating}`} /> : null}
                      {item.widthCm || item.heightCm ? <BoardInfo color={colors.muted} icon="straighten" value={`${item.widthCm || "—"} × ${item.heightCm || "—"} سم`} /> : null}
                    </View>
                    {item.address ? <View style={[styles.address, { borderTopColor: colors.border }]}><MaterialIcons name="place" size={14} color={colors.muted} /><Text style={[styles.addressText, { color: colors.muted }]}>{item.address}</Text></View> : null}
                  </View>
                </View>
              );
            }}
          />
        )}
      </Animated.View>

      {activeImage ? <Modal transparent visible animationType="fade" onRequestClose={() => setActiveImage(null)}><View style={styles.viewerBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveImage(null)} /><View style={[styles.viewer, { backgroundColor: colors.surface }]}><View style={styles.viewerHeader}><TouchableOpacity onPress={() => setActiveImage(null)} style={[styles.viewerClose, { backgroundColor: colors.background }]}><MaterialIcons name="close" size={21} color={colors.foreground} /></TouchableOpacity><Text style={[styles.viewerTitle, { color: colors.foreground }]}>{activeImage.label}</Text></View><Image source={{ uri: activeImage.uri }} resizeMode="contain" style={styles.fullImage} /></View></View></Modal> : null}
    </ScreenContainer>
  );
}

function Metric({ value, label }: { value: string; label: string }) { return <View style={styles.heroMetric}><Text style={styles.heroMetricValue}>{value}</Text><Text style={styles.heroMetricLabel}>{label}</Text></View>; }
function InfoRow({ icon, iconColor, value, label, colors }: { icon: keyof typeof MaterialIcons.glyphMap; iconColor: string; value: string; label: string; colors: ReturnType<typeof useColors> }) { return <View style={styles.overviewRow}><MaterialIcons name={icon} size={18} color={iconColor} /><View style={styles.overviewCopy}><Text style={[styles.overviewValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.overviewLabel, { color: colors.muted }]}>{label}</Text></View></View>; }
function BoardInfo({ icon, value, color }: { icon: keyof typeof MaterialIcons.glyphMap; value: string; color: string }) { return <View style={styles.boardInfo}><MaterialIcons name={icon} size={14} color={color} /><Text style={[styles.boardInfoText, { color }]} numberOfLines={1}>{value}</Text></View>; }
function BoardImage({ uri, label, onPress }: { uri: string; label: string; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.boardImageTouch}><Image source={{ uri }} style={styles.boardImage} /><View style={styles.imageLabel}><MaterialIcons name="fullscreen" size={14} color="#fff" /><Text style={styles.imageLabelText}>{label}</Text></View></TouchableOpacity>; }
function ImagePlaceholder({ color, label, muted }: { color: string; label?: string; muted?: string }) { return <View style={[styles.boardImagePlaceholder, { backgroundColor: color + "10" }]}><MaterialIcons name="image" size={30} color={color} />{label ? <Text style={[styles.missingFace, { color: muted || color }]}>{label}</Text> : null}</View>; }

const styles = StyleSheet.create({
  page: { flex: 1 }, header: { minHeight: 73, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth }, back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "flex-end" }, title: { fontSize: 17, fontWeight: "800" as any }, subtitle: { fontSize: 10, marginTop: 3 }, list: { padding: 16, paddingBottom: 32 }, hero: { borderRadius: 22, padding: 17, marginBottom: 12 }, heroTop: { flexDirection: "row", gap: 11, alignItems: "center" }, heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }, heroCopy: { flex: 1, alignItems: "flex-end" }, heroEyebrow: { color: "rgba(255,255,255,0.78)", fontSize: 10, fontWeight: "700" as any }, heroTitle: { color: "#fff", fontSize: 18, fontWeight: "800" as any, textAlign: "right", marginTop: 2 }, heroDates: { color: "rgba(255,255,255,0.84)", fontSize: 10, marginTop: 4 }, heroMetrics: { flexDirection: "row", marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.22)" }, heroMetric: { flex: 1, alignItems: "center" }, heroMetricValue: { color: "#fff", fontSize: 16, fontWeight: "900" as any }, heroMetricLabel: { color: "rgba(255,255,255,0.8)", fontSize: 9, marginTop: 4 }, heroDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.22)" }, contractStateBadge: { minWidth: 56, minHeight: 29, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, contractStateText: { fontSize: 13, fontWeight: "900" as any }, overview: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, marginBottom: 12 }, overviewRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 9 }, overviewCopy: { flex: 1, alignItems: "flex-end" }, overviewValue: { fontSize: 12, fontWeight: "800" as any, textAlign: "right" }, overviewLabel: { fontSize: 9, marginTop: 3 }, overviewLine: { height: StyleSheet.hairlineWidth }, ratingsSummary: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 16 }, ratingsHeading: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-end" }, ratingsTitle: { fontSize: 12, fontWeight: "800" as any }, ratingChips: { flexDirection: "row", gap: 7, marginTop: 10, flexWrap: "wrap" }, ratingChip: { minWidth: 54, minHeight: 45, borderWidth: 1, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 }, ratingChipValue: { fontSize: 14, fontWeight: "900" as any }, ratingChipLabel: { fontSize: 9, fontWeight: "800" as any, marginTop: 1 }, boardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }, boardHeadingTitle: { fontSize: 15, fontWeight: "800" as any }, boardCount: { fontSize: 11, fontWeight: "800" as any }, boardCard: { borderWidth: 1, borderRadius: 17, overflow: "hidden", marginBottom: 10 }, imagesRow: { flexDirection: "row", gap: 1 }, boardImageTouch: { flex: 1, height: 152 }, boardImage: { width: "100%", height: 152 }, boardImagePlaceholder: { flex: 1, height: 102, alignItems: "center", justifyContent: "center", gap: 5 }, missingFace: { fontSize: 9, textAlign: "center", paddingHorizontal: 8 }, imageLabel: { position: "absolute", bottom: 6, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.62)", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }, imageLabelText: { color: "#fff", fontSize: 9, fontWeight: "700" as any }, boardBody: { padding: 12 }, boardTop: { flexDirection: "row", alignItems: "center", gap: 8 }, boardNumber: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" }, boardNumberText: { fontSize: 12, fontWeight: "900" as any }, boardTitleCopy: { flex: 1, alignItems: "flex-end" }, boardTitle: { fontSize: 13, fontWeight: "800" as any }, boardRegion: { fontSize: 10, marginTop: 3 }, boardInfoGrid: { flexDirection: "row", gap: 8, marginTop: 11, flexWrap: "wrap" }, boardInfo: { minHeight: 30, paddingHorizontal: 7, maxWidth: "48%", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 }, boardInfoText: { fontSize: 10, textAlign: "right", flexShrink: 1 }, address: { marginTop: 9, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 5, alignItems: "flex-start" }, addressText: { flex: 1, fontSize: 10, textAlign: "right", lineHeight: 15 }, viewerBackdrop: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(0,0,0,0.72)" }, viewer: { borderRadius: 22, overflow: "hidden", maxHeight: "88%" }, viewerHeader: { minHeight: 56, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, viewerClose: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }, viewerTitle: { fontSize: 14, fontWeight: "800" as any, textAlign: "right" }, fullImage: { height: 480, width: "100%" }, empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }, emptyTitle: { fontSize: 15, fontWeight: "800" as any }, emptyText: { fontSize: 11, textAlign: "center" },
});
