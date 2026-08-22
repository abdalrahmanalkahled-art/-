import { MaterialIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { DESIGN } from "@/lib/design-system";

interface AppPageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightContent?: ReactNode;
}

/** رأس موحد للصفحات الداخلية؛ يبقى اتجاه النص والعناصر ثابتاً في RTL. */
export function AppPageHeader({ title, subtitle, onBack, rightContent }: AppPageHeaderProps) {
  const colors = useColors();
  return (
    <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {onBack ? <TouchableOpacity onPress={onBack} accessibilityLabel="العودة" style={styles.iconButton}><MaterialIcons name="arrow-forward" size={DESIGN.icon.standard} color={colors.foreground} /></TouchableOpacity> : <View style={styles.iconButton} />}
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {rightContent ?? <View style={styles.iconButton} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 64, paddingHorizontal: DESIGN.spacing.md, flexDirection: "row", alignItems: "center", gap: DESIGN.spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  iconButton: { width: DESIGN.control.compact, height: DESIGN.control.compact, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, alignItems: "flex-end", gap: 2 },
  title: { fontSize: 17, fontWeight: "800", textAlign: "right" },
  subtitle: { fontSize: 10, textAlign: "right" },
});
