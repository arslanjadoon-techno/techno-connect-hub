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
  let current: unknown = payload;
  const arrayKeys = [
    "data",
    "items",
    "results",
    "buddies",
    "users",
    "contacts",
    "channels",
    "groups",
    "conversations",
    "chats",
    "list",
  ];

  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) return current as ChatRecord[];
    if (!current || typeof current !== "object") return [];

    const record = current as ChatRecord;
    const arrayValue = arrayKeys.find((key) => Array.isArray(record[key]));
    if (arrayValue) return record[arrayValue] as ChatRecord[];

    current = record.data ?? record.result ?? record.payload;
  }

  return [];
};
// End of chat helper exports.
const relatedUserRecords = (buddy: ChatRecord | null | undefined): ChatRecord[] =>
  [buddy, buddy?.user, buddy?.profile, buddy?.sender, buddy?.participant].filter(
    (record): record is ChatRecord => Boolean(record && typeof record === "object"),
  );

export const getBuddyEmail = (buddy: ChatRecord | null | undefined): string => {
  for (const record of relatedUserRecords(buddy)) {
    const email =
      record.email ||
      record.email_id ||
      record.provider_email ||
      record.providerEmail ||
      record.userName ||
      record.username ||
      record.login ||
      record.mailid ||
      record.primary_email ||
      record.emailid;
    if (email) return String(email).trim();
  }
  return "";
};

export const getBuddySendId = (buddy: ChatRecord | null | undefined): ChatId => {
  for (const record of relatedUserRecords(buddy)) {
    const id = record.appUserId || record.app_user_id || record.userId || record.user_id || record.id;
    if (id != null && String(id).trim() !== "") return id;
  }
  return getBuddyEmail(buddy);
};

export const getBuddyName = (buddy: ChatRecord | null | undefined): string => {
  const candidates: unknown[] = [];
  relatedUserRecords(buddy).forEach((record) => {
    candidates.push(
      record.display_name,
      record.displayName,
      record.provider_display_name,
      record.providerDisplayName,
      record.userName,
      record.username,
      record.user_name,
      record.full_name,
      record.fullName,
      record.name,
    );

    const firstName = record.first_name || record.firstName || record.givenName;
    const lastName = record.last_name || record.lastName || record.surname;
    const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (combinedName) candidates.push(combinedName);
  });

  const name = candidates.find((value) => {
    const text = String(value || "").trim();
    return (
      text &&
      text.toLowerCase() !== "chat user" &&
      !/^\d+$/.test(text) &&
      !/^[0-9a-f-]{30,}$/i.test(text)
    );
  });
  const fallback = String(getBuddyEmail(buddy) || "").trim();
  return name || (fallback && !/^\d+$/.test(fallback) ? fallback : "Chat User");
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

export const getImageUrl = (item: ChatRecord | null | undefined): string => {
  if (!item) return "";

  // Prefer the User Management profile, then use compatible legacy fields when
  // the profile is empty. This keeps avatars visible while the profile API and
  // conversation payload are being refreshed at different times.
  const imageCandidates = [
    item.profileImage,
    item.profile_image,
    item.avatarUrl,
    item.imageUrl,
    item.profilePicture,
    item.picture,
    item.photo,
    item.image_url,
    item.photo_url,
    item.profile_image_url,
    item.avatar_url,
    item.thumbnail_url,
    item.icon_url,
    item.image,
  ];

  for (const candidate of imageCandidates) {
    const imageUrl = normalizeAssetUrl(candidate);
    if (imageUrl) return imageUrl;
  }

  return "";
};

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
  channel?.id ||
  channel?.conversationId ||
  channel?.conversation_id ||
  channel?.chatId ||
  channel?.chat_id ||
  channel?.groupId ||
  channel?.group_id ||
  channel?.channelId ||
  channel?.channel_id ||
  channel?.unique_name ||
  channel?.uniqueName ||
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

const resolveMessageText = (value: unknown, depth = 0): string => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || depth > 2) return "";

  const record = value as ChatRecord;
  const candidates = [
    record.content?.text,
    record.content?.message,
    record.content?.file_name,
    record.text,
    record.message,
  ];

  for (const candidate of candidates) {
    const text = resolveMessageText(candidate, depth + 1);
    if (text) return text;
  }

  return "";
};

export const getMessageText = (message: ChatRecord | null | undefined): string =>
  resolveMessageText(message);

export const CHAT_URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

export const toChatHref = (url: string) =>
  url.toLowerCase().startsWith("www.") ? `https://${url}` : url;

export const getChatHost = (url: string) => {
  try {
    return new URL(toChatHref(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const getFileUrl = (file: ChatRecord | null | undefined): string =>
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
  message?.createdAt ||
  message?.created_at ||
  message?.sentAt ||
  message?.sent_at ||
  message?.time ||
  message?.created_time ||
  message?.sent_time ||
  message?.timestamp ||
  "";

export const parseChatDate = (value: string | number | Date | null | undefined): Date => {
  if (typeof value === "number" || value instanceof Date) {
    const numeric = typeof value === "number" && value < 1e12 ? value * 1000 : value;
    return new Date(numeric);
  }
  const raw = String(value || "").trim();
  // .NET/MySQL DateTime values can contain more than JavaScript's portable
  // three fractional-second digits (for example .877105). Trim the extra
  // precision before parsing so browsers that reject that format do not leave
  // messages with an unknown timestamp and preserve the API's DESC order.
  const normalizedPrecision = raw.replace(
    /(\.\d{3})\d+(?=(?:[zZ]|[+-]\d{2}:?\d{2})?$)/,
    "$1",
  );
  // API timestamps without an offset are UTC; make that explicit before parsing.
  const normalized =
    normalizedPrecision && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalizedPrecision)
      ? `${normalizedPrecision}Z`
      : normalizedPrecision;
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
