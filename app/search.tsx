import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useHasPermission } from "@/lib/app-context";
import { loadGlobalSearchIndex, searchGlobalIndex, type GlobalSearchResult, type SearchCategory } from "@/lib/global-search";

const FILTERS: { id: SearchCategory | "all"; label: string }[] = [
  { id: "all", label: "الكل" }, { id: "field", label: "الميدان" }, { id: "planning", label: "الخطة" }, { id: "management", label: "الإدارة" }, { id: "reports", label: "التقارير" },
];

const RESULT_COLORS: Record<GlobalSearchResult["icon"], string> = {
  storefront: "#0E9F6E", event: "#7C3AED", assignment: "#7C3AED", inventory: "#0E9F6E", receipt: "#D97706", campaign: "#1A56DB", "inventory-2": "#059669", map: "#9333EA", assessment: "#0891B2", quiz: "#7C3AED",
};

export default function SearchScreen() {
  const colors = useColors();
  const canViewStores = useHasPermission("stores");
  const canViewEvents = useHasPermission("events");
  const canViewSurveys = useHasPermission("surveys");
  const canViewGoals = useHasPermission("goals");
  const canViewWarehouse = useHasPermission("warehouse");
  const canViewExpenses = useHasPermission("expenses");
  const canViewSignage = useHasPermission("signage");
  const canViewProducts = useHasPermission("products");
  const canViewReports = useHasPermission("reports");
  const [index, setIndex] = useState<GlobalSearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchCategory | "all">("all");
  const [isLoading, setIsLoading] = useState(true);

  const availability = useMemo(() => ({ stores: canViewStores, events: canViewEvents, surveys: canViewSurveys, goals: canViewGoals, warehouse: canViewWarehouse, expenses: canViewExpenses, signage: canViewSignage, products: canViewProducts, reports: canViewReports }), [canViewStores, canViewEvents, canViewSurveys, canViewGoals, canViewWarehouse, canViewExpenses, canViewSignage, canViewProducts, canViewReports]);
  const loadIndex = useCallback(async () => {
    setIsLoading(true);
    try { setIndex(await loadGlobalSearchIndex(availability)); } finally { setIsLoading(false); }
  }, [availability]);
  useEffect(() => { void loadIndex(); }, [loadIndex]);
  const results = useMemo(() => searchGlobalIndex(index, query, filter), [index, query, filter]);

  const openResult = (result: GlobalSearchResult) => {
    if (result.destination.type === "route") {
      if (result.destination.pathname === "/store-detail") router.push({ pathname: "/store-detail" as any, params: { id: result.id.replace(/^store:/, "") } });
      else router.push(result.destination.pathname as any);
      return;
    }
    router.push({ pathname: "/(tabs)/more" as any, params: { module: result.destination.module } });
  };

  const hasQuery = query.trim().length >= 2;
  return <ScreenContainer containerClassName="bg-background">
    <View style={[styles.header, { borderBottomColor: colors.border }]}><TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]} accessibilityLabel="رجوع"><MaterialIcons name="arrow-forward" size={22} color={colors.foreground} /></TouchableOpacity><View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>بحث في التطبيق</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>ابحث ضمن البيانات المسموح بها فقط</Text></View></View>
    <View style={styles.body}>
      <View style={[styles.searchBox, { borderColor: colors.primary + "38", backgroundColor: colors.surface }]}><MaterialIcons name="search" size={22} color={colors.primary} /><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="ابحث في المحلات والفعاليات والمنتجات…" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground }]} textAlign="right" returnKeyType="search" accessibilityLabel="حقل البحث الموحد" />{query ? <Pressable onPress={() => setQuery("")} hitSlop={10}><MaterialIcons name="close" size={20} color={colors.muted} /></Pressable> : null}</View>
      <FlatList horizontal showsHorizontalScrollIndicator={false} style={styles.filtersList} data={FILTERS} keyExtractor={(item) => item.id} contentContainerStyle={styles.filters} renderItem={({ item }) => <TouchableOpacity onPress={() => setFilter(item.id)} style={[styles.filter, { borderColor: filter === item.id ? colors.primary : colors.border, backgroundColor: filter === item.id ? colors.primary : colors.surface }]}><Text style={[styles.filterText, { color: filter === item.id ? "#fff" : colors.foreground }]}>{item.label}</Text></TouchableOpacity>} />
      <FlatList data={results} keyExtractor={(item) => item.id} contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled" renderItem={({ item }) => { const accent = RESULT_COLORS[item.icon]; return <TouchableOpacity onPress={() => openResult(item)} activeOpacity={0.76} style={[styles.result, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="chevron-left" size={21} color={colors.muted} /><View style={styles.resultCopy}><View style={styles.titleLine}><Text style={[styles.moduleLabel, { color: accent }]}>{item.moduleLabel}</Text><Text style={[styles.resultTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text></View><Text style={[styles.resultSubtitle, { color: colors.muted }]} numberOfLines={2}>{item.subtitle}</Text></View><View style={[styles.resultIcon, { backgroundColor: accent + "16" }]}><MaterialIcons name={item.icon} size={21} color={accent} /></View></TouchableOpacity>; }} ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.primary + "14" }]}><MaterialIcons name={hasQuery ? "search-off" : "search"} size={28} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{hasQuery ? "لا توجد نتائج مطابقة" : "ابدأ بالبحث"}</Text><Text style={[styles.emptyText, { color: colors.muted }]}>{hasQuery ? "جرّب كلمة أقصر أو اختر فئة أخرى." : "اكتب حرفين على الأقل للبحث في بيانات التطبيق."}</Text></View>} />
    </View>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  header: { height: 76, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1 }, backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "flex-end" }, headerTitle: { fontSize: 18, fontWeight: "800" as const, textAlign: "right" }, headerSubtitle: { fontSize: 11, marginTop: 2, textAlign: "right" },
  body: { flex: 1 }, searchBox: { margin: 14, minHeight: 54, borderWidth: 1, borderRadius: 17, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }, input: { flex: 1, fontSize: 14, minHeight: 48 }, filtersList: { height: 42 }, filters: { height: 42, paddingHorizontal: 14, gap: 8, alignItems: "center", flexDirection: "row-reverse" }, filter: { height: 34, borderRadius: 11, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" }, filterText: { fontSize: 12, fontWeight: "800" as const },
  results: { padding: 14, paddingTop: 7, paddingBottom: 34, gap: 8, flexGrow: 1 }, result: { minHeight: 76, borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }, resultIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, resultCopy: { flex: 1, alignItems: "flex-end" }, titleLine: { flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "space-between", gap: 9 }, resultTitle: { flex: 1, fontSize: 14, fontWeight: "800" as const, textAlign: "right" }, moduleLabel: { fontSize: 10, fontWeight: "800" as const, textAlign: "left" }, resultSubtitle: { width: "100%", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 4 },
  empty: { borderWidth: 1, borderRadius: 18, padding: 25, alignItems: "center", marginTop: 16 }, emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" }, emptyTitle: { fontSize: 15, fontWeight: "800" as const, marginTop: 13 }, emptyText: { fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 6 }, loader: { marginTop: 35 },
});
