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
    ({ chatId, message }: any) => {
      if (!chatId || !message) return;

      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      const normalizedMessage = normalizeRealtimeMessage(message, {
        ...(selectedChat || {}),
        id: localKey || selectedChat?.id,
        currentUserId,
      });

      if (!localKey || !normalizedMessage) return;

      setMessagesByChat((previous: Record<string, any[]>) => ({
        ...previous,
        [localKey]: (previous[localKey] || []).map((item) =>
          String(item.id) === String(normalizedMessage.id)
            ? { ...item, ...normalizedMessage }
            : item,
        ),
      }));
    },
    [buddies, channels, currentUserId, selectedChat, setMessagesByChat],
  );
}
