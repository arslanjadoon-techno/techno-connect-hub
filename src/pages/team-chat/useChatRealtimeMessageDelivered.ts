import { useCallback } from "react";
import { resolveLocalChatKey } from "./chatMessageNormalization";

export function useChatRealtimeMessageDelivered({
  channels,
  buddies,
  currentUserId,
  setMessagesByChat,
}: any) {
  return useCallback(
    ({ chatId, messageId }: any) => {
      if (!chatId || !messageId) return;
      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      if (!localKey) return;

      setMessagesByChat((previous: Record<string, any[]>) => ({
        ...previous,
        [localKey]: (previous[localKey] || []).map((message) =>
          String(message.id) === String(messageId) && message.deliveryStatus !== "seen"
            ? { ...message, deliveryStatus: "delivered" }
            : message,
        ),
      }));
    },
    [buddies, channels, currentUserId, setMessagesByChat],
  );
}
