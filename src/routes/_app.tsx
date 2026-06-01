import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Moon, Sun, LogOut, Settings as SettingsIcon, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, logout } = useAuth();
  const { data, set } = useData();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  if (!user) return null;

  const myNotifications = useMemo(
    () => data.notifications.filter((n) => !n.userId || n.userId === user.id),
    [data.notifications, user.id],
  );
  const unread = myNotifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    set(
      "notifications",
      data.notifications.map((n) =>
        !n.userId || n.userId === user.id ? { ...n, read: true } : n,
      ),
    );
  };

  const openNotification = (id: string, link?: string) => {
    set(
      "notifications",
      data.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    if (link) navigate({ to: link });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="ml-2 flex-1" />

            <Button
              variant="ghost" size="icon"
              onClick={toggle}
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" title="Notifications">
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <div className="font-display text-sm font-semibold">Notifications</div>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {myNotifications.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    myNotifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => openNotification(n.id, n.link)}
                        className={`flex w-full items-start gap-2 border-b px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                          n.read ? "opacity-70" : ""
                        }`}
                      >
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        <div className={n.read ? "ml-4 flex-1" : "flex-1"}>
                          <div className="font-medium">{n.title}</div>
                          <div className="text-xs text-muted-foreground">{n.body}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-full p-1 hover:bg-accent">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{
                      backgroundColor: user.avatarColor ?? "#0d7a5f",
                      backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {!user.avatarUrl && <>{user.firstName[0]}{user.lastName[0]}</>}
                  </div>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.firstName} {user.lastName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-0.5">
                  <div className="text-sm font-medium">{user.firstName} {user.lastName}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex w-full items-center gap-2 cursor-pointer">
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
          </header>
          <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
