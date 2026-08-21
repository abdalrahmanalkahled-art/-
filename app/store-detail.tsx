import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getItems, saveItems, STORAGE_KEYS } from "@/lib/storage";

interface SurveyResult {
  id: string;
  templateId: string;
  templateName: string;
  cycleName?: string;
  storeId: string;
  storeName: string;
  storeRegion: string;
  surveyDate: string;
  data: {
    productId: string;
    productName: string;
    present: boolean;
    shelfPercentage: number;
  }[];
  notes?: string;
  noteType?: "positive" | "negative" | "complaint" | "suggestion" | "recommendation";
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  categoryName: string;
  type: "company" | "competitor";
  competitorName?: string;
}

export default function StoreDetailScreen() {
  const router = useRouter();
  const { storeId } = useLocalSearchParams();
  const colors = useColors();
  
  const [surveys, setSurveys] = useState<SurveyResult[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeRegion, setStoreRegion] = useState("");

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    const [surveysData, productsData] = await Promise.all([
      getItems<SurveyResult>(STORAGE_KEYS.SURVEY_RESULTS),
      getItems<Product>(STORAGE_KEYS.PRODUCTS),
    ]);

    const storeSurveys = surveysData
      .filter((s) => s.storeId === storeId)
      .sort((a, b) => new Date(b.surveyDate).getTime() - new Date(a.surveyDate).getTime());

    setSurveys(storeSurveys);
    setProducts(productsData);

    if (storeSurveys.length > 0) {
      setStoreName(storeSurveys[0].storeName);
      setStoreRegion(storeSurveys[0].storeRegion);
    }
  };

  const getProductTrend = (product: Product) => {
    if (!product) return [];

    const trend = surveys.map((survey) => {
      const productData = survey.data.find((d) => d.productId === product.id);
      return {
        date: survey.surveyDate,
        present: productData?.present ? 1 : 0,
        shelfPercentage: productData?.shelfPercentage || 0,
      };
    });

    return trend.reverse();
  };

  const getNoteTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      positive: "إيجابي",
      negative: "سلبي",
      complaint: "شكوى",
      suggestion: "اقتراح",
      recommendation: "تزكية",
    };
    return labels[type || ""] || "";
  };

  const getNoteTypeColor = (type?: string) => {
    const colorMap: Record<string, string> = {
      positive: colors.success,
      negative: colors.error,
      complaint: colors.warning,
      suggestion: colors.primary,
      recommendation: "#FFD700",
    };
    return colorMap[type || ""] || colors.muted;
  };

  const latestSurvey = surveys[0];
  const trend = selectedProduct ? getProductTrend(selectedProduct) : [];

  return (
    <ScreenContainer className="flex-1">
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{storeName}</Text>
          <Text style={styles.headerSubtitle}>{storeRegion}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Latest Survey Summary */}
        {latestSurvey && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>آخر استبيان</Text>
            <Text style={[styles.cardDate, { color: colors.muted }]}>{latestSurvey.surveyDate}</Text>

            {latestSurvey.data.map((product) => (
              <View key={product.productId} style={[styles.productRow, { borderBottomColor: colors.border }]}>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.foreground }]}>{product.productName}</Text>
                  <View style={styles.productStats}>
                    <View style={[styles.badge, { backgroundColor: product.present ? colors.success + "20" : colors.error + "20" }]}>
                      <Text style={[styles.badgeText, { color: product.present ? colors.success : colors.error }]}>
                        {product.present ? "موجود" : "غير موجود"}
                      </Text>
                    </View>
                    {product.present && (
                      <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>{product.shelfPercentage}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {latestSurvey.notes && (
              <View style={[styles.notesBox, { backgroundColor: colors.background }]}>
                <View style={styles.notesHeader}>
                  <Text style={[styles.notesLabel, { color: colors.foreground }]}>ملاحظات</Text>
                  <View style={[styles.noteTypeBadge, { backgroundColor: getNoteTypeColor(latestSurvey.noteType) }]}>
                    <Text style={styles.noteTypeText}>{getNoteTypeLabel(latestSurvey.noteType)}</Text>
                  </View>
                </View>
                <Text style={[styles.notesText, { color: colors.foreground }]}>{latestSurvey.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Product Selection for Trend */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>اختر منتج لعرض الاتجاه</Text>
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedProduct(item)}
                style={[
                  styles.productOption,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  selectedProduct?.id === item.id && { backgroundColor: colors.primary + "20", borderColor: colors.primary },
                ]}
              >
                <MaterialIcons
                  name={selectedProduct?.id === item.id ? "radio-button-checked" : "radio-button-unchecked"}
                  size={20}
                  color={selectedProduct?.id === item.id ? colors.primary : colors.muted}
                />
                <View style={styles.productOptionInfo}>
                  <Text style={[styles.productOptionName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.productOptionCategory, { color: colors.muted }]}>
                    {item.categoryName}
                    {item.competitorName && ` • ${item.competitorName}`}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Trend Chart */}
        {selectedProduct && trend.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>اتجاه التواجد والظهور</Text>
            <View style={styles.trendContainer}>
              {trend.map((item, index) => (
                <View key={index} style={styles.trendItem}>
                  <View style={styles.trendBar}>
                    <View
                      style={[
                        styles.presenceBar,
                        {
                          height: `${item.present * 100}%`,
                          backgroundColor: item.present ? colors.success : colors.error,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.trendLabel, { color: colors.muted }]}>{item.shelfPercentage}%</Text>
                  <Text style={[styles.trendDate, { color: colors.muted }]}>{item.date}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Survey History */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>سجل الاستبيانات</Text>
          {surveys.map((survey) => (
            <View key={survey.id} style={[styles.surveyItem, { borderBottomColor: colors.border }]}>
              <View style={styles.surveyItemHeader}>
                <Text style={[styles.surveyDate, { color: colors.foreground }]}>{survey.surveyDate}</Text>
                <Text style={[styles.surveyTemplate, { color: colors.muted }]}>{survey.cycleName || survey.templateName}</Text>
              </View>
              <Text style={[styles.surveyCount, { color: colors.muted }]}>
                {survey.data.filter((d) => d.present).length} من {survey.data.length} منتج موجود
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.spacing} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as any,
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.8,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700" as any,
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 12,
    marginBottom: 12,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600" as any,
    marginBottom: 6,
  },
  productStats: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600" as any,
  },
  notesBox: {
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600" as any,
  },
  noteTypeBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  noteTypeText: {
    fontSize: 10,
    fontWeight: "600" as any,
    color: "#fff",
  },
  notesText: {
    fontSize: 12,
    lineHeight: 18,
  },
  productOption: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productOptionInfo: {
    flex: 1,
  },
  productOptionName: {
    fontSize: 13,
    fontWeight: "600" as any,
  },
  productOptionCategory: {
    fontSize: 11,
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 150,
    paddingVertical: 12,
  },
  trendItem: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  trendBar: {
    width: 24,
    height: 100,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    justifyContent: "flex-end",
  },
  presenceBar: {
    width: "100%",
  },
  trendLabel: {
    fontSize: 10,
    fontWeight: "600" as any,
  },
  trendDate: {
    fontSize: 9,
  },
  surveyItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  surveyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  surveyDate: {
    fontSize: 12,
    fontWeight: "600" as any,
  },
  surveyTemplate: {
    fontSize: 11,
  },
  surveyCount: {
    fontSize: 11,
  },
  spacing: {
    height: 20,
  },
});
