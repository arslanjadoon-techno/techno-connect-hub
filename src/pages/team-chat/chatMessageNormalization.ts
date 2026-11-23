import {
  type ChatId,
  type ChatRecord,
  type NormalizedMessage,
  formatMessageTime,
  getBuddySendId,
  getChannelId,
  getImageUrl,
  getMessageAttachments,
  getMessageSenderId,
  getMessageText,
  getMessageTime,
  getBuddyName,
  getBuddyEmail,
} from "./chatHealper";
import { sortMessagesByTime } from "./chatMessageState";
import { applyRememberedReceiptStatus } from "./chatReceiptStatus";

const normalizeMessageReactions = (reactions: ChatRecord[] = [], currentUserId = "") => {
  const reactionsByEmoji = new Map();

  reactions.forEach((reaction) => {
    const emoji = reaction?.emoji ?? reaction?.Emoji;
    if (!emoji) return;

    const user =
      reaction?.user ||
      reaction?.User ||
      reaction?.identity ||
      reaction?.Identity ||
      reaction?.actor ||
      reaction?.Actor;
    const reactionUserId = String(
      reaction?.userId ||
        reaction?.user_id ||
        reaction?.appUserId ||
        reaction?.app_user_id ||
        user?.id ||
        user?.userId ||
        user?.user_id ||
        user?.appUserId ||
        user?.app_user_id ||
        reaction?.chatIdentityId ||
        reaction?.chat_identity_id ||
      reaction?.ChatIdentityId ||
        "",
    );
    const existing = reactionsByEmoji.get(emoji) || {
      emoji,
      count: 0,
      reacted: false,
      users: [],
      userDetails: [],
    };

    const userName =
      user?.name ||
      user?.Name ||
      user?.fullName ||
      user?.FullName ||
      user?.full_name ||
      user?.displayName ||
      user?.display_name ||
      user?.email ||
      user?.Email ||
      user?.emailAddress ||
      user?.email_address ||
      reaction?.userName ||
      reaction?.user_name ||
      reaction?.name;

    reactionsByEmoji.set(emoji, {
      ...existing,
      count: existing.count + (Number(reaction?.count ?? reaction?.Count) || 1),
      reacted:
        existing.reacted ||
        Boolean(reaction?.reacted ?? reaction?.Reacted) ||
        Boolean(currentUserId && reactionUserId === String(currentUserId)),
      users: reactionUserId ? [...existing.users, reactionUserId] : existing.users,
      userDetails:
        userName && reactionUserId
          ? [...existing.userDetails, { id: reactionUserId, name: String(userName) }]
          : existing.userDetails,
    });
  });

  return Array.from(reactionsByEmoji.values());
};

/** Unwrap the response envelopes used by direct, group, and paginated history. */
export const unwrapChatMessagesResponse = (response: any): any => {
  if (!response) return {};

  const candidates = [
    response?.data?.data?.data?.messages && response.data.data.data,
    response?.data?.data?.messages && response.data.data,
    response?.data?.messages && response.data,
    response?.data?.data,
    response?.data,
    response,
  ];

  return candidates.find((candidate) => candidate !== undefined && candidate !== null) ?? {};
};

