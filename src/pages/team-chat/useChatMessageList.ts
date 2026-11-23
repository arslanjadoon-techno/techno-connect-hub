import { messageBelongsToChat, normalizeChatMessages } from "./chatMessageNormalization";
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
    ...messageStateKeys.map((key) =>
      Array.isArray(messagesByChat[key]) ? messagesByChat[key] : [],
    ),
  );
  const scopedMessages = storedMessages.filter((message) =>
    messageBelongsToChat(message, selectedChat),
  );
  const fallbackMessages = selectedLastMessage
    ? normalizeChatMessages([selectedLastMessage], selectedChat).filter((message) =>
        messageBelongsToChat(message, selectedChat),
      )
    : [];
  const currentMessages = selectedChat
    ? (scopedMessages.length ? scopedMessages : undefined) || fallbackMessages
    : [];

  return { currentMessages, messageStateKeys };
}
