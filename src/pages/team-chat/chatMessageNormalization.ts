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
} from "./chatHealper";

const normalizeMessageReactions = (reactions: ChatRecord[] = [], currentUserId = "") => {
  const reactionsByEmoji = new Map();

  reactions.forEach((reaction) => {
    const emoji = reaction?.emoji;
    if (!emoji) return;

    const reactionUserId = String(
      reaction?.userId ||
        reaction?.user_id ||
        reaction?.chatIdentityId ||
        reaction?.chat_identity_id ||
        "",
    );
    const existing = reactionsByEmoji.get(emoji) || {
      emoji,
      count: 0,
      reacted: false,
      users: [],
    };

    reactionsByEmoji.set(emoji, {
      ...existing,
      count: existing.count + (Number(reaction?.count) || 1),
      reacted:
        existing.reacted ||
        Boolean(reaction?.reacted) ||
        Boolean(currentUserId && reactionUserId === String(currentUserId)),
      users: reactionUserId ? [...existing.users, reactionUserId] : existing.users,
    });
  });

  return Array.from(reactionsByEmoji.values());
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

  return messages
    .map((message: ChatRecord, index: number) => {
      const senderId = getMessageSenderId(message);
      const text = getMessageText(message);
      const attachments = getMessageAttachments(message);
      const deletedAt = message?.deletedAt || message?.deleted_at || null;
      const direction =
        senderId && (currentUserId || currentUserEmail)
          ? senderId === currentUserId || senderId.toLowerCase() === currentUserEmail
            ? "outbound"
            : "inbound"
          : message?.direction ||
            (senderId && selectedId && senderId === selectedId ? "inbound" : "outbound");

      return {
        id: message?.message_id || message?.id || `${getMessageTime(message)}-${index}`,
        clientMessageId:
          message?.clientMessageId ||
          message?.client_message_id ||
          message?.metadata?.clientMessageId ||
          null,
        chatId: message?.chatId || message?.chat_id || message?.conversationId || null,
        chat_id: message?.chat_id || message?.chatId || message?.conversationId || null,
        text: deletedAt
          ? "Message deleted"
          : text || (attachments.length ? "" : "[Unsupported message]"),
        sentAt: getMessageTime(message),
        timestamp: formatMessageTime(getMessageTime(message)),
        authorId: senderId,
        authorName:
          message?.sender?.name ||
          message?.sender?.display_name ||
          message?.sender?.displayName ||
          message?.sender?.email ||
          "Chat user",
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
                  message.memberName ||
                  message.member_name ||
                  message.userName ||
                  message.user_name,
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
        replyTo: message?.replyTo || message?.reply_to || message?.replyToMessageId || null,
        edited: Boolean(message?.metadata?.edited || message?.edited),
        editedAt: message?.metadata?.editedAt || message?.editedAt || null,
        deletedAt,
        attachments,
      };
    })
    .sort((first, second) => new Date(first.sentAt).getTime() - new Date(second.sentAt).getTime());
};

export const normalizeRealtimeMessage = (message: ChatRecord, selectedChat: ChatRecord) => {
  const normalized = normalizeChatMessages([message], selectedChat);
  return normalized[0] || null;
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
  const normalizedChatId = String(chatId || "");

  const channelMatch = channels.find(
    (channel) => String(getChannelId(channel)) === normalizedChatId,
  );
  if (channelMatch) {
    return getChannelId(channelMatch);
  }

  const directConversation = channels.find((channel) => {
    const conversationId = String(channel?.chat_id || channel?.chatId || channel?.id || "");
    return (
      conversationId === normalizedChatId &&
      (channel?.isDirect || channel?.type === "direct" || channel?.conversationType === "direct")
    );
  });

  if (directConversation?.participants?.length) {
    const otherParticipant = directConversation.participants.find(
      (participant: ChatRecord) =>
        String(participant?.id || participant?.user_id || "") !== String(currentUserId),
    );

    if (otherParticipant) {
      return String(otherParticipant.id || otherParticipant.user_id || "");
    }
  }

  const buddyMatch = buddies.find((buddy) => String(getBuddySendId(buddy)) === normalizedChatId);
  if (buddyMatch) {
    return getBuddySendId(buddyMatch);
  }

  return normalizedChatId;
};
