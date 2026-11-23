import { useCallback, useEffect, useRef } from "react";
import { markConversationReadService } from "@/services/Team-chat/chat.service";
import { getChannelId } from "./chatHealper";
import { isMessageFromCurrentUser, messageBelongsToChat } from "./chatMessageNormalization";

const READ_DEBOUNCE_MS = 75;
const READ_MAX_DELAY_MS = 250;
const READ_RETRY_DELAY_MS = 250;
const READ_BATCH_SIZE = 200;

type ChatRecord = Record<string, any>;
type ReadQueue = Map<string, Set<string>>;

const getChatKeys = (chatId: string | number, selectedChat: ChatRecord | null): string[] =>
  Array.from(
    new Set(
      [
        chatId,
        selectedChat?.id,
        selectedChat?.chatId,
        selectedChat?.chat_id,
        selectedChat?.directConversationId,
        selectedChat?.conversationId,
        selectedChat?.raw?.id,
        selectedChat?.raw?.chatId,
        selectedChat?.raw?.chat_id,
        selectedChat?.raw?.directConversationId,
        selectedChat?.raw?.conversationId,
        selectedChat?.raw?.conversation_id,
      ]
        .filter(Boolean)
        .map(String),
    ),
  );

const getReadMessageIds = (
  chatId: string | number,
  selectedChat: ChatRecord | null,
  messagesByChat: Record<string, ChatRecord[]>,
  currentUser: ChatRecord | null,
  currentUserId: string,
  currentUserEmail: string,
): string[] => {
  const chatKeys = getChatKeys(chatId, selectedChat);
  return Array.from(
    new Set(
      chatKeys
        .flatMap((key) => messagesByChat[key] || [])
        .filter((message) => messageBelongsToChat(message, selectedChat))
        .filter(
          (message) =>
            !isMessageFromCurrentUser(message, currentUser, currentUserId, currentUserEmail) &&
            message.id,
        )
        .map((message) => String(message.id)),
    ),
  );
};

const addToQueue = (queue: ReadQueue, chatId: string | number, messageIds: string[]) => {
  const key = String(chatId);
  const ids = queue.get(key) || new Set<string>();
  messageIds.forEach((messageId) => ids.add(String(messageId)));
  if (ids.size > 0) queue.set(key, ids);
};

