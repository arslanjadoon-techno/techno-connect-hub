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

export const normalizePresence = (value: unknown): string => {
  const status = String(value || "")
    .trim()
    .toLowerCase();
  return status === "available" || status === "active"
    ? "online"
    : ["online", "away", "busy", "dnd", "offline"].includes(status)
      ? status
      : "online";
};
export const getArrayPayload = (payload: unknown): ChatRecord[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as ChatRecord;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.buddies)) return record.buddies;
  if (Array.isArray(record.users)) return record.users;
  if (Array.isArray(record.contacts)) return record.contacts;
  if (Array.isArray(record.channels)) return record.channels;
  if (Array.isArray(record.groups)) return record.groups;
  if (Array.isArray(record.conversations)) return record.conversations;
  if (Array.isArray(record.chats)) return record.chats;
  if (Array.isArray(record.list)) return record.list;
  return [];
};
// End of chat helper exports.
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
    const record = value as ChatRecord;
    return (
      record.status ||
      record.state ||
      record.label ||
      record.text ||
      record.name ||
      record.availability ||
      record.presence ||
      record.value ||
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

export const normalizeChatError = (error: unknown): string => {
  const record = error && typeof error === "object" ? (error as ChatRecord) : {};
  const details = record.response?.data?.details;
  const detailText = typeof details === "string" ? details : details ? JSON.stringify(details) : "";

  return (
    [record.response?.data?.message, detailText].filter(Boolean).join(": ") ||
    (error instanceof Error ? error.message : record.message) ||
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
  const dayDifference = Math.round(
    (startOfToday.getTime() - startOfMessageDay.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
};
// End of chat helper exports.
