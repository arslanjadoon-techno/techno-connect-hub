import { normalizeChatMessages } from "./chatMessageNormalization";
import { getChatStateKeys } from "./chatConversationKeys";

export function useChatMessageList({ selectedChat, messagesByChat }: any) {
  const selectedLastMessage =
    selectedChat?.lastMessage ||
    selectedChat?.last_message ||
    selectedChat?.raw?.lastMessage ||
    selectedChat?.raw?.last_message;

  const messageStateKeys = getChatStateKeys(selectedChat);
  const storedMessages = messageStateKeys
    .map((key) => messagesByChat[key])
    .filter(Array.isArray)
    .sort((a, b) => b.length - a.length)[0];
  const currentMessages = selectedChat
    ? (storedMessages?.length ? storedMessages : undefined) ||
      (selectedLastMessage ? normalizeChatMessages([selectedLastMessage], selectedChat) : [])
    : [];

  return { currentMessages, messageStateKeys };
}
