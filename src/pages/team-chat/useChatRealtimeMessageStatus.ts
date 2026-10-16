import { useCallback } from "react";

type ChatRecord = Record<string, any>;

export function useChatRealtimeMessageStatus({ setMessagesByChat, setSendError }: any) {
  const updateStatus = useCallback(
    (payload: ChatRecord = {}) => {
      const clientMessageId = String(payload.clientMessageId || payload.client_message_id || "");
      if (!clientMessageId) return;

      const failed = payload.status === "failed" || Boolean(payload.error);
      setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
        const next = { ...previous };
        Object.keys(previous).forEach((key) => {
          next[key] = (previous[key] || []).map((message) =>
            String(message.clientMessageId || message.id) === clientMessageId
              ? {
                  ...message,
                  sendState: failed ? "failed" : "sending",
                  deliveryStatus: failed ? "failed" : "sent",
                  sendError: failed ? payload.error || "Message could not be saved." : undefined,
                  acceptedAt: payload.acceptedAt || message.acceptedAt,
                }
              : message,
          );
        });
        return next;
      });

      if (failed) setSendError(payload.error || "Message could not be saved.");
    },
    [setMessagesByChat, setSendError],
  );

  return { handleMessageAccepted: updateStatus, handleMessageFailed: updateStatus };
}
