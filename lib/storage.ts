import AsyncStorage from "@react-native-async-storage/async-storage";
import { logAudit } from "@/lib/audit-log";
import { addOfflineAction, type PendingAction } from "@/lib/offline-sync";
import { authenticateManagedUser } from "@/lib/user-management";
import type { UserPermissions, UserRole } from "@/lib/user-permissions-model";

// ===== AUTH STORAGE =====
const AUTH_KEY = "madar_auth";
const USER_KEY = "madar_user";

export interface LocalUser {
  id: string;
  username: string;
  name: string;
  avatarUri?: string;
  role: UserRole | "marketing_manager" | "marketing_supervisor";
  permissions?: UserPermissions;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: LocalUser | null;
}

// Default users for the app
export const DEFAULT_USERS: LocalUser[] = [
  {
    id: "user-admin",
    username: "admin",
    name: "المستخدم الرئيسي",
    role: "system_admin",
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_PASSWORDS: Record<string, string> = {
  admin: "123",
};

export async function login(username: string, password: string, rememberMe = true): Promise<LocalUser | null> {
  const managedUser = await authenticateManagedUser(username, password);
  if (managedUser) {
    const user: LocalUser = {
      id: managedUser.id,
      username: managedUser.username,
      name: managedUser.name,
      avatarUri: managedUser.avatarUri,
      role: managedUser.role,
      permissions: managedUser.permissions,
      createdAt: managedUser.createdAt,
    };
    if (rememberMe) {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ isAuthenticated: true }));
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  }
  const expectedPassword = DEFAULT_PASSWORDS[username];
  if (!expectedPassword || expectedPassword !== password) {
    return null;
  }
  const user = DEFAULT_USERS.find((u) => u.username === username);
  if (!user) return null;
  if (rememberMe) {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ isAuthenticated: true }));
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return user;
}

/** يتحقق من كلمة مرور الحساب الحالي قبل تنفيذ عمليات حذف محمية محلياً. */
export async function verifyLocalUserPassword(username: string, password: string): Promise<boolean> {
  if (!password) return false;
  if (await authenticateManagedUser(username, password)) return true;
  return DEFAULT_PASSWORDS[username.trim().toLowerCase()] === password;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export async function getStoredUser(): Promise<LocalUser | null> {
  try {
    const authStr = await AsyncStorage.getItem(AUTH_KEY);
    const userStr = await AsyncStorage.getItem(USER_KEY);
    if (!authStr || !userStr) return null;
    const auth = JSON.parse(authStr);
    if (!auth.isAuthenticated) return null;
    const parsed = JSON.parse(userStr) as LocalUser;
    if (parsed.username === "manager" || parsed.username === "supervisor") {
      const migrated: LocalUser = { ...parsed, id: "user-admin", username: "admin", name: parsed.username === "manager" ? "المستخدم الرئيسي" : parsed.name, role: "system_admin" };
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** يحفظ نسخة الجلسة الحالية بعد تعديل الملف الشخصي لتبقى الصورة والاسم متزامنين بعد إعادة التشغيل. */
export async function saveStoredUser(user: LocalUser): Promise<void> {
  const authStr = await AsyncStorage.getItem(AUTH_KEY);
  if (!authStr || !JSON.parse(authStr).isAuthenticated) return;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ===== GENERIC CRUD STORAGE =====
export async function getItems<T>(key: string): Promise<T[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

export async function saveItems<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

function getTrackedEntity(key: string): PendingAction["entity"] | null {
  if (key === STORAGE_KEYS.STORES || key === STORAGE_KEYS.STORE_VISITS) return "store";
  if (key === STORAGE_KEYS.EVENTS) return "event";
  if (key === STORAGE_KEYS.SURVEYS || key === STORAGE_KEYS.SURVEY_TEMPLATES || key === STORAGE_KEYS.SURVEY_RESULTS || key === STORAGE_KEYS.SURVEY_CYCLES) return "survey";
  return null;
}

async function trackLocalMutation(action: PendingAction["type"], key: string, payload: unknown): Promise<void> {
  const entity = getTrackedEntity(key);
  if (!entity) return;
  await Promise.all([
    addOfflineAction({ type: action, entity, payload }),
    logAudit(action, key, `${action} محلياً في ${key}`),
  ]);
}

export async function addItem<T extends { id: string }>(key: string, item: T): Promise<void> {
  const items = await getItems<T>(key);
  items.push(item);
  await saveItems(key, items);
  await trackLocalMutation("CREATE", key, item);
}

export async function updateItem<T extends { id: string }>(key: string, id: string, updates: Partial<T>): Promise<void> {
  const items = await getItems<T>(key);
  const index = items.findIndex((i) => i.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    await saveItems(key, items);
    await trackLocalMutation("UPDATE", key, { id, updates });
  }
}

export async function deleteItem<T extends { id: string }>(key: string, id: string): Promise<void> {
  const items = await getItems<T>(key);
  const filtered = items.filter((i) => i.id !== id);
  await saveItems(key, filtered);
  await trackLocalMutation("DELETE", key, { id });
}

// ===== STORAGE KEYS =====
export const STORAGE_KEYS = {
  STORES: "madar_stores",
  STORE_VISITS: "madar_store_visits",
  SURVEYS: "madar_surveys",
  SURVEY_TEMPLATES: "madar_survey_templates",
  SURVEY_RESULTS: "madar_survey_results",
  SURVEY_CYCLES: "madar_survey_cycles",
  EVENTS: "madar_events",
  WAREHOUSE_ITEMS: "madar_warehouse_items",
  WAREHOUSE_MOVEMENTS: "madar_warehouse_movements",
  WAREHOUSE_CATEGORIES: "madar_warehouse_categories",
  WAREHOUSE_TOOLS: "madar_warehouse_tools",
  STORE_CATEGORIES: "madar_store_categories",
  EXPENSES: "madar_expenses",
  EXPENSE_CATEGORIES: "madar_expense_categories",
  BUDGETS: "madar_budgets",
  MARKETING_GOALS: "madar_marketing_goals",
  MARKETING_TASKS: "madar_marketing_tasks",
  SIGNAGE_BOARDS: "madar_signage_boards",
  ROAD_SIGNAGE_CONTRACTS: "madar_road_signage_contracts",
  ROAD_SIGNAGE_CATALOG: "madar_road_signage_catalog",
  STANDS: "madar_stands",
  SHELVES: "madar_shelves",
  ADVERTISING_VEHICLES: "madar_advertising_vehicles",
  COMPANY_PRODUCTS: "madar_company_products",
  COMPETITOR_PRODUCTS: "madar_competitor_products",
  PRODUCTS: "madar_products",
  PRODUCT_CATEGORIES: "madar_product_categories",
  COMPETITORS: "madar_competitors",
  BRANDS: "madar_brands",
  REGIONS: "madar_regions",
  REGION_RATINGS: "madar_region_ratings",
  MARKET_VISIT_REPORT_TEMPLATES: "madar_market_visit_report_templates",
  MARKET_VISIT_REPORT_SETTINGS: "madar_market_visit_report_settings",
  EXTERNAL_ANALYTICS_PACKAGES: "madar_external_analytics_packages",
};
