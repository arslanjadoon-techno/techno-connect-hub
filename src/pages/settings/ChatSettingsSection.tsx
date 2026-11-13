import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Check, Loader2, MessageCircle, Shield, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getChatConversationsService,
  getChatSettingsService,
  getChatStatusService,
  getChatUsersService,
  updateChatSettingsService,
  updateChatStatusService,
  unmuteConversationService,
} from "@/services/Team-chat/chat.service";
import {
  areChatNotificationsEnabled,
  requestChatNotificationPermission,
  setChatNotificationsEnabled,
  showChatNotification,
} from "../team-chat/chatNotifications";
import {
  getBuddyName,
  getBuddySendId,
  getImageUrl,
  normalizePresence,
} from "../team-chat/chatHealper";

type ChatRecord = Record<string, any>;

const STATUS_OPTIONS = [
  { value: "online", label: "Available", hint: "Teammates can reach you", color: "#22c55e" },
  { value: "busy", label: "Busy", hint: "Replying may take a while", color: "#ef4444" },
  { value: "dnd", label: "Do not disturb", hint: "Notifications are paused", color: "#dc2626" },
  { value: "away", label: "Away", hint: "You're stepped out", color: "#f59e0b" },
  { value: "offline", label: "Offline", hint: "You appear offline", color: "#9aa3af" },
];

function readPermission(): string {
  return typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "unsupported";
}

function unwrapResponse(response: any): any {
  let value = response;
  for (let index = 0; index < 3; index += 1) {
    if (!value || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, "data")) {
      break;
    }
    value = value.data;
  }
  return value ?? {};
}

function getArrayPayload(response: any): ChatRecord[] {
  const value = unwrapResponse(response);
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["data", "users", "contacts", "conversations", "channels", "groups", "chats", "list"]) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}

function getConversationId(conversation: ChatRecord): string {
  return String(
    conversation?.id ??
      conversation?.chatId ??
      conversation?.chat_id ??
      conversation?.conversationId ??
      conversation?.conversation_id ??
      "",
  ).trim();
}

function getDisplayName(record: ChatRecord): string {
  const label = [
    record?.title,
    record?.name,
    record?.displayName,
    record?.display_name,
    getBuddyName(record),
  ].find((value) => value && !/^(chat\s*user|chatuser)$/i.test(String(value).trim()));
  const id = String(getBuddySendId(record) || record?.id || "").trim();

  if (label && !/^(chat\s*user|chatuser)$/i.test(String(label).trim())) {
    return String(label).trim();
  }
  return id ? `User ${id}` : "Unknown user";
}

