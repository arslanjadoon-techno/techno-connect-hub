import { createOptimisticMessage, getOptimisticMessageKeys } from "./chatMessageState";
import type { PendingChatSend, PendingChatSendStatus } from "./chatMessageIndexedDb";

type ChatRecord = Record<string, any>;

export const pendingChatSendKeys = (
  pending: Pick<PendingChatSend, "localChatKey" | "chatId">,
): string[] =>
  Array.from(
    new Set([pending.localChatKey, pending.chatId].filter(Boolean).map((value) => String(value))),
  );

export const pendingChatSendStatusToMessageState = (
  status: PendingChatSendStatus,
): { sendState: string; deliveryStatus: string } => {
  switch (status) {
    case "failed":
      return { sendState: "failed", deliveryStatus: "failed" };
    case "retrying":
      return { sendState: "retrying", deliveryStatus: "retrying" };
    case "cancelled":
      return { sendState: "cancelled", deliveryStatus: "failed" };
    case "accepted":
      return { sendState: "accepted", deliveryStatus: "sent" };
    default:
      return { sendState: "pending", deliveryStatus: "pending" };
  }
};

export const pendingChatSendToChat = (pending: PendingChatSend): ChatRecord => ({
  id: pending.localChatKey || pending.chatId || pending.targetId,
  chatId: pending.chatId,
  chat_id: pending.chatId,
  type: pending.targetType === "channel" ? "channel" : "person",
  title: pending.targetType === "channel" ? "Group" : "Chat user",
  userId: pending.targetId,
});

export const pendingChatSendToOptimisticMessage = (
  pending: PendingChatSend,
  currentUser: ChatRecord | null,
): ChatRecord => {
  const selectedChat = pendingChatSendToChat(pending);
  const state = pendingChatSendStatusToMessageState(pending.status);
  const message = createOptimisticMessage({
    selectedChat,
    currentUser,
    currentUserId: pending.ownerUserId,
    text: pending.text,
    hasFiles: pending.attachments.length > 0,
    clientMessageId: pending.clientMessageId,
    clientSequence: pending.clientSequence,
    metadata: pending.metadata,
  });

  const createdAt = pending.createdAt || new Date().toISOString();
  return {
    ...message,
    createdAt,
    sentAt: createdAt,
    ...(pending.replyTo
      ? { replyTo: pending.replyTo, replyToMessageId: pending.replyTo }
      : {}),
    ...state,
  };
};

export const pendingChatSendMessageKeys = (
  pending: PendingChatSend,
  selectedChat?: ChatRecord | null,
): string[] =>
  Array.from(
    new Set(
      [...pendingChatSendKeys(pending), ...getOptimisticMessageKeys(selectedChat)]
        .filter(Boolean)
        .map((value) => String(value)),
    ),
  );

export const isPendingChatSendActive = (status: PendingChatSendStatus): boolean =>
  status === "pending" || status === "retrying";

export const isUnknownSendError = (error: unknown): boolean => {
  const status = Number((error as { status?: number } | null)?.status);
  return (
    !Number.isFinite(status) || status === 408 || status === 425 || status === 429 || status >= 500
  );
};

export const pendingChatSendErrorMessage = (error: unknown): string => {
  if (isUnknownSendError(error)) {
    return "Send outcome is unknown. We will retry this message safely.";
  }
  return error instanceof Error && error.message ? error.message : "Message could not be sent.";
};
