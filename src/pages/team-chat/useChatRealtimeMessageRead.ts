import { useCallback } from "react";
import { resolveLocalChatKey } from "./chatMessageNormalization";

export function useChatRealtimeMessageRead({
  channels,
  buddies,
  currentUserId,
  setMessageInfoVersions,
  setMessagesByChat,
}: any) {
  return useCallback(
    ({ chatId, userId, readAt, status, readStates = [], messageIds = [] }: any) => {
      if (!chatId || (!readAt && status !== "read") || String(userId) === currentUserId) return;
      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      if (!localKey) return;
      const readMessageIdSet = new Set((Array.isArray(messageIds) ? messageIds : []).map(String));

      setMessageInfoVersions((previous: Record<string, number>) => ({
        ...previous,
        [localKey]: (previous[localKey] || 0) + 1,
      }));

      const otherReaders = readStates.filter(
        (reader: any) => reader.userId && String(reader.userId) !== currentUserId,
      );
      // Direct-chat read events can contain only the reader's watermark. Use
      // that timestamp as a fallback when a legacy/server path does not send
      // messageIds or readStates.
      const effectiveReaders =
        otherReaders.length > 0
          ? otherReaders
          : readAt
            ? [{ readAt }]
            : [];
      setMessagesByChat((previous: Record<string, any[]>) => {
        const next = { ...previous };
        Object.keys(next).forEach((key) => {
          const messages = next[key];
          if (!Array.isArray(messages)) return;

          next[key] = messages.map((message) => {
            if (message.direction !== "outbound") return message;
            if (readMessageIdSet.has(String(message.id))) {
              return { ...message, deliveryStatus: "seen" };
            }
            if (effectiveReaders.length === 0) return message;
            const sentAt = new Date(message.sentAt).getTime();
            const seenByAll = effectiveReaders.every(
              (reader: any) => reader.readAt && new Date(reader.readAt).getTime() >= sentAt,
            );
            return seenByAll ? { ...message, deliveryStatus: "seen" } : message;
          });
        });
        return next;
      });
    },
    [buddies, channels, currentUserId, setMessageInfoVersions, setMessagesByChat],
  );
}
