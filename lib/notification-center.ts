import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getRoadsideContractAlert, type RoadsideContract } from "./roadside-contracts";
import { loadAppSettings } from "./app-settings";

import {
  createNotificationId,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
  NOTIFICATION_STORAGE_KEY,
  type AppNotification,
  type AppNotificationType,
  type NotificationPreferences,
} from "./notifications-model";

interface DashboardNotificationSource {
  lowStockItems: { id: string; name: string; currentQuantity: number; minimumQuantity: number }[];
  delayedTasks: { id: string; title: string; dueDate: string }[];
  upcomingEvents: { id: string; title: string; eventDate: string }[];
  maintenanceTools: { id: string; name: string; condition: string }[];
  roadsideContracts?: RoadsideContract[];
  roadsideReminderDays?: number;
}

const MAX_NOTIFICATIONS = 100;
const CHANNEL_ID = "madar-alerts";
const ROAD_CONTRACT_SCHEDULES_KEY = "@madar_road_contract_schedules_v1";

function contractNotificationTitle(state: "upcoming" | "expired"): string { return state === "expired" ? "انتهى عقد لوحات طرقية" : "عقد لوحات طرقية يقترب من النهاية"; }
function contractNotificationMessage(contract: RoadsideContract, daysRemaining: number): string { return daysRemaining < 0 ? `${contract.ownerCompany || "الشركة المالكة"}: انتهى العقد في ${contract.endDate}. راجع التجديد أو الإلغاء.` : `${contract.ownerCompany || "الشركة المالكة"}: ينتهي العقد خلال ${daysRemaining} يوم.`; }
function contractRoute(contractId: string): string { return `/roadside-contract-details?id=${encodeURIComponent(contractId)}`; }

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function buildDashboardNotifications(source: DashboardNotificationSource, now = new Date()): AppNotification[] {
  const createdAt = now.toISOString();
  const alerts: AppNotification[] = [
    ...source.lowStockItems.map((item) => ({
      id: createNotificationId("stock", item.id),
      type: "stock" as const,
      title: "مخزون منخفض",
      message: `${item.name}: ${item.currentQuantity} متبقية من الحد الأدنى ${item.minimumQuantity}.`,
      createdAt,
      isRead: false,
      targetRoute: "/(tabs)/more",
      targetId: item.id,
    })),
    ...source.delayedTasks.map((task) => ({
      id: createNotificationId("task", task.id),
      type: "task" as const,
      title: "مهمة متأخرة",
      message: task.title,
      createdAt,
      isRead: false,
      targetRoute: "/(tabs)/more",
      targetId: task.id,
    })),
    ...source.upcomingEvents.map((event) => ({
      id: createNotificationId("event", event.id),
      type: "event" as const,
      title: "فعالية قريبة",
      message: `${event.title} بتاريخ ${event.eventDate}.`,
      createdAt,
      isRead: false,
      targetRoute: "/(tabs)/events",
      targetId: event.id,
    })),
    ...source.maintenanceTools.map((tool) => ({
      id: createNotificationId("tool", tool.id),
      type: "tool" as const,
      title: "أداة بحاجة متابعة",
      message: `${tool.name}: ${tool.condition}.`,
      createdAt,
      isRead: false,
      targetRoute: "/(tabs)/more",
      targetId: tool.id,
    })),
    ...(source.roadsideContracts || []).flatMap((contract) => {
      const alert = getRoadsideContractAlert(contract, now, source.roadsideReminderDays || 30);
      if (alert.state === "safe") return [];
      return [{
        id: createNotificationId("contract", `${contract.id}:${alert.state}`), type: "contract" as const,
        title: contractNotificationTitle(alert.state), message: contractNotificationMessage(contract, alert.daysRemaining), createdAt,
        isRead: false, targetRoute: "/roadside-contract-details", targetId: contract.id,
      }];
    }),
  ];
  return alerts;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    const stored = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      enabled: stored.enabled !== false,
      lowStock: stored.lowStock !== false,
      delayedTasks: stored.delayedTasks !== false,
      eventReminders: stored.eventReminders !== false,
      toolMaintenance: stored.toolMaintenance !== false,
      roadContractReminders: stored.roadContractReminders !== false,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export async function saveNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export async function getAppNotifications(): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    return Array.isArray(entries) ? entries as AppNotification[] : [];
  } catch {
    return [];
  }
}

async function saveAppNotifications(notifications: AppNotification[]): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
}

function preferenceAllows(type: AppNotificationType, preferences: NotificationPreferences): boolean {
  if (!preferences.enabled) return false;
  if (type === "stock") return preferences.lowStock;
  if (type === "task") return preferences.delayedTasks;
  if (type === "event") return preferences.eventReminders;
  if (type === "tool") return preferences.toolMaintenance;
  if (type === "contract") return preferences.roadContractReminders;
  return true;
}

