import { normalizeChatMessages } from "./chatMessageNormalization";
import { getChatStateKeys } from "./chatConversationKeys";

export function useChatMessageList({ selectedChat, messagesByChat }: any) {
  const selectedLastMessage =
    selectedChat?.lastMessage ||
    selectedChat?.last_message ||
    selectedChat?.raw?.lastMessage ||
    selectedChat?.raw?.last_message;

  const messageStateKeys = getChatStateKeys(selectedChat);
  const mergedMessages = new Map<string, any>();
  messageStateKeys.forEach((key) => {
    const messages = messagesByChat[key];
    if (!Array.isArray(messages)) return;

    messages.forEach((message: any) => {
      const messageKey = String(
        message?.id ||
          message?.messageId ||
          message?.message_id ||
          message?.clientMessageId ||
          `${message?.authorId || message?.senderId || message?.sender?.id || ""}:` +
            `${message?.sentAt || message?.createdAt || "missing-time"}:` +
            `${message?.text || message?.content || ""}`,
      );
      mergedMessages.set(messageKey, {
        ...mergedMessages.get(messageKey),
        ...message,
      });
    });
  });
  const storedMessages = Array.from(mergedMessages.values()).sort((first, second) => {
    const firstTime = new Date(
      first.sentAt || first.createdAt || first.created_at || first.timestamp || 0,
    ).getTime();
    const secondTime = new Date(
      second.sentAt || second.createdAt || second.created_at || second.timestamp || 0,
    ).getTime();
    return (Number.isFinite(firstTime) ? firstTime : 0) -
      (Number.isFinite(secondTime) ? secondTime : 0);
  });
  const currentMessages = selectedChat
    ? (storedMessages.length ? storedMessages : undefined) ||
      (selectedLastMessage ? normalizeChatMessages([selectedLastMessage], selectedChat) : [])
    : [];

  return { currentMessages, messageStateKeys };
}
