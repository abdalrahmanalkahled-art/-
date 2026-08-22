import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AuditLogItem {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  module: string;
  description: string;
  username: string;
  timestamp: string;
}

const AUDIT_STORAGE_KEY = "@madar_audit_logs_v1";

export async function logAudit(action: AuditLogItem["action"], module: string, description: string, username = "مندوب ميداني"): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AUDIT_STORAGE_KEY);
    const logs: AuditLogItem[] = raw ? JSON.parse(raw) : [];
    const newItem: AuditLogItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      module,
      description,
      username,
      timestamp: new Date().toLocaleString("en-US"),
    };
    logs.unshift(newItem);
    // الاحتفاظ بأحدث 200 سجل فقط
    if (logs.length > 200) {
      logs.pop();
    }
    await AsyncStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to log audit", e);
  }
}

export async function getAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const raw = await AsyncStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
