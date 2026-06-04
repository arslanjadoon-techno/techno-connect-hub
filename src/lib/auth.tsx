import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Department, Role, User } from "./types";
import { ALL_DEPARTMENTS } from "./types";
import {
  authApi, setToken, setStoredUser, getStoredUser, type BackendUser,
} from "./api/client";

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

/** Map backend user shape -> local User used across the UI. */
export function mapBackendUser(b: any): User {
  const parts = (b.fullName ?? "").trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || "";

  // 🛠️ Hybrid Extraction: Check if object exists (list API) or direct string exists (Login API)
  const rawRole = b.role?.name || b.roleName || "user";
  const normalizedRole = String(rawRole).toLowerCase();

  // Mapping string to match UI Expected Role types ("state_manager", etc.)
  let roleName: Role = "user";
  if (normalizedRole === "admin") roleName = "admin";
  else if (normalizedRole === "manager") roleName = "manager";
  else if (normalizedRole === "statemanager" || normalizedRole === "state_manager") roleName = "state_manager";
  else if (normalizedRole === "districtmanager" || normalizedRole === "district_manager") roleName = "district_manager";
  else if (normalizedRole === "marketmanager" || normalizedRole === "market_manager") roleName = "market_manager";
  else if (normalizedRole === "storemanager" || normalizedRole === "store_manager") roleName = "store_manager";

  // 🛠️ Hybrid Extraction for Department
  const rawDept = b.department?.name || b.departmentName || "Operations";
  const department: Department = (ALL_DEPARTMENTS.includes(rawDept as Department)
    ? (rawDept as Department)
    : "Operations");

  return {
    id: String(b.id),
    firstName,
    lastName,
    email: b.email,
    phone: b.phone ?? undefined,
    department,
    roleName,
    avatarUrl: b.profileImage ?? undefined,
    avatarColor: "#0d7a5f",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = getStoredUser<any>();
    return stored ? mapBackendUser(stored) : null;
  });

  // Keep React state in sync if the stored user changes elsewhere.
  useEffect(() => {
    const stored = getStoredUser<any>();
    if (stored && !user) setUser(mapBackendUser(stored));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await authApi.login(email, password);
    // Persist exactly per spec: `token` and `user` keys in localStorage.
    setToken(res.data.token);
    setStoredUser(res.data.user);
    const u = mapBackendUser(res.data.user);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}