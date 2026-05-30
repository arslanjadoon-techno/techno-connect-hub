import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { seedUsers } from "./mock/seed";
import type { User } from "./types";

const AUTH_KEY = "techno-ticket-auth-v1";

interface AuthCtx {
  user: User | null;
  login: (email: string) => Promise<User>;
  logout: () => void;
  switchTo: (userId: string) => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(AUTH_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  });

  useEffect(() => {
    try {
      if (user) window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      else window.localStorage.removeItem(AUTH_KEY);
    } catch { /* ignore */ }
  }, [user]);

  const login = useCallback(async (email: string): Promise<User> => {
    const u = seedUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u) throw new Error("No account found for that email");
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const switchTo = useCallback((userId: string) => {
    const u = seedUsers.find((x) => x.id === userId);
    if (u) setUser(u);
  }, []);

  const value = useMemo(() => ({ user, login, logout, switchTo }), [user, login, logout, switchTo]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
