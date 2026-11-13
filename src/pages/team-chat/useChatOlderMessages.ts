import { useCallback } from "react";
import { getChatMessagesService } from "@/services/Team-chat/chat.service";
import { normalizeChatError } from "./chatHealper";
import {
  normalizeChatMessages,
  unwrapChatMessagesResponse,
} from "./chatMessageNormalization";
import { mergeChatMessages } from "./chatMessageState";
import { saveCachedChatMessages } from "./chatMessageIndexedDb";
import { getChatStateKeys } from "./chatConversationKeys";

export function useChatOlderMessages({
  selectedChat,
  loadingOlderMessages,
  messagePaginationByChat,
  filterBlockedMessages,
  setLoadingOlderMessages,
  setMessagesByChat,
  setMessagePaginationByChat,
  setSendError,
}: any) {
  return useCallback(async () => {
    if (!selectedChat || loadingOlderMessages) return;
    const chatKey = selectedChat.id;
    const pagination = messagePaginationByChat[chatKey];
    if (!pagination?.hasMore || !pagination.nextCursor) return;

    const chatId = selectedChat.chatId || selectedChat.id;
    setLoadingOlderMessages(true);
    try {
      const response: any = await getChatMessagesService(chatId, {
        limit: 100,
        before: pagination.nextCursor,
      });
      const payload = unwrapChatMessagesResponse(response);
      const olderMessages = filterBlockedMessages(normalizeChatMessages(payload, selectedChat));

      setMessagesByChat((previous: Record<string, any[]>) => {
        const stateKeys = getChatStateKeys(selectedChat);
        const existing = mergeChatMessages(
          ...stateKeys.map((key) => previous[key] || []),
        );
        const merged = mergeChatMessages(olderMessages, existing);
        const next = { ...previous };
        stateKeys.forEach((key) => {
          next[key] = merged;
        });
        return next;
      });
      setMessagePaginationByChat((previous: Record<string, any>) => ({
        ...previous,
        [chatKey]: payload?.pagination || { hasMore: false },
      }));

      // Keep successfully paged older messages available after a reload. The
      // IndexedDB writer merges against the latest row, so this cannot replace
      // newer realtime/history messages that arrived concurrently.
      if (selectedChat.type !== "channel") {
        void Promise.all(
          getChatStateKeys(selectedChat).map((key) => saveCachedChatMessages(key, olderMessages)),
        ).catch((error) => {
          console.warn("Could not cache older chat messages", error);
        });
      }

    } catch (error) {
      setSendError(normalizeChatError(error));
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [
    filterBlockedMessages,
    loadingOlderMessages,
    messagePaginationByChat,
    selectedChat,
    setLoadingOlderMessages,
    setMessagePaginationByChat,
    setMessagesByChat,
    setSendError,
  ]);
}
