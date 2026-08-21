import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PendingAction {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  entity: "store" | "survey" | "event";
  payload: any;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = "@madar_offline_queue_v1";

export async function getOfflineQueue(): Promise<PendingAction[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function addOfflineAction(action: Omit<PendingAction, "id" | "timestamp">): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const newAction: PendingAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    queue.push(newAction);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to add offline action", e);
  }
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}
