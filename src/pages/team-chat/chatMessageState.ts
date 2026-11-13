import { getMessageTimestamp } from "./ChatSystemUtils";

export type ChatRecord = Record<string, any>;

const nonEmptyString = (value: unknown): string => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : "";
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
  const clientMessageId = getMessageClientId(incoming) || getMessageClientId(current);

  // Normalization intentionally emits null when the server does not return a
  // client ID. Never let that erase the optimistic ID that links both copies.
  if (clientMessageId) merged.clientMessageId = clientMessageId;

  return merged;
};

export function sortMessagesByTime<T extends ChatRecord>(messages: T[]): T[] {
  return messages
    .map((message, index) => ({ message, index, time: getMessageTimestamp(message) }))
    .sort((first, second) => {
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
  metadata,
}: {
  selectedChat: ChatRecord;
  currentUser?: ChatRecord | null;
  currentUserId: string;
  text: string;
  hasFiles: boolean;
  clientMessageId: string;
  metadata: ChatRecord;
}): ChatRecord => {
  const createdAt = new Date().toISOString();

  return {
    id: clientMessageId,
    clientMessageId,
    chatId: selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId || selectedChat.id,
    chat_id: selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId || selectedChat.id,
    text: text || (hasFiles ? "[Attachment]" : ""),
    createdAt,
    sentAt: createdAt,
    timestamp: new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    authorId: currentUserId,
    authorName: currentUser?.name || currentUser?.displayName || "You",
    direction: "outbound",
    deliveryStatus: "sending",
    sendState: "sending",
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
