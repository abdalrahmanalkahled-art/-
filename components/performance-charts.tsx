import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
}

interface BarChartProps {
  data: ChartData;
  title?: string;
  height?: number;
}

interface LineChartProps {
  data: ChartData;
  title?: string;
  height?: number;
}

interface PieChartProps {
  data: ChartData;
  title?: string;
  size?: number;
}

/**
 * بطاقة الرسم البياني العام
 */
export function ChartCard({ children, title }: { children: React.ReactNode; title?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {title && <Text style={[styles.chartTitle, { color: colors.foreground }]}>{title}</Text>}
      {children}
    </View>
  );
}

/**
 * حساب التقسيمات المناسبة لمحور Y
 */
function calculateYAxisDivisions(maxValue: number) {
  if (maxValue === 0) return [0];
  
  // تحديد الخطوة المناسبة
  let step = 1;
  if (maxValue > 100) {
    step = Math.ceil(maxValue / 5 / 10) * 10;
  } else if (maxValue > 10) {
    step = Math.ceil(maxValue / 5);
  }
  
  const divisions = [];
  for (let i = 0; i <= maxValue; i += step) {
    divisions.push(i);
  }
  
  // التأكد من وجود القيمة القصوى
  if (divisions[divisions.length - 1] < maxValue) {
    divisions.push(Math.ceil(maxValue / step) * step);
  }
  
  return divisions;
}

/**
 * رسم بياني بالأعمدة (Bar Chart)
 */
