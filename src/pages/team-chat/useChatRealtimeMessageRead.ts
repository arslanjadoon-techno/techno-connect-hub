import { useCallback } from "react";
import { isMessageFromCurrentUser, resolveLocalChatKey } from "./chatMessageNormalization";
import { parseChatDate } from "./chatHealper";
import { rememberReceiptStatus } from "./chatReceiptStatus";

export function useChatRealtimeMessageRead({
  channels,
  buddies,
  currentUser,
  currentUserEmail,
  currentUserId,
  setMessageInfoVersions,
  setMessagesByChat,
  setChannels,
  setBuddies,
}: any) {
  return useCallback(
    (payload: any = {}) => {
      const event =
        payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
          ? payload.data
          : payload;
      const chatId = event.chatId ?? event.chat_id ?? event.conversationId ?? event.conversation_id;
      const userId = event.userId ?? event.user_id;
      const readAt = event.readAt ?? event.read_at;
      const status = String(event.status || "").toLowerCase();
      const readStates = event.readStates ?? event.read_states ?? [];
      const messageIds = event.messageIds ?? event.message_ids ?? [];
      if (!chatId || (!readAt && status !== "read") || String(userId) === currentUserId) return;
      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      const versionKey = String(localKey || chatId);
      const readMessageIdSet = new Set((Array.isArray(messageIds) ? messageIds : []).map(String));
      readMessageIdSet.forEach((messageId) => rememberReceiptStatus([messageId], "seen"));

      setMessageInfoVersions((previous: Record<string, number>) => ({
        ...previous,
        [versionKey]: (previous[versionKey] || 0) + 1,
      }));

      const otherReaders = (Array.isArray(readStates) ? readStates : []).filter(
        (reader: any) =>
          (reader.userId ?? reader.user_id) &&
          String(reader.userId ?? reader.user_id) !== currentUserId,
      );
      // Direct-chat read events can contain only the reader's watermark. Use
      // that timestamp as a fallback when a legacy/server path does not send
      // messageIds or readStates.
      const effectiveReaders = otherReaders.length > 0 ? otherReaders : readAt ? [{ readAt }] : [];
      const messageIsSeen = (message: any) => {
        if (!isMessageFromCurrentUser(message, currentUser, currentUserId, currentUserEmail)) {
          return false;
        }

        const ids = [
          message.id,
          message.messageId,
          message.message_id,
          message.serverMessageId,
          message.clientMessageId,
          message.client_message_id,
          message.metadata?.clientMessageId,
          message.metadata?.client_message_id,
        ]
          .filter(Boolean)
          .map(String);
        if (ids.some((messageId) => readMessageIdSet.has(messageId))) return true;
        if (effectiveReaders.length === 0) return false;

        const sentAt = parseChatDate(
          message.sentAt || message.sent_at || message.createdAt || message.created_at,
        ).getTime();
        return effectiveReaders.every((reader: any) => {
          const readerAt = reader.readAt ?? reader.read_at;
          return readerAt && parseChatDate(readerAt).getTime() >= sentAt;
        });
      };

      setMessagesByChat((previous: Record<string, any[]>) => {
        const next = { ...previous };
        Object.keys(next).forEach((key) => {
          const messages = next[key];
          if (!Array.isArray(messages)) return;

          next[key] = messages.map((message) => {
            return messageIsSeen(message) ? { ...message, deliveryStatus: "seen" } : message;
          });
        });
        return next;
      });

      const updatePreview = (record: any) => {
        const lastMessage = record?.lastMessage || record?.last_message;
        if (!lastMessage || !messageIsSeen(lastMessage)) return record;
        const updatedMessage = { ...lastMessage, deliveryStatus: "seen", status: "read" };
        return {
          ...record,
          lastMessage: updatedMessage,
          last_message: updatedMessage,
          deliveryStatus: "seen",
          delivery_state: "seen",
        };
      };
      setChannels?.((previous: any[]) => previous.map(updatePreview));
      setBuddies?.((previous: any[]) => previous.map(updatePreview));
    },
    [
      buddies,
      channels,
      currentUser,
      currentUserEmail,
      currentUserId,
      setBuddies,
      setChannels,
      setMessageInfoVersions,
      setMessagesByChat,
    ],
  );
}
