import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  themePreference: "light" | "dark" | "system";
  setColorScheme: (scheme: ColorScheme) => void;
  setThemePreference: (preference: "light" | "dark" | "system") => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_PREFERENCE_KEY = "@madar_theme_preference_v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [themePreference, setThemePreferenceState] = useState<"light" | "dark" | "system">("system");
  const colorScheme: ColorScheme = themePreference === "system" ? systemScheme : themePreference;

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  const setThemePreference = useCallback(async (preference: "light" | "dark" | "system") => {
    setThemePreferenceState(preference);
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    void setThemePreference(scheme);
  }, [setThemePreference]);

  useEffect(() => {
    void AsyncStorage.getItem(THEME_PREFERENCE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemePreferenceState(saved);
      }
    });
  }, []);

  useEffect(() => {
    applyScheme(colorScheme);
    Appearance.setColorScheme?.(themePreference === "system" ? null : colorScheme);
  }, [applyScheme, colorScheme, themePreference]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      themePreference,
      setColorScheme,
      setThemePreference,
    }),
    [colorScheme, setColorScheme, setThemePreference, themePreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
