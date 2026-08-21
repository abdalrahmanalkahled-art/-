import type { PermissionAction, PermissionModule } from "@/lib/user-permissions-model";

export type AppCustomizationModule = PermissionModule | "more";
export type AppCustomizationAction = "view" | "create" | "edit" | "delete" | "export" | "manage";

export interface AppModuleCustomization {
  visible: boolean;
  actions: Record<AppCustomizationAction, boolean>;
}

export interface AppCustomizationSettings {
  modules: Record<AppCustomizationModule, AppModuleCustomization>;
}

export const APP_CUSTOMIZATION_STORAGE_KEY = "madar_app_customization_v1";
export const APP_CUSTOMIZATION_MODULES: AppCustomizationModule[] = ["dashboard", "stores", "surveys", "events", "more", "warehouse", "expenses", "goals", "signage", "reports", "products", "analytics", "settings", "users"];
export const APP_CUSTOMIZATION_ACTIONS: AppCustomizationAction[] = ["view", "create", "edit", "delete", "export", "manage"];

function defaultModule(): AppModuleCustomization {
  return { visible: true, actions: { view: true, create: true, edit: true, delete: true, export: true, manage: true } };
}

export function createDefaultAppCustomization(): AppCustomizationSettings {
  return { modules: Object.fromEntries(APP_CUSTOMIZATION_MODULES.map((module) => [module, defaultModule()])) as AppCustomizationSettings["modules"] };
}

export function normalizeAppCustomization(value: unknown): AppCustomizationSettings {
  const fallback = createDefaultAppCustomization();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const raw = value as { modules?: Record<string, Partial<AppModuleCustomization>> };
  APP_CUSTOMIZATION_MODULES.forEach((module) => {
    const candidate = raw.modules?.[module];
    if (!candidate) return;
    fallback.modules[module] = {
      visible: typeof candidate.visible === "boolean" ? candidate.visible : true,
      actions: Object.fromEntries(APP_CUSTOMIZATION_ACTIONS.map((action) => [action, typeof candidate.actions?.[action] === "boolean" ? candidate.actions[action] : true])) as AppModuleCustomization["actions"],
    };
  });
  // لا يُسمح بإغلاق الوصول لإعداد التخصيص نفسه حتى لا يُقفل التطبيق على المستخدم.
  fallback.modules.settings.visible = true;
  fallback.modules.settings.actions.manage = true;
  return fallback;
}

export function customizationAllows(settings: AppCustomizationSettings, module: PermissionModule | "more", action: PermissionAction): boolean {
  const item = settings.modules[module as AppCustomizationModule];
  return Boolean(item?.visible && item.actions[action as AppCustomizationAction]);
}
