import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";

import { useColors } from "@/hooks/use-colors";

export interface FABMenuItem {
  id: string;
  icon: string;
  label: string;
  iconColor?: string;
  onPress: () => void;
}

/** قائمة إدارة عائمة موحّدة بمظهر زر التحليلات المتقدمة. */
export function FABMenu({ items }: { items: FABMenuItem[] }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const select = (action: () => void) => { setOpen(false); action(); };
  if (!items.length) return null;
  return <View style={styles.wrap}>
    {open ? <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.header, { color: colors.muted }]}>إدارة</Text>
      {items.map((item, index) => <View key={item.id}>
        {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
        <TouchableOpacity onPress={() => select(item.onPress)} style={styles.item}>
          <MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={19} color={item.iconColor ?? colors.primary} />
          <Text style={[styles.itemText, { color: colors.foreground }]}>{item.label}</Text>
        </TouchableOpacity>
      </View>)}
    </View> : null}
    <TouchableOpacity onPress={() => setOpen((value) => !value)} style={[styles.fab, { backgroundColor: colors.primary }]} accessibilityLabel="إدارة">
      <MaterialIcons name={open ? "close" : "more-horiz"} size={27} color="#fff" />
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: 18, bottom: 20, alignItems: "flex-start", gap: 10, zIndex: 100 },
  fab: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", elevation: 5 },
  menu: { minWidth: 176, borderRadius: 16, borderWidth: 1, paddingVertical: 7, elevation: 4 },
  header: { fontSize: 10, fontWeight: "800", paddingHorizontal: 13, paddingTop: 5, textAlign: "left" },
  item: { minHeight: 43, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  itemText: { fontSize: 12, fontWeight: "800" },
  divider: { height: 1, marginVertical: 2 },
});
