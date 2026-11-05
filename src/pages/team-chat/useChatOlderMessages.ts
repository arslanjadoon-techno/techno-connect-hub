import { useCallback } from "react";
import { getChatMessagesService } from "@/services/Team-chat/chat.service";
import { normalizeChatError } from "./chatHealper";
import { normalizeChatMessages } from "./chatMessageNormalization";
import { getChatStateKeys } from "./chatConversationKeys";

export function useChatOlderMessages({
  selectedChat,
  loadingOlderMessages,
  messagePaginationByChat,
  chatBoxRef,
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
    const previousHeight = chatBoxRef.current?.scrollHeight || 0;
    setLoadingOlderMessages(true);
    try {
      const response: any = await getChatMessagesService(chatId, {
        limit: 50,
        before: pagination.nextCursor,
      });
      const payload = response.data?.data;
      const olderMessages = filterBlockedMessages(normalizeChatMessages(payload, selectedChat));

      setMessagesByChat((previous: Record<string, any[]>) => {
        const stateKeys = getChatStateKeys(selectedChat);
        const existingById = new Map<string, any>();
        stateKeys.forEach((key) => {
          (previous[key] || []).forEach((message: any) => {
            existingById.set(String(message.id), message);
          });
        });

        const existing = Array.from(existingById.values());
        const existingIds = new Set(existing.map((message) => String(message.id)));
        const uniqueOlder = olderMessages.filter(
          (message: any) => !existingIds.has(String(message.id)),
        );
        const merged = [...uniqueOlder, ...existing];
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

      requestAnimationFrame(() => {
        if (chatBoxRef.current) {
          chatBoxRef.current.scrollTop += chatBoxRef.current.scrollHeight - previousHeight;
        }
      });
    } catch (error) {
      setSendError(normalizeChatError(error));
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [
    chatBoxRef,
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
