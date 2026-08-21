




import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, TicketCheck, MessagesSquare, MapPin, Store as StoreIcon,
  Building2, Network, Users as UsersIcon, Wrench, LogOut, ShieldCheck,
  Settings as SettingsIcon, ChevronUp, ChevronDown, Home, Sun, Moon,
  Sparkles, Ticket as TicketIcon, BarChart3, DollarSign,
  Briefcase, CalendarDays, KeyRound, Award, Milestone
} from "lucide-react";

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

type Item = { title: string; url: string; icon: any };
type Group = { title: string; icon: any; items: Item[] };

const topItems: Item[] = [
  { title: "AI Chat", url: "/ai-chat", icon: Sparkles },
  { title: "Team Chat", url: "/chat", icon: MessagesSquare },
];

// 🌟 Tamam Mumkina Portals Ka Master Definition Map
const MASTER_PORTAL_GROUPS: Record<string, Group> = {
  ticketing: {
    title: "Ticketing Portal",
    icon: TicketIcon,
    items: [
      { title: "Dashboard", url: "/ticketing/dashboard", icon: LayoutDashboard },
      { title: "Tickets", url: "/ticketing/tickets", icon: TicketCheck },
      { title: "External Team", url: "/ticketing/external", icon: Wrench },
    ],
  },
  commission: {
    title: "Commission Portal",
    icon: DollarSign,
    items: [
      { title: "Dashboard", url: "/commission/dashboard", icon: BarChart3 },
      { title: "Commission", url: "/commission/my-commission", icon: DollarSign },
    ],
  },
  leasing: {
    title: "Leasing Portal",
    icon: KeyRound,
    items: [
      { title: "Dashboard", url: "/leasing/dashboard", icon: Milestone },
    ],
  },
  lease: {
    title: "Lease Portal",
    icon: KeyRound,
    items: [
      { title: "Dashboard", url: "/lease/dashboard", icon: LayoutDashboard },
    ],
  },
  scheduling: {
    title: "Scheduling Portal",
    icon: CalendarDays,
    items: [
      { title: "Dashboard", url: "/scheduling/dashboard", icon: LayoutDashboard },
    ],
  },
  attendence: {
    title: "Leave Portal",
    icon: CalendarDays,
    items: [
      { title: "Dashboard", url: "/attendance/dashboard", icon: BarChart3 },
    ],
  },
  ranker: {
    title: "Ranker Portal",
    icon: Award,
    items: [
      { title: "Dashboard", url: "/ranker/dashboard", icon: LayoutDashboard },
      { title: "Standings", url: "/ranker/standings", icon: LayoutDashboard },
    ],
  },
};

const ALWAYS_PORTAL_KEYS = ["lease", "scheduling"];


const adminGroup: Group = {
  title: "User Manager",
  icon: UsersIcon,
  items: [
    { title: "Users", url: "/admin/users", icon: UsersIcon },
    { title: "Departments", url: "/admin/departments", icon: Briefcase },
    { title: "States", url: "/admin/states", icon: MapPin },
    { title: "Districts", url: "/admin/districts", icon: Building2 },
    { title: "Markets", url: "/admin/markets", icon: Network },
    { title: "Stores", url: "/admin/stores", icon: StoreIcon },
    { title: "Houses", url: "/admin/houses", icon: Home },
  ],
};

