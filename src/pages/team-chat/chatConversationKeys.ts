export type ChatRecord = Record<string, any>;

export const getConversationId = (chat: ChatRecord | null | undefined) =>
  chat?.type === "channel" ? chat.id : chat?.chatId || null;

export const getChatStateKeys = (chat: ChatRecord | null | undefined): string[] =>
  Array.from(new Set([chat?.chatId, chat?.id].filter(Boolean).map(String)));

export const getConversationPreviewTimestamp = (
  message: ChatRecord | null | undefined,
  fallback = "",
) =>
  message?.createdAt ||
  message?.created_at ||
  message?.sentAt ||
  message?.sent_at ||
  message?.timestamp ||
  message?.time ||
  fallback;

const toEpoch = (value: unknown): number => {
  if (value == null || value === "") return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

type ConversationPreviewOptions = {
  chatId: string | number;
  message: ChatRecord;
  unreadIncrement?: number;
  createConversation?: () => ChatRecord | null | undefined;
};

/** Update and promote a conversation without waiting for a sidebar refresh. */
export const updateConversationPreview = (
  conversations: ChatRecord[] = [],
  { chatId, message, unreadIncrement = 0, createConversation }: ConversationPreviewOptions,
): ChatRecord[] => {
  const targetId = String(chatId ?? "");
  if (!targetId) return conversations;

  let firstMatch = -1;
  let foundMatch = false;
  const previewTimestamp = getConversationPreviewTimestamp(message);
  const previewTime = toEpoch(previewTimestamp);
  if (!previewTime) return conversations;
  const next = conversations.map((conversation, index) => {
    const conversationIds = [
      conversation?.unique_name,
      conversation?.uniqueName,
      conversation?.channel_id,
      conversation?.chat_id,
      conversation?.chatId,
      conversation?.group_id,
      conversation?.groupId,
      conversation?.group_name,
      conversation?.groupName,
      conversation?.name,
      conversation?.id,
    ]
      .filter(Boolean)
      .map(String);

    if (!conversationIds.includes(targetId)) return conversation;
    foundMatch = true;

    // SignalR events can arrive out of order after reconnects. An older event
    // must not overwrite the latest WhatsApp-style sidebar preview or promote
    // that conversation above a newer one.
    const currentTimestamp = getConversationPreviewTimestamp(conversation);
    const currentTime = toEpoch(currentTimestamp);
    if (previewTime > 0 && currentTime > previewTime) return conversation;

    if (firstMatch === -1) firstMatch = index;

    const currentUnread = Number(conversation?.unreadCount ?? conversation?.unread_count ?? 0);
    const safeUnread = Number.isFinite(currentUnread) ? currentUnread : 0;
    const nextUnread = Math.max(0, safeUnread + unreadIncrement);

    return {
      ...conversation,
      lastMessage: message,
      last_message: message,
      lastMessageAt: previewTimestamp,
      last_message_at: previewTimestamp,
      lastMessageTime: previewTimestamp,
      unreadCount: nextUnread,
      unread_count: nextUnread,
    };
  });

  if (firstMatch === -1) {
    if (foundMatch) return conversations;
    const created = createConversation?.();
    return created ? [created, ...conversations] : conversations;
  }

  const [promoted] = next.splice(firstMatch, 1);
  return promoted ? [promoted, ...next] : next;
};
