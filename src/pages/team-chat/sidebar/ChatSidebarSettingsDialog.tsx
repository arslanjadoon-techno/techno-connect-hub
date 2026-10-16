import { useState, type ReactNode } from "react";
import { Bell, Camera, Check, Loader2, X } from "lucide-react";
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
  open: boolean;
  settingsNotice?: string;
  statusSaving?: boolean;
  page?: boolean;
}

const STATUSES = [
  { value: "available", label: "Available", hint: "Teammates can reach you", color: "#22c55e" },
  { value: "busy", label: "Busy", hint: "Replying may take a while", color: "#ef4444" },
  { value: "dnd", label: "Do not disturb", hint: "Notifications are paused", color: "#dc2626" },
  { value: "away", label: "Away", hint: "You're stepped out", color: "#f59e0b" },
  { value: "offline", label: "Offline", hint: "You appear offline", color: "#9aa3af" },
];

// Flip to true to show these rows again (they were commented out in the original).
const SHOW_MENTION_NOTIFICATIONS = false;

function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
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

export default function ChatSidebarSettingsDialog({
  avatarUploading = false,
  currentStatus,
  currentUser,
  currentUserName,
  mentionNotifications = true,
  notificationPermission,
  notificationsEnabled,
  onAvatarPick,
  onClose,
  onStatusPick,
  onTestNotification,
  onToggleNotifications,
  onToggleMentionNotifications,
  open,
  settingsNotice,
  statusSaving = false,
  page = false,
  blockedUsers = [],
  onUnblockUser,
}: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const availability = getAvailability({ presence: currentStatus });
  const imageUrl = getImageUrl(currentUser);
  const permissionDenied = notificationPermission === "denied";

  const profile = (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="View profile"
          className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setProfileOpen(true)}
        >
          <Avatar className="h-16 w-16 bg-primary text-xl font-bold text-primary-foreground">
            <AvatarImage key={imageUrl} src={imageUrl} />
            <AvatarFallback>{getInitial(currentUserName)}</AvatarFallback>
          </Avatar>
        </button>
        <button
          type="button"
          aria-label="Change profile picture"
          title="Change profile picture"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground disabled:opacity-60"
          onClick={onAvatarPick}
          disabled={avatarUploading}
        >
          {avatarUploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Camera className="h-3 w-3" />
          )}
        </button>
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold leading-tight">{currentUserName}</p>
        <p className="truncate text-sm text-muted-foreground">
          {currentUser?.email || "Team Chat user"}
        </p>
        <p className="mt-1.5 inline-flex items-center gap-2 text-sm">
          <Dot color={availability.color} />
          {availability.label}
        </p>
      </div>
    </div>
  );

  const presence = (
    <>
      <div
        role="radiogroup"
        aria-label="Presence"
        className="divide-y overflow-hidden rounded-lg border"
      >
        {STATUSES.map((status) => {
          const selected = status.value === currentStatus;
          return (
            <button
              key={status.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={statusSaving}
              onClick={() => !selected && onStatusPick(status.value)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60 ${
                selected ? "bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <Dot color={status.color} size={12} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{status.label}</span>
                <span className="block text-xs text-muted-foreground">{status.hint}</span>
              </span>
              {selected && <Check className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>
      {statusSaving && (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving your presence…
        </p>
      )}
    </>
  );

  const preferences = (
    <div className="divide-y">
      <PreferenceRow
        title="Desktop notifications"
        description={
          permissionDenied
            ? "Blocked by your browser. Allow notifications in site settings to turn this on."
            : notificationPermission === "granted"
              ? "Show an alert when a new message arrives."
              : "Your browser will ask for permission when you turn this on."
        }
        control={
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={() => onToggleNotifications()}
            disabled={permissionDenied}
            aria-label="Desktop notifications"
          />
        }
      />
      {SHOW_MENTION_NOTIFICATIONS && (
        <PreferenceRow
          title="Mention alerts"
          description="Get priority alerts when someone mentions you, even in muted chats."
          control={
            <Switch
              checked={mentionNotifications}
              onCheckedChange={onToggleMentionNotifications}
              aria-label="Mention alerts"
            />
          }
        />
      )}
    </div>
  );

  const blocked =
    blockedUsers.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        You haven't blocked anyone. Blocked people can't message you.
      </p>
    ) : (
      <ul className="divide-y rounded-lg border">
        {blockedUsers.map((user) => {
          const label = user.name || user.display_name || user.email || user.id;
          return (
            <li key={user.id} className="flex items-center gap-3 px-3 py-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{getInitial(String(label))}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onUnblockUser?.(String(user.id))}
                aria-label={`Unblock ${label}`}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Unblock
              </Button>
            </li>
          );
        })}
      </ul>
    );

  const notice = settingsNotice && (
    <p role="status" className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm text-foreground">
      {settingsNotice}
    </p>
  );

  const profileDialog = (
    <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-28 w-28">
            <AvatarImage key={imageUrl} src={imageUrl} />
            <AvatarFallback className="text-3xl">{getInitial(currentUserName)}</AvatarFallback>
          </Avatar>
          <p className="mt-3 text-lg font-semibold">{currentUserName}</p>
          <p className="text-sm text-muted-foreground">
            {currentUser?.email || "Team Chat user"}
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm">
            <Dot color={availability.color} />
            {availability.label}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (page) {
    return (
      <main className="fixed inset-0 z-10 overflow-y-auto bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-8 sm:pt-12">
          <header className="mb-10">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your profile, availability, and how messages reach you.
            </p>
          </header>

          <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <div className="space-y-10 lg:sticky lg:top-8 lg:self-start">
              {profile}
              <div>
                <h2 className="font-display text-base font-semibold">Presence</h2>
                <p className="mb-4 mt-1 text-sm text-muted-foreground">
                  Choose how teammates see your availability.
                </p>
                {presence}
              </div>
            </div>

            <div className="divide-y">
              <Section title="Notifications" description="Choose how new messages reach you.">
                {preferences}
              </Section>
              <Section title="Blocked users" description="People you've blocked.">
                {blocked}
              </Section>
            </div>
          </div>
          {notice}
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <p className="hidden text-xs text-muted-foreground sm:block">
              Send a sample alert to this device to check your notification settings.
            </p>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={onTestNotification}>
                <Bell className="mr-2 h-4 w-4" />
                Send test notification
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        </div>
        {profileDialog}
      </main>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="divide-y">
            <Section title="Account">{profile}</Section>
            <Section title="Presence" description="Choose how teammates see your availability.">
              {presence}
            </Section>
            <Section title="Notifications" description="Choose how new messages reach you.">
              {preferences}
            </Section>
            <Section title="Blocked users" description="People you've blocked.">
              {blocked}
            </Section>
          </div>
          {notice}
          <DialogFooter>
            <Button variant="outline" onClick={onTestNotification}>
              Send test notification
            </Button>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {profileDialog}
    </>
  );
}