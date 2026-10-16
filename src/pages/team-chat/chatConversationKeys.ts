export type ChatRecord = Record<string, any>;

export const getConversationId = (chat: ChatRecord | null | undefined) =>
  chat?.type === "channel" ? chat.id : chat?.chatId || null;

export const getChatStateKeys = (chat: ChatRecord | null | undefined): string[] =>
  Array.from(new Set([chat?.chatId, chat?.id].filter(Boolean).map(String)));
