import { useState, type ReactNode } from "react";
import {
  Bell,
  Camera,
  Circle,
  MessageSquareText,
  Settings,
  UserRound,
  ShieldBan,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { getAvailability, getImageUrl } from "../chatHealper";
import { getInitial } from "./chatSidebarUtils";

type UserRecord = Record<string, any>;
interface Props {
  avatarUploading?: boolean;
  currentStatus: string;
  currentUser?: UserRecord;
  currentUserName: string;
  blockedUsers?: UserRecord[];
  enterToSend?: boolean;
  mentionNotifications?: boolean;
  notificationPermission: string;
  notificationsEnabled: boolean;
  onAvatarPick?: () => void;
  onUnblockUser?: (user: UserRecord | string) => void;
  onClose: () => void;
  onStatusPick: (status: string) => void;
  onTestNotification: () => void;
  onToggleNotifications: () => void;
  onToggleMentionNotifications: (enabled: boolean) => void;
  onEnterToSendChange?: (value: boolean) => void;
  open: boolean;
  settingsNotice?: string;
  statusSaving?: boolean;
  page?: boolean;
}

export default function ChatSidebarSettingsDialog({
  avatarUploading = false,
  currentStatus,
  currentUser,
  currentUserName,
  enterToSend = false,
  mentionNotifications = true,
  notificationPermission,
  notificationsEnabled,
  onAvatarPick,
  onClose,
  onStatusPick,
  onTestNotification,
  onToggleNotifications,
  onToggleMentionNotifications,
  onEnterToSendChange,
  open,
  settingsNotice,
  statusSaving = false,
  page = false,
  blockedUsers = [],
  onUnblockUser,
}: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const availability = getAvailability({ presence: currentStatus });
  const statuses = [
    { value: "available", label: "Available", color: "#22c55e" },
    { value: "busy", label: "Busy", color: "#ef4444" },
    { value: "dnd", label: "Do Not Disturb", color: "#dc2626" },
    { value: "away", label: "Away", color: "#f59e0b" },
    { value: "offline", label: "Offline", color: "#9aa3af" },
  ];
  const cardSurface = "rounded-xl border bg-card p-5 text-card-foreground shadow-sm";
  const sectionHeading = (icon: ReactNode, title: string, description: string) => (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
  const content = (
    <div className={`w-full ${page ? "grid gap-4 lg:grid-cols-2" : "max-w-xl space-y-4"}`}>
      <div className="space-y-4">
        <section className={cardSurface}>
          {sectionHeading(
            <UserRound className="h-4 w-4" />,
            "Your account",
            "Your Team Chat profile",
          )}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="View profile"
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => setProfileOpen(true)}
              >
                <Avatar className="h-14 w-14 bg-primary text-xl font-bold text-primary-foreground">
                  <AvatarImage key={getImageUrl(currentUser)} src={getImageUrl(currentUser)} />
                  <AvatarFallback>{getInitial(currentUserName)}</AvatarFallback>
                </Avatar>
              </button>
              <button
                type="button"
                aria-label="Change profile picture"
                title="Change profile picture"
                className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow-sm disabled:opacity-60"
                onClick={onAvatarPick}
                disabled={avatarUploading}
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{currentUserName}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {currentUser?.email || "Team Chat user"}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium capitalize text-muted-foreground">
                <Circle
                  className="h-2.5 w-2.5"
                  style={{ color: availability.color, fill: availability.color }}
                />
                {availability.label}
              </p>
            </div>
          </div>
        </section>
        <section className={cardSurface}>
          {sectionHeading(
            <Circle className="h-4 w-4" />,
            "Presence",
            "Choose how teammates see your availability.",
          )}
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((status) => (
              <Button
                key={status.value}
                variant={status.value === currentStatus ? "default" : "outline"}
                disabled={statusSaving}
                onClick={() => onStatusPick(status.value)}
                className={`justify-start ${status.value === currentStatus ? "shadow-sm shadow-primary/20" : ""}`}
              >
                <Circle className="h-3 w-3" style={{ color: status.color, fill: status.color }} />
                {status.label}
              </Button>
            ))}
          </div>
          {statusSaving && (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              Saving your presence…
            </p>
          )}
        </section>
      </div>
      <section className={cardSurface}>
        {sectionHeading(
          <MessageSquareText className="h-4 w-4" />,
          "Messaging preferences",
          "Choose how new messages reach you.",
        )}
        <div className="divide-y">
          <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
            <div className="flex min-w-0 items-start gap-3">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Desktop notifications</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Browser permission: {notificationPermission}
                </p>
              </div>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={onToggleNotifications}
              disabled={notificationPermission === "denied"}
              aria-label="Desktop notifications"
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Mention notifications</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Get priority alerts when someone mentions you, including in muted chats.
                </p>
              </div>
            </div>
            <Switch
              checked={mentionNotifications}
              onCheckedChange={onToggleMentionNotifications}
              aria-label="Mention notifications"
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
            <div className="flex min-w-0 items-start gap-3">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Enter to send</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Press Enter to send instead of Ctrl+Enter.
                </p>
              </div>
            </div>
            <Switch
              checked={enterToSend}
              onCheckedChange={onEnterToSendChange}
              aria-label="Enter to send messages"
            />
          </div>
        </div>
      </section>
      <section className={cardSurface}>
        {sectionHeading(
          <ShieldBan className="h-4 w-4" />,
          "Blocked users",
          "Manage people you have blocked.",
        )}
        {blockedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocked users.</p>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((user) => {
              const label = user.name || user.display_name || user.email || user.id;
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-2"
                >
                  <span className="truncate text-sm font-medium">{label}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUnblockUser?.(String(user.id))}
                  >
                    Unblock
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {settingsNotice && (
        <p
          role="status"
          className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground"
        >
          {settingsNotice}
        </p>
      )}
    </div>
  );
  if (page)
    return (
      <main className="fixed inset-0 z-10 overflow-y-auto bg-background p-4 text-foreground sm:p-8">
        <div className="mx-auto max-w-4xl animate-fade-in">
          <header className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Settings className="h-3.5 w-3.5" />
              Team Chat
            </div>
            <h1 className="font-display text-2xl font-semibold">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your profile, availability, and messaging preferences.
            </p>
          </header>
          {content}
          <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 py-4 backdrop-blur">
            <p className="text-xs text-muted-foreground">
              Notification test sends a sample alert to this device.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onTestNotification}>
                Test notification
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        </div>
      </main>
    );
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>
          <Button variant="outline" onClick={onTestNotification}>
            Test
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
          </DialogHeader>
          <div className="text-center">
            <Avatar className="mx-auto h-24 w-24">
              <AvatarImage key={getImageUrl(currentUser)} src={getImageUrl(currentUser)} />
              <AvatarFallback>{getInitial(currentUserName)}</AvatarFallback>
            </Avatar>
            <p className="mt-2 font-bold">{currentUserName}</p>
            <p className="text-sm text-muted-foreground">
              {currentUser?.email || "Team Chat user"}
            </p>
            <p className="mt-2 text-sm" style={{ color: availability.color }}>
              {availability.label}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
