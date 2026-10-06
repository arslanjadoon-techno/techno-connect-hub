import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Department, Role, User } from "./types";
import { ALL_DEPARTMENTS } from "./types";
import {
  setToken,
  setStoredUser,
  getStoredUser,
  getStoredPermissions,
  setStoredPermissions,
  type BackendUser,
  type UserPermissionEntry,
} from "./api/client";
import { authService } from "@/services/auth";

export type LoginResult =
  | { kind: "authenticated"; user: User }
  | {
      kind: "setup2fa";
      email: string;
      partialToken?: string;
      qrCode?: string;
      userName?: string;
      userId?: number;
      secretKey?: string;
      qrCodeUrl?: string;
    }
  | {
      kind: "verify2fa";
      email: string;
      partialToken?: string;
      userName?: string;
      userId?: number;
    };

interface AuthCtx {
  user: User | null;
  permissions: UserPermissionEntry[];
  /** Handles all four backend login cases: blocked, bypass-2fa, setup-2fa, verify-2fa. */
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Establish session from a token + backend user (used after 2FA verification). */
  setSession: (token: string, backendUser: any, permissions?: UserPermissionEntry[]) => User;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

/** Map backend user shape -> local User used across the UI. */
export function mapBackendUser(b: any): User {
  const parts = (b.fullName ?? "").trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || "";

  // 🛠️ Hybrid Extraction: Check if object exists (list API), direct string exists (Login API), or portalAccess
  const rawRole =
    b.role?.name ||
    b.roleName ||
    (Array.isArray(b.portalAccess) && b.portalAccess.length > 0
      ? b.portalAccess[0].roleName
      : "user");
  const normalizedRole = String(rawRole)
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  // Mapping string to match UI Expected Role types ("state_manager", etc.)
  let roleName: Role = "user";
  if (normalizedRole === "admin") roleName = "admin";
  else if (normalizedRole === "manager") roleName = "manager";
  else if (normalizedRole === "statemanager" || normalizedRole === "state_manager")
    roleName = "state_manager";
  else if (normalizedRole === "districtmanager" || normalizedRole === "district_manager")
    roleName = "district_manager";
  else if (normalizedRole === "marketmanager" || normalizedRole === "market_manager")
    roleName = "market_manager";
  else if (normalizedRole === "storemanager" || normalizedRole === "store_manager")
    roleName = "store_manager";

  // 🛠️ Hybrid Extraction for Department
  const rawDept = b.department?.name || b.departmentName || "Operations";
  const department: Department = ALL_DEPARTMENTS.includes(rawDept as Department)
    ? (rawDept as Department)
    : "Operations";

  return {
    id: String(b.id),
    firstName,
    lastName,
    fullName: b.fullName || `${firstName} ${lastName}`.trim(),
    email: b.email,
    phone: b.phone ?? undefined,
    department,
    departmentName: b.department?.name ?? b.departmentName ?? undefined,
    roleName,
    assignedPortals: Array.isArray(b.assignedPortals) ? b.assignedPortals : [],
    portalAccess: Array.isArray(b.portalAccess) ? b.portalAccess : [],
    allowedUserManagement: Boolean(b.allowedUserManagement),
    states: Array.isArray(b.states) ? b.states : [],
    districts: Array.isArray(b.districts) ? b.districts : [],
    markets: Array.isArray(b.markets) ? b.markets : [],
    stores: Array.isArray(b.stores) ? b.stores : [],
    houses: Array.isArray(b.houses) ? b.houses : [],
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
  const [permissions, setPermissions] = useState<UserPermissionEntry[]>(() => getStoredPermissions());

  // Keep React state in sync if the stored user changes elsewhere.
  useEffect(() => {
    const stored = getStoredUser<any>();
    if (stored && !user) setUser(mapBackendUser(stored));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setSession = useCallback(
    (token: string, backendUser: any, newPermissions?: UserPermissionEntry[]): User => {
      setToken(token);
      setStoredUser(backendUser);
      setStoredPermissions(newPermissions ?? []);
      const u = mapBackendUser(backendUser);
      setUser(u);
      setPermissions(newPermissions ?? []);
      return u;
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const res = await authService.totpLogin(email, password);
      const d: any = res.data ?? {};

      // Case 1: First-time setup (QR Code screen)
      if (d.requiresSetup === true || d.qrCode || d.qrCodeUrl) {
        return {
          kind: "setup2fa",
          email,
          partialToken: d.partialToken,
          qrCode: d.qrCode,
          userName: d.userName,
          userId: d.userID ?? d.userId,
          secretKey: d.secretKey ?? "",
          qrCodeUrl: d.qrCodeUrl ?? "",
        };
      }

      // Case 2: Already registered in authenticator app (Code entry screen)
      if (d.requiresTotp === true) {
        return {
          kind: "verify2fa",
          email,
          partialToken: d.partialToken,
          userName: d.userName,
          userId: d.userID ?? d.userId,
        };
      }

      // Case 3: 2FA Bypassed (Direct Login)
      if (d.token) {
        const user = setSession(d.token as string, d.user, d.permissions ?? []);
        return { kind: "authenticated", user };
      }

      return { kind: "verify2fa", email };
    },
    [setSession],
  );

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setStoredPermissions(null);
    setUser(null);
    setPermissions([]);
  }, []);

  const value = useMemo(
    () => ({ user, permissions, login, setSession, logout }),
    [user, permissions, login, setSession, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
