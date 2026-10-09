import { Check, CheckCheck, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
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
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
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
      <Avatar className="h-[42px] w-[42px] bg-primary/10 font-extrabold text-primary">
        <AvatarImage src={imageUrl} />
        <AvatarFallback>
          <UsersRound className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <span className="relative shrink-0" title={availability.label}>
      <Avatar className="h-[42px] w-[42px] bg-primary/10 font-extrabold text-primary">
        <AvatarImage src={imageUrl} />
        <AvatarFallback>{getInitial(title)}</AvatarFallback>
      </Avatar>
      <span
        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card"
        style={{ backgroundColor: availability.color }}
      />
    </span>
  );
}

export default function ConversationListItem({
  item,
  isChannel,
  selectedChat,
  onSelectBuddy,
  onSelectChannel,
}: Props) {
  const title = String(isChannel ? getChannelName(item) : getBuddyName(item));
  const itemId = isChannel ? getChannelId(item) : getBuddySendId(item);
  const selected = String(selectedChat?.id || "") === String(itemId || "");
  const disabled = !itemId;
  const unreadCount = getUnreadCount(item);
  const deliveryState = getDeliveryState(item);
  const preview = getLastMessagePreview(item, isChannel);
  const unreadLabel = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <Card
      className={`overflow-hidden border-border/80 shadow-xs transition-colors ${selected ? "border-primary/50 bg-primary/5" : "hover:bg-accent/30"}`}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        onClick={() => {
          if (disabled) return;
          if (isChannel) onSelectChannel(item);
          else onSelectBuddy(item);
        }}
        className="flex w-full min-w-0 items-center gap-3 p-3 text-left text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <PresenceAvatar item={item} title={title} isChannel={isChannel} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-sm ${unreadCount > 0 ? "font-bold" : "font-semibold"}`}
            >
              {title}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatConversationTime(item)}
            </span>
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
            {deliveryState === "read" ? (
              <CheckCheck className="h-4 w-4 shrink-0 text-blue-500" />
            ) : deliveryState === "sent" ? (
              <Check className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : null}
            <span
              className={`min-w-0 flex-1 truncate text-sm ${unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              {preview}
            </span>
            {unreadCount > 0 && (
              <span className="min-w-[18px] shrink-0 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[18px] text-primary-foreground">
                {unreadLabel}
              </span>
            )}
          </span>
        </span>
      </button>
    </Card>
  );
}
