import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthState } from "./auth.storage";
import { loadAuth, saveAuth, clearAuth } from "./auth.storage";

type AuthContextValue = {
  auth: AuthState | null;
  setAuth: (a: AuthState | null) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<AuthState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const a = await loadAuth();
      setAuthState(a);
      setReady(true);
    })();
  }, []);

  const setAuth = async (a: AuthState | null) => {
    setAuthState(a);
    if (a) await saveAuth(a);
    else await clearAuth();
  };

  const logout = async () => setAuth(null);

  const value = useMemo(() => ({ auth, setAuth, logout }), [auth]);

  if (!ready) return null;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
