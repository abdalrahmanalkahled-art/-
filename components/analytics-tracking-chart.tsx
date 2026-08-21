import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as SvgText } from "react-native-svg";

import { useColors } from "@/hooks/use-colors";
import type { ChartLabelSize, ChartOrientation, ChartType } from "@/lib/analytics-settings";
import type { AdvancedSurveyAnalytics, CycleProductPresence } from "@/lib/advanced-analytics";
import { getDynamicBarLayout } from "@/lib/chart-bar-layout";
import { toWesternDigits } from "@/lib/analytics-number-format";

type Palette = ReturnType<typeof useColors>;

const CHART_LABELS: Record<ChartType, string> = { line: "خطي", bar: "أعمدة", pie: "دائري", area: "مساحي", scatter: "نقاط", radar: "رادار", candlestick: "شمعدان" };
const LABEL_FONT_SIZES: Record<ChartLabelSize, number> = { small: 6, medium: 7, large: 9 };

export function AnalyticsTrackingChart({ analytics, scopeLabel, chartType = "line", chartOrientation = "vertical", selectedSingleCycle = false, showValues = false, showProductNames = false, labelSize = "medium", rotateProductNames = false }: { analytics: AdvancedSurveyAnalytics; scopeLabel: string; chartType?: ChartType; chartOrientation?: ChartOrientation; selectedSingleCycle?: boolean; showValues?: boolean; showProductNames?: boolean; labelSize?: ChartLabelSize; rotateProductNames?: boolean }) {
  const colors = useColors();
  const viewport = useWindowDimensions();
  const products = Array.from(new Map(analytics.points.flatMap((point) => point.products).map((product) => [product.productId, product])).values());
  const baseWidth = Math.max(300, viewport.width - 56);
  const supportsProductAxis = chartType !== "pie" && chartType !== "radar";
  const usesProductAxis = selectedSingleCycle && analytics.points.length === 1 && supportsProductAxis;
  const effectiveOrientation: ChartOrientation = usesProductAxis ? "vertical" : chartOrientation;
  const productLabelDepth = (showProductNames || usesProductAxis) ? (rotateProductNames ? 54 : 20) : 0;
  const isHorizontalBar = chartType === "bar" && effectiveOrientation === "horizontal";
  const showNativeProductLabels = showProductNames && chartType === "bar" && !isHorizontalBar;
  const totalBars = analytics.points.length * products.length;
  const shouldScrollBars = ((chartType === "bar" && effectiveOrientation === "vertical") || usesProductAxis) && totalBars > 10;
  const minimumScrollableWidth = 48 + totalBars * 16 + (totalBars + 1) * 8;
  const width = shouldScrollBars ? Math.max(baseWidth, minimumScrollableWidth) : baseWidth;
  const chartHeight = isHorizontalBar ? Math.max(208, products.length * 34 + 54) : 208 + (showValues ? 18 : 0) + productLabelDepth;
  const padding = { left: 24, right: 24, top: 18, bottom: 42 + (showValues ? 18 : 0) + productLabelDepth };
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;

  if (!analytics.points.length || !products.length) return <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyText, { color: colors.muted }]}>اختر استبياناً ومنتجاً ومحلًا أو منطقة لعرض مخطط التتبع.</Text></View>;

  const xAt = (index: number) => analytics.points.length === 1 ? width / 2 : padding.left + index * usableWidth / (analytics.points.length - 1);
  const yAt = (value: number) => padding.top + usableHeight - Math.max(0, Math.min(value, 100)) / 100 * usableHeight;
  const getValue = (productId: string, index: number) => analytics.points[index]?.products.find((item) => item.productId === productId)?.presencePercentage || 0;
  const chart = buildChart({ chartType, chartOrientation: effectiveOrientation, usesProductAxis, analytics, products, colors, width, chartHeight, padding, xAt, yAt, getValue, showValues, showProductNames: showProductNames || usesProductAxis, labelFontSize: LABEL_FONT_SIZES[labelSize], rotateProductNames });

  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.title, { color: colors.foreground }]}>{usesProductAxis ? "تحليل الدورة المختارة" : "التتبع حسب الدورات"} — مخطط {CHART_LABELS[chartType]}</Text>
    <Text style={[styles.caption, { color: colors.muted }]}>{toWesternDigits(scopeLabel)} · {isHorizontalBar ? "المحور الأفقي: نسبة التواجد · المحور العمودي: المنتجات" : usesProductAxis ? "المحور الأفقي: المنتجات · المحور العمودي: نسبة التواجد" : "المحور الأفقي: الدورات · المحور العمودي: نسبة التواجد"}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.chartCanvas, { width }]}><Svg width={width} height={chartHeight}>{isHorizontalBar ? null : [0, 50, 100].map((value) => <Line key={value} x1={padding.left} x2={width - padding.right} y1={yAt(value)} y2={yAt(value)} stroke={colors.border} strokeDasharray="4 4" />)}{chart}</Svg>{isHorizontalBar ? <View pointerEvents="none" style={[styles.horizontalLabels, { width: Math.min(126, width * 0.34) - 8 }]}>{products.map((product, index) => <Text key={product.productId} numberOfLines={1} style={[styles.horizontalLabel, { color: colors.foreground, top: 25 + index * 34 }]}>{toWesternDigits(product.productName)}</Text>)}</View> : <View style={styles.labels}>{showNativeProductLabels || usesProductAxis ? products.map((product) => <Text key={product.productId} numberOfLines={2} style={[styles.label, styles.productAxisLabel, { color: colors.foreground }]}>{toWesternDigits(product.productName)}</Text>) : analytics.points.map((point) => <Text key={point.cycleId} numberOfLines={2} style={[styles.label, { color: colors.muted }]}>{toWesternDigits(point.cycleName)}</Text>)}</View>}</View>
    </ScrollView>
    <View style={styles.legend}>{products.map((product) => <View key={product.productId} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: product.color }]} /><Text style={[styles.legendText, { color: colors.muted }]}>{toWesternDigits(product.productName)}</Text></View>)}</View>
  </View>;
}

