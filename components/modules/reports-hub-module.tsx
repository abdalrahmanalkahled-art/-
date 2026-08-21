import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ReportsModule from "@/components/modules/reports-module";
import { ReportsCenterModule } from "@/components/modules/reports-center-module";
import { useColors } from "@/hooks/use-colors";

export function ReportsHubModule() {
  const colors = useColors();
  const [activeSection, setActiveSection] = useState<"overview" | "center">("overview");

  return (
    <View style={styles.container}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.tab, activeSection === "center" && { borderBottomColor: colors.primary }]} onPress={() => setActiveSection("center")}>
          <Text style={[styles.tabText, { color: activeSection === "center" ? colors.primary : colors.muted }]}>مركز التقارير</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeSection === "overview" && { borderBottomColor: colors.primary }]} onPress={() => setActiveSection("overview")}>
          <Text style={[styles.tabText, { color: activeSection === "overview" ? colors.primary : colors.muted }]}>لوحة التقارير</Text>
        </TouchableOpacity>
      </View>
      {activeSection === "overview" ? <ReportsModule /> : <ReportsCenterModule />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: "row", borderBottomWidth: 0.5, paddingHorizontal: 12 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 14, fontWeight: "700" as any },
});
