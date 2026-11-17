import { useCallback } from "react";
import { getMessageClientId } from "./chatMessageState";

type ChatRecord = Record<string, any>;

export function useChatRealtimeMessageStatus({ setMessagesByChat, setSendError }: any) {
  const updateStatus = useCallback(
    (payload: ChatRecord = {}) => {
      const event =
        payload?.message && typeof payload.message === "object"
          ? payload.message
          : payload?.data && typeof payload.data === "object"
            ? payload.data
            : payload;
      const clientMessageId = String(
        payload.clientMessageId ||
          payload.client_message_id ||
          event.clientMessageId ||
          event.client_message_id ||
          "",
      );
      if (!clientMessageId) return;

      const status = String(payload.status || event.status || "").toLowerCase();
      const failed = status === "failed" || Boolean(payload.error || event.error);
      const errorMessage = payload.error || event.error || "Message could not be saved.";
      setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
        const next = { ...previous };
        Object.keys(previous).forEach((key) => {
          next[key] = (previous[key] || []).map((message) =>
            getMessageClientId(message) === clientMessageId || String(message.id) === clientMessageId
              ? {
                  ...message,
                  // message:accepted means the server has accepted the
                  // message. Do not leave the optimistic bubble spinning
                  // while REST or message:new reconciliation catches up.
                  sendState: failed ? "failed" : "sent",
                  deliveryStatus: failed ? "failed" : "sent",
                  sendError: failed ? errorMessage : undefined,
                  acceptedAt: payload.acceptedAt || event.acceptedAt || message.acceptedAt,
                }
              : message,
          );
        });
        return next;
      });

      if (failed) setSendError(errorMessage);
    },
    [setMessagesByChat, setSendError],
  );

  return { handleMessageAccepted: updateStatus, handleMessageFailed: updateStatus };
}
