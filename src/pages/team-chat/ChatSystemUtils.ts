export type ChatRecord = Record<string, any>;

export const PENDING_CALL_STORAGE_KEY = "pingly_pending_call";

export function getMessageTimestamp(message: ChatRecord | null | undefined): number {
  const value =
    message?.createdAt ||
    message?.created_at ||
    message?.sentAt ||
    message?.sent_at ||
    message?.timestamp ||
    message?.time;
  const numericValue = Number(value);
  const timestamp =
    Number.isFinite(numericValue) && numericValue > 0
      ? numericValue < 1e12
        ? numericValue * 1000
        : numericValue
      : value
        ? new Date(value).getTime()
        : NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getConversationActivityTime(conversation: ChatRecord | null | undefined): number {
  const value =
    conversation?.lastMessage?.createdAt ||
    conversation?.lastMessage?.created_at ||
    conversation?.last_message?.createdAt ||
    conversation?.last_message?.created_at ||
    conversation?.lastMessageAt ||
    conversation?.last_message_at ||
    conversation?.lastMessageTime ||
    conversation?.last_message_time ||
    conversation?.updatedAt ||
    conversation?.updated_at;
  if (value == null || value === "") return 0;
  const numericValue = Number(value);
  if (Number.isFinite(numericValue))
    return numericValue < 1e12 ? numericValue * 1000 : numericValue;
  const parsedValue = new Date(value).getTime();
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function normalizeCall(call: ChatRecord | null | undefined): ChatRecord | null | undefined {
  if (!call) return null;
  const chatId = call.chatId || call.chat_id || call.conversationId || call.conversation_id;
  return chatId ? { ...call, chatId: String(chatId) } : call;
}

export const hasConversationHistory = (conversation: ChatRecord | null | undefined): boolean =>
  Boolean(
    conversation?.lastMessage ||
    conversation?.last_message ||
    conversation?.lastMessageAt ||
    conversation?.last_message_at,
  );

const escapeMentionRegExp = (value: unknown): string =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function messageMentionsUser(
  message: ChatRecord | null | undefined,
  userId: string,
  userEmail: string,
): boolean {
  const mentions = message?.metadata?.mentions || message?.mentions || [];
  if (!Array.isArray(mentions)) return false;
  return mentions.some((mention) => {
    const mentionId = String(mention?.userId || mention?.user_id || mention?.id || "");
    const mentionEmail = String(mention?.email || "")
      .trim()
      .toLowerCase();
    return (userId && mentionId === userId) || (userEmail && mentionEmail === userEmail);
  });
}

export function textContainsMention(text: unknown, label: unknown): boolean {
  const normalizedLabel = String(label || "").trim();
  if (!normalizedLabel) return false;
  return new RegExp(
    `(?:^|\\s)@${escapeMentionRegExp(normalizedLabel)}(?=\\s|$|[.,!?;:])`,
    "i",
  ).test(String(text || ""));
}

export function isMessageReadByUser(
  message: ChatRecord | null | undefined,
  currentUserId: string,
  currentUserEmail: string,
): boolean {
  if (message?.isRead === true || message?.is_read === true || message?.read === true) return true;
  const readers = [
    message?.readBy,
    message?.read_by,
    message?.readStates,
    message?.read_states,
    message?.readReceipts,
    message?.read_receipts,
  ].find(Array.isArray);
  if (!readers) return false;
  return readers.some((reader) => {
    const readerId = String(
      typeof reader === "object"
        ? reader?.userId || reader?.user_id || reader?.id || reader?.appUserId
        : reader,
    );
    const readerEmail = String(
      typeof reader === "object" ? reader?.email || reader?.email_id || reader?.mailid : "",
    ).toLowerCase();
    return (
      (currentUserId && readerId === currentUserId) ||
      (currentUserEmail && readerEmail === currentUserEmail)
    );
  });
}

export function getConversationIdFromResponse(
  response: ChatRecord | null | undefined,
): string | number | null {
  const root = response?.data;
  const payload = root?.data;
  const candidates = [
    payload?.chat_id,
    payload?.chatId,
    payload?.conversation_id,
    payload?.conversationId,
    payload?.id,
    payload?.conversation?.chat_id,
    payload?.conversation?.chatId,
    payload?.conversation?.conversation_id,
    payload?.conversation?.conversationId,
    payload?.conversation?.id,
    payload?.data?.chat_id,
    payload?.data?.chatId,
    payload?.data?.conversation_id,
    payload?.data?.conversationId,
    payload?.data?.id,
  ];
  return candidates.find((value) => value !== undefined && value !== null && value !== "") || null;
}
