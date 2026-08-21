import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  AndroidImportance: { HIGH: 4 },
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { buildDashboardNotifications, syncRoadsideContractPhoneReminders, unreadNotificationCount } from "../notification-center";

describe("مركز الإشعارات", () => {
  it("ينشئ تنبيهات مرتبطة بالمخزون والمهام والفعاليات والأدوات", () => {
    const notifications = buildDashboardNotifications({
      lowStockItems: [{ id: "item-1", name: "عبوات", currentQuantity: 2, minimumQuantity: 10 }],
      delayedTasks: [{ id: "task-1", title: "زيارة منطقة الشمال", dueDate: "2026-08-15" }],
      upcomingEvents: [{ id: "event-1", title: "فعالية إطلاق", eventDate: "2026-08-18" }],
      maintenanceTools: [{ id: "tool-1", name: "ستاند متنقل", condition: "بحاجة إصلاح" }],
      roadsideContracts: [{ id: "contract-1", name: "عقد لوحات طرقية", type: "road", totalBoards: 2, ownerCompany: "شركة المتحدة", startDate: "2026-01-01", endDate: "2026-08-20", boards: [], status: "active", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
    }, new Date("2026-08-16T10:00:00Z"));
    expect(notifications).toHaveLength(5);
    expect(notifications.map((notification) => notification.type)).toEqual(["stock", "task", "event", "tool", "contract"]);
    expect(notifications[0].targetRoute).toBe("/(tabs)/more");
  });

  it("يحسب التنبيهات غير المقروءة فقط", () => {
    expect(unreadNotificationCount([
      { id: "a", type: "stock", title: "أ", message: "أ", createdAt: "2026-08-16", isRead: false },
      { id: "b", type: "system", title: "ب", message: "ب", createdAt: "2026-08-16", isRead: true },
    ])).toBe(1);
  });

  it("يجدول تنبيه الهاتف قبل نهاية العقد وعند انتهائه", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as any);
    vi.mocked(Notifications.scheduleNotificationAsync).mockResolvedValueOnce("before-end").mockResolvedValueOnce("at-end");
    await syncRoadsideContractPhoneReminders([{ id: "contract-1", name: "عقد لوحات طرقية", type: "road", totalBoards: 2, ownerCompany: "شركة المتحدة", startDate: "2026-08-01", endDate: "2026-10-01", boards: [], status: "active", createdAt: "2026-08-01", updatedAt: "2026-08-01" }], new Date("2026-08-20T09:00:00"));
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(expect.any(String), JSON.stringify(["before-end", "at-end"]));
  });
});
