import { getChatMessagesService } from "@/services/Team-chat/chat.service";
import { normalizeChatMessages } from "./chatMessageNormalization";

export function useChatMessageHistory({ selectedChat, setMessagesByChat }: any) {
  const refreshSelectedChatMessages = async (chatId: string | number) => {
    if (!chatId || !selectedChat) return;

    const messagesResponse: any = await getChatMessagesService(chatId, { limit: 100 });
    const normalizedMessages = normalizeChatMessages(
      messagesResponse?.data?.data ?? messagesResponse?.data ?? messagesResponse,
      selectedChat,
    );
    setMessagesByChat((prev: Record<string, any[]>) => {
      const existing = prev[chatId] || prev[selectedChat.id] || [];
      const merged = normalizedMessages.length >= existing.length ? normalizedMessages : existing;
      return { ...prev, [selectedChat.id]: merged, [chatId]: merged };
    });
  };

  return { refreshSelectedChatMessages };
}