export function BarChart({ data, title, height = 250 }: BarChartProps) {
  const colors = useColors();
  const maxValue = Math.max(...data.values, 1);
  const screenWidth = Dimensions.get("window").width - 64;
  
  // حساب عرض كل عمود بناءً على عدد المنتجات
  const minBarWidth = 40;
  const barSpacing = 20;
  const totalBarsWidth = data.labels.length * (minBarWidth + barSpacing);
  const chartWidth = Math.max(totalBarsWidth, screenWidth) + 40; // إضافة padding إضافي
  const barWidth = minBarWidth;
  
  const yAxisDivisions = useMemo(() => calculateYAxisDivisions(maxValue), [maxValue]);
  const chartHeight = height - 60; // الارتفاع المتاح للرسم البياني

  const defaultColors = [colors.primary, colors.success, colors.warning, colors.error];

  return (
    <ChartCard title={title}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} scrollEventThrottle={16} contentContainerStyle={{ paddingRight: 40 }}>
        <View style={[styles.barChartContainer, { height, width: chartWidth }]}>
          <View style={styles.barChartContent}>
            {/* Y-axis labels */}
            <View style={[styles.yAxisLabels, { height: chartHeight }]}>
              {[...yAxisDivisions].reverse().map((label, idx) => (
                <Text key={label} style={[styles.yAxisLabel, { color: colors.muted }]}>
                  {label}
                </Text>
              ))}
            </View>

            {/* Bars */}
            <View style={[styles.barsContainer, { paddingHorizontal: 12, height: chartHeight }]}>
              {data.values.map((value, idx) => {
                const barHeight = (value / maxValue) * chartHeight;
                const barColor = data.colors?.[idx] || defaultColors[idx % defaultColors.length];
                return (
                  <View key={idx} style={[styles.barWrapper, { marginHorizontal: barSpacing / 2 }]}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, 5),
                          backgroundColor: barColor,
                          width: barWidth,
                        },
                      ]}
                    />
                    <Text style={[styles.barValue, { color: colors.foreground }]}>{Math.round(value)}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* X-axis labels */}
          <View style={[styles.xAxisLabels, { paddingLeft: 48, paddingRight: 40 }]}>
            {data.labels.map((label, idx) => (
              <Text key={idx} style={[styles.xAxisLabel, { color: colors.muted, width: barWidth + barSpacing }]}>
                {label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </ChartCard>
  );
}

/**
 * رسم بياني بالخطوط (Line Chart)
 */
export function LineChart({ data, title, height = 250 }: LineChartProps) {
  const colors = useColors();
  const maxValue = Math.max(...data.values, 1);
  const screenWidth = Dimensions.get("window").width - 64;
  
  // حساب عرض الرسم البياني بناءً على عدد النقاط
  const minPointSpacing = 60;
  const chartWidth = Math.max(data.labels.length * minPointSpacing, screenWidth) + 40; // إضافة padding إضافي
  const pointSpacing = chartWidth / (data.labels.length - 1 || 1);
  
  const yAxisDivisions = useMemo(() => calculateYAxisDivisions(maxValue), [maxValue]);
  const chartHeight = height - 60;

  const defaultColor = colors.primary;

  const points = useMemo(() => {
    return data.values.map((value, idx) => ({
      x: idx * pointSpacing,
      y: chartHeight - (value / maxValue) * chartHeight,
    }));
  }, [data.values, pointSpacing, chartHeight, maxValue]);

  const pathData = useMemo(() => {
    if (points.length === 0) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }, [points]);

  return (
    <ChartCard title={title}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} scrollEventThrottle={16} contentContainerStyle={{ paddingRight: 20 }}>
        <View style={[styles.lineChartContainer, { height, width: chartWidth }]}>
          <View style={styles.lineChartContent}>
            {/* Y-axis labels */}
            <View style={[styles.yAxisLabels, { height: chartHeight }]}>
              {yAxisDivisions.map((label, idx) => (
                <Text key={label} style={[styles.yAxisLabel, { color: colors.muted }]}>
                  {label}
                </Text>
              ))}
            </View>

            {/* Grid and line */}
            <View style={[styles.gridContainer, { height: chartHeight }]}>
              {/* Horizontal grid lines */}
              {[...yAxisDivisions].reverse().map((label, idx) => {
                const yPosition = (chartHeight * idx) / (yAxisDivisions.length - 1 || 1);
                return (
                  <View
                    key={`grid-${label}`}
                    style={[
                      styles.gridLine,
                      {
                        top: yPosition,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  />
                );
              })}

              {/* Points and values */}
              {points.map((point, idx) => (
                <View
                  key={`point-${idx}`}
                  style={[
                    styles.chartPoint,
                    {
                      left: point.x - 6,
                      top: point.y - 6,
                      backgroundColor: defaultColor,
                    },
                  ]}
                >
                  <Text style={[styles.pointValue, { color: colors.foreground }]}>{Math.round(data.values[idx])}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* X-axis labels */}
          <View style={styles.xAxisLabels}>
            {data.labels.map((label, idx) => (
              <Text
                key={idx}
                style={[
                  styles.xAxisLabel,
                  {
                    color: colors.muted,
                    marginLeft: idx === 0 ? 0 : pointSpacing - 30,
                  },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </ChartCard>
  );
}

/**
 * رسم بياني دائري (Pie Chart)
 */
export function PieChart({ data, title, size = 200 }: PieChartProps) {
  const colors = useColors();
  const defaultColors = [colors.primary, colors.success, colors.warning, colors.error];
  const total = data.values.reduce((a, b) => a + b, 0);

  const slices = useMemo(() => {
    let currentAngle = -90;
    return data.values.map((value, idx) => {
      const sliceAngle = (value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      const color = data.colors?.[idx] || defaultColors[idx % defaultColors.length];
      const percentage = Math.round((value / total) * 100);

      return {
        startAngle,
        endAngle,
        color,
        percentage,
        label: data.labels[idx],
      };
    });
  }, [data.values, data.labels, data.colors, total]);

  return (
    <ChartCard title={title}>
      <View style={styles.pieChartContainer}>
        <View style={[styles.pieChart, { width: size, height: size }]}>
          {slices.map((slice, idx) => {
            const radius = size / 2;
            const startRad = (slice.startAngle * Math.PI) / 180;
            const endRad = (slice.endAngle * Math.PI) / 180;

            const x1 = radius + radius * Math.cos(startRad);
            const y1 = radius + radius * Math.sin(startRad);
            const x2 = radius + radius * Math.cos(endRad);
            const y2 = radius + radius * Math.sin(endRad);

            const largeArc = slice.endAngle - slice.startAngle > 180 ? 1 : 0;

            return (
              <View
                key={idx}
                style={[
                  styles.pieSlice,
                  {
                    width: size,
                    height: size,
                    backgroundColor: slice.color,
                    transform: [
                      {
                        rotate: `${slice.startAngle}deg`,
                      },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Legend */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.pieLegend}>
            {slices.map((slice, idx) => (
              <View key={idx} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColor,
                    {
                      backgroundColor: slice.color,
                    },
                  ]}
                />
                <Text style={[styles.legendLabel, { color: colors.foreground }]}>
                  {slice.label}: {slice.percentage}%
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </ChartCard>
  );
}

/**
 * رسم بياني بسيط لمقارنة قيمتين
 */
export function ComparisonChart({ label1, value1, label2, value2 }: { label1: string; value1: number; label2: string; value2: number }) {
  const colors = useColors();
  const maxValue = Math.max(value1, value2, 1);
  const height = 150;

  return (
    <ChartCard>
      <View style={styles.comparisonChartContainer}>
        <View style={styles.comparisonItem}>
          <View style={[styles.comparisonBar, { height: (value1 / maxValue) * height, backgroundColor: colors.primary }]} />
          <Text style={[styles.comparisonLabel, { color: colors.foreground }]}>{label1}</Text>
          <Text style={[styles.comparisonValue, { color: colors.primary }]}>{Math.round(value1)}</Text>
        </View>

        <View style={styles.comparisonItem}>
          <View style={[styles.comparisonBar, { height: (value2 / maxValue) * height, backgroundColor: colors.error }]} />
          <Text style={[styles.comparisonLabel, { color: colors.foreground }]}>{label2}</Text>
          <Text style={[styles.comparisonValue, { color: colors.error }]}>{Math.round(value2)}</Text>
        </View>
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600" as any,
    marginBottom: 12,
  },

  // Bar Chart
  barChartContainer: {
    justifyContent: "flex-end",
  },
  barChartContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  yAxisLabels: {
    justifyContent: "space-between",
    paddingRight: 8,
    width: 40,
  },
  yAxisLabel: {
    fontSize: 10,
    textAlign: "right",
  },
  barsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  barWrapper: {
    alignItems: "center",
    gap: 4,
  },
  bar: {
    borderRadius: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: "600" as any,
  },
  xAxisLabels: {
    flexDirection: "row",
    paddingTop: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    textAlign: "center",
  },

  // Line Chart
  lineChartContainer: {
    justifyContent: "flex-end",
  },
  lineChartContent: {
    flex: 1,
    flexDirection: "row",
  },
  gridContainer: {
    flex: 1,
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderBottomWidth: 1,
  },
  chartPoint: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  pointValue: {
    fontSize: 8,
    fontWeight: "600" as any,
  },

  // Pie Chart
  pieChartContainer: {
    alignItems: "center",
    gap: 16,
  },
  pieChart: {
    borderRadius: 100,
    overflow: "hidden",
  },
  pieSlice: {
    position: "absolute",
  },
  pieLegend: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 12,
  },

  // Comparison Chart
  comparisonChartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 24,
  },
  comparisonItem: {
    alignItems: "center",
    gap: 8,
  },
  comparisonBar: {
    width: 40,
    borderRadius: 4,
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: "500" as any,
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: "700" as any,
  },
});