export const normalizeChatMessages = (
  payload: unknown,
  selectedChat: ChatRecord | null | undefined,
): NormalizedMessage[] => {
  const findMessages = (value: any, depth = 0): any[] => {
    if (depth > 5 || value == null) return [];
    if (Array.isArray(value)) return value;
    if (typeof value !== "object") return [];
    if (Array.isArray(value.messages)) return value.messages;
    if (Array.isArray(value.items)) return value.items;
    return findMessages(value.data, depth + 1);
  };
  const messages = findMessages(payload);
  const selectedId = String(selectedChat?.id || "");
  const currentUserId = String(selectedChat?.currentUserId || "");
  const currentUserEmail = String(selectedChat?.currentUserEmail || "").toLowerCase();

  const normalizedMessages = messages.map((message: ChatRecord, index: number) => {
    const senderId = getMessageSenderId(message);
    const text = getMessageText(message);
    const attachments = getMessageAttachments(message);
    const deletedAt = message?.deletedAt || message?.deleted_at || null;
    const isOwnMessage = isMessageFromCurrentUser(
      message,
      selectedChat?.currentUser,
      currentUserId,
      currentUserEmail,
    );
    const direction =
      senderId && (currentUserId || currentUserEmail)
        ? isOwnMessage
          ? "outbound"
          : "inbound"
        : message?.direction ||
          (senderId && selectedId && senderId === selectedId ? "inbound" : "outbound");

    const replyTo =
      message?.replyTo ||
      message?.reply_to ||
      message?.replyToMessageId ||
      message?.reply_to_message_id ||
      message?.ReplyToMessageId ||
      null;

    return {
      id:
        message?.message_id ||
        message?.messageId ||
        message?.id ||
        message?.publicId ||
        `${getMessageTime(message)}-${index}`,
      clientMessageId:
        message?.clientMessageId ||
        message?.client_message_id ||
        message?.metadata?.clientMessageId ||
        message?.metadata?.client_message_id ||
        null,
      clientSequence:
        message?.clientSequence ??
        message?.client_sequence ??
        message?.metadata?.clientSequence ??
        message?.metadata?.client_sequence,
      chatId: message?.chatId || message?.chat_id || message?.conversationId || null,
      chat_id: message?.chat_id || message?.chatId || message?.conversationId || null,
      createdAt: message?.createdAt || message?.created_at || null,
      updatedAt: message?.updatedAt || message?.updated_at || null,
      authorEmail:
        getBuddyEmail(message?.sender) || message?.authorEmail || message?.author_email || "",
      text: deletedAt
        ? "Message deleted"
        : text || (attachments.length ? "" : "[Unsupported message]"),
      sentAt: getMessageTime(message),
      timestamp: formatMessageTime(getMessageTime(message)),
      authorId: senderId,
      authorName: getBuddyName(message?.sender) || "Chat user",
      authorAvatarUrl: getImageUrl(message?.sender),
      direction,
      deliveryStatus:
        message?.deliveryStatus ||
        message?.delivery_status ||
        (direction === "outbound" ? "sent" : undefined),
      sendState: message?.sendState || message?.send_state || undefined,
      reactions: normalizeMessageReactions(message?.reactions || [], currentUserId),
      metadata:
        message?.metadata ||
        (message?.systemEventType === "group_member_added" ||
        message?.systemEventType === "group_member_joined" ||
        message?.systemEventType === "group_member_removed"
          ? {
              kind: message.systemEventType,
              memberName:
                message.memberName || message.member_name || message.userName || message.user_name,
            }
          : message?.callHistory ||
              message?.call_history ||
              message?.systemEventType === "call_history"
            ? {
                kind: "call_history",
                callHistory: message.callHistory ||
                  message.call_history || {
                    callId: message.callId,
                    type: message.callType,
                    status: message.callStatus,
                    startedAt: message.callStartedAt,
                    endedAt: message.callEndedAt,
                    durationSeconds: message.callDurationSeconds || 0,
                  },
              }
            : message?.isPinned || message?.is_pinned
              ? { pinned: true }
              : {}),
      mentions: message?.metadata?.mentions || message?.mentions || [],
      replyTo,
      replyToMessageId: replyTo,
      edited: Boolean(
        message?.metadata?.edited || message?.edited || message?.isEdited || message?.is_edited,
      ),
      editedAt:
        message?.metadata?.editedAt ||
        message?.editedAt ||
        message?.updatedAt ||
        message?.updated_at ||
        null,
      deletedAt,
      attachments,
    };
  });

  return sortMessagesByTime(normalizedMessages.map(applyRememberedReceiptStatus));
};

export const normalizeRealtimeMessage = (message: ChatRecord, selectedChat: ChatRecord) => {
  const normalized = normalizeChatMessages([message], selectedChat);
  return normalized[0] || null;
};

const normalizeIdentityValue = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const getIdentityAliases = (record: ChatRecord | null | undefined) => {
  if (!record || typeof record !== "object") return { ids: [], emails: [] };

  const ids = [
    record.id,
    record.authorId,
    record.author_id,
    record.senderId,
    record.sender_id,
    record.senderIdentityId,
    record.sender_identity_id,
    record.appUserId,
    record.app_user_id,
    record.userId,
    record.user_id,
    record.identityId,
    record.identity_id,
    record.chatIdentityId,
    record.chat_identity_id,
  ]
    .map(normalizeIdentityValue)
    .filter(Boolean);
  const emails = [
    record.email,
    record.email_id,
    record.mailid,
    record.providerEmail,
    record.provider_email,
    record.username,
    record.userName,
  ]
    .map(normalizeIdentityValue)
    .filter(Boolean);

  return { ids, emails };
};

/**
 * Chat identities have historically used both the application user ID and a
 * chat-identity ID. Compare all safe identity aliases so the sender's own
 * realtime/history row is not incorrectly rendered as an inbound message.
 */
export const isMessageFromCurrentUser = (
  message: ChatRecord | null | undefined,
  currentUser: ChatRecord | null | undefined,
  currentUserId = "",
  currentUserEmail = "",
): boolean => {
  const sender = message?.sender || message?.from || message?.user || {};
  const senderAliases = getIdentityAliases({
    ...(typeof sender === "object" ? sender : {}),
    authorId: message?.authorId,
    author_id: message?.author_id,
    senderId: message?.senderId,
    sender_id: message?.sender_id,
    senderIdentityId: message?.senderIdentityId,
    sender_identity_id: message?.sender_identity_id,
  });
  const currentAliases = getIdentityAliases({
    ...(currentUser || {}),
    id: currentUser?.id || currentUserId,
    appUserId: currentUser?.appUserId || currentUserId,
    userId: currentUser?.userId || currentUserId,
    email: currentUser?.email || currentUserEmail,
  });

  return (
    senderAliases.ids.some((senderId) => currentAliases.ids.includes(senderId)) ||
    senderAliases.emails.some((senderEmail) => currentAliases.emails.includes(senderEmail))
  );
};

