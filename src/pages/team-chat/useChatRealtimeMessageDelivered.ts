import { useCallback } from "react";
import { rememberReceiptStatus } from "./chatReceiptStatus";

export function useChatRealtimeMessageDelivered({ setMessagesByChat }: any) {
  return useCallback(
    (payload: any = {}) => {
      const event =
        payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
          ? payload.data
          : payload;
      const chatId = event.chatId ?? event.chat_id ?? event.conversationId ?? event.conversation_id;
      const messageId = event.messageId ?? event.message_id ?? event.id;
      const clientMessageId = event.clientMessageId ?? event.client_message_id;
      const status = String(event.status || "delivered").toLowerCase();
      if (!chatId || (!messageId && !clientMessageId)) return;
      rememberReceiptStatus([messageId, clientMessageId], status);

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
              status === "read" ||
              status === "seen"
            ) {
              return message;
            }

            updated = true;
            return { ...message, deliveryStatus: status };
          });

          next[key] = mapped;
        });

        return updated ? next : previous;
      });
    },
    [setMessagesByChat],
  );
}
