export type ChatRecord = Record<string, any>;
export type ChatId = string | number;
export interface ChatAvailability {
  label: string;
  color: string;
}
export interface ChatAttachment extends ChatRecord {
  id: ChatId;
  name: string;
  url: string;
  downloadUrl?: string;
  contentType?: string;
}
export interface NormalizedMessage extends ChatRecord {
  id: ChatId;
  text: string;
  sentAt: string;
  authorId: string;
}

export const getArrayPayload = (payload: unknown): ChatRecord[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.buddies)) return payload.buddies;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.contacts)) return payload.contacts;
  if (Array.isArray(payload?.channels)) return payload.channels;
  if (Array.isArray(payload?.groups)) return payload.groups;
  if (Array.isArray(payload?.conversations)) return payload.conversations;
  if (Array.isArray(payload?.chats)) return payload.chats;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
};

export const getBuddyEmail = (buddy: ChatRecord | null | undefined): string =>
  buddy?.email ||
  buddy?.email_id ||
  buddy?.provider_email ||
  buddy?.providerEmail ||
  buddy?.userName ||
  buddy?.username ||
  buddy?.login ||
  buddy?.mailid ||
  buddy?.primary_email ||
  buddy?.emailid ||
  buddy?.user_id ||
  buddy?.id ||
  "";

export const getBuddySendId = (buddy: ChatRecord | null | undefined): ChatId =>
  buddy?.appUserId ||
  buddy?.app_user_id ||
  buddy?.userId ||
  buddy?.user_id ||
  buddy?.id ||
  getBuddyEmail(buddy);

export const getBuddyName = (buddy: ChatRecord | null | undefined): string => {
  const candidates = [
    buddy?.display_name,
    buddy?.displayName,
    buddy?.provider_display_name,
    buddy?.providerDisplayName,
    buddy?.userName,
    buddy?.username,
    buddy?.user_name,
    buddy?.full_name,
    buddy?.fullName,
    buddy?.first_name,
    buddy?.name,
  ];
  const name = candidates.find((value) => {
    const text = String(value || "").trim();
    return text && text.toLowerCase() !== "chat user" && !/^[0-9a-f-]{30,}$/i.test(text);
  });
  return name || getBuddyEmail(buddy) || "Chat User";
};

const normalizeAssetUrl = (value: unknown): string => {
  const url = String(value || "").trim();

  if (!url) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(url)) return url;

  const apiUrl = import.meta.env.VITE_API_URL || "";
  if (apiUrl && url.startsWith("/")) {
    return `${apiUrl.replace(/\/$/, "")}${url}`;
  }

  return url;
};

export const getImageUrl = (item: ChatRecord | null | undefined): string =>
  normalizeAssetUrl(
    item?.avatarUrl ||
      item?.imageUrl ||
      item?.profilePicture ||
      item?.profile_picture ||
      item?.picture ||
      item?.photo ||
      item?.image_url ||
      item?.photo_url ||
      item?.profile_image ||
      item?.profile_image_url ||
      item?.avatar_url ||
      item?.thumbnail_url ||
      item?.icon_url ||
      item?.image ||
      "",
  );

const pickStatusValue = (value: unknown): unknown => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "available" : "unavailable";

  if (typeof value === "object") {
    return (
      value.status ||
      value.state ||
      value.label ||
      value.text ||
      value.name ||
      value.availability ||
      value.presence ||
      value.value ||
      ""
    );
  }

  return "";
};

