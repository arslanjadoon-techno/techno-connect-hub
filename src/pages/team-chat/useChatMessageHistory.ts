import { getChatMessagesService } from "@/services/Team-chat/chat.service";
import { normalizeChatMessages } from "./chatMessageNormalization";
import { getCachedChatMessages, saveCachedChatMessages } from "./chatMessageIndexedDb";

type ChatMessage = Record<string, any>;
type ChatMessageMap = Record<string, ChatMessage[]>;

type UseChatMessageHistoryProps = {
  selectedChat: ChatMessage | null;
  setMessagesByChat: React.Dispatch<React.SetStateAction<ChatMessageMap>>;
};

console.log("[ChatCache] History module loaded");

function getMessageKey(message: ChatMessage): string {
  const id =
    message.id ??
    message.messageId ??
    message.message_id ??
    message.clientMessageId ??
    message.client_message_id;

  if (id !== undefined && id !== null && id !== "") {
    return `id:${String(id)}`;
  }

  return [
    message.senderId ?? message.sender_id ?? "",
    message.createdAt ?? message.created_at ?? message.sentAt ?? message.sent_at ?? "",
    message.content ?? message.message ?? message.text ?? "",
  ].join("|");
}

function mergeMessages(...groups: ChatMessage[][]): ChatMessage[] {
  const merged = new Map<string, ChatMessage>();

  for (const group of groups) {
    for (const message of group) {
      const key = getMessageKey(message);

      merged.set(key, {
        ...merged.get(key),
        ...message,
      });
    }
  }

  return Array.from(merged.values());
}

export function useChatMessageHistory({
  selectedChat,
  setMessagesByChat,
}: UseChatMessageHistoryProps) {
  console.log("[ChatCache] History hook rendered", selectedChat?.id);

  const refreshSelectedChatMessages = async (chatId: string | number): Promise<void> => {
    const chat = selectedChat;

    if (chatId === undefined || chatId === null || String(chatId).trim() === "" || !chat) {
      console.warn("[ChatCache] History skipped: chat ID or selected chat is missing");
      return;
    }

    const primaryChatId = String(chat.id ?? chatId);
    const requestedChatId = String(chatId);

    console.log("[ChatCache] Refresh started", primaryChatId);

    // 1. Load cached messages first.
    try {
      const cachedMessages = await getCachedChatMessages(primaryChatId);

      console.log("[ChatCache] Cached messages found:", cachedMessages.length);

      if (cachedMessages.length > 0) {
        setMessagesByChat((prev) => {
          const existing = mergeMessages(prev[primaryChatId] ?? [], prev[requestedChatId] ?? []);

          const merged = mergeMessages(cachedMessages, existing);

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

    // 2. Fetch the latest server history.
    try {
      console.log("[ChatCache] Requesting server history:", chatId);

      const response: any = await getChatMessagesService(chatId, {
        limit: 100,
      });

      const responseData = response?.data?.data ?? response?.data ?? response;

      const normalizedMessages: ChatMessage[] = normalizeChatMessages(responseData, chat);

      console.log("[ChatCache] Server messages received:", normalizedMessages.length);

      // 3. Merge with the latest React state.
      // Keep existing real-time and cached messages.
      setMessagesByChat((prev) => {
        const existing = mergeMessages(prev[primaryChatId] ?? [], prev[requestedChatId] ?? []);

        const merged = mergeMessages(existing, normalizedMessages);

        return {
          ...prev,
          [primaryChatId]: merged,
          [requestedChatId]: merged,
        };
      });

      // 4. Persist the latest history.
      // Do not depend on React's state updater running synchronously.
      const latestCachedMessages = await getCachedChatMessages(primaryChatId);

      const messagesToSave = mergeMessages(latestCachedMessages, normalizedMessages);

      await saveCachedChatMessages(primaryChatId, messagesToSave);

      console.log("[ChatCache] IndexedDB save completed:", primaryChatId, messagesToSave.length);
    } catch (error) {
      console.error("[ChatCache] Server history refresh failed:", error);
    }
  };

  return {
    refreshSelectedChatMessages,
  };
}
