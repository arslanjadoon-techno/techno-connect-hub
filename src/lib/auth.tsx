import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Department, Role, User } from "./types";
import { ALL_DEPARTMENTS } from "./types";
import {
  authApi, setToken, setStoredUser, getStoredUser, type BackendUser,
} from "./api/client";

export type LoginResult =
  | { kind: "authenticated"; user: User }
  | { kind: "setup2fa"; email: string; secretKey: string; qrCodeUrl: string }
  | { kind: "verify2fa"; email: string };

interface AuthCtx {
  user: User | null;
  /** Handles all four backend login cases: blocked, bypass-2fa, setup-2fa, verify-2fa. */
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Establish session from a token + backend user (used after 2FA verification). */
  setSession: (token: string, backendUser: any) => User;
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
    departmentName: b.department?.name ?? b.departmentName ?? undefined,
    roleName,
    stateId: b.state?.id ?? (b.stateId != null ? String(b.stateId) : undefined),
    stateName: b.state?.name ?? b.stateName ?? undefined,
    districtId: b.district?.id ?? (b.districtId != null ? String(b.districtId) : undefined),
    districtName: b.district?.name ?? b.districtName ?? undefined,
    marketId: b.market?.id ?? (b.marketId != null ? String(b.marketId) : undefined),
    marketName: b.market?.name ?? b.marketName ?? undefined,
    storeId: b.store?.id ?? (b.storeId != null ? String(b.storeId) : undefined),
    storeName: b.store?.name ?? b.storeName ?? undefined,
    avatarUrl: b.profileImage ?? undefined,
    avatarColor: "#4f46e5",
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

  const setSession = useCallback((token: string, backendUser: any): User => {
    setToken(token);
    setStoredUser(backendUser);
    const u = mapBackendUser(backendUser);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const requires2FA =
      (res as any).data?.requires2FA === true ||
      (res as any).data?.twoFactorRequired === true ||
      (!res.data?.token && !res.data?.user);
    if (requires2FA) {
      return { requires2FA: true as const, email };
    }
    return setSession(res.data.token as string, res.data.user);
  }, [setSession]);

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, setSession, logout }), [user, login, setSession, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}