import { getAvailability, getBuddyEmail, getMessageText } from "../chatHealper";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Chat items come from several API shapes (camelCase and snake_case), so they stay loosely typed.
type ChatItem = Record<string, any> | null | undefined;

export interface AppRailItem {
  key: string;
  label: string;
}

export interface StatusOption {
  value: string;
  label: string;
  color: string;
}

export const appRailItems: AppRailItem[] = [{ key: "conversations", label: "All conversations" }];

export const statusOptions: StatusOption[] = [
  { value: "online", label: "Online", color: "#22c55e" },
  { value: "away", label: "Away", color: "#f59e0b" },
  { value: "busy", label: "Busy", color: "#ef4444" },
  { value: "dnd", label: "Do not disturb", color: "#dc2626" },
  { value: "offline", label: "Offline", color: "#9aa3af" },
];

/** First letter of a name for avatar fallbacks. Safe for emoji and other multi-unit characters. */
export const getInitial = (value: unknown): string => {
  const [first] = Array.from(String(value ?? "").trim());
  return first ? first.toUpperCase() : "?";
};

export const getCurrentUserName = (currentUser: ChatItem): string =>
  currentUser?.name ||
  currentUser?.displayName ||
  currentUser?.username ||
  currentUser?.email ||
  "Current user";

export const isDirectConversation = (item: ChatItem, isChannel: boolean): boolean =>
  !isChannel ||
  Boolean(item?.isDirect) ||
  item?.type === "direct" ||
  item?.conversationType === "direct";

export const getParticipantCount = (item: ChatItem): number => {
  const participants = Array.isArray(item?.participants) ? item.participants : [];
  const count = item?.participantCount || item?.participant_count || participants.length;
  return Number(count) || 0;
};

/** One-line text for the conversation list: newlines collapsed, placeholders made readable. */
const toPreview = (value: unknown): string => {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return text === "[Attachment]" ? "Attachment" : text;
};

export const getLastMessagePreview = (item: ChatItem, isChannel: boolean): string => {
  const rawLastMessage =
    item?.lastMessage || item?.last_message || item?.latestMessage || item?.latest_message || null;
  const text = toPreview(
    getMessageText(rawLastMessage) || item?.lastMessageText || item?.last_message_text,
  );

  if (text) return text;

  const hasAttachments =
    Array.isArray(rawLastMessage?.attachments) && rawLastMessage.attachments.length > 0;
  if (hasAttachments) return "Attachment";

  // Groups and channels have no person to describe, so they show an empty-state line.
  if (!isDirectConversation(item, isChannel)) return "No messages yet";

  return getAvailability(item)?.label || getBuddyEmail(item) || "Direct message";
};

export const getDeliveryState = (item: ChatItem): string =>
  String(
    item?.deliveryState ||
      item?.delivery_state ||
      item?.messageStatus ||
      item?.message_status ||
      item?.lastMessage?.status ||
      item?.last_message?.status ||
      "",
  ).toLowerCase();
