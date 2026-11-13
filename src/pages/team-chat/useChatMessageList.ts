import { normalizeChatMessages } from "./chatMessageNormalization";
import { mergeChatMessages } from "./chatMessageState";
import { getChatStateKeys } from "./chatConversationKeys";

export function useChatMessageList({ selectedChat, messagesByChat }: any) {
  const selectedLastMessage =
    selectedChat?.lastMessage ||
    selectedChat?.last_message ||
    selectedChat?.raw?.lastMessage ||
    selectedChat?.raw?.last_message;

  const messageStateKeys = getChatStateKeys(selectedChat);
  const storedMessages = mergeChatMessages(
    ...messageStateKeys.map((key) => (Array.isArray(messagesByChat[key]) ? messagesByChat[key] : [])),
  );
  const currentMessages = selectedChat
    ? (storedMessages.length ? storedMessages : undefined) ||
      (selectedLastMessage ? normalizeChatMessages([selectedLastMessage], selectedChat) : [])
    : [];

  return { currentMessages, messageStateKeys };
}
