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
    ({ chatId, userId, readAt, readStates = [] }: any) => {
      if (!chatId || !readAt || String(userId) === currentUserId) return;
      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      if (!localKey) return;

      setMessageInfoVersions((previous: Record<string, number>) => ({
        ...previous,
        [localKey]: (previous[localKey] || 0) + 1,
      }));

      const otherReaders = readStates.filter(
        (reader: any) => reader.userId && String(reader.userId) !== currentUserId,
      );
      setMessagesByChat((previous: Record<string, any[]>) => ({
        ...previous,
        [localKey]: (previous[localKey] || []).map((message) => {
          if (message.direction !== "outbound" || otherReaders.length === 0) return message;
          const sentAt = new Date(message.sentAt).getTime();
          const seenByAll = otherReaders.every(
            (reader: any) => reader.readAt && new Date(reader.readAt).getTime() >= sentAt,
          );
          return seenByAll ? { ...message, deliveryStatus: "seen" } : message;
        }),
      }));
    },
    [buddies, channels, currentUserId, setMessageInfoVersions, setMessagesByChat],
  );
}
