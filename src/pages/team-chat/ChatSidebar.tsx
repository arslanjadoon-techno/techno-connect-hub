import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  areChatNotificationsEnabled,
  requestChatNotificationPermission,
  setChatNotificationsEnabled,
  showChatNotification,
} from "./chatNotifications";
import { getImageUrl } from "./chatHealper";
import { updateChatSettingsService } from "@/services/Team-chat/chat.service";
import ChatSidebarSettingsDialog from "./sidebar/ChatSidebarSettingsDialog";
import { getCurrentUserName } from "./sidebar/chatSidebarUtils";
import ConversationList from "./sidebar/ConversationList";
import SearchBox from "./sidebar/SearchBox";

type ChatRecord = Record<string, any>;

interface ChatSidebarProps {
  avatarUploading?: boolean;
  currentUser?: ChatRecord;
  blockedUsers?: ChatRecord[];
  filteredItems?: ChatRecord[];
  loadError?: string;
  loading?: boolean;
  currentStatus?: string;
  mentionNotifications?: boolean;
  onMentionNotificationsChange?: (enabled: boolean) => void;
  onAvatarUpload?: (file: File) => void;
  onRefresh?: () => void;
  onSelectBuddy: (item: ChatRecord) => void;
  onSelectChannel: (item: ChatRecord) => void;
  onStatusChange?: (status: string) => void;
  onUnblockUser?: (user: string | Record<string, any>) => void;
  searchTerm?: string;
  selectedChat?: ChatRecord | null;
  statusSaving?: boolean;
  connectUrl?: string;
  setSearchTerm: (value: string) => void;
  settingsPage?: boolean;
  onSettingsClose?: () => void;
  /** Kept for compatibility. The sidebar no longer opens settings itself. */
  onSettingsOpen?: () => void;
  /** The parent owns this value; the sidebar only renders and updates it. */
  desktopNotifications?: boolean;
  onDesktopNotificationsChange?: (enabled: boolean) => void;
}

const EMPTY_LIST: ChatRecord[] = [];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const NOTICE_MS = 3000;

const readPermission = (): string =>
  typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "unsupported";

