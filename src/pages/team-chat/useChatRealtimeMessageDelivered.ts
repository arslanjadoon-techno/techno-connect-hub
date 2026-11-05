import { useCallback } from "react";
import { resolveLocalChatKey } from "./chatMessageNormalization";

export function useChatRealtimeMessageDelivered({
  channels,
  buddies,
  currentUserId,
  setMessagesByChat,
}: any) {
  return useCallback(
    ({ chatId, messageId, status }: any) => {
      if (!chatId || !messageId) return;
      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      if (!localKey) return;

      setMessagesByChat((previous: Record<string, any[]>) => {
        const next = { ...previous };
        let updated = false;

        // History can be indexed by conversation id and by the local
        // buddy/channel id. Update every matching copy so a receipt cannot be
        // lost because the server and UI used different chat keys.
        Object.keys(next).forEach((key) => {
          const messages = next[key];
          if (!Array.isArray(messages)) return;

          const mapped = messages.map((message) => {
            if (
              String(message.id) !== String(messageId) ||
              message.deliveryStatus === "seen" ||
              status === "read"
            ) {
              return message;
            }

            updated = true;
            return { ...message, deliveryStatus: status || "delivered" };
          });

          next[key] = mapped;
        });

        return updated ? next : previous;
      });
    },
    [buddies, channels, currentUserId, setMessagesByChat],
  );
}
