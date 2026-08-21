import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { getStoredUser, LocalUser } from "./storage";
import { AUTH_CHECK_TIMEOUT_MS, withTimeout } from "./auth-loading";
import type { PermissionAction, PermissionModule } from "./user-permissions-model";
import { useAppCustomization } from "./app-customization-context";

// ===== TYPES =====
interface AppState {
  user: LocalUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AppAction =
  | { type: "SET_USER"; payload: LocalUser }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; payload: boolean };

interface AppContextType extends AppState {
  dispatch: React.Dispatch<AppAction>;
}

// ===== REDUCER =====
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false };
    case "LOGOUT":
      return { ...state, user: null, isAuthenticated: false, isLoading: false };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// ===== CONTEXT =====
const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await withTimeout(
          getStoredUser(),
          AUTH_CHECK_TIMEOUT_MS,
          null,
        );
        if (user) {
          dispatch({ type: "SET_USER", payload: user });
        } else {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } catch {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
    checkAuth();
  }, []);

  return <AppContext.Provider value={{ ...state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}

export function useIsManager() {
  const { user } = useApp();
  return user?.role === "system_admin" || user?.role === "marketing_manager";
}

/** يتيح للحسابات القديمة والمديرين كامل الوصول، ويطبّق الصلاحيات المحفوظة للحسابات المُدارة. */
export function useHasPermission(module: PermissionModule, action: PermissionAction = "view") {
  const { user } = useApp();
  const { canUse } = useAppCustomization();
  if (!user) return false;
  if (!canUse(module, action)) return false;
  if (user.role === "system_admin" || user.role === "marketing_manager") return true;
  return Boolean(user.permissions?.[module]?.includes(action));
}