/** يمسح تذكيرات الهاتف المجدولة لعقود اللوحات فقط، من دون التأثير في بقية إشعارات التطبيق. */
export async function clearRoadsideContractPhoneReminders(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ROAD_CONTRACT_SCHEDULES_KEY);
    const scheduleIds = raw ? JSON.parse(raw) : [];
    if (Array.isArray(scheduleIds)) await Promise.all(scheduleIds.map((id) => typeof id === "string" ? Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined) : undefined));
  } finally {
    await AsyncStorage.removeItem(ROAD_CONTRACT_SCHEDULES_KEY);
  }
}

/** يجدول تذكيراً قبل 30 يوماً وتذكيراً عند نهاية كل عقد نشط، بعد موافقة المستخدم على إشعارات الهاتف. */
export async function syncRoadsideContractPhoneReminders(contracts: RoadsideContract[], now = new Date()): Promise<void> {
  const [preferences, settings] = await Promise.all([getNotificationPreferences(), loadAppSettings()]);
  const reminderDays = settings.roadsideContractReminderDays;
  await clearRoadsideContractPhoneReminders();
  if (!preferences.enabled || !preferences.roadContractReminders || Platform.OS === "web") return;
  if (!(await requestNotificationPermission())) return;
  const scheduledIds: string[] = [];
  for (const contract of contracts.filter((item) => item.status === "active")) {
    const endDate = new Date(`${contract.endDate}T09:00:00`);
    const reminderDate = new Date(endDate); reminderDate.setDate(reminderDate.getDate() - reminderDays);
    const schedule = async (date: Date, state: "upcoming" | "expired") => {
      if (date.getTime() <= now.getTime()) return;
      const identifier = await Notifications.scheduleNotificationAsync({ content: { title: contractNotificationTitle(state), body: state === "expired" ? `${contract.ownerCompany || "الشركة المالكة"}: انتهت فترة العقد. افتح التطبيق للتجديد أو الإلغاء.` : `${contract.ownerCompany || "الشركة المالكة"}: ينتهي عقد اللوحات خلال ${reminderDays} يوماً.`, data: { url: contractRoute(contract.id), targetRoute: "/roadside-contract-details", targetId: contract.id }, ...(Platform.OS === "android" ? { color: "#1A56DB" } : {}) }, trigger: { type: "date", date } as any });
      scheduledIds.push(identifier);
    };
    await schedule(reminderDate, "upcoming");
    await schedule(endDate, "expired");
  }
  await AsyncStorage.setItem(ROAD_CONTRACT_SCHEDULES_KEY, JSON.stringify(scheduledIds));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "تنبيهات مساعد التسويق الميداني",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#1A56DB",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function displayOnDevice(notification: AppNotification): Promise<void> {
  if (!(await requestNotificationPermission())) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.message,
      data: { targetRoute: notification.targetRoute, targetId: notification.targetId },
      ...(Platform.OS === "android" ? { color: "#1A56DB" } : {}),
    },
    trigger: null,
  });
}

/** يدمج التنبيهات الجديدة مع المركز ويحاول عرض التنبيهات الجديدة على الهاتف دون تكرار القديمة. */
export async function syncNotificationCenter(candidates: AppNotification[]): Promise<AppNotification[]> {
  const [existing, preferences] = await Promise.all([getAppNotifications(), getNotificationPreferences()]);
  const existingIds = new Set(existing.map((notification) => notification.id));
  const fresh = candidates.filter((notification) => !existingIds.has(notification.id));
  const visibleFresh = fresh.filter((notification) => preferenceAllows(notification.type, preferences));
  await Promise.all(visibleFresh.map((notification) => displayOnDevice(notification).catch(() => undefined)));
  const merged = [...visibleFresh, ...existing].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await saveAppNotifications(merged);
  return merged;
}

export async function markNotificationRead(id: string): Promise<AppNotification[]> {
  const notifications = await getAppNotifications();
  const updated = notifications.map((notification) => notification.id === id ? { ...notification, isRead: true } : notification);
  await saveAppNotifications(updated);
  return updated;
}

export async function markAllNotificationsRead(): Promise<AppNotification[]> {
  const notifications = await getAppNotifications();
  const updated = notifications.map((notification) => ({ ...notification, isRead: true }));
  await saveAppNotifications(updated);
  return updated;
}

export function unreadNotificationCount(notifications: AppNotification[]): number {
  return notifications.filter((notification) => !notification.isRead).length;
}