export const getAvailability = (item: ChatRecord | null | undefined): ChatAvailability => {
  const rawStatus =
    [
      item?.availability,
      item?.availability_status,
      item?.availabilityStatus,
      item?.presence,
      item?.presence_status,
      item?.presenceStatus,
      item?.status,
      item?.status_message,
      item?.statusMessage,
      item?.user_status,
      item?.userStatus,
      item?.connection_status,
      item?.connectionStatus,
      item?.chat_status,
      item?.chatStatus,
      item?.online_status,
      item?.onlineStatus,
      item?.state,
      item?.mode,
    ]
      .map(pickStatusValue)
      .find(Boolean) || "";
  const status = String(rawStatus).toLowerCase();

  const booleanAvailability =
    item?.is_available ?? item?.isAvailable ?? item?.is_online ?? item?.isOnline ?? item?.online;

  if (booleanAvailability === true) {
    return { label: "Available", color: "#22c55e" };
  }
  if (booleanAvailability === false) {
    return { label: "Unavailable", color: "#9aa3af" };
  }

  if (
    status.includes("online") ||
    status.includes("available") ||
    status.includes("free") ||
    status === "active" ||
    status === "1"
  ) {
    return { label: "Available", color: "#22c55e" };
  }
  if (status.includes("dnd") || status.includes("do not disturb")) {
    return { label: "Do Not Disturb", color: "#dc2626" };
  }
  if (status.includes("busy")) {
    return { label: "Busy", color: "#ef4444" };
  }
  if (status.includes("offline") || status.includes("unavailable")) {
    return { label: "Offline", color: "#9aa3af" };
  }
  if (status.includes("away") || status.includes("idle") || status.includes("break")) {
    return { label: "Away", color: "#f59e0b" };
  }

  return { label: "Unknown", color: "#9aa3af" };
};

export const getPhoneNumber = (item: ChatRecord | null | undefined): string | number =>
  item?.phone ||
  item?.mobile ||
  item?.mobile_number ||
  item?.phone_number ||
  item?.contact_number ||
  "";

export const getChannelId = (channel: ChatRecord | null | undefined): ChatId =>
  channel?.unique_name ||
  channel?.uniqueName ||
  channel?.channel_id ||
  channel?.chat_id ||
  channel?.group_id ||
  channel?.groupId ||
  channel?.name ||
  channel?.groupName ||
  channel?.group_name ||
  channel?.id ||
  "";

export const getChannelName = (channel: ChatRecord | null | undefined): string | number =>
  channel?.name ||
  channel?.display_name ||
  channel?.groupName ||
  channel?.group_name ||
  channel?.title ||
  getChannelId(channel) ||
  "Group";

