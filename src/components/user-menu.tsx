import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut, Settings as SettingsIcon, Sun, Moon, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

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
  return spaced.trim().split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function UserMenu() {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;

  const localUserData = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  if (!localUserData) return null;
  const user = JSON.parse(localUserData);

  const rawRole = getCurrentPortalRole(user, pathname);
  const formattedRole = formatRoleName(rawRole);

  const nameParts = (user.fullName || "User").trim().split(/\s+/);
  const initials = (nameParts.length > 1
    ? `${nameParts[0]?.[0] || ""}${nameParts[nameParts.length - 1]?.[0] || ""}`
    : `${nameParts[0]?.[0] || ""}${nameParts[0]?.[1] || ""}`
  ).toUpperCase();

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
        <div className="px-2 py-1.5">
          <div className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Appearance</div>
          <div role="radiogroup" className="grid grid-cols-2 gap-1.5">
            <button
              role="radio"
              aria-checked={theme === "light"}
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition ${theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
            >
              <Sun className="h-3.5 w-3.5" /> Light
            </button>
            <button
              role="radio"
              aria-checked={theme === "dark"}
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition ${theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
            >
              <Moon className="h-3.5 w-3.5" /> Dark
            </button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex w-full cursor-pointer items-center gap-2">
            <SettingsIcon className="h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => { logout(); navigate("/login"); }}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
