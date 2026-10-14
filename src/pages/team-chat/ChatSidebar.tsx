import { useEffect, useRef, useState } from "react";
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
  enterToSend?: boolean;
  mentionNotifications?: boolean;
  onMentionNotificationsChange?: (enabled: boolean) => void;
  onEnterToSendChange?: (value: boolean) => void;
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
  onSettingsOpen?: () => void;
  // NEW — parent owns this, sidebar just renders it
  desktopNotifications?: boolean;
  onDesktopNotificationsChange?: (enabled: boolean) => void;
}

export default function ChatSidebar({
  avatarUploading = false,
  currentUser,
  filteredItems = [],
  loadError,
  loading = false,
  currentStatus = "available",
  enterToSend = false,
  mentionNotifications = true,
  onMentionNotificationsChange,
  onEnterToSendChange,
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
  blockedUsers = [],
  onSettingsClose,
  onSettingsOpen,
  desktopNotifications,
  onDesktopNotificationsChange,
}: ChatSidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    desktopNotifications ?? areChatNotificationsEnabled(),
  );
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const [settingsNotice, setSettingsNotice] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const currentUserName = getCurrentUserName(currentUser);
  const currentUserId = String(
    currentUser?.id || currentUser?.userId || currentUser?.user_id || "",
  );

  // Sync from the parent when it loads the value.
  useEffect(() => {
    if (desktopNotifications === undefined) return;
    setNotificationsEnabled(desktopNotifications);
    setChatNotificationsEnabled(desktopNotifications);
  }, [desktopNotifications]);

  // Auto-clear the notice after a few seconds.
  useEffect(() => {
    if (!settingsNotice) return;
    const timer = setTimeout(() => setSettingsNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [settingsNotice]);

  const persistNotificationSetting = async (enabled: boolean) => {
    const previous = notificationsEnabled;
    setChatNotificationsEnabled(enabled);
    setNotificationsEnabled(enabled);
    onDesktopNotificationsChange?.(enabled);
    try {
      await updateChatSettingsService({ desktopNotifications: enabled });
    } catch {
      setChatNotificationsEnabled(previous);
      setNotificationsEnabled(previous);
      onDesktopNotificationsChange?.(previous);
      setSettingsNotice("Notification setting could not be saved.");
    }
  };

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      await persistNotificationSetting(false);
      setSettingsNotice("Desktop notifications are off.");
      return;
    }
    const permission = await requestChatNotificationPermission();
    setNotificationPermission(permission);
    await persistNotificationSetting(permission === "granted");
    setSettingsNotice(
      permission === "granted"
        ? "Desktop notifications are on."
        : "Notification permission was not granted.",
    );
  };

  const handleToggleMentionNotifications = async (enabled: boolean) => {
    try {
      await updateChatSettingsService({ mentionNotifications: enabled });
      localStorage.setItem("chat_mention_notifications", String(enabled));
      onMentionNotificationsChange?.(enabled);
      setSettingsNotice(
        enabled ? "Mention notifications are on." : "Mention notifications are off.",
      );
    } catch {
      setSettingsNotice("Mention notification setting could not be saved.");
    }
  };

  const handleTestNotification = async () => {
    const permission = await requestChatNotificationPermission();
    setNotificationPermission(permission);
    await persistNotificationSetting(permission === "granted");
    if (permission === "granted") {
      showChatNotification({
        title: "Team Chat",
        body: "Desktop notifications are ready.",
        icon: getImageUrl(currentUser),
        tag: `pingly-test-${Date.now()}`,
        url: "/chat",
        onClick: () => undefined,
      });
      setSettingsNotice("Test notification sent.");
    } else {
      setSettingsNotice("Notifications are not available in this browser.");
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onAvatarUpload?.(file);
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
      <ChatSidebarSettingsDialog
        avatarUploading={avatarUploading}
        currentStatus={currentStatus}
        currentUser={currentUser}
        blockedUsers={blockedUsers}
        currentUserName={currentUserName}
        notificationPermission={notificationPermission}
        enterToSend={enterToSend}
        notificationsEnabled={notificationsEnabled}
        mentionNotifications={mentionNotifications}
        onAvatarPick={() => avatarInputRef.current?.click()}
        onClose={settingsPage ? onSettingsClose || (() => undefined) : () => setSettingsOpen(false)}
        onStatusPick={onStatusChange || (() => undefined)}
        onUnblockUser={onUnblockUser}
        onTestNotification={handleTestNotification}
        onToggleNotifications={handleToggleNotifications}
        onToggleMentionNotifications={handleToggleMentionNotifications}
        onEnterToSendChange={onEnterToSendChange}
        open={settingsOpen || settingsPage}
        page={settingsPage}
        settingsNotice={settingsNotice}
        statusSaving={statusSaving}
      />
    </aside>
  );
}
