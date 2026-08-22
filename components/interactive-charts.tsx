import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface InteractiveBarChartProps {
  data: ChartDataPoint[];
  title: string;
  maxValue?: number;
  height?: number;
}

export function InteractiveBarChart({
  data,
  title,
  maxValue,
  height = 300,
}: InteractiveBarChartProps) {
  const colors = useColors();
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - 60;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chartContainer}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16, paddingHorizontal: 16 }}>
          {data.map((item, index) => {
            const barHeight = (item.value / max) * chartHeight;
            const isSelected = selectedBar === index;

            return (
              <Pressable
                key={index}
                onPress={() => setSelectedBar(isSelected ? null : index)}
                style={styles.barWrapper}
              >
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: item.color || colors.primary,
                      opacity: isSelected ? 1 : 0.7,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: colors.foreground,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.barLabel,
                    { color: colors.foreground, marginTop: 8 },
                  ]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
                {isSelected && (
                  <View
                    style={[
                      styles.valueLabel,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.valueLabelText}>{item.value}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

interface InteractivePieChartProps {
  data: ChartDataPoint[];
  title: string;
  size?: number;
}

export function InteractivePieChart({
  data,
  title,
  size = 200,
}: InteractivePieChartProps) {
  const colors = useColors();
  const [selectedSlice, setSelectedSlice] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>

      <View style={styles.pieContainer}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: "hidden",
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {data.length > 0 && (
            <Text style={[styles.centerText, { color: colors.foreground }]}>
              {total}
            </Text>
          )}
        </View>

        <View style={styles.legend}>
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            const isSelected = selectedSlice === index;

            return (
              <Pressable
                key={index}
                onPress={() => setSelectedSlice(isSelected ? null : index)}
                style={[
                  styles.legendItem,
                  isSelected && {
                    backgroundColor: colors.primary,
                    opacity: 0.2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: item.color || colors.primary },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.legendLabel, { color: colors.foreground }]}
                  >
                    {item.label}
                  </Text>
                  <Text style={[styles.legendValue, { color: colors.muted }]}>
                    {item.value} ({percentage}%)
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface InteractiveLineChartProps {
  data: ChartDataPoint[];
  title: string;
  height?: number;
}

export function InteractiveLineChart({
  data,
  title,
  height = 250,
}: InteractiveLineChartProps) {
  const colors = useColors();
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  const max = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - 60;
  const chartWidth = 300;
  const pointSpacing = chartWidth / (data.length - 1 || 1);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View
          style={{
            width: chartWidth + 40,
            height: chartHeight + 40,
            padding: 20,
            position: "relative",
          }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                top: 20 + (1 - ratio) * chartHeight,
                left: 20,
                right: 0,
                height: 1,
                backgroundColor: colors.border,
                opacity: 0.3,
              }}
            />
          ))}

          {/* Points and lines */}
          {data.map((item, index) => {
            const y = 20 + (1 - item.value / max) * chartHeight;
            const x = 20 + index * pointSpacing;
            const isSelected = selectedPoint === index;

            return (
              <Pressable
                key={index}
                onPress={() => setSelectedPoint(isSelected ? null : index)}
                style={{
                  position: "absolute",
                  left: x - 12,
                  top: y - 12,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: item.color || colors.primary,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: isSelected ? 3 : 0,
                  borderColor: colors.foreground,
                }}
              >
                {isSelected && (
                  <View
                    style={{
                      position: "absolute",
                      top: -30,
                      backgroundColor: colors.primary,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                      {item.value}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        {data.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => setSelectedPoint(selectedPoint === index ? null : index)}
            style={[
              styles.legendItem,
              selectedPoint === index && {
                backgroundColor: colors.primary,
                opacity: 0.2,
              },
            ]}
          >
            <View
              style={[
                styles.legendColor,
                { backgroundColor: item.color || colors.primary },
              ]}
            />
            <Text style={[styles.legendLabel, { color: colors.foreground }]}>
              {item.label}: {item.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 16,
  },
  barWrapper: {
    alignItems: "center",
    width: 60,
  },
  bar: {
    width: 40,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  valueLabel: {
    position: "absolute",
    top: -25,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  valueLabelText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  pieContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 16,
  },
  centerText: {
    fontSize: 24,
    fontWeight: "700",
  },
  legend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  legendValue: {
    fontSize: 12,
  },
});
