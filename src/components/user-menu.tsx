import { useState } from "react";
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
import { toast } from "sonner";

function getCurrentPortalRole(user: any, pathname: string): string {
  if (!user || !Array.isArray(user.portalAccess)) return "—";
  const currentPortal = pathname.split("/")[1]?.toLowerCase();
  if (currentPortal) {
    const access = user.portalAccess.find(
      (p: any) => p.portalName?.toLowerCase() === currentPortal,
    );
    if (access?.roleName) return access.roleName;
  }
  if (user.portalAccess.length > 0) return user.portalAccess[0].roleName;
  return "—";
}

function formatRoleName(roleStr: string): string {
  if (!roleStr) return "—";
  let spaced = roleStr.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
  spaced = spaced.replace(/(?<!\s)(manager)/i, " Manager");
  return spaced
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function UserMenu() {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const [loadingPayroll, setLoadingPayroll] = useState(false);

  const localUserData = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  if (!localUserData) return null;
  const user = JSON.parse(localUserData);

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
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white uppercase"
            style={{ backgroundColor: user.avatarColor ?? "#0d7a5f" }}
          >
            {initials}
          </div>
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
