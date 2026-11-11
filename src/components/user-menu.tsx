import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  Settings as SettingsIcon,
  Sun,
  MoonStar,
  ChevronDown,
  Receipt,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { payslipService } from "@/services/payslips";
import { usersApi } from "@/lib/api/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/pages/team-chat/chatHealper";
import { getSurveillanceRole } from "@/services/portals/surveillance/types";

function readStoredUser(): Record<string, any> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as Record<string, any>) : null;
  } catch {
    return null;
  }
}

function detectPortalFromPath(pathname: string): string | null {
  const normPath = String(pathname || "").toLowerCase();
  const first = normPath.split("/")[1] || "";

  if (first === "commission") return "commission";
  if (first === "leasing" || first === "lease") return "leasing";
  if (first === "ranker") return "ranker";
  if (first === "ticketing") return "ticketing";
  if (first === "surveillance") return "surveillance";
  if (first === "leave" || first === "attendance") return "leave";
  if (first === "scheduling") return "scheduling";
  if (first === "reporting") return "reporting";
  if (first === "chat" || first === "ai-chat") return "chat";
  if (first === "admin" || first === "user-manager") return "admin";
  if (first === "otp") return "otp";
  if (first === "mis") return "mis";

  return null;
}

function findPortalAccessEntry(portalKey: string, portalAccess: any[]): any {
  if (!Array.isArray(portalAccess) || portalAccess.length === 0) return null;

  const norm = (s: string) =>
    String(s || "")
      .toLowerCase()
      .replace(/[\s_-]/g, "");

  const target = norm(portalKey);

  // 1. Direct normalized match
  let found = portalAccess.find((p: any) => norm(p?.portalName || p?.name || "") === target);
  if (found) return found;

  // 2. Domain matching
  found = portalAccess.find((p: any) => {
    const pn = norm(p?.portalName || p?.name || "");
    if (!pn) return false;

    if (target === "commission") return pn.includes("commiss");
    if (target === "leasing") return pn.includes("leas") || pn.includes("rent");
    if (target === "ranker") return pn.includes("rank");
    if (target === "ticketing") return pn.includes("ticket");
    if (target === "surveillance") return pn.includes("surveil");
    if (target === "leave") return pn.includes("leave") || pn.includes("attendance");
    if (target === "scheduling") return pn.includes("schedul") || pn.includes("attendance");
    if (target === "reporting") return pn.includes("report");
    if (target === "chat") return pn.includes("chat") || pn.includes("team");
    if (target === "admin") return pn.includes("admin") || pn.includes("user") || pn.includes("management");
    if (target === "otp") return pn.includes("otp") || pn.includes("manager") || pn.includes("backoffice");

    return pn.includes(target) || target.includes(pn);
  });

  return found || null;
}

