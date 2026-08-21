import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, Pressable, Modal } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { BarChart, LineChart, ComparisonChart } from "@/components/performance-charts";
import { InteractiveBarChart, InteractivePieChart, InteractiveLineChart } from "@/components/interactive-charts";
import { calculateSurveyAnalytics, type Product, type SurveyResult } from "@/lib/survey-analytics-calculator";

interface SurveyAnalyticsModuleProps {
  surveys: SurveyResult[];
  products: Product[];
}

export function SurveyAnalyticsModule({ surveys, products }: SurveyAnalyticsModuleProps) {
  const colors = useColors();
  const analytics = useMemo(() => calculateSurveyAnalytics(surveys, products), [surveys, products]);
  
  // State for comparison filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct1, setSelectedProduct1] = useState<string | null>(null);
  const [selectedProduct2, setSelectedProduct2] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showProduct1Dropdown, setShowProduct1Dropdown] = useState(false);
  const [showProduct2Dropdown, setShowProduct2Dropdown] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  
  // State for category analysis view mode
  const [categoryViewMode, setCategoryViewMode] = useState<{ [key: string]: 'table' | 'chart' }>({});
  
  // State for notes modal
  const [selectedNoteType, setSelectedNoteType] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  
  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.categoryName)));
  }, [products]);
  
  // Get products for selected category
  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter((p) => p.categoryName === selectedCategory);
  }, [selectedCategory, products]);
  
  // Get selected products data from analytics
  const getProductData = (productId: string) => {
    if (!selectedCategory) return null;
    const categoryAnalysis = analytics.categoryAnalysis.find((c) => c.categoryName === selectedCategory);
    if (!categoryAnalysis) return null;
    
    const companyProduct = categoryAnalysis.companyProducts.find((p) => p.name === productId);
    if (companyProduct) return { ...companyProduct, type: "company" as const };
    
    const competitorProduct = categoryAnalysis.competitorProducts.find((p) => p.name === productId);
    if (competitorProduct) return { ...competitorProduct, type: "competitor" as const };
    
    return null;
  };
  
  // Get products for selected category from surveys
  const selectedCategoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    const productsInCategory = products.filter((p) => p.categoryName === selectedCategory);
    const productsInSurveys = new Set<string>();
    
    surveys.forEach((survey) => {
      survey.data.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product && product.categoryName === selectedCategory) {
          productsInSurveys.add(product.name);
        }
      });
    });
    
    return Array.from(productsInSurveys);
  }, [selectedCategory, surveys, products]);

  const StatBox = ({ label, value, icon, color }: any) => (
    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );

  const TrendBadge = ({ trend }: any) => {
    const trendColor = trend === "up" ? colors.success : trend === "down" ? colors.error : colors.warning;
    const trendIcon = trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : "trending-flat";
    return (
      <View style={[styles.trendBadge, { backgroundColor: trendColor + "20" }]}>
        <MaterialIcons name={trendIcon} size={14} color={trendColor} />
        <Text style={[styles.trendText, { color: trendColor }]}>
          {trend === "up" ? "صاعد" : trend === "down" ? "هابط" : "مستقر"}
        </Text>
      </View>
    );
  };

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Overall Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الإحصائيات العامة</Text>
        <View style={styles.statsGrid}>
          <StatBox label="إجمالي الاستبيانات" value={analytics.overallStats.totalSurveys} icon="assignment" color={colors.primary} />
          <StatBox label="عدد المحلات" value={analytics.overallStats.totalStores} icon="store" color={colors.accent} />
          <StatBox label="متوسط التواجد" value={`${analytics.overallStats.avgPresence}%`} icon="bar-chart" color={colors.success} />
        </View>
      </View>

      {/* Company vs Competitors */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>مقارنة الأداء</Text>
        <View style={[styles.comparisonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: colors.muted }]}>منتجاتنا</Text>
              <Text style={[styles.comparisonValue, { color: colors.primary }]}>{analytics.overallStats.companyAvgPresence}%</Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: colors.muted }]}>المنافسون</Text>
              <Text style={[styles.comparisonValue, { color: colors.error }]}>{analytics.overallStats.competitorAvgPresence}%</Text>
            </View>
          </View>
        </View>
        
        {/* Product Comparison Filters */}
        <View style={[styles.filterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.filterTitle, { color: colors.foreground }]}>مقارنة منتجات محددة</Text>
          
          {/* Category Dropdown */}
          <Pressable
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            style={[styles.dropdownBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <Text style={[styles.dropdownBtnText, { color: selectedCategory ? colors.foreground : colors.muted }]}>
              {selectedCategory || "اختر التصنيف"}
            </Text>
            <MaterialIcons name={showCategoryDropdown ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
          </Pressable>
          
          {showCategoryDropdown && (
            <ScrollView style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {categories.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowCategoryDropdown(false);
                    setSelectedProduct1(null);
                    setSelectedProduct2(null);
                  }}
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{category}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          
          {selectedCategory && (
            <>
              {/* Product 1 Dropdown */}
              <Pressable
                onPress={() => setShowProduct1Dropdown(!showProduct1Dropdown)}
                style={[styles.dropdownBtn, { borderColor: colors.border, backgroundColor: colors.background, marginTop: 8 }]}
              >
                <Text style={[styles.dropdownBtnText, { color: selectedProduct1 ? colors.foreground : colors.muted }]}>
                  {selectedProduct1 || "اختر المنتج الأول"}
                </Text>
                <MaterialIcons name={showProduct1Dropdown ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
              </Pressable>
              
              {showProduct1Dropdown && (
                <ScrollView style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                  {selectedCategoryProducts.map((product) => (
                    <Pressable
                      key={product}
                      onPress={() => {
                        setSelectedProduct1(product);
                        setShowProduct1Dropdown(false);
                      }}
                      style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{product}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              
              {/* Product 2 Dropdown */}
              <Pressable
                onPress={() => setShowProduct2Dropdown(!showProduct2Dropdown)}
                style={[styles.dropdownBtn, { borderColor: colors.border, backgroundColor: colors.background, marginTop: 8 }]}
              >
                <Text style={[styles.dropdownBtnText, { color: selectedProduct2 ? colors.foreground : colors.muted }]}>
                  {selectedProduct2 || "اختر المنتج الثاني"}
                </Text>
                <MaterialIcons name={showProduct2Dropdown ? "expand-less" : "expand-more"} size={20} color={colors.primary} />
              </Pressable>
              
              {showProduct2Dropdown && (
                <ScrollView style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                  {selectedCategoryProducts.map((product) => (
                    <Pressable
                      key={product}
                      onPress={() => {
                        setSelectedProduct2(product);
                        setShowProduct2Dropdown(false);
                      }}
                      style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{product}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              
              {/* Show Charts Button */}
              {selectedProduct1 && selectedProduct2 && (
                <Pressable
                  onPress={() => setShowCharts(true)}
                  style={[styles.compareBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                >
                  <MaterialIcons name="bar-chart" size={18} color="#fff" />
                  <Text style={styles.compareBtnText}>عرض الرسوم البيانية</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
      
      {/* Charts Modal */}
      {selectedProduct1 && selectedProduct2 && (
        <Modal visible={showCharts} transparent animationType="slide" onRequestClose={() => setShowCharts(false)}>
          <View style={[styles.chartsModal, { backgroundColor: colors.background }]}>
            <View style={[styles.chartsHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.chartsTitle, { color: colors.foreground }]}>مقارنة الأداء</Text>
              <Pressable onPress={() => setShowCharts(false)}>
                <MaterialIcons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.chartsContent} showsVerticalScrollIndicator={false}>
              {(() => {
                const product1Data = getProductData(selectedProduct1);
                const product2Data = getProductData(selectedProduct2);
                
                if (!product1Data || !product2Data) return null;
                
                return (
                  <>
                    <ComparisonChart
                      label1={selectedProduct1}
                      value1={product1Data.presencePercentage}
                      label2={selectedProduct2}
                      value2={product2Data.presencePercentage}
                    />
                    
                    <BarChart
                      data={{
                        labels: [selectedProduct1, selectedProduct2],
                        values: [product1Data.presencePercentage, product2Data.presencePercentage],
                        colors: [colors.primary, colors.error],
                      }}
                      title="نسبة التواجد"
                    />
                    
                    <InteractiveBarChart
                      data={[
                        { label: selectedProduct1, value: product1Data.presencePercentage, color: colors.primary },
                        { label: selectedProduct2, value: product2Data.presencePercentage, color: colors.error },
                      ]}
                      title="رسم بياني تفاعلي - نسبة التواجد"
                    />
                    
                    <BarChart
                      data={{
                        labels: [selectedProduct1, selectedProduct2],
                        values: [product1Data.avgShelfPercentage, product2Data.avgShelfPercentage],
                        colors: [colors.success, colors.warning],
                      }}
                      title="متوسط نسبة الرف"
                    />
                    
                    <InteractiveBarChart
                      data={[
                        { label: selectedProduct1, value: product1Data.avgShelfPercentage, color: colors.success },
                        { label: selectedProduct2, value: product2Data.avgShelfPercentage, color: colors.warning },
                      ]}
                      title="رسم بياني تفاعلي - متوسط نسبة الرف"
                    />
                  </>
                );
              })()}
              
              <View style={styles.padding} />
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Category Analysis */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>التحليل حسب التصنيفات</Text>
        {analytics.categoryAnalysis.map((category, idx) => {
          const currentViewMode = categoryViewMode[category.categoryName] || 'table';
          
          // Get products that were actually selected in surveys for this category
          const productsInSurveys = new Set<string>();
          surveys.forEach((survey) => {
            survey.data.forEach((item) => {
              const product = products.find((p) => p.id === item.productId);
              if (product && product.categoryName === category.categoryName) {
                productsInSurveys.add(product.id);
              }
            });
          });
          
          // Filter products to show only those in surveys
          const filteredCompanyProducts = category.companyProducts.filter((p) => {
            return products.some((prod) => prod.name === p.name && prod.categoryName === category.categoryName && productsInSurveys.has(prod.id));
          });
          
          const filteredCompetitorProducts = category.competitorProducts.filter((p) => {
            return products.some((prod) => prod.name === p.name && prod.categoryName === category.categoryName && productsInSurveys.has(prod.id));
          });
          
          // Don't show category if it has no products
          if (filteredCompanyProducts.length === 0 && filteredCompetitorProducts.length === 0) {
            return null;
          }
          
          return (
            <View key={idx} style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.categoryHeader}>
                <Text style={[styles.categoryName, { color: colors.foreground }]}>{category.categoryName}</Text>
                <Pressable
                  onPress={() => setCategoryViewMode(prev => ({
                    ...prev,
                    [category.categoryName]: prev[category.categoryName] === 'chart' ? 'table' : 'chart'
                  }))}
                  style={[styles.viewModeToggle, { backgroundColor: colors.primary + '20' }]}
                >
                  <MaterialIcons 
                    name={currentViewMode === 'chart' ? 'table-chart' : 'bar-chart'} 
                    size={18} 
                    color={colors.primary} 
                  />
                </Pressable>
              </View>

              {currentViewMode === 'table' ? (
                <>
                  {/* Company Products */}
                  {filteredCompanyProducts.length > 0 && (
                    <View style={styles.productGroup}>
                      <Text style={[styles.productGroupTitle, { color: colors.primary }]}>منتجاتنا</Text>
                      {filteredCompanyProducts.map((product, pidx) => (
                        <View key={pidx} style={[styles.productRow, { borderBottomColor: colors.border }]}>
                          <View style={styles.productInfo}>
                            <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                            <Text style={[styles.productSubtitle, { color: colors.muted }]}>
                              {product.visitCount} زيارة
                            </Text>
                          </View>
                          <View style={styles.productStats}>
                            <View style={[styles.statBadge, { backgroundColor: colors.primary + "20" }]}>
                              <Text style={[styles.statBadgeText, { color: colors.primary }]}>
                                {product.presencePercentage}%
                              </Text>
                            </View>
                            <Text style={[styles.shelfPercentage, { color: colors.muted }]}>
                              رف: {product.avgShelfPercentage}%
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Competitor Products */}
                  {filteredCompetitorProducts.length > 0 && (
                    <View style={styles.productGroup}>
                      <Text style={[styles.productGroupTitle, { color: colors.error }]}>منتجات المنافسين</Text>
                      {filteredCompetitorProducts.map((product, pidx) => (
                        <View key={pidx} style={[styles.productRow, { borderBottomColor: colors.border }]}>
                          <View style={styles.productInfo}>
                            <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                            <Text style={[styles.productSubtitle, { color: colors.muted }]}>
                              {product.competitorName} • {product.visitCount} زيارة
                            </Text>
                          </View>
                          <View style={styles.productStats}>
                            <View style={[styles.statBadge, { backgroundColor: colors.error + "20" }]}>
                              <Text style={[styles.statBadgeText, { color: colors.error }]}>
                                {product.presencePercentage}%
                              </Text>
                            </View>
                            <Text style={[styles.shelfPercentage, { color: colors.muted }]}>
                              رف: {product.avgShelfPercentage}%
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                /* Chart View */
                <View style={styles.chartViewContainer}>
                  <BarChart
                    data={{
                      labels: [
                        ...filteredCompanyProducts.map(p => p.name),
                        ...filteredCompetitorProducts.map(p => p.name)
                      ],
                      values: [
                        ...filteredCompanyProducts.map(p => p.presencePercentage),
                        ...filteredCompetitorProducts.map(p => p.presencePercentage)
                      ],
                      colors: [
                        ...filteredCompanyProducts.map(() => colors.primary),
                        ...filteredCompetitorProducts.map(() => colors.error)
                      ]
                    }}
                    title="نسبة التواجد"
                    height={250}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Questions Analysis */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>تحليل الأسئلة</Text>
        {surveys.some(s => s.questions && s.questions.length > 0) ? (
          <View>
            {(() => {
              const allQuestions = new Map();
              surveys.forEach(survey => {
                if (survey.questions && survey.questions.length > 0) {
                  survey.questions.forEach(q => {
                    if (!allQuestions.has(q.questionId)) {
                      allQuestions.set(q.questionId, {
                        question: q.question,
                        answers: {}
                      });
                    }
                    const qData = allQuestions.get(q.questionId);
                    if (qData && q.answer) {
                      qData.answers[q.answer] = (qData.answers[q.answer] || 0) + 1;
                    }
                  });
                }
              });
              
              if (allQuestions.size === 0) {
                return <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد أسئلة متعددة الخيارات</Text>;
              }
              
              return Array.from(allQuestions.entries()).map(([qId, qData]: [string, any], qIdx: number) => {
                const totalAnswers = Object.values(qData.answers).reduce((a: any, b: any) => (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0), 0);
                // Sort answers by count (highest first)
                const sortedAnswers = Object.entries(qData.answers).sort((a: any, b: any) => (b[1] || 0) - (a[1] || 0));
                
                return (
                  <View key={qIdx} style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.questionText, { color: colors.foreground }]}>{qData.question}</Text>
                    <View style={styles.answersContainer}>
                      {sortedAnswers.map(([answer, count]: [string, any], aIdx: number) => {
                        const countNum = typeof count === 'number' ? count : 0;
                        const percentage = ((countNum / (typeof totalAnswers === 'number' ? totalAnswers : 1)) * 100);
                        return (
                          <View key={aIdx} style={[styles.answerRowWithBar, { borderBottomColor: colors.border }]}>
                            <View style={styles.answerInfo}>
                              <Text style={[styles.answerText, { color: colors.foreground }]}>{answer}</Text>
                              <Text style={[styles.answerStats, { color: colors.muted }]}>{countNum} إجابة • {percentage.toFixed(1)}%</Text>
                            </View>
                            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                              <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: colors.primary }]} />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد أسئلة متعددة الخيارات</Text>
        )}
      </View>

      {/* Notes Analysis */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>تحليل التعليقات</Text>
        {surveys.length > 0 && surveys.some(s => s.noteType) ? (
          <View style={[styles.notesTypeSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {['positive', 'negative', 'complaint', 'suggestion', 'recommendation'].map((type, idx) => {
              const notesOfType = surveys.filter(s => s.noteType === type);
              if (notesOfType.length === 0) return null;
              
              const typeLabels: { [key: string]: string } = {
                positive: 'إيجابي',
                negative: 'سلبي',
                complaint: 'شكوى',
                suggestion: 'اقتراح',
                recommendation: 'تزكية'
              };
              
              const typeColors: { [key: string]: string } = {
                positive: colors.success,
                negative: colors.error,
                complaint: colors.error,
                suggestion: colors.primary,
                recommendation: colors.primary
              };
              
              return (
                <Pressable
                  key={idx}
                  onPress={() => {
                    setSelectedNoteType(type);
                    setShowNotesModal(true);
                  }}
                  style={[styles.noteTypeButton, { borderColor: typeColors[type] }]}
                >
                  <Text style={[styles.noteTypeButtonLabel, { color: typeColors[type] }]}>{typeLabels[type]}</Text>
                  <View style={[styles.noteTypeCounter, { backgroundColor: typeColors[type] }]}>
                    <Text style={styles.noteTypeCounterText}>{notesOfType.length}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد تعليقات</Text>
        )}
      </View>

      {/* Store Analysis */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>تحليل المحلات</Text>
        {analytics.storeAnalysis.sort((a, b) => b.overallPresencePercentage - a.overallPresencePercentage).map((store, idx) => (
          <View key={idx} style={[styles.storeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.storeHeader}>
              <View style={styles.storeInfo}>
                <Text style={[styles.storeName, { color: colors.foreground }]}>{store.storeName}</Text>
                <Text style={[styles.storeRegion, { color: colors.muted }]}>{store.storeRegion}</Text>
              </View>
              <TrendBadge trend={store.presenceTrend} />
            </View>

            <View style={styles.storeStats}>
              <View style={[styles.storeStat, { borderRightColor: colors.border }]}>
                <Text style={[styles.storeStatLabel, { color: colors.muted }]}>الزيارات</Text>
                <Text style={[styles.storeStatValue, { color: colors.foreground }]}>{store.visitCount}</Text>
              </View>
              <View style={[styles.storeStat, { borderRightColor: colors.border }]}>
                <Text style={[styles.storeStatLabel, { color: colors.muted }]}>آخر زيارة</Text>
                <Text style={[styles.storeStatValue, { color: colors.foreground }]}>{store.lastVisitDate}</Text>
              </View>
              <View style={styles.storeStat}>
                <Text style={[styles.storeStatLabel, { color: colors.muted }]}>التواجد الحالي</Text>
                <Text style={[styles.storeStatValue, { color: colors.primary }]}>{store.overallPresencePercentage}%</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.padding} />
    </ScrollView>
    
    {/* Notes Modal */}
    <Modal
      visible={showNotesModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowNotesModal(false)}
    >
      <View style={[styles.notesModalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.notesModalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.notesModalTitle, { color: colors.foreground }]}>
            {selectedNoteType && {
              positive: 'التعليقات الإيجابية',
              negative: 'التعليقات السلبية',
              complaint: 'الشكاوى',
              suggestion: 'الاقتراحات',
              recommendation: 'التزكيات'
            }[selectedNoteType]}
          </Text>
          <Pressable
            onPress={() => setShowNotesModal(false)}
            style={styles.notesModalCloseBtn}
          >
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>
        
        <ScrollView style={styles.notesModalContent}>
          {selectedNoteType && surveys
            .filter(s => s.noteType === selectedNoteType && s.notes && s.notes.trim())
            .map((note, idx) => (
              <View key={idx} style={[styles.socialNoteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.socialNoteHeader}>
                  <View>
                    <Text style={[styles.socialNoteStore, { color: colors.foreground }]}>{note.storeName}</Text>
                    <Text style={[styles.socialNoteDate, { color: colors.muted }]}>{note.surveyDate}</Text>
                  </View>
                </View>
                <Text style={[styles.socialNoteText, { color: colors.foreground }]}>{note.notes}</Text>
              </View>
            ))}
          {selectedNoteType && surveys.filter(s => s.noteType === selectedNoteType && s.notes && s.notes.trim()).length === 0 && (
            <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد تعليقات</Text>
          )}
          <View style={styles.notesModalPadding} />
        </ScrollView>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as any, marginBottom: 8 },
  statsGrid: { gap: 12 },
  statBox: { borderRadius: 12, padding: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  statIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statContent: { flex: 1 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 18, fontWeight: "700" as any, marginTop: 2 },
  comparisonCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  comparisonRow: { flexDirection: "row", alignItems: "center" },
  comparisonItem: { flex: 1, alignItems: "center" },
  comparisonLabel: { fontSize: 12, marginBottom: 6 },
  comparisonValue: { fontSize: 24, fontWeight: "700" as any },
  comparisonDivider: { width: 1, height: 40, backgroundColor: "#e5e7eb", marginHorizontal: 12 },
  categoryCard: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 12 },
  categoryName: { fontSize: 14, fontWeight: "700" as any, marginBottom: 12 },
  productGroup: { marginBottom: 12 },
  productGroupTitle: { fontSize: 12, fontWeight: "700" as any, marginBottom: 8 },
  productRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5 },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: "600" as any },
  productSubtitle: { fontSize: 11, marginTop: 2 },
  productStats: { alignItems: "flex-end", gap: 4 },
  statBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statBadgeText: { fontSize: 12, fontWeight: "700" as any },
  shelfPercentage: { fontSize: 11 },
  storeCard: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 12 },
  storeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 14, fontWeight: "700" as any },
  storeRegion: { fontSize: 12, marginTop: 2 },
  trendBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  trendText: { fontSize: 11, fontWeight: "600" as any },
  storeStats: { flexDirection: "row", gap: 12 },
  storeStat: { flex: 1, paddingRight: 12, borderRightWidth: 1 },
  storeStatLabel: { fontSize: 11, marginBottom: 4 },
  storeStatValue: { fontSize: 14, fontWeight: "700" as any },
  
  // Filter Card
  filterCard: { borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 12, marginHorizontal: 0 },
  filterTitle: { fontSize: 13, fontWeight: "600" as any, marginBottom: 12 },
  
  // Dropdown
  dropdownBtn: { borderRadius: 8, padding: 12, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  dropdownBtnText: { fontSize: 13, fontWeight: "500" as any },
  dropdownMenu: { borderRadius: 8, borderWidth: 1, marginBottom: 8, maxHeight: 200, overflow: "hidden" },
  dropdownItem: { padding: 12, borderBottomWidth: 0.5 },
  dropdownItemText: { fontSize: 13 },
  
  // Compare Button
  compareBtn: { borderRadius: 8, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  compareBtnText: { fontSize: 13, fontWeight: "600" as any, color: "#fff" },
  
  // Charts Modal
  chartsModal: { flex: 1, paddingTop: 40 },
  chartsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  chartsTitle: { fontSize: 16, fontWeight: "700" as any },
  chartsContent: { flex: 1, padding: 16 },
  
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  viewModeToggle: { borderRadius: 6, padding: 8 },
  chartViewContainer: { marginVertical: 12 },
  
  questionCard: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 12 },
  questionText: { fontSize: 13, fontWeight: "600" as any, marginBottom: 12 },
  answersContainer: { gap: 0 },
  answerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5 },
  answerRowWithBar: { paddingVertical: 10, borderBottomWidth: 0.5 },
  answerInfo: { marginBottom: 6 },
  answerText: { fontSize: 12 },
  answerStats: { fontSize: 11, marginTop: 2 },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  answerBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  answerCount: { fontSize: 12, fontWeight: "700" as any },
  
  notesTypeSelector: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 12, flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-start", alignItems: "flex-start" },
  noteTypeButton: { borderRadius: 8, borderWidth: 2, padding: 10, alignItems: "center", justifyContent: "center", gap: 6, minHeight: 60, flex: 1, minWidth: "30%", marginBottom: 8 },
  noteTypeButtonLabel: { fontSize: 10, fontWeight: "600" as any, textAlign: "center", flexShrink: 1 },
  noteTypeCounter: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, minWidth: 20, alignItems: "center", justifyContent: "center" },
  noteTypeCounterText: { fontSize: 10, fontWeight: "700" as any, color: "#fff" },
  
  notesModalContainer: { flex: 1, paddingTop: 40 },
  notesModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  notesModalTitle: { fontSize: 16, fontWeight: "700" as any },
  notesModalCloseBtn: { padding: 8 },
  notesModalContent: { flex: 1, padding: 16 },
  
  socialNoteCard: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  socialNoteHeader: { padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  socialNoteStore: { fontSize: 14, fontWeight: "700" as any },
  socialNoteDate: { fontSize: 11, marginTop: 2 },
  socialNoteText: { fontSize: 13, paddingHorizontal: 12, paddingBottom: 12, lineHeight: 20 },
  notesModalPadding: { height: 20 },
  
  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 16 },
  
  padding: { height: 20 },
});
