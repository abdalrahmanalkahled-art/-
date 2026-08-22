import AsyncStorage from "@react-native-async-storage/async-storage";

import { ROLE_PERMISSION_PRESETS, USERS_STORAGE_KEY, type ManagedUser, type UserPermissions, type UserRole } from "./user-permissions-model";

const INITIAL_USERS: ManagedUser[] = [
  { id: "user-admin", username: "admin", password: "123", name: "المستخدم الرئيسي", role: "system_admin", permissions: ROLE_PERMISSION_PRESETS.system_admin, isActive: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
];

function clonePermissions(permissions: UserPermissions): UserPermissions {
  return Object.fromEntries(Object.entries(permissions).map(([module, actions]) => [module, [...actions]])) as UserPermissions;
}

function normalizeUser(value: Partial<ManagedUser>): ManagedUser | null {
  if (!value.id || !value.username || !value.password || !value.name) return null;
  const role = value.role && ROLE_PERMISSION_PRESETS[value.role] ? value.role : "field_supervisor";
  return {
    id: value.id,
    username: value.username.trim().toLowerCase(),
    password: value.password,
    name: value.name.trim(),
    avatarUri: value.avatarUri,
    role,
    permissions: value.permissions ? clonePermissions(value.permissions) : clonePermissions(ROLE_PERMISSION_PRESETS[role]),
    isActive: value.isActive !== false,
    createdAt: value.createdAt || new Date().toISOString(),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

export async function getManagedUsers(): Promise<ManagedUser[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const users = parsed.map(normalizeUser).filter(Boolean) as ManagedUser[];
        const migrated = users
          .filter((user) => user.username !== "supervisor")
          .map((user) => user.username === "manager" ? { ...user, id: "user-admin", username: "admin", password: "123", name: user.name === "مدير التسويق" ? "المستخدم الرئيسي" : user.name, role: "system_admin" as const, permissions: clonePermissions(ROLE_PERMISSION_PRESETS.system_admin), updatedAt: new Date().toISOString() } : user);
        if (migrated.length) {
          await saveManagedUsers(migrated);
          return migrated;
        }
      }
    }
  } catch {
    // يعود التطبيق إلى الحسابات الابتدائية القابلة للإدارة عند فساد البيانات.
  }
  const users = INITIAL_USERS.map((user) => ({ ...user, permissions: clonePermissions(user.permissions) }));
  await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  return users;
}

export async function saveManagedUsers(users: ManagedUser[]): Promise<void> {
  await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export async function createManagedUser(input: { username: string; password: string; name: string; role: UserRole; permissions?: UserPermissions }): Promise<ManagedUser> {
  const users = await getManagedUsers();
  const username = input.username.trim().toLowerCase();
  if (!username) throw new Error("أدخل اسم مستخدم");
  if (users.some((user) => user.username === username)) throw new Error("اسم المستخدم مستخدم بالفعل");
  if (input.password.trim().length < 4) throw new Error("كلمة المرور يجب أن تتكون من 4 أحرف على الأقل");
  const now = new Date().toISOString();
  const user: ManagedUser = {
    id: `user-${Date.now()}`,
    username,
    password: input.password,
    name: input.name.trim() || username,
    role: input.role,
    permissions: input.permissions ? clonePermissions(input.permissions) : clonePermissions(ROLE_PERMISSION_PRESETS[input.role]),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await saveManagedUsers([...users, user]);
  return user;
}

export async function updateManagedUser(id: string, updates: Partial<Pick<ManagedUser, "username" | "name" | "password" | "avatarUri" | "role" | "permissions" | "isActive">>): Promise<ManagedUser> {
  const users = await getManagedUsers();
  const index = users.findIndex((user) => user.id === id);
  if (index < 0) throw new Error("المستخدم غير موجود");
  const current = users[index];
  const username = updates.username?.trim().toLowerCase() || current.username;
  if (!username) throw new Error("اسم المستخدم مطلوب");
  if (users.some((user, userIndex) => userIndex !== index && user.username === username)) throw new Error("اسم المستخدم مستخدم بالفعل");
  if (updates.password !== undefined && updates.password.trim().length < 3) throw new Error("كلمة المرور يجب أن تتكون من 3 أحرف على الأقل");
  const role = updates.role || current.role;
  const next: ManagedUser = {
    ...current,
    ...updates,
    username,
    permissions: updates.permissions ? clonePermissions(updates.permissions) : updates.role ? clonePermissions(ROLE_PERMISSION_PRESETS[role]) : current.permissions,
    updatedAt: new Date().toISOString(),
  };
  users[index] = next;
  await saveManagedUsers(users);
  return next;
}

export async function authenticateManagedUser(username: string, password: string): Promise<ManagedUser | null> {
  const users = await getManagedUsers();
  return users.find((user) => user.isActive && user.username === username.trim().toLowerCase() && user.password === password) || null;
}
