import type { ComponentProps } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

export interface MoreModuleChoice {
  id: string;
  label: string;
}

/** تبويبات موحدة لمحتوى وحدات صفحة المزيد. */
export function MoreModuleTabs({
  items,
  selectedId,
  onSelect,
}: {
  items: MoreModuleChoice[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            activeOpacity={0.78}
            style={[styles.tab, isSelected && { borderBottomColor: colors.primary }]}
            onPress={() => onSelect(item.id)}
          >
            <Text style={[styles.tabText, { color: isSelected ? colors.primary : colors.muted }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** شرائح فلترة أفقية متسقة، مناسبة للفئات والأصناف والمنافسين. */
export function MoreModuleFilterChips({
  items,
  selectedId,
  onSelect,
}: {
  items: MoreModuleChoice[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            activeOpacity={0.78}
            style={[styles.filterChip, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : colors.surface }]}
            onPress={() => onSelect(item.id)}
          >
            <Text style={[styles.filterText, { color: isSelected ? "#fff" : colors.foreground }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/** حالة فارغة موحدة تحافظ على وضوح سياق كل وحدة. */
export function MoreModuleEmptyState({
  icon,
  title,
  description,
}: {
  icon: ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  description?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "12" }]}>
        <MaterialIcons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      {description ? <Text style={[styles.emptyDescription, { color: colors.muted }]}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { minHeight: 52, flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent", paddingHorizontal: 8 },
  tabText: { fontSize: 13, fontWeight: "700" as any, textAlign: "center" },
  filterRow: { maxHeight: 56 },
  filterContent: { alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  filterChip: { minHeight: 36, justifyContent: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 13 },
  filterText: { fontSize: 12, fontWeight: "700" as any, textAlign: "center" },
  empty: { minHeight: 156, marginHorizontal: 14, marginTop: 12, borderWidth: 1, borderRadius: 18, alignItems: "center", justifyContent: "center", padding: 20 },
  emptyIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: "800" as any, textAlign: "center" },
  emptyDescription: { fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 4 },
});