export function useChatMarkRead({
  activeConversationId,
  callSocketRef,
  currentUser,
  currentUserEmail,
  currentUserId,
  messagesByChat,
  selectedChat,
  setChannels,
}: any) {
  const latestMessagesByChat = useRef(messagesByChat);
  const latestSelectedChat = useRef(selectedChat);
  const pendingReadIds = useRef<ReadQueue>(new Map());
  const acknowledgedReadIds = useRef(new Set<string>());
  const flushTimer = useRef<number | null>(null);
  const firstQueuedAt = useRef<number | null>(null);
  const flushing = useRef(false);
  const retryTimer = useRef<number | null>(null);

  latestMessagesByChat.current = messagesByChat;
  latestSelectedChat.current = selectedChat;

  const clearFlushTimer = useCallback(() => {
    if (flushTimer.current !== null) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    firstQueuedAt.current = null;
  }, []);

  const updateLocalUnreadCount = useCallback(
    (chatId: string) => {
      setChannels((previousChannels: ChatRecord[]) =>
        previousChannels.map((channel) => {
          const channelIds = [channel?.id, channel?.chatId, channel?.chat_id, getChannelId(channel)]
            .filter(Boolean)
            .map(String);
          return channelIds.includes(chatId)
            ? { ...channel, unreadCount: 0, unread_count: 0 }
            : channel;
        }),
      );
    },
    [setChannels],
  );

  const markConversationReadFallback = useCallback(
    async (chatId: string): Promise<boolean> => {
      try {
        const response: any = await markConversationReadService(chatId);
        if (response?.data?.success === false || response?.success === false) return false;
        updateLocalUnreadCount(chatId);
        return true;
      } catch (error) {
        console.warn("[Chat realtime] REST read acknowledgement failed", error);
        return false;
      }
    },
    [updateLocalUnreadCount],
  );

  const flushReadQueue = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    clearFlushTimer();

    try {
      const acknowledgeRead = callSocketRef?.current?.emit;

      const queuedBatches: Array<{ chatId: string; messageIds: string[] }> = [];
      pendingReadIds.current.forEach((ids, chatId) => {
        const eligibleIds = Array.from(ids).filter(
          (messageId) => !acknowledgedReadIds.current.has(`${chatId}:${messageId}`),
        );
        for (let index = 0; index < eligibleIds.length; index += READ_BATCH_SIZE) {
          queuedBatches.push({
            chatId,
            messageIds: eligibleIds.slice(index, index + READ_BATCH_SIZE),
          });
        }
      });
      pendingReadIds.current.clear();

      if (queuedBatches.length === 0) return;

      await Promise.all(
        queuedBatches.map(async ({ chatId, messageIds }) => {
          messageIds.forEach((messageId) =>
            acknowledgedReadIds.current.add(`${chatId}:${messageId}`),
          );

          let signalRRead = false;
          if (acknowledgeRead) {
            try {
              const result = await acknowledgeRead("message:read:ack", [chatId, messageIds]);
              signalRRead = Boolean(
                result?.ok && Array.isArray(result.messageIds) && result.messageIds.length > 0,
              );
              if (signalRRead) {
                // The SignalR read ACK advances the participant watermark and
                // updates individual receipt rows. Keep the sidebar in sync only
                // after the server accepted the batch.
                updateLocalUnreadCount(chatId);
                return;
              }
            } catch (error) {
              console.warn("[Chat realtime] Read acknowledgement batch failed", error);
            }
          }

          // History can be opened while SignalR is reconnecting, and a legacy receipt
          // set may not contain every loaded message ID. The authenticated REST endpoint
          // marks the recipient's durable receipt rows and broadcasts the same read state.
          if (await markConversationReadFallback(chatId)) return;

          messageIds.forEach((messageId) => {
            acknowledgedReadIds.current.delete(`${chatId}:${messageId}`);
            addToQueue(pendingReadIds.current, chatId, [messageId]);
          });
        }),
      );
    } catch (error) {
      // A disconnected socket must not lose the queued IDs. They are retried
      // after reconnect/focus instead of falling back to duplicate REST writes.
      console.warn("[Chat realtime] Unable to flush read acknowledgements", error);
      pendingReadIds.current.forEach((ids, chatId) => {
        ids.forEach((messageId) => acknowledgedReadIds.current.delete(`${chatId}:${messageId}`));
      });
    } finally {
      flushing.current = false;
      if (pendingReadIds.current.size > 0 && retryTimer.current === null) {
        retryTimer.current = window.setTimeout(() => {
          retryTimer.current = null;
          void flushReadQueue();
        }, READ_RETRY_DELAY_MS);
      }
    }
  }, [callSocketRef, clearFlushTimer, markConversationReadFallback, updateLocalUnreadCount]);

  const scheduleRead = useCallback(
    (chatId: string | number, flushNow = false) => {
      if (!chatId || document.hidden) return;

      const messageIds = getReadMessageIds(
        chatId,
        latestSelectedChat.current,
        latestMessagesByChat.current,
        currentUser,
        currentUserId,
        currentUserEmail,
      );
      const queue = pendingReadIds.current;
      const acknowledgedOrQueuedIds = new Set(
        Array.from(queue.get(String(chatId)) || []).map(String),
      );
      const unreadIds = messageIds.filter(
        (messageId) =>
          !acknowledgedReadIds.current.has(`${String(chatId)}:${messageId}`) &&
          !acknowledgedOrQueuedIds.has(messageId),
      );
      addToQueue(queue, chatId, unreadIds);

      if (flushNow) {
        // If the local cache has no eligible IDs yet, still perform the authenticated
        // conversation-level read. This covers a freshly opened chat whose history is
        // still loading and legacy rows whose message shape cannot be normalized locally.
        if (unreadIds.length === 0) {
          void markConversationReadFallback(String(chatId));
        } else {
          void flushReadQueue();
        }
        return;
      }

      if (queue.size === 0 || flushTimer.current !== null) return;
      const now = Date.now();
      firstQueuedAt.current ??= now;
      const elapsed = now - firstQueuedAt.current;
      const delay = Math.max(0, Math.min(READ_DEBOUNCE_MS, READ_MAX_DELAY_MS - elapsed));
      flushTimer.current = window.setTimeout(() => {
        flushTimer.current = null;
        firstQueuedAt.current = null;
        void flushReadQueue();
      }, delay);
    },
    [currentUser, currentUserEmail, currentUserId, flushReadQueue, markConversationReadFallback],
  );

  const markChatAsRead = useCallback(
    async ({ chatId }: { chatId?: string | number } = {}) => {
      if (!chatId) return;
      scheduleRead(chatId, true);
    },
    [scheduleRead],
  );

  useEffect(() => {
    if (!activeConversationId || document.hidden) return;
    scheduleRead(activeConversationId);
  }, [activeConversationId, messagesByChat, scheduleRead, selectedChat?.id]);

  useEffect(() => {
    const socket = callSocketRef?.current;
    const flushActiveConversation = () => {
      if (!document.hidden && activeConversationId) {
        scheduleRead(activeConversationId, true);
      }
    };

    socket?.on("connect", flushActiveConversation);
    window.addEventListener("focus", flushActiveConversation);
    document.addEventListener("visibilitychange", flushActiveConversation);
    flushActiveConversation();

    return () => {
      socket?.off("connect", flushActiveConversation);
      window.removeEventListener("focus", flushActiveConversation);
      document.removeEventListener("visibilitychange", flushActiveConversation);
    };
  }, [activeConversationId, callSocketRef, scheduleRead]);

  useEffect(
    () => () => {
      clearFlushTimer();
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    },
    [clearFlushTimer],
  );

  return { markChatAsRead };
}