export default function ChatSidebar({
  avatarUploading = false,
  currentUser,
  filteredItems = EMPTY_LIST,
  loadError,
  loading = false,
  currentStatus = "available",
  mentionNotifications = true,
  onMentionNotificationsChange,
  onAvatarUpload,
  onRefresh,
  onSelectBuddy,
  onSelectChannel,
  onStatusChange,
  onUnblockUser,
  searchTerm = "",
  selectedChat,
  statusSaving = false,
  connectUrl,
  setSearchTerm,
  settingsPage = false,
  blockedUsers = EMPTY_LIST,
  onSettingsClose,
  desktopNotifications,
  onDesktopNotificationsChange,
}: ChatSidebarProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    desktopNotifications ?? areChatNotificationsEnabled(),
  );
  const [notificationPermission, setNotificationPermission] = useState(readPermission);
  const [settingsNotice, setSettingsNotice] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const currentUserName = getCurrentUserName(currentUser);

  // The switch only reads as "on" when the browser actually allows notifications.
  const effectiveEnabled = notificationsEnabled && notificationPermission === "granted";

  // Sync from the parent when it loads the value.
  useEffect(() => {
    if (desktopNotifications === undefined) return;
    setNotificationsEnabled(desktopNotifications);
    setChatNotificationsEnabled(desktopNotifications);
  }, [desktopNotifications]);

  // Auto-clear the notice after a few seconds.
  useEffect(() => {
    if (!settingsNotice) return;
    const timer = setTimeout(() => setSettingsNotice(""), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [settingsNotice]);

  // Pick up permission changes made in the browser's site settings.
  useEffect(() => {
    const refresh = () => setNotificationPermission(readPermission());
    window.addEventListener("focus", refresh);
    let status: PermissionStatus | null = null;
    navigator.permissions
      ?.query({ name: "notifications" as PermissionName })
      .then((result) => {
        status = result;
        result.onchange = refresh;
      })
      .catch(() => undefined);
    return () => {
      window.removeEventListener("focus", refresh);
      if (status) status.onchange = null;
    };
  }, []);

  // Saves the setting and rolls back if the request fails. Returns whether it was saved.
  const persistNotificationSetting = async (enabled: boolean): Promise<boolean> => {
    const previous = notificationsEnabled;
    setChatNotificationsEnabled(enabled);
    setNotificationsEnabled(enabled);
    onDesktopNotificationsChange?.(enabled);
    try {
      await updateChatSettingsService({ desktopNotifications: enabled });
      return true;
    } catch {
      setChatNotificationsEnabled(previous);
      setNotificationsEnabled(previous);
      onDesktopNotificationsChange?.(previous);
      setSettingsNotice("Notification setting could not be saved.");
      return false;
    }
  };

  const handleToggleNotifications = async () => {
    if (effectiveEnabled) {
      if (await persistNotificationSetting(false)) {
        setSettingsNotice("Desktop notifications are off.");
      }
      return;
    }

    let permission: string;
    try {
      permission = await requestChatNotificationPermission();
    } catch {
      setSettingsNotice("Notifications are not available in this browser.");
      return;
    }
    setNotificationPermission(permission);

    if (permission !== "granted") {
      setSettingsNotice("Permission was not granted. You can allow it in your browser's site settings.");
      return;
    }
    if (await persistNotificationSetting(true)) {
      setSettingsNotice("Desktop notifications are on.");
    }
  };

  const handleToggleMentionNotifications = async (enabled: boolean) => {
    try {
      await updateChatSettingsService({ mentionNotifications: enabled });
      try {
        localStorage.setItem("chat_mention_notifications", String(enabled));
      } catch {
        // Storage can be unavailable; the server value is the source of truth.
      }
      onMentionNotificationsChange?.(enabled);
      setSettingsNotice(
        enabled ? "Mention notifications are on." : "Mention notifications are off.",
      );
    } catch {
      setSettingsNotice("Mention notification setting could not be saved.");
    }
  };

  // The test button only shows a sample alert. It never changes the saved setting.
  const handleTestNotification = async () => {
    let permission: string;
    try {
      permission = await requestChatNotificationPermission();
    } catch {
      setSettingsNotice("Notifications are not available in this browser.");
      return;
    }
    setNotificationPermission(permission);

    if (permission !== "granted") {
      setSettingsNotice("Notifications are blocked. Allow them in your browser's site settings.");
      return;
    }
    showChatNotification({
      title: "Team Chat",
      body: "Desktop notifications are ready.",
      icon: getImageUrl(currentUser),
      tag: `pingly-test-${Date.now()}`,
      url: "/chat",
      onClick: () => undefined,
    });
    setSettingsNotice(
      notificationsEnabled
        ? "Test notification sent."
        : "Test sent. Turn on desktop notifications to receive alerts.",
    );
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setSettingsNotice("Choose an image smaller than 5 MB.");
      return;
    }
    onAvatarUpload?.(file);
  };

  return (
    <aside
      className={`grid h-full min-h-0 min-w-0 grid-cols-1 border-r border-border bg-background ${selectedChat ? "hidden md:grid" : "grid"}`}
    >
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        onChange={handleAvatarChange}
      />
      <div className="flex min-h-0 min-w-0 flex-col bg-background">
        <SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <ConversationList
          connectUrl={connectUrl}
          filteredItems={filteredItems}
          loadError={loadError}
          loading={loading}
          onRefresh={onRefresh}
          onSelectBuddy={onSelectBuddy}
          onSelectChannel={onSelectChannel}
          selectedChat={selectedChat}
        />
      </div>
      {settingsPage && (
        <ChatSidebarSettingsDialog
          avatarUploading={avatarUploading}
          currentStatus={currentStatus}
          currentUser={currentUser}
          blockedUsers={blockedUsers}
          currentUserName={currentUserName}
          notificationPermission={notificationPermission}
          notificationsEnabled={effectiveEnabled}
          mentionNotifications={mentionNotifications}
          onAvatarPick={() => avatarInputRef.current?.click()}
          onClose={onSettingsClose || (() => undefined)}
          onStatusPick={onStatusChange || (() => undefined)}
          onUnblockUser={onUnblockUser}
          onTestNotification={handleTestNotification}
          onToggleNotifications={handleToggleNotifications}
          onToggleMentionNotifications={handleToggleMentionNotifications}
          open
          page
          settingsNotice={settingsNotice}
          statusSaving={statusSaving}
        />
      )}
    </aside>
  );
}