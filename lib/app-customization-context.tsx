import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { APP_CUSTOMIZATION_STORAGE_KEY, createDefaultAppCustomization, customizationAllows, normalizeAppCustomization, type AppCustomizationSettings } from "@/lib/app-customization-model";
import type { PermissionAction, PermissionModule } from "@/lib/user-permissions-model";

interface AppCustomizationContextValue {
  settings: AppCustomizationSettings;
  loaded: boolean;
  canUse: (module: PermissionModule | "more", action?: PermissionAction) => boolean;
  save: (settings: AppCustomizationSettings) => Promise<void>;
}

const AppCustomizationContext = createContext<AppCustomizationContextValue | undefined>(undefined);

export function AppCustomizationProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppCustomizationSettings>(createDefaultAppCustomization());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(APP_CUSTOMIZATION_STORAGE_KEY).then((raw) => setSettings(normalizeAppCustomization(raw ? JSON.parse(raw) : null))).catch(() => setSettings(createDefaultAppCustomization())).finally(() => setLoaded(true));
  }, []);

  const save = useCallback(async (next: AppCustomizationSettings) => {
    const normalized = normalizeAppCustomization(next);
    await AsyncStorage.setItem(APP_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(normalized));
    setSettings(normalized);
  }, []);

  const value = useMemo<AppCustomizationContextValue>(() => ({ settings, loaded, save, canUse: (module, action = "view") => customizationAllows(settings, module, action) }), [loaded, save, settings]);
  return <AppCustomizationContext.Provider value={value}>{children}</AppCustomizationContext.Provider>;
}

export function useAppCustomization() {
  const context = useContext(AppCustomizationContext);
  if (!context) throw new Error("useAppCustomization must be used within AppCustomizationProvider");
  return context;
}