export const getUnreadCount = (item: ChatRecord | null | undefined): number => {
  const value = item?.unreadCount ?? item?.unread_count ?? 0;

  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

export const normalizeChatError = (error: ChatRecord | Error | null | undefined): string => {
  const details = error?.response?.data?.details;
  const detailText = typeof details === "string" ? details : details ? JSON.stringify(details) : "";

  return (
    [error?.response?.data?.message, detailText].filter(Boolean).join(": ") ||
    error?.message ||
    "Chat request failed."
  );
};

export const getMessageText = (message: ChatRecord | null | undefined): string =>
  message?.content?.text ||
  message?.content?.message ||
  message?.content?.file_name ||
  message?.text ||
  message?.message ||
  "";

const getFileUrl = (file: ChatRecord | null | undefined): string =>
  file?.url ||
  file?.Url ||
  file?.fileUrl ||
  file?.file_url ||
  file?.attachmentUrl ||
  file?.attachment_url ||
  file?.path ||
  file?.filePath ||
  file?.downloadUrl ||
  file?.download_url ||
  file?.publicUrl ||
  file?.public_url ||
  "";

export const getMessageAttachments = (message: ChatRecord | null | undefined): ChatAttachment[] => {
  const metadata = message?.metadata || {};
  const content = message?.content || {};
  const candidates = [
    metadata.file,
    metadata.attachment,
    message?.file,
    message?.attachment,
    content.file,
    content.attachment,
    ...(Array.isArray(message?.attachments) ? message.attachments : []),
    ...(Array.isArray(metadata.files) ? metadata.files : []),
    ...(Array.isArray(metadata.attachments) ? metadata.attachments : []),
    ...(Array.isArray(content.files) ? content.files : []),
    ...(Array.isArray(content.attachments) ? content.attachments : []),
  ].filter(Boolean);

  if (metadata.type === "file" && candidates.length === 0) {
    candidates.push(metadata);
  }

  return candidates.map((file, index) => {
    const name =
      file.name ||
      file.fileName ||
      file.file_name ||
      file.originalName ||
      file.original_name ||
      content.file_name ||
      message?.file_name ||
      "Document";

    return {
      id: file.id || file.key || getFileUrl(file) || `${name}-${index}`,
      name,
      url: getFileUrl(file),
      downloadUrl: file.downloadUrl || file.download_url || "",
      size: file.size || file.contentLength || file.content_length || metadata.contentLength,
      contentType:
        file.contentType ||
        file.content_type ||
        file.mimeType ||
        file.mime_type ||
        metadata.contentType ||
        "",
    };
  });
};

export const downloadAttachment = (event: Event | null | undefined, file: ChatRecord): void => {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const url = file?.downloadUrl || file?.download_url || file?.url;
  if (!url) return;

  // Presigned S3 URLs are cross-origin. Native navigation avoids CORS failures
  // that occur when fetching the URL with JavaScript and creating a Blob URL.
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name || file.fileName || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};
export const getMessageSenderId = (message: ChatRecord | null | undefined): string => {
  const sender = message?.sender || message?.from || message?.user || {};

  if (typeof sender === "string" || typeof sender === "number") {
    return String(sender);
  }

  return String(
    message?.senderId ||
      message?.sender_id ||
      message?.senderIdentityId ||
      message?.sender_identity_id ||
      sender?.appUserId ||
      sender?.app_user_id ||
      sender?.userId ||
      sender?.id ||
      sender?.user_id ||
      sender?.chatIdentityId ||
      sender?.email_id ||
      sender?.mailid ||
      sender?.email ||
      "",
  );
};

export const getMessageTime = (message: ChatRecord | null | undefined): string =>
  message?.time ||
  message?.created_time ||
  message?.sent_time ||
  message?.createdAt ||
  message?.timestamp ||
  new Date().toISOString();

export const parseChatDate = (value: string | number | Date): Date => {
  if (typeof value === "number" || value instanceof Date) {
    const numeric = typeof value === "number" && value < 1e12 ? value * 1000 : value;
    return new Date(numeric);
  }
  const raw = String(value || "").trim();
  // API timestamps without an offset are UTC; make that explicit before parsing.
  const normalized = raw && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? `${raw}Z` : raw;
  return new Date(normalized);
};

export const formatMessageTime = (value: string | number | Date): string => {
  const date = parseChatDate(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const getMessageDayKey = (value: string | number | Date): string => {
  const date = parseChatDate(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export const formatMessageDateLabel = (value: string | number | Date): string => {
  const date = parseChatDate(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((startOfToday - startOfMessageDay) / (24 * 60 * 60 * 1000));

  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
};

const normalizeMessageReactions = (reactions = [], currentUserId = "") => {
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

export const normalizeChatMessages = (payload, selectedChat) => {
  const findMessages = (value, depth = 0): any[] => {
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
    .map((message, index) => {
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
            :
          (message?.callHistory ||
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
              : {})),
        mentions: message?.metadata?.mentions || message?.mentions || [],
        replyTo: message?.replyTo || message?.reply_to || message?.replyToMessageId || null,
        edited: Boolean(message?.metadata?.edited || message?.edited),
        editedAt: message?.metadata?.editedAt || message?.editedAt || null,
        deletedAt,
        attachments,
      };
    })
    .sort((first, second) => new Date(first.sentAt) - new Date(second.sentAt));
};

export const normalizeRealtimeMessage = (message, selectedChat) => {
  const normalized = normalizeChatMessages([message], selectedChat);
  return normalized[0] || null;
};

export const resolveLocalChatKey = ({
  chatId,
  channels = [],
  buddies = [],
  currentUserId = "",
}) => {
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
      (participant) =>
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
