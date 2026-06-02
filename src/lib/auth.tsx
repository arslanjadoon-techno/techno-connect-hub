import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { seedUsers } from "./mock/seed";
import type { Department, Role, User } from "./types";
import { ALL_DEPARTMENTS } from "./types";
import { authApi, setToken, type BackendUser } from "./api/client";

const AUTH_KEY = "techno-ticket-auth-v1";

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  switchTo: (userId: string) => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

/** Map backend user shape -> local User. */
function mapBackendUser(b: BackendUser): User {
  const parts = (b.fullName ?? "").trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || "";
  const role: Role = (["user","manager","market_manager","district_manager","state_manager","store_manager","admin"]
    .includes(b.role) ? b.role : "user") as Role;
  const department: Department = (ALL_DEPARTMENTS.includes(b.department as Department)
    ? (b.department as Department)
    : "Operations");
  return {
    id: String(b.id),
    firstName,
    lastName,
    email: b.email,
    phone: b.phone ?? undefined,
    department,
    role,
    avatarUrl: b.profileImage ?? undefined,
    avatarColor: "#0d7a5f",
  };
}

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

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    // Try real backend first; fall back to seed users for demo when backend is unreachable.
    try {
      const res = await authApi.login(email, password);
      setToken(res.data.token);
      const u = mapBackendUser(res.data.user);
      setUser(u);
      return u;
    } catch (err) {
      const msg = (err as Error).message ?? "";
      const isNetwork = msg.includes("Network") || msg.includes("fetch") || msg.includes("Failed");
      if (!isNetwork) throw err;
      // Network down → demo fallback
      const u = seedUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (!u) throw new Error("Backend unreachable and no demo account matches.");
      setUser(u);
      return u;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

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
