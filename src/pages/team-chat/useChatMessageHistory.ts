import { useCallback } from "react";
import { getChatMessagesService } from "@/services/Team-chat/chat.service";
import {
  normalizeChatMessages,
  unwrapChatMessagesResponse,
} from "./chatMessageNormalization";
import { mergeChatMessages } from "./chatMessageState";
import { getCachedChatMessages, saveCachedChatMessages } from "./chatMessageIndexedDb";

type ChatMessage = Record<string, any>;
type ChatMessageMap = Record<string, ChatMessage[]>;

type UseChatMessageHistoryProps = {
  selectedChat: ChatMessage | null;
  setMessagesByChat: React.Dispatch<React.SetStateAction<ChatMessageMap>>;
};

export function useChatMessageHistory({
  selectedChat,
  setMessagesByChat,
}: UseChatMessageHistoryProps) {
  const refreshSelectedChatMessages = useCallback(
    async (chatId: string | number): Promise<void> => {
      const chat = selectedChat;

      if (chatId === undefined || chatId === null || String(chatId).trim() === "" || !chat) {
        console.warn("[ChatCache] History skipped: chat ID or selected chat is missing");
        return;
      }

      const primaryChatId = String(chat.id ?? chatId);
      const requestedChatId = String(chatId);
      const isGroupConversation = chat.type === "channel";

      // Group history is participant-scoped on the server. Never reintroduce an
      // older cached page after the API has applied the member's join cutoff.
      if (!isGroupConversation) {
        try {
          const cachedMessages = await getCachedChatMessages(primaryChatId);

          if (cachedMessages.length > 0) {
            setMessagesByChat((prev) => {
              const existing = mergeChatMessages(
                prev[primaryChatId] ?? [],
                prev[requestedChatId] ?? [],
              );

              const merged = mergeChatMessages(cachedMessages, existing);

              return {
                ...prev,
                [primaryChatId]: merged,
                [requestedChatId]: merged,
              };
            });
          }
        } catch (error) {
          // Cache failure must not prevent server history loading.
          console.error("[ChatCache] Failed to read IndexedDB:", error);
        }
      }

      // 2. Fetch the latest server history.
      try {
        const response: any = await getChatMessagesService(chatId, {
          limit: 100,
        });

        const responseData = unwrapChatMessagesResponse(response);

        const normalizedMessages: ChatMessage[] = normalizeChatMessages(responseData, chat);

        // 3. Merge with the latest React state for direct chats only. Group state
        // must be replaced by the participant-filtered server page.
        setMessagesByChat((prev) => {
          const existing = mergeChatMessages(
            prev[primaryChatId] ?? [],
            prev[requestedChatId] ?? [],
          );

          const merged = isGroupConversation
            ? mergeChatMessages(normalizedMessages)
            : mergeChatMessages(existing, normalizedMessages);

          return {
            ...prev,
            [primaryChatId]: merged,
            [requestedChatId]: merged,
          };
        });

        // 4. Persist the latest history.
        // Do not depend on React's state updater running synchronously.
        if (!isGroupConversation) {
          const latestCachedMessages = await getCachedChatMessages(primaryChatId);
          const messagesToSave = mergeChatMessages(latestCachedMessages, normalizedMessages);
          await saveCachedChatMessages(primaryChatId, messagesToSave);
        }
      } catch (error) {
        console.error("[ChatCache] Server history refresh failed:", error);
      }
    },
    [selectedChat, setMessagesByChat],
  );

  return {
    refreshSelectedChatMessages,
  };
}
