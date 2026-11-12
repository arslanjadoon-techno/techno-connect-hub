import { useCallback } from "react";
import { resolveLocalChatKey } from "./chatMessageNormalization";

export function useChatRealtimeMessageDelivered({
  channels,
  buddies,
  currentUserId,
  setMessagesByChat,
}: any) {
  return useCallback(
    ({ chatId, messageId, clientMessageId, status }: any) => {
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
            const storedMessageId = message.id ?? message.message_id ?? message.messageId;
            const storedClientMessageId =
              message.clientMessageId ??
              message.client_message_id ??
              message.metadata?.clientMessageId ??
              message.metadata?.client_message_id;
            const matchesCanonicalId = String(storedMessageId) === String(messageId);
            const matchesClientId =
              clientMessageId && String(storedClientMessageId) === String(clientMessageId);

            if (
              (!matchesCanonicalId && !matchesClientId) ||
              ["seen", "read"].includes(String(message.deliveryStatus).toLowerCase()) ||
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