function getCurrentPortalRole(user: any, pathname: string): string {
  if (!user) return "—";

  const accessList: any[] = Array.isArray(user.portalAccess) ? user.portalAccess : [];
  const currentPortal = detectPortalFromPath(pathname);

  if (currentPortal) {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("mis_last_active_portal", currentPortal);
      }
    } catch {
      /* ignore */
    }

    if (currentPortal === "surveillance") {
      const survRole = getSurveillanceRole(user);
      if (survRole && survRole !== "other") {
        return survRole;
      }
    }

    const access = findPortalAccessEntry(currentPortal, accessList);
    const roleName =
      access?.roleName ||
      access?.role?.name ||
      (typeof access?.role === "string" ? access.role : undefined);
    if (roleName) return roleName;
  } else {
    try {
      if (typeof window !== "undefined") {
        const lastPortal = window.sessionStorage.getItem("mis_last_active_portal");
        if (lastPortal) {
          if (lastPortal === "surveillance") {
            const survRole = getSurveillanceRole(user);
            if (survRole && survRole !== "other") return survRole;
          }
          const access = findPortalAccessEntry(lastPortal, accessList);
          const roleName =
            access?.roleName ||
            access?.role?.name ||
            (typeof access?.role === "string" ? access.role : undefined);
          if (roleName) return roleName;
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Fallbacks:
  if (accessList.length > 0 && accessList[0]?.roleName) {
    return accessList[0].roleName;
  }

  return (
    user.roleName ||
    user.rawRoleName ||
    user.role?.name ||
    (typeof user.role === "string" ? user.role : "") ||
    "—"
  );
}

function formatRoleName(roleStr: string): string {
  if (!roleStr || roleStr === "—") return "—";
  const upperAcronyms = new Set(["QA", "HR", "IT", "SDR", "OTP", "CEO", "CTO", "COO", "MIS"]);
  let spaced = roleStr.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
  spaced = spaced.replace(/(?<!\s)(manager)/i, " Manager");
  return spaced
    .trim()
    .split(/\s+/)
    .map((w) => {
      const up = w.toUpperCase();
      if (upperAcronyms.has(up)) return up;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

export function UserMenu() {
  const { logout, user: authUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [storedUser, setStoredUser] = useState<Record<string, any> | null>(() => readStoredUser());

  useEffect(() => {
    const syncUser = (event?: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      setStoredUser(
        detail && typeof detail === "object" ? (detail as Record<string, any>) : readStoredUser(),
      );
    };

    window.addEventListener("user:profile-updated", syncUser);
    window.addEventListener("storage", syncUser);
    syncUser();

    return () => {
      window.removeEventListener("user:profile-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    const userId = storedUser?.id || authUser?.id;
    if (!userId) return;

    let active = true;
    usersApi
      .get(userId)
      .then((response) => {
        if (!active || !response.data) return;

        setStoredUser((previous) => {
          const nextUser = { ...(previous || {}), ...(response.data as Record<string, any>) };
          try {
            window.localStorage.setItem("user", JSON.stringify(nextUser));
          } catch {
            // Keep the in-memory profile available if storage is unavailable.
          }
          window.dispatchEvent(new CustomEvent("user:profile-updated", { detail: nextUser }));
          return nextUser;
        });
      })
      .catch(() => {
        // The cached profile remains usable if the refresh endpoint is unavailable.
      });

    return () => {
      active = false;
    };
  }, [authUser?.id, storedUser?.id]);

  const user = useMemo(() => {
    const raw = readStoredUser();
    const merged = {
      ...(raw || {}),
      ...(authUser || {}),
      ...(storedUser || {}),
    };
    const accessList =
      Array.isArray(storedUser?.portalAccess) && storedUser.portalAccess.length > 0
        ? storedUser.portalAccess
        : Array.isArray(authUser?.portalAccess) && authUser.portalAccess.length > 0
          ? authUser.portalAccess
          : Array.isArray(raw?.portalAccess) && raw.portalAccess.length > 0
            ? raw.portalAccess
            : [];
    return {
      ...merged,
      portalAccess: accessList,
    };
  }, [authUser, storedUser]);

  if (!user || (!user.id && !user.fullName && !user.email)) return null;

  const rawRole = getCurrentPortalRole(user, pathname);
  const formattedRole = formatRoleName(rawRole);

  const nameParts = (user.fullName || "User").trim().split(/\s+/);
  const initials = (
    nameParts.length > 1
      ? `${nameParts[0]?.[0] || ""}${nameParts[nameParts.length - 1]?.[0] || ""}`
      : `${nameParts[0]?.[0] || ""}${nameParts[0]?.[1] || ""}`
  ).toUpperCase();

  const handlePayrollHub = async (e: React.MouseEvent) => {
    e.preventDefault();
    const rawUserId = user?.id || user?.userId || user?.userID;
    if (!rawUserId) {
      toast.error("User ID not found. Please log in again.");
      return;
    }

    try {
      setLoadingPayroll(true);
      const res = await payslipService.getUnviewedByUserId(rawUserId);

      let targetUrl: string | undefined;

      if (Array.isArray(res?.data) && res.data.length > 0) {
        targetUrl = res.data[0]?.token;
      } else if (res?.data && typeof res.data === "object" && "token" in res.data) {
        targetUrl = (res.data as any).token;
      }

      if (targetUrl && typeof targetUrl === "string" && targetUrl.trim()) {
        const cleanUrl = targetUrl.trim();
        const newTab = window.open(cleanUrl, "_blank", "noopener,noreferrer");
        if (!newTab || newTab.closed || typeof newTab.closed === "undefined") {
          const a = document.createElement("a");
          a.href = cleanUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } else {
        const currentUserName =
          user?.fullName ||
          user?.name ||
          user?.userName ||
          (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "") ||
          "User";
        toast.info(`No payroll record found for ${currentUserName}.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch payslip information.");
    } finally {
      setLoadingPayroll(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 transition-colors hover:bg-accent">
          <Avatar
            className="h-8 w-8 shrink-0 text-xs font-semibold text-white uppercase"
            style={{ backgroundColor: user.avatarColor ?? "#0d7a5f" }}
          >
            <AvatarImage src={getImageUrl(user)} alt={user.fullName || "User profile"} />
            <AvatarFallback className="bg-transparent text-inherit">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block min-w-0 text-left">
            <div className="truncate text-sm font-medium leading-tight">
              {user.fullName || "User"}
            </div>
            <div className="truncate text-[10px] font-semibold leading-tight text-amber-600 dark:text-amber-400">
              {formattedRole}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="text-sm font-medium">{user.fullName}</div>
          <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 pt-0.5">
            {formattedRole}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2.5 py-2">
          <div className="mb-2 flex items-center justify-between px-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Theme
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {theme === "dark" ? "Dark mode" : "Light mode"}
            </span>
          </div>

          {/* Inline Toggle Container matching screenshot */}
          <div className="flex items-center justify-center gap-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 p-2.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            {/* Sun Icon (Left Side) */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTheme("light");
              }}
              title="Switch to Light Theme"
              className={`p-1 rounded-full transition-all duration-200 cursor-pointer focus:outline-none ${
                theme === "light"
                  ? "text-amber-500 scale-110 drop-shadow-[0_1px_4px_rgba(245,158,11,0.4)]"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 opacity-60 hover:opacity-100"
              }`}
            >
              <Sun className="h-5 w-5" />
            </button>

            {/* Pill Toggle Switch (Middle) */}
            <button
              type="button"
              role="switch"
              aria-checked={theme === "dark"}
              aria-label="Toggle dark/light theme"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTheme(theme === "dark" ? "light" : "dark");
              }}
              className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
                theme === "dark"
                  ? "bg-slate-950 border border-slate-700/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  : "bg-slate-200/90 border border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]"
              }`}
            >
              <span
                className={`pointer-events-none block h-6 w-6 rounded-full transform transition-transform duration-300 ease-in-out ${
                  theme === "dark"
                    ? "translate-x-7 bg-slate-600 shadow-[0_2px_5px_rgba(0,0,0,0.5)] border border-slate-500/50"
                    : "translate-x-0 bg-white shadow-[0_2px_5px_rgba(0,0,0,0.25)] border border-slate-100"
                }`}
              />
            </button>

            {/* Moon Icon (Right Side) */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTheme("dark");
              }}
              title="Switch to Dark Theme"
              className={`p-1 rounded-full transition-all duration-200 cursor-pointer focus:outline-none ${
                theme === "dark"
                  ? "text-violet-400 scale-110 drop-shadow-[0_1px_4px_rgba(167,139,250,0.4)]"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 opacity-60 hover:opacity-100"
              }`}
            >
              <MoonStar className="h-5 w-5" />
            </button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={loadingPayroll}
          onClick={handlePayrollHub}
          className="flex w-full cursor-pointer items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            {loadingPayroll ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Receipt className="h-4 w-4" />
            )}
            <span>Payroll Hub</span>
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-70" />
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex w-full cursor-pointer items-center gap-2">
            <SettingsIcon className="h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
