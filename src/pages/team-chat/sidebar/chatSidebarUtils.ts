import { getAvailability, getBuddyEmail, getMessageText } from "../chatHealper";

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
  { value: "dnd", label: "Do Not Disturb", color: "#dc2626" },
  { value: "offline", label: "Offline", color: "#9aa3af" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getInitial = (value: any): string =>
  String(value || "Z")
    .trim()
    .charAt(0)
    .toUpperCase();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getCurrentUserName = (currentUser: any): string =>
  currentUser?.name ||
  currentUser?.displayName ||
  currentUser?.username ||
  currentUser?.email ||
  "Current user";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isDirectConversation = (item: any, isChannel: boolean): boolean =>
  !isChannel || item?.isDirect || item?.type === "direct" || item?.conversationType === "direct";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getParticipantCount = (item: any): number => {
  const participants = Array.isArray(item?.participants) ? item.participants : [];
  const count = item?.participantCount || item?.participant_count || participants.length;
  return Number(count) || 0;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getLastMessagePreview = (item: any, isChannel: boolean): string => {
  const rawLastMessage =
    item?.lastMessage || item?.last_message || item?.latestMessage || item?.latest_message || null;
  const text = getMessageText(rawLastMessage) || item?.lastMessageText || item?.last_message_text;

  if (text) return text;
  if (isChannel && !isDirectConversation(item, isChannel)) {
    return "No messages yet";
  }

  const availability = getAvailability(item);
  return availability?.label || getBuddyEmail(item) || "Direct message";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getDeliveryState = (item: any): string =>
  String(
    item?.deliveryState ||
      item?.delivery_state ||
      item?.messageStatus ||
      item?.message_status ||
      item?.lastMessage?.status ||
      item?.last_message?.status ||
      "",
  ).toLowerCase();
