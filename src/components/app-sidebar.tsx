import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, TicketCheck, MessagesSquare, MapPin, Store as StoreIcon,
  Building2, Network, Users as UsersIcon, Wrench, LogOut, ShieldCheck,
  Settings as SettingsIcon, ChevronUp, ChevronDown, Home, Sun, Moon,
  Sparkles, Ticket as TicketIcon, BarChart3, DollarSign,
  Briefcase,
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
import { isAdmin } from "@/lib/permissions";
import { roleSubLabel } from "@/lib/role-label";
import { useTheme } from "@/lib/theme";

type Item = { title: string; url: string; icon: any };
type Group = { title: string; icon: any; items: Item[] };

const topItems: Item[] = [
  { title: "AI Chat", url: "/ai-chat", icon: Sparkles },
  { title: "Team Chat", url: "/chat", icon: MessagesSquare },
];

const portalGroups: Group[] = [
  {
    title: "Ticketing Portal",
    icon: TicketIcon,
    items: [
      { title: "Dashboard", url: "/ticketing/dashboard", icon: LayoutDashboard },
      { title: "Tickets", url: "/ticketing/tickets", icon: TicketCheck },
    ],
  },
  {
    title: "Commission Portal",
    icon: DollarSign,
    items: [
      { title: "Dashboard", url: "/commission/dashboard", icon: BarChart3 },
    ],
  },
];

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
    { title: "External Team", url: "/admin/external", icon: Wrench },
  ],
};



function CollapsibleGroup({
  group, collapsed, isActive, defaultOpen,
}: {
  group: Group;
  collapsed: boolean;
  isActive: (p: string) => boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);
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
          onClick={() => setOpen((v) => !v)}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition hover:bg-sidebar-accent ${defaultOpen ? "text-primary" : "text-sidebar-foreground"}`}
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

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const groupActive = (g: Group) => g.items.some((i) => isActive(i.url));

  if (!user) return null;
  const roleLine = roleSubLabel(user);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="relative overflow-hidden border-b border-sidebar-border">
        {/* Decorative bubbles */}
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
                Techno MIS
              </div>
              <div className="truncate text-[11px] text-sidebar-foreground/70">
                Management Information System
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
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

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Portals</SidebarGroupLabel>}
          <SidebarGroupContent>
            {portalGroups.map((g) => (
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

        {isAdmin(user) && (
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

      <SidebarFooter className="border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{
                  backgroundColor: user.avatarColor ?? "#0d7a5f",
                  backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!user.avatarUrl && <>{user.firstName[0]}{user.lastName[0]}</>}
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-sidebar-foreground">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="truncate text-[11px] text-sidebar-foreground/70">
                      {roleLine}
                    </div>
                  </div>
                  <ChevronUp className="h-4 w-4 text-sidebar-foreground/70" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <div className="text-sm font-medium">{user.firstName} {user.lastName}</div>
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
                  <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${theme === "light" ? "border-primary" : "border-muted-foreground"}`}>
                    {theme === "light" && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
                  <Sun className="h-3.5 w-3.5" /> Light
                </button>
                <button
                  role="radio"
                  aria-checked={theme === "dark"}
                  onClick={() => setTheme("dark")}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition ${theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
                >
                  <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${theme === "dark" ? "border-primary" : "border-muted-foreground"}`}>
                    {theme === "dark" && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
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
              onClick={() => { logout(); navigate({ to: "/login" }); }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
