import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getAppNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/notification-center";
import type { AppNotification, AppNotificationType } from "@/lib/notifications-model";
import { formatArabicDate } from "@/lib/analytics-number-format";

const TYPE_CONFIG: Record<AppNotificationType, { icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  stock: { icon: "inventory-2", color: "#D97706" },
  task: { icon: "assignment-late", color: "#DC2626" },
  event: { icon: "event", color: "#2563EB" },
  goal: { icon: "flag", color: "#7C3AED" },
  tool: { icon: "build", color: "#0E9F6E" },
  contract: { icon: "directions", color: "#0E9F6E" },
  system: { icon: "info", color: "#64748B" },
};

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatArabicDate(date, { month: "short", day: "numeric" });
}

export default function NotificationsScreen() {
  const colors = useColors();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    const entries = await getAppNotifications();
    setNotifications(entries);
  }, []);

  useEffect(() => { void loadNotifications(); }, [loadNotifications]);
  useFocusEffect(useCallback(() => { void loadNotifications(); }, [loadNotifications]));

  const handlePress = async (notification: AppNotification) => {
    const updated = await markNotificationRead(notification.id);
    setNotifications(updated);
    if (notification.targetRoute) router.push(notification.targetRoute as any);
  };

  const handleMarkAllRead = async () => {
    const updated = await markAllNotificationsRead();
    setNotifications(updated);
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <ScreenContainer className="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity accessibilityLabel="العودة" onPress={() => router.back()} style={[styles.headerButton, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.foreground }]}>الإشعارات</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{unreadCount ? `${unreadCount} غير مقروءة` : "أنت على اطلاع"}</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="تعليم الكل كمقروء"
          onPress={() => void handleMarkAllRead()}
          disabled={!unreadCount}
          style={[styles.markAllButton, { backgroundColor: colors.primary + "16", opacity: unreadCount ? 1 : 0.45 }]}
        >
          <Text style={[styles.markAllText, { color: colors.primary }]}>قراءة الكل</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications.length ? styles.listContent : styles.emptyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadNotifications(); setRefreshing(false); }} />}
        renderItem={({ item }) => {
          const config = TYPE_CONFIG[item.type];
          return (
            <TouchableOpacity
              onPress={() => void handlePress(item)}
              activeOpacity={0.76}
              style={[styles.notificationCard, { backgroundColor: item.isRead ? colors.surface : colors.primary + "0D", borderColor: item.isRead ? colors.border : colors.primary + "33" }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: config.color + "18" }]}>
                <MaterialIcons name={config.icon} size={22} color={config.color} />
              </View>
              <View style={styles.notificationBody}>
                <View style={styles.notificationTitleRow}>
                  {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                  <Text style={[styles.notificationTitle, { color: colors.foreground }]}>{item.title}</Text>
                </View>
                <Text style={[styles.notificationMessage, { color: colors.muted }]}>{item.message}</Text>
                <Text style={[styles.notificationTime, { color: colors.muted }]}>{formatRelativeDate(item.createdAt)}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "12" }]}><MaterialIcons name="notifications-none" size={38} color={colors.primary} /></View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد إشعارات حالياً</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>ستظهر هنا تنبيهات المخزون والمهام والفعاليات والأدوات.</Text>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { height: 76, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16, gap: 12 },
  headerButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  titleArea: { flex: 1, alignItems: "flex-start" },
  title: { fontSize: 18, fontWeight: "800" as any },
  subtitle: { fontSize: 12, marginTop: 2 },
  markAllButton: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  markAllText: { fontSize: 12, fontWeight: "700" as any },
  listContent: { padding: 16, gap: 10, paddingBottom: 34 },
  emptyContent: { flexGrow: 1, padding: 24 },
  notificationCard: { borderRadius: 16, borderWidth: 1, padding: 13, flexDirection: "row", alignItems: "center", gap: 11 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  notificationBody: { flex: 1, alignItems: "flex-start" },
  notificationTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  notificationTitle: { fontSize: 14, fontWeight: "800" as any, textAlign: "left" },
  notificationMessage: { fontSize: 12, lineHeight: 18, textAlign: "left", marginTop: 3 },
  notificationTime: { fontSize: 11, textAlign: "left", marginTop: 5 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, paddingBottom: 80 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: "800" as any },
  emptyText: { fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 6 },
});