function getStoredPresence(): string {
  try {
    return normalizePresence(window.localStorage.getItem("chat_presence"));
  } catch {
    return "online";
  }
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PreferenceRow({
  title,
  description,
  control,
}: {
  title: string;
  description: ReactNode;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {control}
    </div>
  );
}

export default function ChatSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [presence, setPresence] = useState(getStoredPresence);
  const [notificationsEnabled, setNotificationsEnabled] = useState(areChatNotificationsEnabled);
  const [mentionNotifications, setMentionNotifications] = useState(() => {
    try {
      return window.localStorage.getItem("chat_mention_notifications") !== "false";
    } catch {
      return true;
    }
  });
  const [notificationPermission, setNotificationPermission] = useState(readPermission);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [mutedChatIds, setMutedChatIds] = useState<string[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatRecord[]>([]);
  const [conversations, setConversations] = useState<ChatRecord[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [settingsResponse, usersResponse, conversationsResponse, statusResponse] =
          await Promise.all([
            getChatSettingsService(),
            // Load the full chat directory so blocked users are not reduced to
            // an ID when they fall outside the default first page.
            getChatUsersService({ excludeSelf: true, limit: 1000 }),
            getChatConversationsService(),
            getChatStatusService().catch(() => null),
          ]);

        if (!active) return;

        const settings = unwrapResponse(settingsResponse) as ChatRecord;
        const nextBlockedUserIds = Array.isArray(settings?.blockedUserIds)
          ? settings.blockedUserIds.map(String)
          : [];
        setBlockedUserIds(
          nextBlockedUserIds,
        );
        setMutedChatIds(
          Array.isArray(settings?.mutedChatIds) ? settings.mutedChatIds.map(String) : [],
        );
        const directoryUsers = getArrayPayload(usersResponse);
        const foundUserIds = new Set(
          directoryUsers.map((user) => String(getBuddySendId(user) || "")).filter(Boolean),
        );
        const missingBlockedUserIds = nextBlockedUserIds.filter((id) => !foundUserIds.has(id));
        const missingUserResponses = await Promise.all(
          missingBlockedUserIds.map((id) =>
            getChatUsersService({ excludeSelf: true, search: id, limit: 10 }).catch(() => null),
          ),
        );
        if (!active) return;
        const resolvedBlockedUsers = missingUserResponses.flatMap((response) =>
          response ? getArrayPayload(response) : [],
        );
        const usersById = new Map<string, ChatRecord>();
        [...directoryUsers, ...resolvedBlockedUsers].forEach((user) => {
          const id = String(getBuddySendId(user) || "").trim();
          if (id) usersById.set(id, { ...(usersById.get(id) || {}), ...user });
        });
        setChatUsers(Array.from(usersById.values()));
        setConversations(getArrayPayload(conversationsResponse));

        if (typeof settings?.desktopNotifications === "boolean") {
          setNotificationsEnabled(settings.desktopNotifications);
          setChatNotificationsEnabled(settings.desktopNotifications);
        }

        const status = unwrapResponse(statusResponse) as ChatRecord;
        const statusUser = status?.user || status;
        const serverPresence = normalizePresence(statusUser?.presence || statusUser?.status);
        const savedPresence = getStoredPresence();
        // Presence is reset to Available by the authenticated session. The
        // local value is authoritative while that session is active; the API
        // is updated below when the values differ.
        const restoredPresence = savedPresence || serverPresence || "online";
        setPresence(restoredPresence);

        if (savedPresence && savedPresence !== serverPresence) {
          updateChatStatusService(savedPresence).catch(() => undefined);
        }
      } catch (error: any) {
        if (active) setLoadError(error?.message || "Chat settings could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const refreshPermission = () => setNotificationPermission(readPermission());
    window.addEventListener("focus", refreshPermission);
    return () => window.removeEventListener("focus", refreshPermission);
  }, []);

  const blockedUsers = useMemo(
    () =>
      blockedUserIds.map((id) => {
        const match = chatUsers.find((user) => String(getBuddySendId(user)) === String(id));
        return match || { id };
      }),
    [blockedUserIds, chatUsers],
  );

  const mutedConversations = useMemo(
    () =>
      mutedChatIds.map((id) => {
        const match = conversations.find((conversation) => getConversationId(conversation) === id);
        return { id, label: match ? getDisplayName(match) : id };
      }),
    [conversations, mutedChatIds],
  );

  const persistDesktopNotifications = async (enabled: boolean) => {
    const previous = notificationsEnabled;
    setSaving("notifications");
    setNotificationsEnabled(enabled);
    setChatNotificationsEnabled(enabled);
    try {
      await updateChatSettingsService({ desktopNotifications: enabled });
      toast.success(enabled ? "Desktop notifications are on." : "Desktop notifications are off.");
    } catch (error: any) {
      setNotificationsEnabled(previous);
      setChatNotificationsEnabled(previous);
      toast.error(error?.message || "Notification setting could not be saved.");
    } finally {
      setSaving(null);
    }
  };

  const handleToggleNotifications = async () => {
    const enabledInBrowser = notificationsEnabled && notificationPermission === "granted";
    if (enabledInBrowser) {
      await persistDesktopNotifications(false);
      return;
    }

    let permission: string;
    try {
      permission = await requestChatNotificationPermission();
    } catch {
      toast.error("Notifications are not available in this browser.");
      return;
    }
    setNotificationPermission(permission);
    if (permission !== "granted") {
      toast.error("Permission was not granted. Allow notifications in your browser settings.");
      return;
    }
    await persistDesktopNotifications(true);
  };

  const handleToggleMentionNotifications = (enabled: boolean) => {
    setMentionNotifications(enabled);
    try {
      window.localStorage.setItem("chat_mention_notifications", String(enabled));
    } catch {
      // The in-memory setting remains usable if browser storage is unavailable.
    }
    toast.success(enabled ? "Mention alerts are on." : "Mention alerts are off.");
  };

  const handleStatusChange = async (nextPresence: string) => {
    const previous = presence;
    setSaving("presence");
    setPresence(nextPresence);
    try {
      await updateChatStatusService(nextPresence);
      window.localStorage.setItem("chat_presence", nextPresence);
      toast.success("Presence updated.");
    } catch (error: any) {
      setPresence(previous);
      toast.error(error?.message || "Presence could not be saved.");
    } finally {
      setSaving(null);
    }
  };

  const handleBlockedUser = async (userId: string) => {
    const next = blockedUserIds.filter((id) => id !== userId);
    const previous = blockedUserIds;
    setSaving(`blocked:${userId}`);
    setBlockedUserIds(next);
    try {
      await updateChatSettingsService({ blockedUserIds: next });
      toast.success("User unblocked.");
    } catch (error: any) {
      setBlockedUserIds(previous);
      toast.error(error?.message || "Blocked-user setting could not be saved.");
    } finally {
      setSaving(null);
    }
  };

  const handleUnmute = async (chatId: string) => {
    setSaving(`muted:${chatId}`);
    try {
      await unmuteConversationService(chatId);
      setMutedChatIds((previous) => previous.filter((id) => id !== chatId));
      toast.success("Conversation unmuted.");
    } catch (error: any) {
      toast.error(error?.message || "Mute setting could not be saved.");
    } finally {
      setSaving(null);
    }
  };

  const handleTestNotification = async () => {
    let permission: string;
    try {
      permission = await requestChatNotificationPermission();
    } catch {
      toast.error("Notifications are not available in this browser.");
      return;
    }
    setNotificationPermission(permission);
    if (permission !== "granted") {
      toast.error("Notifications are blocked. Allow them in your browser settings.");
      return;
    }
    showChatNotification({
      title: "Team Chat",
      body: "Desktop notifications are ready.",
      tag: `chat-settings-test-${Date.now()}`,
      url: "/chat",
      onClick: () => undefined,
    });
    toast.success("Test notification sent.");
  };

  const notificationBlocked = notificationPermission === "denied";

  return (
    <Card className="p-6 hover-lift">
      <div className="mb-6 flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          <MessageCircle className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Chat</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage your availability, notifications, and privacy preferences.
          </p>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <div className="space-y-6">
        <Section
          title="Presence"
          description="Choose how teammates see your availability."
          icon={<span className="h-2.5 w-2.5 rounded-full bg-white" />}
        >
          <div role="radiogroup" aria-label="Chat presence" className="divide-y overflow-hidden rounded-lg border">
            {STATUS_OPTIONS.map((status) => {
              const selected = status.value === presence;
              return (
                <button
                  key={status.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={loading || saving === "presence"}
                  onClick={() => !selected && handleStatusChange(status.value)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60 ${selected ? "bg-primary/5" : "hover:bg-muted/50"}`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{status.label}</span>
                    <span className="block text-xs text-muted-foreground">{status.hint}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          title="Notifications"
          description="Choose how new messages and mentions reach you."
          icon={<Bell className="h-4 w-4" />}
        >
          <div className="divide-y">
            <PreferenceRow
              title="Desktop notifications"
              description={
                notificationBlocked
                  ? "Blocked by your browser. Allow notifications in site settings to turn this on."
                  : "Show an alert when a new message arrives."
              }
              control={
                <Switch
                  checked={notificationsEnabled && notificationPermission === "granted"}
                  onCheckedChange={handleToggleNotifications}
                  disabled={loading || notificationBlocked || saving === "notifications"}
                  aria-label="Desktop notifications"
                />
              }
            />
            <PreferenceRow
              title="Mention alerts"
              description="Get priority alerts when someone mentions you, including in muted chats."
              control={
                <Switch
                  checked={mentionNotifications}
                  onCheckedChange={handleToggleMentionNotifications}
                  disabled={loading}
                  aria-label="Mention alerts"
                />
              }
            />
          </div>
          <Button type="button" variant="outline" className="mt-4" onClick={handleTestNotification}>
            Send test notification
          </Button>
        </Section>

        <Section
          title="Privacy"
          description="Control people and conversations that should not interrupt you."
          icon={<Shield className="h-4 w-4" />}
        >
          <div>
            <Label className="text-sm font-medium">Blocked users</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Blocked people cannot send messages to you.
            </p>
            {loading ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading blocked users…
              </p>
            ) : blockedUsers.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">You haven't blocked anyone.</p>
            ) : (
              <ul className="mt-3 divide-y rounded-lg border">
                {blockedUsers.map((user) => {
                  const id = String(getBuddySendId(user) || user.id);
                  const label = getDisplayName(user) || id;
                  return (
                    <li key={id} className="flex items-center gap-3 px-3 py-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getImageUrl(user)} />
                        <AvatarFallback className="text-xs">{label.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleBlockedUser(id)}
                        disabled={saving === `blocked:${id}`}
                      >
                        Unblock
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-6 border-t pt-5">
            <div className="flex items-start gap-3">
              <VolumeX className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-medium">Muted conversations</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Muted conversations stay muted until you choose to unmute them.
                </p>
                {loading ? (
                  <p className="mt-3 text-sm text-muted-foreground">Loading muted conversations…</p>
                ) : mutedConversations.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No muted conversations.</p>
                ) : (
                  <ul className="mt-3 divide-y rounded-lg border">
                    {mutedConversations.map((conversation) => (
                      <li key={conversation.id} className="flex items-center gap-3 px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{conversation.label}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnmute(conversation.id)}
                          disabled={saving === `muted:${conversation.id}`}
                        >
                          Unmute
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Messaging behavior"
          description="These indicators continue using the existing chat behavior."
          icon={<MessageCircle className="h-4 w-4" />}
        >
          <div className="divide-y rounded-lg border px-4">
            <PreferenceRow
              title="Read receipts"
              description="Read and delivery receipts remain enabled for conversations."
              control={<span className="text-xs font-medium text-muted-foreground">Enabled</span>}
            />
            <PreferenceRow
              title="Typing indicators"
              description="Show when another participant is typing in a conversation."
              control={<span className="text-xs font-medium text-muted-foreground">Enabled</span>}
            />
          </div>
        </Section>
      </div>
    </Card>
  );
}
