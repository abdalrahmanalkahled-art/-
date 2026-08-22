import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

export interface MoreModuleShellProps {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  accent: string;
  compact?: boolean;
  onClose: () => void;
}

export function MoreModuleShell({ title, subtitle, icon, accent, compact = false, onClose }: MoreModuleShellProps) {
  const colors = useColors();

  if (compact) {
    return (
      <View style={[styles.compact, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity accessibilityLabel="العودة إلى المزيد" onPress={onClose} style={styles.closeIcon}>
          <MaterialIcons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.compactTitle, { color: colors.foreground }]}>{title}</Text>
        <View style={styles.spacer} />
      </View>
    );
  }

  return (
    <View style={[styles.hero, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
      <TouchableOpacity accessibilityLabel="العودة إلى المزيد" onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.background }]}> 
        <MaterialIcons name="close" size={21} color={colors.foreground} />
      </TouchableOpacity>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>}
      </View>
      <View style={[styles.icon, { backgroundColor: `${accent}1A` }]}>
        <MaterialIcons name={icon} size={23} color={accent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  closeIcon: { width: 28, alignItems: "flex-start" },
  compactTitle: { fontSize: 17, fontWeight: "700" as any },
  spacer: { width: 28 },
  hero: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, alignItems: "flex-end" },
  title: { fontSize: 16, fontWeight: "800" as any, textAlign: "right" },
  subtitle: { fontSize: 11, marginTop: 3, textAlign: "right" },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
