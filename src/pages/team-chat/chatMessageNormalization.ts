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
      userDetails: [],
    };

    const user =
      reaction?.user ||
      reaction?.User ||
      reaction?.identity ||
      reaction?.Identity ||
      reaction?.actor ||
      reaction?.Actor;
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
      count: existing.count + (Number(reaction?.count) || 1),
      reacted:
        existing.reacted ||
        Boolean(reaction?.reacted) ||
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

  const normalizedMessages = messages
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
        chatId: message?.chatId || message?.chat_id || message?.conversationId || null,
        chat_id: message?.chat_id || message?.chatId || message?.conversationId || null,
        createdAt: message?.createdAt || message?.created_at || null,
        authorEmail:
          getBuddyEmail(message?.sender) ||
          message?.authorEmail ||
          message?.author_email ||
          "",
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
    });

  return sortMessagesByTime(normalizedMessages);
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
