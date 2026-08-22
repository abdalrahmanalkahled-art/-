export type UserRole = "system_admin" | "marketing_manager" | "field_supervisor" | "viewer";
export type PermissionAction = "view" | "create" | "edit" | "delete" | "export" | "manage";
export type PermissionModule = "dashboard" | "stores" | "surveys" | "events" | "warehouse" | "expenses" | "goals" | "signage" | "reports" | "products" | "analytics" | "settings" | "users";

export type UserPermissions = Record<PermissionModule, PermissionAction[]>;

export interface ManagedUser {
  id: string;
  username: string;
  password: string;
  name: string;
  avatarUri?: string;
  role: UserRole;
  permissions: UserPermissions;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const USERS_STORAGE_KEY = "madar_managed_users";

const ALL_ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete", "export", "manage"];
const ALL_MODULES: PermissionModule[] = ["dashboard", "stores", "surveys", "events", "warehouse", "expenses", "goals", "signage", "reports", "products", "analytics", "settings", "users"];

function permissionsFor(actions: PermissionAction[], modules = ALL_MODULES): UserPermissions {
  return Object.fromEntries(ALL_MODULES.map((module) => [module, modules.includes(module) ? [...actions] : []])) as UserPermissions;
}

export const ROLE_PERMISSION_PRESETS: Record<UserRole, UserPermissions> = {
  system_admin: permissionsFor(ALL_ACTIONS),
  marketing_manager: permissionsFor(["view", "create", "edit", "delete", "export"], ALL_MODULES.filter((module) => module !== "users")),
  field_supervisor: permissionsFor(["view", "create", "edit"], ["dashboard", "stores", "surveys", "events", "warehouse"]),
  viewer: permissionsFor(["view"], ["dashboard", "reports", "analytics"]),
};

export function canUsePermission(user: Pick<ManagedUser, "permissions"> | null | undefined, module: PermissionModule, action: PermissionAction): boolean {
  return Boolean(user?.permissions[module]?.includes(action));
}
