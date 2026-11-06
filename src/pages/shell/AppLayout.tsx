import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, CheckCheck } from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import GlobalChatNotifications from "./GlobalChatNotifications";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/api/client";

export default function AppLayout() {
  const { user } = useAuth();
  const { data, set } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith("/chat");
  const notificationsRef = useRef(data.notifications);
  notificationsRef.current = data.notifications;
  const [serverUnreadCount, setServerUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    let disposed = false;

    const loadNotifications = async () => {
      const token = getToken();
      if (!token || disposed) return;

      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/api/v1/notifications/my?pageNumber=1&pageSize=100`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
      } catch {
        return;
      }
      if (!response.ok || disposed) return;

      let body: any;
      try {
        body = await response.json();
      } catch {
        return;
      }
      if (disposed) return;
      setServerUnreadCount(Number(body?.unreadCount) || 0);
      const items = Array.isArray(body?.items) ? body.items : [];
      const serverNotifications = items.map((item: any) => {
        const type = String(item.type || "").toLowerCase();
        const link = type === "otp_manager"
          ? "/otp/manager"
          : type === "otp_backoffice_pending"
            ? "/otp/backoffice"
            : type === "otp"
              ? "/chat"
              : type.startsWith("otp:")
                ? `/chat/${encodeURIComponent(type.slice("otp:".length))}`
              : type.startsWith("chat_message:") || type.startsWith("chat_reaction:")
                ? `/chat/${encodeURIComponent(type.slice(type.indexOf(":") + 1))}`
              : undefined;

        return {
        id: String(item.id),
        userId: String(item.userId ?? user.id),
        requestId: item.requestId,
        type: item.type,
        title: item.title ?? "Notification",
        body: item.message ?? item.body ?? "",
        link,
        createdAt: item.createdAt ?? new Date().toISOString(),
        read: Boolean(item.isRead ?? item.read),
        };
      });

      // Keep a just-arrived realtime item if the polling request hit a stale
      // read replica. The next successful poll naturally replaces it once the
      // persisted row becomes visible.
      const serverIds = new Set(serverNotifications.map((item: any) => item.id));
      const serverKeys = new Set(
        serverNotifications.map((item: any) => `${item.type || ""}|${item.title}|${item.body}`),
      );
      const realtimeOnly = notificationsRef.current.filter(
        (item) =>
          !serverIds.has(item.id) &&
          !serverKeys.has(`${item.type || ""}|${item.title}|${item.body}`),
      );
      const merged = [...serverNotifications, ...realtimeOnly]
        .sort((left: any, right: any) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .slice(0, 100);
      notificationsRef.current = merged;
      set("notifications", merged);
    };

    void loadNotifications();
    // Realtime notification:new updates the bell immediately. Polling is only
    // a recovery path for notifications received while disconnected, so avoid
    // querying the API every few seconds on every MIS page.
    const interval = window.setInterval(() => void loadNotifications(), 30000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [set, user?.id]);

  useEffect(() => {
    const handleRealtimeNotification = (event: Event) => {
      const item = (event as CustomEvent).detail?.notification || (event as CustomEvent).detail;
      const id = item?.id == null ? "" : String(item.id);
      if (!id || notificationsRef.current.some((notification) => notification.id === id)) return;
      setServerUnreadCount((count) => count + 1);
    };

    window.addEventListener("app:notification", handleRealtimeNotification);
    return () => window.removeEventListener("app:notification", handleRealtimeNotification);
  }, []);

  const myNotifications = useMemo(
    () => data.notifications.filter((n) => !n.userId || String(n.userId) === String(user?.id)),
    [data.notifications, user?.id],
  );

  if (!user) return null;

  const unread = Math.max(serverUnreadCount, myNotifications.filter((n) => !n.read).length);

  const markAllRead = async () => {
    const token = getToken();
    if (!token) return;

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/v1/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      return;
    }
    if (!response.ok) return;

    const updated = notificationsRef.current.map((n) =>
      !n.userId || String(n.userId) === String(user.id) ? { ...n, read: true } : n,
    );
    setServerUnreadCount(0);
    notificationsRef.current = updated;
    set("notifications", updated);
  };

  const openNotification = (id: string, link?: string) => {
    const token = getToken();
    if (token && /^\d+$/.test(id)) {
      void fetch(`${API_BASE_URL}/api/v1/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }

    const updated = notificationsRef.current.map((n) => (n.id === id ? { ...n, read: true } : n));
    if (notificationsRef.current.some((n) => n.id === id && !n.read)) {
      setServerUnreadCount((count) => Math.max(0, count - 1));
    }
    notificationsRef.current = updated;
    set("notifications", updated);
    if (link) navigate(link);
  };

  return (
    <SidebarProvider>
      <GlobalChatNotifications />
      <div className={`flex w-full bg-background ${isChatRoute ? "h-screen overflow-hidden" : "min-h-screen"}`}>
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-card/95 px-3.5 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <SidebarTrigger />
            <div className="ml-2 flex-1" />

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
                    <button
                      onClick={markAllRead}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
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
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
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

            <div className="ml-1">
              <UserMenu />
            </div>
          </header>
          {/* No overflow-x-hidden here on non-chat routes: setting only one axis
              forces the CSS spec to compute the other as "auto", silently turning
              <main> into its own scroll container - which breaks position:sticky
              for anything inside it (sticky binds to the nearest such container,
              and this one never actually scrolls, since the window does). Wide
              content should scope its own overflow-x-auto locally (tables already
              do this) rather than relying on this element. Chat routes still need
              their own overflow-hidden for internal scroll containers. */}
          <main className={`min-h-0 flex-1 p-3 sm:p-4 lg:p-6 ${isChatRoute ? "overflow-hidden" : ""}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
