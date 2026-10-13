export type ChatRecord = Record<string, any>;

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
}): ChatRecord => ({
  id: clientMessageId,
  clientMessageId,
  chatId: selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId || selectedChat.id,
  chat_id: selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId || selectedChat.id,
  text: text || (hasFiles ? "[Attachment]" : ""),
  sentAt: new Date().toISOString(),
  timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  authorId: currentUserId,
  authorName: currentUser?.name || currentUser?.displayName || "You",
  direction: "outbound",
  deliveryStatus: "sending",
  sendState: "sending",
  reactions: [],
  metadata,
  attachments: [],
});

export const updateMessageByClientId = (
  state: Record<string, ChatRecord[]>,
  keys: string[],
  clientMessageId: string,
  update: (message: ChatRecord) => ChatRecord,
): Record<string, ChatRecord[]> => {
  const next = { ...state };
  keys.forEach((key) => {
    next[key] = (state[key] || []).map((message) =>
      message.id === clientMessageId ? update(message) : message,
    );
  });
  return next;
};
