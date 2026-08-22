import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

interface SurveyResultItem {
  id: string;
  templateId: string;
  templateName: string;
  cycleName?: string;
  storeId: string;
  storeName: string;
  storeRegion: string;
  surveyDate: string;
  imageUri?: string;
  storePhotoUri?: string;
  storePhotoUris?: string[];
  data: {
    productId: string;
    productName: string;
    present: boolean;
    shelfPercentage: number;
    shelfOccupied?: number;
    price?: number;
  }[];
  hasShelfPercentage?: boolean;
  hasProductPrice?: boolean;
  totalShelves?: number;
  notes?: string;
  createdAt: string;
}

interface SurveyResultDetailScreenProps {
  result: SurveyResultItem;
  visible: boolean;
  onClose: () => void;
  onViewStoreDetails: (storeId: string) => void;
}

export function SurveyResultDetailScreen({
  result,
  visible,
  onClose,
  onViewStoreDetails,
}: SurveyResultDetailScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const presentCount = result.data.filter((d) => d.present).length;
  const percentage = Math.round((presentCount / result.data.length) * 100);

  const getStatusColor = (present: boolean) => {
    return present ? colors.success : colors.error;
  };

  const getStatusText = (present: boolean) => {
    return present ? "موجود" : "غير موجود";
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>تفاصيل النتيجة</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
          {/* صورة الاستبيان */}
          {result.imageUri && (
            <Image source={{ uri: result.imageUri }} style={styles.surveyImage} />
          )}
          {(result.storePhotoUris?.length || result.storePhotoUri) && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>صور المحل</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storePhotoList}>
                {(result.storePhotoUris?.length ? result.storePhotoUris : result.storePhotoUri ? [result.storePhotoUri] : []).map((uri, index) => <Image key={`${uri}_${index}`} source={{ uri }} style={styles.storePhoto} resizeMode="cover" />)}
              </ScrollView>
            </View>
          )}

          {/* معلومات الاستبيان */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>معلومات الاستبيان</Text>

            <View style={styles.infoGrid}>
              <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.primary + "15" }]}>
                  <MaterialIcons name="store" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>المحل</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>
                  {result.storeName}
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.primary + "15" }]}>
                  <MaterialIcons name="location-on" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>المنطقة</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>
                  {result.storeRegion}
                </Text>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.primary + "15" }]}>
                  <MaterialIcons name="calendar-today" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>التاريخ</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>
                  {new Date(result.surveyDate).toLocaleDateString("en-US")}
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.primary + "15" }]}>
                  <MaterialIcons name="description" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>القالب</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>
                  {result.cycleName || result.templateName}
                </Text>
              </View>
            </View>
          </View>

          {/* نسبة التواجد */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>نسبة التواجد</Text>

            <View style={[styles.percentageContainer, { backgroundColor: colors.primary + "10", borderColor: colors.primary }]}>
              <View style={styles.percentageContent}>
                <Text style={[styles.percentageLabel, { color: colors.muted }]}>النسبة الإجمالية</Text>
                <Text style={[styles.percentageValue, { color: colors.primary }]}>{percentage}%</Text>
              </View>
              <View style={[styles.percentageCircle, { backgroundColor: colors.primary }]}>
                <Text style={styles.percentageCircleText}>{percentage}%</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.success + "10", borderColor: colors.success }]}>
                <MaterialIcons name="check-circle" size={20} color={colors.success} />
                <Text style={[styles.statLabel, { color: colors.muted }]}>موجود</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>{presentCount}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.error + "10", borderColor: colors.error }]}>
                <MaterialIcons name="cancel" size={20} color={colors.error} />
                <Text style={[styles.statLabel, { color: colors.muted }]}>غير موجود</Text>
                <Text style={[styles.statValue, { color: colors.error }]}>
                  {result.data.length - presentCount}
                </Text>
              </View>
            </View>
          </View>

          {/* المنتجات */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>المنتجات</Text>

            {result.data.map((product, index) => (
              <View
                key={product.productId}
                style={[
                  styles.productItem,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderBottomWidth: index < result.data.length - 1 ? 1 : 0,
                  },
                ]}
              >
                <View style={styles.productHeader}>
                  <View style={styles.productInfo}>
                    <View
                      style={[
                        styles.productStatusIcon,
                        { backgroundColor: getStatusColor(product.present) + "20" },
                      ]}
                    >
                      <MaterialIcons
                        name={product.present ? "check" : "close"}
                        size={16}
                        color={getStatusColor(product.present)}
                      />
                    </View>
                    <View style={styles.productDetails}>
                      <Text style={[styles.productName, { color: colors.foreground }]}>
                        {product.productName}
                      </Text>
                      <Text style={[styles.productStatus, { color: getStatusColor(product.present) }]}>
                        {getStatusText(product.present)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.productMetrics}>
                    {result.hasShelfPercentage !== false && (
                      <View style={styles.productPercentage}>
                        <Text style={[styles.percentageLabel, { color: colors.muted }]}>النسبة</Text>
                        <Text style={[styles.percentageValue, { color: colors.primary }]}> 
                          {product.shelfPercentage}%
                        </Text>
                        {result.totalShelves ? <Text style={[styles.percentageLabel, { color: colors.muted }]}>{product.shelfOccupied ?? 0} / {result.totalShelves} رف</Text> : null}
                      </View>
                    )}
                    {product.present && result.hasProductPrice && (
                      <View style={styles.productPercentage}>
                        <Text style={[styles.percentageLabel, { color: colors.muted }]}>السعر</Text>
                        <Text style={[styles.percentageValue, { color: colors.primary }]}>{product.price ?? 0}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Progress Bar */}
                {result.hasShelfPercentage !== false && (
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}> 
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${product.shelfPercentage}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* الملاحظات */}
          {result.notes && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الملاحظات</Text>
              <View style={[styles.notesBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.notesText, { color: colors.foreground }]}>{result.notes}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Button - View Store Details */}
        <View style={[styles.actionContainer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            onPress={() => {
              onViewStoreDetails(result.storeId);
              onClose();
            }}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="info" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>معلومات المحل</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as any,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 0,
  },
  surveyImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as any,
    marginBottom: 12,
  },
  storePhotoList: {
    flexDirection: "row",
    gap: 9,
  },
  storePhoto: {
    width: 170,
    height: 128,
    borderRadius: 10,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600" as any,
    marginBottom: 6,
    textAlign: "center",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700" as any,
    textAlign: "center",
  },
  percentageContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    justifyContent: "space-between",
  },
  percentageContent: {
    flex: 1,
  },
  percentageLabel: {
    fontSize: 12,
    fontWeight: "600" as any,
    marginBottom: 4,
  },
  percentageValue: {
    fontSize: 24,
    fontWeight: "700" as any,
  },
  percentageCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  percentageCircleText: {
    fontSize: 20,
    fontWeight: "700" as any,
    color: "#fff",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600" as any,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as any,
  },
  productItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 0,
    borderWidth: 1,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600" as any,
    marginBottom: 4,
  },
  productStatus: {
    fontSize: 11,
    fontWeight: "500" as any,
  },
  productPercentage: {
    alignItems: "flex-start",
  },
  productMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  notesBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  notesText: {
    fontSize: 13,
    fontWeight: "500" as any,
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    padding: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600" as any,
    color: "#fff",
  },
});
