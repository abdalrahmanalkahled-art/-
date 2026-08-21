export type AppNotificationType = "stock" | "task" | "event" | "goal" | "tool" | "contract" | "system";

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  targetRoute?: string;
  targetId?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  lowStock: boolean;
  delayedTasks: boolean;
  eventReminders: boolean;
  toolMaintenance: boolean;
  roadContractReminders: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  lowStock: true,
  delayedTasks: true,
  eventReminders: true,
  toolMaintenance: true,
  roadContractReminders: true,
};

export const NOTIFICATION_STORAGE_KEY = "@madar_notifications_v1";
export const NOTIFICATION_PREFERENCES_STORAGE_KEY = "@madar_notification_preferences_v1";

export function createNotificationId(type: AppNotificationType, sourceId: string): string {
  return `${type}:${sourceId}`;
}
