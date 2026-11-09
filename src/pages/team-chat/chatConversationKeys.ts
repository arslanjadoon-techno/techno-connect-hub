export type ChatRecord = Record<string, any>;

export const getConversationId = (chat: ChatRecord | null | undefined) =>
  chat?.type === "channel" || chat?.type === "group"
    ? chat?.id || chat?.conversationId || chat?.chatId || null
    : chat?.chatId || chat?.directConversationId || chat?.conversationId || chat?.id || null;

const firstNonEmpty = (...values: unknown[]): string => {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
};

const isDirectConversation = (chat: ChatRecord | null | undefined): boolean => {
  const type = String(chat?.type || chat?.conversationType || "").toLowerCase();
  return (
    chat?.isDirect === true ||
    chat?.__conversationType === "person" ||
    type === "direct" ||
    type === "person"
  );
};

/**
 * Returns the persisted conversation id, never a display name.
 * Direct sidebar rows keep the peer id in `id`, so their conversation id is
 * intentionally checked first through `directConversationId`/`chatId`.
 */
export const getConversationRecordId = (chat: ChatRecord | null | undefined): string => {
  if (!chat) return "";

  return isDirectConversation(chat)
    ? firstNonEmpty(
        chat.directConversationId,
        chat.conversationId,
        chat.conversation_id,
        chat.chatId,
        chat.chat_id,
        chat.id,
      )
    : firstNonEmpty(
        chat.id,
        chat.conversationId,
        chat.conversation_id,
        chat.chatId,
        chat.chat_id,
        chat.groupId,
        chat.group_id,
        chat.channelId,
        chat.channel_id,
      );
};

/**
 * Stable state/render key. A direct record without a persisted conversation
 * id is a new chat, so its user id is only a fallback until the server creates
 * the conversation. Names are deliberately never used.
 */
export const getConversationKey = (chat: ChatRecord | null | undefined): string => {
  const direct = isDirectConversation(chat);
  const conversationId = getConversationRecordId(chat);
  if (conversationId) return `${direct ? "direct" : "group"}:${conversationId}`;

  if (direct) {
    const userId = firstNonEmpty(
      chat?.appUserId,
      chat?.app_user_id,
      chat?.userId,
      chat?.user_id,
      chat?.id,
      chat?.email,
      chat?.email_id,
    );
    return userId ? `direct-user:${userId.toLowerCase()}` : "";
  }

  return "";
};

const toEpoch = (value: unknown): number => {
  if (value == null || value === "") return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getConversationActivityTime = (conversation: ChatRecord | null | undefined): number =>
  toEpoch(
    conversation?.lastMessage?.createdAt ||
      conversation?.lastMessage?.created_at ||
      conversation?.last_message?.createdAt ||
      conversation?.last_message?.created_at ||
      conversation?.lastMessageAt ||
      conversation?.last_message_at ||
      conversation?.lastMessageTime ||
      conversation?.last_message_time ||
      conversation?.updatedAt ||
      conversation?.updated_at ||
      conversation?.createdAt ||
      conversation?.created_at,
  );

const mergeConversationRecords = (first: ChatRecord, second: ChatRecord): ChatRecord => {
  const firstTime = getConversationActivityTime(first);
  const secondTime = getConversationActivityTime(second);
  const newer = secondTime >= firstTime ? second : first;
  const older = newer === second ? first : second;
  const merged = { ...older, ...newer };

  const firstUnread = Number(first.unreadCount ?? first.unread_count ?? 0);
  const secondUnread = Number(second.unreadCount ?? second.unread_count ?? 0);
  const unreadCount = Math.max(
    Number.isFinite(firstUnread) ? firstUnread : 0,
    Number.isFinite(secondUnread) ? secondUnread : 0,
  );
  merged.unreadCount = unreadCount;
  merged.unread_count = unreadCount;

  if (!merged.participants && (first.participants || second.participants)) {
    merged.participants = first.participants || second.participants;
  }
  if (!merged.lastMessage && (first.lastMessage || second.lastMessage)) {
    merged.lastMessage = first.lastMessage || second.lastMessage;
  }
  if (!merged.last_message && (first.last_message || second.last_message)) {
    merged.last_message = first.last_message || second.last_message;
  }

  return merged;
};

/** Collapse only records with the same persisted conversation key. */
export const dedupeConversationRecords = (conversations: ChatRecord[] = []): ChatRecord[] => {
  const result = new Map<string, ChatRecord>();
  const withoutKey: ChatRecord[] = [];

  conversations.forEach((conversation) => {
    const key = getConversationKey(conversation);
    if (!key) {
      withoutKey.push(conversation);
      return;
    }

    const existing = result.get(key);
    result.set(key, existing ? mergeConversationRecords(existing, conversation) : conversation);
  });

  return [...result.values(), ...withoutKey];
};

/** Upsert one realtime/API conversation by persisted id. */
export const upsertConversationRecord = (
  conversations: ChatRecord[] = [],
  conversation: ChatRecord | null | undefined,
): ChatRecord[] => {
  if (!conversation) return dedupeConversationRecords(conversations);

  const current = dedupeConversationRecords(conversations);
  const key = getConversationKey(conversation);
  if (!key) return current;

  const index = current.findIndex((item) => getConversationKey(item) === key);
  if (index < 0) return [conversation, ...current];

  const existing = current[index];
  const merged = mergeConversationRecords(existing, conversation);
  const next = [...current];
  next[index] = merged;

  if (getConversationActivityTime(merged) > getConversationActivityTime(existing)) {
    next.splice(index, 1);
    next.unshift(merged);
  }

  return next;
};

export const getChatStateKeys = (chat: ChatRecord | null | undefined): string[] =>
  Array.from(
    new Set(
      [
        chat?.chatId,
        chat?.chat_id,
        chat?.conversationId,
        chat?.conversation_id,
        chat?.directConversationId,
        chat?.id,
      ]
        .filter(Boolean)
        .map(String),
    ),
  );

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
  const normalizedConversations = dedupeConversationRecords(conversations);
  if (!previewTime) return normalizedConversations;
  const next = normalizedConversations.map((conversation, index) => {
    const conversationId = getConversationRecordId(conversation);

    if (conversationId !== targetId) return conversation;
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
    if (foundMatch) return normalizedConversations;
    const created = createConversation?.();
    return created
      ? upsertConversationRecord(normalizedConversations, created)
      : normalizedConversations;
  }

  const [promoted] = next.splice(firstMatch, 1);
  return promoted ? [promoted, ...next] : next;
};