type ChartBuildProps = { chartType: ChartType; chartOrientation: ChartOrientation; usesProductAxis: boolean; analytics: AdvancedSurveyAnalytics; products: CycleProductPresence[]; colors: Palette; width: number; chartHeight: number; padding: { left: number; right: number; top: number; bottom: number }; xAt: (index: number) => number; yAt: (value: number) => number; getValue: (productId: string, index: number) => number; showValues: boolean; showProductNames: boolean; labelFontSize: number; rotateProductNames: boolean };

function buildChart({ chartType, chartOrientation, usesProductAxis, analytics, products, colors, width, chartHeight, padding, xAt, yAt, getValue, showValues, showProductNames, labelFontSize, rotateProductNames }: ChartBuildProps) {
  if (chartType === "pie") return <PieChart products={products} getValue={getValue} colors={colors} width={width} chartHeight={chartHeight} />;
  if (chartType === "radar") return <RadarChart products={products} count={analytics.points.length} getValue={getValue} colors={colors} width={width} chartHeight={chartHeight} />;
  if (chartType === "candlestick") return <CandlestickChart products={products} count={analytics.points.length} getValue={getValue} colors={colors} width={width} padding={padding} yAt={yAt} />;
  if (chartType === "bar") return chartOrientation === "horizontal" ? <HorizontalBarChart products={products} count={analytics.points.length} getValue={getValue} colors={colors} width={width} chartHeight={chartHeight} /> : <BarChart products={products} count={analytics.points.length} getValue={getValue} colors={colors} width={width} padding={padding} yAt={yAt} showValues={showValues} showProductNames={showProductNames} labelFontSize={labelFontSize} rotateProductNames={rotateProductNames} />;
  if (usesProductAxis) return <ProductAxisSeriesChart chartType={chartType} products={products} colors={colors} width={width} padding={padding} yAt={yAt} getValue={getValue} showValues={showValues} labelFontSize={labelFontSize} />;
  return products.map((product) => {
    const points = analytics.points.map((_, index) => `${xAt(index)},${yAt(getValue(product.productId, index))}`).join(" ");
    const area = `${padding.left},${yAt(0)} ${points} ${width - padding.right},${yAt(0)}`;
    const dots = analytics.points.map((_, index) => <G key={`${product.productId}-${index}`}><Circle cx={xAt(index)} cy={yAt(getValue(product.productId, index))} r={chartType === "scatter" ? 5 : 3.7} fill={product.color} />{showValues ? <SvgText x={xAt(index)} y={Math.max(13, yAt(getValue(product.productId, index)) - 7)} textAnchor="middle" fill={product.color} fontSize={labelFontSize + 1} fontWeight="700">{getValue(product.productId, index)}%</SvgText> : null}</G>);
    return <G key={product.productId}>{chartType === "area" ? <Polygon points={area} fill={product.color + "24"} /> : null}{chartType !== "scatter" ? <Polyline points={points} fill="none" stroke={product.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" /> : null}{dots}</G>;
  });
}

function ProductAxisSeriesChart({ chartType, products, colors, width, padding, yAt, getValue, showValues, labelFontSize }: Pick<ChartBuildProps, "chartType" | "products" | "colors" | "width" | "padding" | "yAt" | "getValue" | "showValues" | "labelFontSize">) {
  const innerWidth = width - padding.left - padding.right;
  const xAtProduct = (index: number) => products.length === 1 ? width / 2 : padding.left + index * innerWidth / (products.length - 1);
  const points = products.map((product, index) => `${xAtProduct(index)},${yAt(getValue(product.productId, 0))}`).join(" ");
  const area = `${padding.left},${yAt(0)} ${points} ${width - padding.right},${yAt(0)}`;
  return <G>{chartType === "area" ? <Polygon points={area} fill={colors.primary + "24"} /> : null}{chartType !== "scatter" ? <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" /> : null}{products.map((product, index) => { const value = getValue(product.productId, 0); return <G key={product.productId}><Circle cx={xAtProduct(index)} cy={yAt(value)} r={chartType === "scatter" ? 5 : 3.7} fill={product.color} />{showValues ? <SvgText x={xAtProduct(index)} y={Math.max(13, yAt(value) - 7)} textAnchor="middle" fill={product.color} fontSize={labelFontSize + 1} fontWeight="700">{value}%</SvgText> : null}</G>; })}</G>;
}

function BarChart({ products, count, getValue, colors, width, padding, yAt, showValues, showProductNames, labelFontSize, rotateProductNames }: Pick<ChartBuildProps, "products" | "getValue" | "colors" | "width" | "padding" | "yAt" | "showValues" | "showProductNames" | "labelFontSize" | "rotateProductNames"> & { count: number }) {
  const { gap: dynamicGap, barWidth } = getDynamicBarLayout(width - padding.left - padding.right, count, products.length);
  const baseY = yAt(0);
  return products.flatMap((product, productIndex) => Array.from({ length: count }).map((_, index) => {
    const value = getValue(product.productId, index); const height = baseY - yAt(value); const flatIndex = index * products.length + productIndex; const x = padding.left + dynamicGap + flatIndex * (barWidth + dynamicGap); const renderedWidth = Math.max(1.5, barWidth); const center = x + renderedWidth / 2; const valueY = baseY + (showProductNames ? (rotateProductNames ? 52 : 27) : 13);
    return <G key={`${product.productId}-${index}`}><Rect x={x} y={yAt(value)} width={renderedWidth} height={height} rx={3} fill={product.color} />{showValues ? <SvgText x={center} y={valueY} textAnchor="middle" fill={product.color} fontSize={labelFontSize + 1} fontWeight="700">{value}%</SvgText> : null}</G>;
  }));
}

function HorizontalBarChart({ products, count, getValue, colors, width, chartHeight }: Pick<ChartBuildProps, "products" | "getValue" | "colors" | "width" | "chartHeight"> & { count: number }) {
  const labelWidth = Math.min(126, width * 0.34); const valueWidth = width - labelWidth - 42; const rowHeight = 34;
  return <>{[0, 25, 50, 75, 100].map((value) => { const x = labelWidth + valueWidth * value / 100; return <G key={value}><Line x1={x} x2={x} y1={18} y2={chartHeight - 24} stroke={colors.border} strokeDasharray="4 4" /><SvgText x={x} y={14} textAnchor="middle" fill={colors.muted} fontSize={8}>{value}%</SvgText></G>; })}{products.map((product, index) => { const total = Array.from({ length: count }, (_, pointIndex) => getValue(product.productId, pointIndex)).reduce((sum, item) => sum + item, 0); const value = Math.round(total / Math.max(count, 1)); const y = 26 + index * rowHeight; return <G key={product.productId}><Rect x={labelWidth} y={y} width={valueWidth} height={19} rx={5} fill={colors.border} /><Rect x={labelWidth} y={y} width={Math.max(1, valueWidth * value / 100)} height={19} rx={5} fill={product.color} /><SvgText x={Math.min(width - 4, labelWidth + valueWidth * value / 100 + 6)} y={y + 14} fill={product.color} fontSize={9} fontWeight="700">{value}%</SvgText></G>; })}</>;
}

function PieChart({ products, getValue, colors, width, chartHeight }: Pick<ChartBuildProps, "products" | "getValue" | "colors" | "width" | "chartHeight">) { const values = products.map((product) => ({ product, value: getValue(product.productId, 0) })).filter((item) => item.value > 0); const total = values.reduce((sum, item) => sum + item.value, 0); if (!total) return <SvgText x={width / 2} y={chartHeight / 2} fill={colors.muted} textAnchor="middle">لا توجد قيم موجبة للرسم الدائري</SvgText>; const radius = 54; const centerX = width / 2; const centerY = chartHeight / 2 - 8; const circumference = 2 * Math.PI * radius; let offset = 0; return <><Circle cx={centerX} cy={centerY} r={radius} stroke={colors.border} strokeWidth={24} fill="none" />{values.map(({ product, value }) => { const dash = circumference * value / total; const element = <Circle key={product.productId} cx={centerX} cy={centerY} r={radius} stroke={product.color} strokeWidth={24} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="butt" fill="none" transform={`rotate(-90 ${centerX} ${centerY})`} />; offset += dash; return element; })}</>; }
function RadarChart({ products, count, getValue, colors, width, chartHeight }: Pick<ChartBuildProps, "products" | "getValue" | "colors" | "width" | "chartHeight"> & { count: number }) { const axisCount = Math.max(3, count); const centerX = width / 2; const centerY = chartHeight / 2 - 6; const radius = 70; const coordinate = (index: number, value: number) => { const angle = Math.PI * 2 * index / axisCount - Math.PI / 2; const scaled = radius * value / 100; return `${centerX + Math.cos(angle) * scaled},${centerY + Math.sin(angle) * scaled}`; }; const outline = Array.from({ length: axisCount }).map((_, index) => coordinate(index, 100)).join(" "); const axes = Array.from({ length: axisCount }).map((_, index) => { const end = coordinate(index, 100).split(","); return <Line key={index} x1={centerX} y1={centerY} x2={Number(end[0])} y2={Number(end[1])} stroke={colors.border} />; }); return <><Polygon points={outline} fill="none" stroke={colors.border} strokeWidth={1} />{axes}{products.map((product) => <Polygon key={product.productId} points={Array.from({ length: axisCount }).map((_, index) => coordinate(index, getValue(product.productId, Math.min(index, count - 1)))).join(" ")} fill={product.color + "22"} stroke={product.color} strokeWidth={2} />)}</>; }
function CandlestickChart({ products, count, getValue, colors, width, padding, yAt }: Pick<ChartBuildProps, "products" | "getValue" | "colors" | "width" | "padding" | "yAt"> & { count: number }) { const spacing = (width - padding.left - padding.right) / products.length; return products.map((product, index) => { const values = Array.from({ length: count }).map((_, pointIndex) => getValue(product.productId, pointIndex)); const open = values[0] || 0; const close = values[values.length - 1] || 0; const high = Math.max(...values); const low = Math.min(...values); const x = padding.left + index * spacing + spacing / 2; const top = yAt(Math.max(open, close)); const bodyHeight = Math.max(3, Math.abs(yAt(open) - yAt(close))); return <G key={product.productId}><Line x1={x} x2={x} y1={yAt(high)} y2={yAt(low)} stroke={product.color} strokeWidth={2} /><Rect x={x - 8} y={top} width={16} height={bodyHeight} fill={close >= open ? product.color : "transparent"} stroke={product.color} strokeWidth={2} /></G>; }); }

const styles = StyleSheet.create({ card: { borderRadius: 18, borderWidth: 1, padding: 14 }, title: { fontSize: 15, fontWeight: "800", textAlign: "right" }, caption: { fontSize: 11, textAlign: "right", marginTop: 4, marginBottom: 8 }, scrollContent: { paddingBottom: 4 }, chartCanvas: { position: "relative" }, labels: { flexDirection: "row-reverse", justifyContent: "space-between", paddingHorizontal: 4 }, label: { width: 82, fontSize: 9, textAlign: "center", lineHeight: 13 }, productAxisLabel: { fontWeight: "700" }, horizontalLabels: { position: "absolute", top: 0, left: 0, bottom: 0 }, horizontalLabel: { position: "absolute", right: 0, fontSize: 9, lineHeight: 18, textAlign: "right", fontWeight: "700" }, legend: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9, marginTop: 8 }, legendItem: { flexDirection: "row-reverse", alignItems: "center", gap: 5 }, dot: { width: 9, height: 9, borderRadius: 5 }, legendText: { fontSize: 10 }, emptyCard: { borderRadius: 18, borderWidth: 1, padding: 22 }, emptyText: { textAlign: "center", lineHeight: 20, fontSize: 13 } });
