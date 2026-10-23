import { memo } from "react";
import { Check, CheckCheck, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getAvailability,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
  getUnreadCount,
} from "../chatHealper";
import {
  getDeliveryState,
  getInitial,
  getLastMessagePreview,
  isDirectConversation,
} from "./chatSidebarUtils";

type Conversation = Record<string, any>;

// Created once. Building an Intl formatter is slow when done for every row on every render.
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const shortDateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const longDateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatConversationTime(item: Conversation) {
  const value =
    item?.lastMessage?.createdAt ||
    item?.lastMessage?.created_at ||
    item?.last_message?.createdAt ||
    item?.last_message?.created_at ||
    item?.lastMessageAt ||
    item?.last_message_at ||
    item?.lastMessageTime ||
    item?.last_message_time;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return timeFormat.format(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return (date.getFullYear() !== now.getFullYear() ? longDateFormat : shortDateFormat).format(date);
}

interface Props {
  item: Conversation;
  isChannel: boolean;
  selectedChat?: Conversation | null;
  onSelectBuddy: (item: Conversation) => void;
  onSelectChannel: (item: Conversation) => void;
}

function PresenceAvatar({
  item,
  title,
  isChannel,
}: Pick<Props, "item" | "isChannel"> & { title: string }) {
  const availability = getAvailability(item);
  const isDirect = isDirectConversation(item, isChannel);
  const imageUrl =
    getImageUrl(item) ||
    getImageUrl(item?.user) ||
    getImageUrl(item?.profile) ||
    getImageUrl(item?.participant) ||
    getImageUrl(item?.raw);

  if (!isDirect) {
    return (
      <Avatar className="h-12 w-12 shrink-0 bg-primary/10 text-primary">
        <AvatarImage src={imageUrl} />
        <AvatarFallback>
          <UsersRound className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <span className="relative shrink-0" title={availability.label}>
      <Avatar className="h-12 w-12 bg-primary/10 text-primary">
        <AvatarImage src={imageUrl} />
        <AvatarFallback>{getInitial(title)}</AvatarFallback>
      </Avatar>
      <span
        role="img"
        aria-label={availability.label}
        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background"
        style={{ backgroundColor: availability.color }}
      />
    </span>
  );
}

function ConversationListItem({
  item,
  isChannel,
  selectedChat,
  onSelectBuddy,
  onSelectChannel,
}: Props) {
  const title = String(isChannel ? getChannelName(item) : getBuddyName(item)) || "Conversation";
  const itemId = isChannel ? getChannelId(item) : getBuddySendId(item);
  const selected = Boolean(itemId) && String(selectedChat?.id || "") === String(itemId);
  const disabled = !itemId;
  const unreadCount = getUnreadCount(item);
  const hasUnread = unreadCount > 0;
  const deliveryState = getDeliveryState(item);
  const preview = getLastMessagePreview(item, isChannel);
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={selected ? "true" : undefined}
      onClick={() => {
        if (disabled) return;
        if (isChannel) onSelectChannel(item);
        else onSelectBuddy(item);
      }}
      className={`flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? "bg-accent" : "hover:bg-accent/60"
      }`}
    >
      <PresenceAvatar item={item} title={title} isChannel={isChannel} />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-[15px]" title={title}>
            {title}
          </span>
          <span
            className={`shrink-0 text-xs ${hasUnread ? "text-primary" : "text-muted-foreground"}`}
          >
            {formatConversationTime(item)}
          </span>
        </span>

        <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
          {deliveryState === "read" ? (
            <CheckCheck aria-label="Read" className="h-4 w-4 shrink-0 text-primary" />
          ) : deliveryState === "delivered" ? (
            <CheckCheck aria-label="Delivered" className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : deliveryState === "sent" ? (
            <Check aria-label="Sent" className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : null}
          <span
            className={`min-w-0 flex-1 truncate text-sm ${hasUnread ? "text-foreground" : "text-muted-foreground"}`}
          >
            {preview}
          </span>
          {hasUnread && (
            <span
              aria-label={`${unreadCount} unread ${unreadCount === 1 ? "message" : "messages"}`}
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] leading-none text-primary-foreground"
            >
              {unreadLabel}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

// Only re-render a row when its own data or its selected state changes.
export default memo(
  ConversationListItem,
  (prev, next) =>
    prev.item === next.item &&
    prev.isChannel === next.isChannel &&
    prev.onSelectBuddy === next.onSelectBuddy &&
    prev.onSelectChannel === next.onSelectChannel &&
    String(prev.selectedChat?.id ?? "") === String(next.selectedChat?.id ?? ""),
);