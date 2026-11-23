import { getMessageTimestamp } from "./ChatSystemUtils";

export type ChatRecord = Record<string, any>;

const nonEmptyString = (value: unknown): string => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : "";
};

const receiptStatusRank = (status: unknown): number => {
  switch (
    String(status ?? "")
      .trim()
      .toLowerCase()
  ) {
    case "read":
    case "seen":
      return 3;
    case "delivered":
      return 2;
    case "sent":
      return 1;
    default:
      return 0;
  }
};

const getReceiptStatus = (message: ChatRecord): string =>
  String(
    message.deliveryStatus ??
      message.delivery_status ??
      message.status ??
      message.sendState ??
      message.send_state ??
      "",
  );

const getMessageUpdatedAt = (message: ChatRecord): number => {
  const value = message?.updatedAt ?? message?.updated_at;
  if (!value) return 0;

  const timestamp = Date.parse(String(value));
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getMessageClientId = (message: ChatRecord | null | undefined): string =>
  nonEmptyString(
    message?.clientMessageId ??
      message?.client_message_id ??
      message?.metadata?.clientMessageId ??
      message?.metadata?.client_message_id,
  );

export const getMessageServerId = (message: ChatRecord | null | undefined): string =>
  nonEmptyString(
    message?.id ??
      message?.messageId ??
      message?.message_id ??
      message?.publicId ??
      message?.public_id,
  );

const getMessageFallbackKey = (message: ChatRecord): string =>
  [
    message.authorId ?? message.author_id ?? message.senderId ?? message.sender_id ?? "",
    message.sentAt ??
      message.sent_at ??
      message.createdAt ??
      message.created_at ??
      message.timestamp ??
      message.time ??
      "",
    message.text ?? message.content ?? message.message ?? "",
  ].join("|");

const getMessageIdentityKeys = (message: ChatRecord): string[] => {
  const keys = new Set<string>();
  const serverId = getMessageServerId(message);
  const clientId = getMessageClientId(message);

  if (serverId) keys.add(`id:${serverId}`);
  if (clientId) keys.add(`client:${clientId}`);
  if (keys.size === 0) keys.add(`fallback:${getMessageFallbackKey(message)}`);

  return Array.from(keys);
};

const mergeMessageAttachments = (current: unknown, incoming: unknown): ChatRecord[] => {
  const currentAttachments = Array.isArray(current) ? current : [];
  const incomingAttachments = Array.isArray(incoming) ? incoming : [];

  if (currentAttachments.length === 0) return incomingAttachments;
  if (incomingAttachments.length === 0) return currentAttachments;

  const merged = [...currentAttachments] as ChatRecord[];
  incomingAttachments.forEach((attachment) => {
    if (!attachment || typeof attachment !== "object") return;

    const attachmentId = String(
      attachment.id ?? attachment.Id ?? attachment.key ?? attachment.Key ?? "",
    ).trim();
    const attachmentUrl = String(
      attachment.url ?? attachment.Url ?? attachment.fileUrl ?? attachment.FileUrl ?? "",
    ).trim();
    const index = merged.findIndex((existing) => {
      const existingId = String(
        existing?.id ?? existing?.Id ?? existing?.key ?? existing?.Key ?? "",
      ).trim();
      const existingUrl = String(
        existing?.url ?? existing?.Url ?? existing?.fileUrl ?? existing?.FileUrl ?? "",
      ).trim();
      return (
        (attachmentId && existingId === attachmentId) ||
        (attachmentUrl && existingUrl === attachmentUrl)
      );
    });

    if (index >= 0) {
      merged[index] = { ...merged[index], ...attachment };
    } else {
      merged.push(attachment);
    }
  });

  return merged;
};

export const areChatMessagesSame = (
  first: ChatRecord | null | undefined,
  second: ChatRecord | null | undefined,
): boolean => {
  if (!first || !second) return false;
  const secondKeys = new Set(getMessageIdentityKeys(second));
  return getMessageIdentityKeys(first).some((key) => secondKeys.has(key));
};

const mergeMessageRecords = (current: ChatRecord, incoming: ChatRecord): ChatRecord => {
  const merged = { ...current, ...incoming };
  const attachments = mergeMessageAttachments(current.attachments, incoming.attachments);
  if (attachments.length > 0) merged.attachments = attachments;
  const clientMessageId = getMessageClientId(incoming) || getMessageClientId(current);

  // Normalization intentionally emits null when the server does not return a
  // client ID. Never let that erase the optimistic ID that links both copies.
  if (clientMessageId) merged.clientMessageId = clientMessageId;

  // Receipt state is monotonic for a message. A late cache/history response must
  // never regress a blue tick to sent/delivered after a realtime read event.
  const currentStatus = getReceiptStatus(current);
  const incomingStatus = getReceiptStatus(incoming);
  if (receiptStatusRank(currentStatus) > receiptStatusRank(incomingStatus)) {
    merged.deliveryStatus = currentStatus;
  }

  // Reaction updates are broadcast as complete message snapshots. When several
  // users react at nearly the same time, SignalR can deliver those snapshots out
  // of order. Keep the newer reaction snapshot instead of letting an older one
  // erase reactions that were already received.
  const currentUpdatedAt = getMessageUpdatedAt(current);
  const incomingUpdatedAt = getMessageUpdatedAt(incoming);
  if (currentUpdatedAt > incomingUpdatedAt) {
    merged.updatedAt = current.updatedAt ?? current.updated_at;
    if (Array.isArray(current.reactions)) merged.reactions = current.reactions;
  }

  return merged;
};

export function sortMessagesByTime<T extends ChatRecord>(messages: T[]): T[] {
  return messages
    .map((message, index) => ({ message, index, time: getMessageTimestamp(message) }))
    .sort((first, second) => {
      const firstClientSequence = Number(
        first.message.clientSequence ?? first.message.metadata?.clientSequence,
      );
      const secondClientSequence = Number(
        second.message.clientSequence ?? second.message.metadata?.clientSequence,
      );
      const firstAuthorId = String(first.message.authorId ?? first.message.author_id ?? "");
      const secondAuthorId = String(second.message.authorId ?? second.message.author_id ?? "");

      // Concurrent sends can receive responses out of order. Keep messages
      // submitted by the same client in submission order while still using
      // server timestamps for all other messages.
      if (
        firstAuthorId &&
        firstAuthorId === secondAuthorId &&
        Number.isFinite(firstClientSequence) &&
        Number.isFinite(secondClientSequence) &&
        firstClientSequence !== secondClientSequence
      ) {
        return firstClientSequence - secondClientSequence;
      }

      if (first.time !== second.time) {
        if (first.time === 0) return 1;
        if (second.time === 0) return -1;
        return first.time - second.time;
      }

      return first.index - second.index;
    })
    .map(({ message }) => message);
}

/**
 * Merge history, cache, optimistic state, and realtime messages while keeping
 * one ASC list. A server ID and its clientMessageId are aliases, so a REST or
 * SignalR confirmation cannot create a second row for the optimistic message.
 */
export function mergeChatMessages(...groups: ChatRecord[][]): ChatRecord[] {
  let merged: ChatRecord[] = [];

  for (const group of groups) {
    for (const message of group || []) {
      if (!message) continue;

      const incomingKeys = new Set(getMessageIdentityKeys(message));
      const matchingIndexes = merged.reduce<number[]>((indexes, candidate, index) => {
        if (getMessageIdentityKeys(candidate).some((key) => incomingKeys.has(key))) {
          indexes.push(index);
        }
        return indexes;
      }, []);

      if (matchingIndexes.length === 0) {
        merged.push(message);
        continue;
      }

      const firstIndex = matchingIndexes[0];
      const matchingSet = new Set(matchingIndexes);
      const combined = matchingIndexes.reduce(
        (current, index) => mergeMessageRecords(current, merged[index]),
        {} as ChatRecord,
      );
      const nextMessage = mergeMessageRecords(combined, message);
      const insertionIndex = merged
        .slice(0, firstIndex)
        .filter((_, index) => !matchingSet.has(index)).length;

      merged = merged.filter((_, index) => !matchingSet.has(index));
      merged.splice(insertionIndex, 0, nextMessage);
    }
  }

  return sortMessagesByTime(merged);
}

export const getOptimisticMessageKeys = (selectedChat: ChatRecord | null | undefined): string[] =>
  Array.from(new Set([selectedChat?.id, selectedChat?.chatId].filter(Boolean).map(String)));

export const createClientMessageId = (): string =>
  `client-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`}`;

export const createOptimisticMessage = ({
  selectedChat,
  currentUser,
  currentUserId,
  text,
  hasFiles,
  clientMessageId,
  clientSequence,
  metadata,
}: {
  selectedChat: ChatRecord;
  currentUser?: ChatRecord | null;
  currentUserId: string;
  text: string;
  hasFiles: boolean;
  clientMessageId: string;
  clientSequence: number;
  metadata: ChatRecord;
}): ChatRecord => {
  const createdAt = new Date().toISOString();

  return {
    id: clientMessageId,
    clientMessageId,
    chatId:
      selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId || selectedChat.id,
    chat_id:
      selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId || selectedChat.id,
    text: text || (hasFiles ? "[Attachment]" : ""),
    createdAt,
    sentAt: createdAt,
    timestamp: new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    authorId: currentUserId,
    authorName: currentUser?.name || currentUser?.displayName || "You",
    direction: "outbound",
    deliveryStatus: "pending",
    sendState: "pending",
    clientSequence,
    reactions: [],
    metadata,
    attachments: [],
  };
};

export const updateMessageByClientId = (
  state: Record<string, ChatRecord[]>,
  keys: string[],
  clientMessageId: string,
  update: (message: ChatRecord) => ChatRecord,
): Record<string, ChatRecord[]> => {
  const next = { ...state };
  keys.forEach((key) => {
    const normalizedClientId = String(clientMessageId);
    const updated = (state[key] || []).map((message) => {
      const messageClientId = getMessageClientId(message);
      const messageId = getMessageServerId(message);
      return messageClientId === normalizedClientId || messageId === normalizedClientId
        ? update(message)
        : message;
    });

    next[key] = mergeChatMessages(updated);
  });
  return next;
};
