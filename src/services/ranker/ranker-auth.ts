import { useState, useEffect } from "react";

export type RankerRole = "admin" | "manager" | "user";

export interface RankerUserAuth {
  role: RankerRole;
  rawRole: string;
  fullName: string;
  email: string;
  isRankerAdmin: boolean;
  isRankerManager: boolean;
  isRankerUser: boolean;
}

/**
 * Reads user object from localStorage and extracts Ranker portal role.
 * Matches:
 *   "admin" -> Admin (full access to all records)
 *   "manager" (or containing manager) -> Manager (can only view and click own record)
 *   "user" -> User (blocked from ranker portal with a message modal)
 */
export function getRankerUserAuth(): RankerUserAuth {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem("user") : null;
    if (raw) {
      const u = JSON.parse(raw);
      const accessList = Array.isArray(u?.portalAccess) ? u.portalAccess : [];
      const rankerAccess = accessList.find((p: any) => p?.portalName?.toLowerCase() === "ranker");

      // Check portalAccess roleName first
      let rawRole = (rankerAccess?.roleName || "").trim().toLowerCase();

      // If portalAccess not found or empty, fallback to u.role?.name or u.roleName or u.role
      if (!rawRole) {
        rawRole = (u?.role?.name || u?.roleName || u?.role || "").trim().toLowerCase();
      }

      let role: RankerRole = "user";
      if (rawRole === "admin" || rawRole === "superadmin" || rawRole === "super_admin") {
        role = "admin";
      } else if (rawRole === "manager" || rawRole.includes("manager")) {
        role = "manager";
      } else {
        role = "user";
      }

      const fullName = (u?.fullName || `${u?.firstName || ""} ${u?.lastName || ""}`).trim();
      const email = u?.email || "";

      return {
        role,
        rawRole,
        fullName,
        email,
        isRankerAdmin: role === "admin",
        isRankerManager: role === "manager",
        isRankerUser: role === "user",
      };
    }
  } catch (e) {
    console.error("Error reading ranker user auth from localStorage:", e);
  }

  return {
    role: "user",
    rawRole: "user",
    fullName: "",
    email: "",
    isRankerAdmin: false,
    isRankerManager: false,
    isRankerUser: true,
  };
}

/**
 * Compare manager name from record with user full name loosely.
 */
export function isCurrentManager(rowName?: string | null, userFullName?: string | null): boolean {
  if (!rowName || !userFullName) return false;
  const n1 = rowName.trim().toLowerCase().replace(/\s+/g, " ");
  const n2 = userFullName.trim().toLowerCase().replace(/\s+/g, " ");
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
}

/**
 * React hook to observe Ranker auth state and react to changes.
 */
export function useRankerAuth(): RankerUserAuth {
  const [auth, setAuth] = useState<RankerUserAuth>(() => getRankerUserAuth());

  useEffect(() => {
    const handleStorageChange = () => {
      setAuth(getRankerUserAuth());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return auth;
}