const isDirectConversationRecord = (record: ChatRecord): boolean => {
  const type = String(record?.type || record?.conversationType || "").toLowerCase();
  return record?.isDirect === true || type === "direct" || type === "person";
};

const getConversationAliases = (record: ChatRecord): string[] =>
  [
    record?.directConversationId,
    record?.conversationId,
    record?.conversation_id,
    record?.chatId,
    record?.chat_id,
    record?.id,
  ]
    .map(normalizeIdentityValue)
    .filter(Boolean);

const getParticipantAliases = (participant: ChatRecord): string[] =>
  [
    participant?.id,
    participant?.appUserId,
    participant?.app_user_id,
    participant?.userId,
    participant?.user_id,
    participant?.identityId,
    participant?.identity_id,
    participant?.chatIdentityId,
    participant?.chat_identity_id,
    getBuddyEmail(participant),
  ]
    .map(normalizeIdentityValue)
    .filter(Boolean);

export const getMessageConversationId = (message: ChatRecord | null | undefined): string =>
  normalizeIdentityValue(
    message?.conversationId ||
      message?.conversation_id ||
      message?.chatId ||
      message?.chat_id ||
      message?.ConversationId,
  );

/**
 * Prevent a stale alias/cache row from rendering in a different conversation.
 * Rows without a conversation ID are legacy/optimistic records and remain
 * visible because there is no safe server-side ID to compare.
 */
export const messageBelongsToChat = (
  message: ChatRecord | null | undefined,
  selectedChat: ChatRecord | null | undefined,
): boolean => {
  const messageConversationId = getMessageConversationId(message);
  if (!messageConversationId || !selectedChat) return true;

  const isGroup = selectedChat.type === "channel" || selectedChat.type === "group";
  const expectedConversationIds = [
    isGroup ? selectedChat.id : selectedChat.chatId,
    isGroup ? selectedChat.chatId : selectedChat.directConversationId,
    selectedChat.directConversationId,
    selectedChat.chat_id,
    selectedChat.conversationId,
    selectedChat.conversation_id,
    selectedChat.raw?.id,
    selectedChat.raw?.chatId,
    selectedChat.raw?.chat_id,
    selectedChat.raw?.directConversationId,
    selectedChat.raw?.conversationId,
    selectedChat.raw?.conversation_id,
    // A new direct chat has no persisted conversation yet; optimistic rows
    // use the peer ID as their temporary chat ID.
    !selectedChat.chatId && !isGroup ? selectedChat.id : null,
  ]
    .map(normalizeIdentityValue)
    .filter(Boolean);

  return expectedConversationIds.includes(messageConversationId);
};

export const resolveLocalChatKey = ({
  chatId,
  channels = [],
  buddies = [],
  currentUserId = "",
}: {
  chatId: ChatId;
  channels?: ChatRecord[];
  buddies?: ChatRecord[];
  currentUserId?: ChatId;
}): string | number => {
  const normalizedChatId = normalizeIdentityValue(chatId);
  if (!normalizedChatId) return "";

  // Resolve direct conversations before group/channel IDs. A direct sidebar
  // row is keyed locally by the peer user ID, while SignalR sends the
  // persisted conversation ID. Returning the conversation ID here creates a
  // second local bucket and lets stale alias data bleed into the selected chat.
  const directConversation = channels.find(
    (channel) =>
      isDirectConversationRecord(channel) &&
      getConversationAliases(channel).includes(normalizedChatId),
  );

  if (directConversation) {
    const currentUserAliases = new Set(
      [currentUserId, getBuddySendId({ id: currentUserId })]
        .map(normalizeIdentityValue)
        .filter(Boolean),
    );
    const otherParticipant = (directConversation.participants || []).find(
      (participant: ChatRecord) =>
        !getParticipantAliases(participant).some((alias) => currentUserAliases.has(alias)),
    );

    if (otherParticipant) return getBuddySendId(otherParticipant);
  }

  const groupMatch = channels.find(
    (channel) =>
      !isDirectConversationRecord(channel) &&
      normalizeIdentityValue(getChannelId(channel)) === normalizedChatId,
  );
  if (groupMatch) return getChannelId(groupMatch);

  // Some conversation-list responses do not include the direct conversation
  // object yet, but the buddy row still carries its conversation ID.
  const buddyConversationMatch = buddies.find((buddy) =>
    [buddy?.directConversationId, buddy?.chatId, buddy?.chat_id]
      .map(normalizeIdentityValue)
      .includes(normalizedChatId),
  );
  if (buddyConversationMatch) return getBuddySendId(buddyConversationMatch);

  const buddyMatch = buddies.find(
    (buddy) => normalizeIdentityValue(getBuddySendId(buddy)) === normalizedChatId,
  );
  if (buddyMatch) return getBuddySendId(buddyMatch);

  return String(chatId);
};
