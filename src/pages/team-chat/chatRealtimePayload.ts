type ChatRecord = Record<string, unknown>;

const asRecord = (value: unknown): ChatRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as ChatRecord) : {};

const firstValue = (...values: unknown[]): string => {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
};

/** Unwrap the message shape emitted by current and legacy realtime producers. */
export const getRealtimeMessage = (payload: unknown): ChatRecord => {
  const event = asRecord(payload);
  const data = asRecord(event.data);
  const wrappedMessage =
    event.message || event.Message || data.message || data.Message;
  const messageRecord = asRecord(wrappedMessage);

  return Object.keys(messageRecord).length > 0
    ? messageRecord
    : Object.keys(data).length > 0
      ? data
      : event;
};

/** Always prefer the persisted conversation ID over participant/user aliases. */
export const getRealtimeConversationId = (
  payload: unknown,
  message?: ChatRecord,
): string => {
  const event = asRecord(payload);
  const data = asRecord(event.data);
  const resolvedMessage = message || getRealtimeMessage(payload);

  return firstValue(
    resolvedMessage.conversationId,
    resolvedMessage.conversation_id,
    resolvedMessage.ConversationId,
    event.conversationId,
    event.conversation_id,
    event.ConversationId,
    data.conversationId,
    data.conversation_id,
    data.ConversationId,
    event.chatId,
    event.chat_id,
    event.ChatId,
    data.chatId,
    data.chat_id,
    data.ChatId,
    resolvedMessage.chatId,
    resolvedMessage.chat_id,
    resolvedMessage.ChatId,
  );
};

export const getRealtimeMessageId = (
  payload: unknown,
  message?: ChatRecord,
): string => {
  const event = asRecord(payload);
  const resolvedMessage = message || getRealtimeMessage(payload);

  return firstValue(
    resolvedMessage.id,
    resolvedMessage.messageId,
    resolvedMessage.message_id,
    resolvedMessage.MessageId,
    resolvedMessage.clientMessageId,
    resolvedMessage.client_message_id,
    event.messageId,
    event.message_id,
    event.MessageId,
  );
};

export const getRealtimeReaction = (payload: unknown): ChatRecord => {
  const event = asRecord(payload);
  return asRecord(event.reaction || event.Reaction || event.reactionAdded || event.ReactionAdded);
};

export const getRealtimeReactionEmoji = (reaction: ChatRecord): string =>
  firstValue(reaction.emoji, reaction.Emoji);