function CollapsibleGroup({
  group, collapsed, isActive, active, open, onToggle,
}: {
  group: Group;
  collapsed: boolean;
  isActive: (p: string) => boolean;
  active: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = group.icon;

  if (collapsed) {
    return (
      <SidebarMenu>
        {group.items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
              <Link to={item.url} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition hover:bg-sidebar-accent ${active ? "text-primary" : "text-sidebar-foreground"}`}
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-left">{group.title}</span>
          {open ? <ChevronUp className="h-4 w-4 opacity-70" /> : <ChevronDown className="h-4 w-4 opacity-70" />}
        </button>
      </SidebarMenuItem>

      {open && (
        <div className="ml-3 mt-0.5 border-l border-sidebar-border/70 pl-2 animate-fade-in">
          {group.items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} size="sm">
                <Link to={item.url} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </div>
      )}
    </SidebarMenu>
  );
}


function getCurrentPortalRole(user: any, pathname: string): string {
  if (!user || !Array.isArray(user.portalAccess)) return "—";

  const currentPortal = pathname.split("/")[1]?.toLowerCase();

  if (currentPortal) {
    const access = user.portalAccess.find(
      (p: any) => p.portalName?.toLowerCase() === currentPortal
    );
    if (access?.roleName) {
      return access.roleName;
    }
  }

  if (user.portalAccess.length > 0) {
    return user.portalAccess[0].roleName;
  }

  return "—";
}

function formatRoleName(roleStr: string): string {
  if (!roleStr) return "—";

  let spaced = roleStr.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
  spaced = spaced.replace(/(?<!\s)(manager)/i, " Manager");

  return spaced
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function AppSidebar() {

  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { logout } = useAuth(); // user ko yahan se hata dein
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  useEffect(() => { setOpenGroup(null); }, [pathname]);

  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const groupActive = (g: Group) => g.items.some((i) => isActive(i.url));
  // Accordion: only one group open at a time. `null` = follow the active route.
  const isGroupOpen = (g: Group) => (openGroup === null ? groupActive(g) : openGroup === g.title);
  const toggleGroup = (g: Group) => setOpenGroup(isGroupOpen(g) ? "" : g.title);


  const localUserData = localStorage.getItem("user");
  if (!localUserData) return null;
  
  const user = JSON.parse(localUserData);

  const rawRole = getCurrentPortalRole(user, pathname);
  const formattedRole = formatRoleName(rawRole);

  const nameParts = (user.fullName || "User").trim().split(/\s+/);
  const initials = nameParts.length > 1 
    ? `${nameParts[0]?.[0] || ""}${nameParts[nameParts.length - 1]?.[0] || ""}`
    : `${nameParts[0]?.[0] || ""}${nameParts[0]?.[1] || ""}`;

  // 3. 🌟 Dynamic Portals Matching Logic
  const allowedPortalsList = Array.isArray(user.assignedPortals) ? user.assignedPortals : [];
  const portalAccessList: Array<{ portalName: string; roleName: string }> =
    Array.isArray(user.portalAccess) ? user.portalAccess : [];

  const getPortalRole = (portalKey: string): string => {
    const access = portalAccessList.find(
      (p) => p.portalName?.toLowerCase() === portalKey.toLowerCase()
    );
    return access?.roleName?.toLowerCase() ?? "";
  };

  const dynamicPortalGroups = allowedPortalsList
    .map((pKey: string): Group | undefined => {
      const key = pKey.toLowerCase().trim();
      const master = MASTER_PORTAL_GROUPS[key];
      if (!master) return undefined;

      // Commission Dashboard sirf admin role waly user ko nazar aaye
      if (key === "commission" && getPortalRole("commission") !== "admin") {
        return {
          ...master,
          items: master.items.filter((i) => i.url !== "/commission/dashboard"),
        };
      }
      return master;
    })
    .filter((g: Group | undefined): g is Group => Boolean(g && g.items.length > 0));

  // Lease & Scheduling portals are always available
  for (const key of ALWAYS_PORTAL_KEYS) {
    const g = MASTER_PORTAL_GROUPS[key];
    if (g && !dynamicPortalGroups.some((x: Group) => x.title === g.title)) dynamicPortalGroups.push(g);
  }


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="relative overflow-hidden border-b border-sidebar-border">
        <div className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-2 px-2 py-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-md"
            style={{ backgroundImage: "var(--gradient-primary, var(--gradient-gold))" }}
          >
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-semibold text-sidebar-foreground">
                MIS
              </div>
              <div className="truncate text-[11px] text-sidebar-foreground/70">
                Management Information System
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Workspace Group */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {topItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Portals Group */}
        {dynamicPortalGroups.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Portals</SidebarGroupLabel>}
            <SidebarGroupContent>
              {dynamicPortalGroups.map((g: Group) => (
                <CollapsibleGroup
                  key={g.title}
                  group={g}
                  collapsed={collapsed}
                  isActive={isActive}
                  defaultOpen={groupActive(g)}
                />
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administration Group */}
        {user.allowedUserManagement === true && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Administration</SidebarGroupLabel>}
            <SidebarGroupContent>
              <CollapsibleGroup
                group={adminGroup}
                collapsed={collapsed}
                isActive={isActive}
                defaultOpen={groupActive(adminGroup)}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
