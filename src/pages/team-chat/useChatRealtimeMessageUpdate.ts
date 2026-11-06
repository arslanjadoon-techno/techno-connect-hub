import { useCallback } from "react";
import { normalizeRealtimeMessage, resolveLocalChatKey } from "./chatMessageNormalization";

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
      const wrappedMessage = payload?.message;
      const message =
        wrappedMessage && typeof wrappedMessage === "object" ? wrappedMessage : payload;
      const chatId =
        payload?.chatId ??
        payload?.chat_id ??
        message?.chatId ??
        message?.chat_id ??
        message?.conversationId ??
        message?.conversation_id;

      if (!chatId || !message) return;

      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      const normalizedMessage = normalizeRealtimeMessage(message, {
        ...(selectedChat || {}),
        id: localKey || selectedChat?.id,
        currentUserId,
      });

      if (!localKey || !normalizedMessage) return;

      const stateKeys = Array.from(
        new Set(
          [localKey, chatId, selectedChat?.id, selectedChat?.chatId]
            .filter(Boolean)
            .map(String),
        ),
      );

      setMessagesByChat((previous: Record<string, any[]>) => {
        const next = { ...previous };
        stateKeys.forEach((key) => {
          next[key] = (previous[key] || []).map((item) =>
            String(item.id) === String(normalizedMessage.id)
              ? { ...item, ...normalizedMessage }
              : item,
          );
        });
        return next;
      });
    },
    [buddies, channels, currentUserId, selectedChat, setMessagesByChat],
  );
}
