import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AuditLogItem {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "BACKUP" | "RESTORE" | "EXPORT" | "CLEANUP";
  module: string;
  description: string;
  username: string;
  timestamp: string;
}

const AUDIT_STORAGE_KEY = "@madar_audit_logs_v1";
const MAX_AUDIT_LOG_ITEMS = 200;

function parseAuditLogs(raw: string | null): AuditLogItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is AuditLogItem => Boolean(item && typeof item === "object" && "id" in item && "action" in item && "timestamp" in item)) : [];
  } catch {
    return [];
  }
}

export async function logAudit(action: AuditLogItem["action"], module: string, description: string, username = "مندوب ميداني"): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AUDIT_STORAGE_KEY);
    const logs = parseAuditLogs(raw);
    const newItem: AuditLogItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      module,
      description,
      username,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newItem);
    if (logs.length > MAX_AUDIT_LOG_ITEMS) logs.length = MAX_AUDIT_LOG_ITEMS;
    await AsyncStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to log audit", e);
  }
}

export async function getAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const raw = await AsyncStorage.getItem(AUDIT_STORAGE_KEY);
    return parseAuditLogs(raw);
  } catch {
    return [];
  }
}

export async function clearAuditLogs(): Promise<void> {
  await AsyncStorage.removeItem(AUDIT_STORAGE_KEY);
}
