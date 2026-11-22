import { useCallback } from "react";
import { normalizeRealtimeMessage, resolveLocalChatKey } from "./chatMessageNormalization";
import { getCachedChatMessages, saveCachedChatMessages } from "./chatMessageIndexedDb";
import { mergeChatMessages } from "./chatMessageState";
import { getRealtimeConversationId, getRealtimeMessage } from "./chatRealtimePayload";

export function useChatRealtimeMessageUpdate({
  channels,
  buddies,
  currentUserId,
  selectedChat,
  setMessagesByChat,
}: any) {
  return useCallback(
    (payload: any = {}) => {
      // Accept both wrapped notifications and raw message DTOs from realtime
      // producers during deployments and system-message fanout.
      const message = getRealtimeMessage(payload);
      const chatId = getRealtimeConversationId(payload, message);

      if (!chatId || !message) return;

      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      const normalizedMessage = normalizeRealtimeMessage(message, {
        ...(selectedChat || {}),
        id: localKey || selectedChat?.id || chatId,
        currentUserId,
      });

      if (!normalizedMessage) return;

      const stateKeys = Array.from(
        new Set(
          [localKey, chatId, selectedChat?.id, selectedChat?.chatId].filter(Boolean).map(String),
        ),
      );

      setMessagesByChat((previous: Record<string, any[]>) => {
        const next = { ...previous };
        stateKeys.forEach((key) => {
          const current = previous[key] || [];
          // message:updated contains the authoritative message, including its
          // complete reaction list. Merge it even when one local alias bucket
          // has not been populated yet; this is common for direct chats.
          next[key] = mergeChatMessages(current, [normalizedMessage]);
        });
        return next;
      });

      // A delete/edit can arrive through realtime while this client is not
      // viewing the conversation. Persist the server update so reopening the
      // chat does not restore stale IndexedDB content.
      void Promise.all(
        stateKeys.map(async (key) => {
          const cached = await getCachedChatMessages(key);
          if (cached.length === 0) return;

          const updated = mergeChatMessages(cached, [normalizedMessage]);

          const ordered = mergeChatMessages(updated);
          if (ordered.some((item, index) => item !== cached[index])) {
            await saveCachedChatMessages(key, ordered);
          }
        }),
      ).catch((error) => {
        console.warn("Could not update cached chat message", error);
      });
    },
    [buddies, channels, currentUserId, selectedChat, setMessagesByChat],
  );
}
