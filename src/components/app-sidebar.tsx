import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, TicketCheck, MessagesSquare, MapPin, Store as StoreIcon,
  Building2, Network, Users as UsersIcon, Wrench, LogOut, ShieldCheck,
  Settings as SettingsIcon, ChevronUp,
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
import { ALL_ROLES } from "@/lib/types";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Tickets", url: "/tickets", icon: TicketCheck },
  { title: "Team Chat", url: "/chat", icon: MessagesSquare },
];

const adminItems = [
  { title: "States",        url: "/admin/states",    icon: MapPin },
  { title: "Markets",       url: "/admin/markets",   icon: Network },
  { title: "Districts",     url: "/admin/districts", icon: Building2 },
  { title: "Stores",        url: "/admin/stores",    icon: StoreIcon },
  { title: "Users",         url: "/admin/users",     icon: UsersIcon },
  { title: "External Team", url: "/admin/external",  icon: Wrench },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  if (!user) return null;
  const roleLabel = ALL_ROLES.find((r) => r.value === user.role)?.label ?? user.role;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundImage: "var(--gradient-gold)" }}
          >
            <ShieldCheck className="h-5 w-5 text-[oklch(0.25_0.05_80)]" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-semibold text-sidebar-foreground">
                Techno Communications
              </div>
              <div className="truncate text-[11px] text-sidebar-foreground/70">
                Ticket Portal
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
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

        {isAdmin(user) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
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
                      {roleLabel} • {user.department}
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
