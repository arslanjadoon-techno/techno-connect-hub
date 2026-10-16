import { useCallback, useEffect, useRef } from "react";
import { markConversationReadService } from "@/services/Team-chat/chat.service";
import { getChannelId } from "./chatHealper";

export function useChatMarkRead({
  activeConversationId,
  callSocketRef,
  messagesByChat,
  selectedChat,
  setChannels,
}: any) {
  const latestMessagesByChat = useRef(messagesByChat);
  const latestSelectedChat = useRef(selectedChat);
  const acknowledgedReadMessageIds = useRef(new Set<string>());
  latestMessagesByChat.current = messagesByChat;
  latestSelectedChat.current = selectedChat;

  const acknowledgeVisibleMessages = useCallback(
    (chatId: string | number) => {
      const chatKeys = [
        chatId,
        latestSelectedChat.current?.id,
        latestSelectedChat.current?.chatId,
        latestSelectedChat.current?.chat_id,
        latestSelectedChat.current?.raw?.id,
        latestSelectedChat.current?.raw?.chatId,
        latestSelectedChat.current?.raw?.chat_id,
        latestSelectedChat.current?.raw?.conversationId,
        latestSelectedChat.current?.raw?.conversation_id,
      ]
        .filter(Boolean)
        .map(String);
      const messageIds = Array.from(
        new Set(
          chatKeys
            .flatMap((key) => latestMessagesByChat.current?.[key] || [])
            .filter((message: any) => message.direction !== "outbound" && message.id)
            .map((message: any) => String(message.id)),
        ),
      ).filter((messageId) => !acknowledgedReadMessageIds.current.has(messageId));
      const acknowledgeRead = callSocketRef?.current?.emit;
      if (messageIds.length === 0 || !acknowledgeRead) return;

      for (let index = 0; index < messageIds.length; index += 200) {
        const batch = messageIds.slice(index, index + 200);
        batch.forEach((messageId) => acknowledgedReadMessageIds.current.add(messageId));
        void acknowledgeRead("message:read:ack", [String(chatId), batch])
          .then((result: any) => {
            if (!result?.ok) {
              batch.forEach((messageId) => acknowledgedReadMessageIds.current.delete(messageId));
            }
          })
          .catch((error: unknown) => {
            batch.forEach((messageId) => acknowledgedReadMessageIds.current.delete(messageId));
            console.warn("[Chat realtime] Unable to acknowledge read messages", error);
          });
      }
    },
    [callSocketRef],
  );

  const markChatAsRead = useCallback(
    async ({ chatId }: any = {}) => {
      if (!chatId) return;
      const response: any = await markConversationReadService(chatId);
      const markedChatId = String(
        response.data?.data?.chatId || response.data?.data?.chat_id || chatId,
      );

      setChannels((previousChannels: any[]) =>
        previousChannels.map((channel) => {
          const channelIds = [channel?.id, channel?.chatId, channel?.chat_id, getChannelId(channel)]
            .filter(Boolean)
            .map(String);
          return channelIds.includes(markedChatId)
            ? { ...channel, unreadCount: 0, unread_count: 0 }
            : channel;
        }),
      );

      acknowledgeVisibleMessages(chatId);
    },
    [acknowledgeVisibleMessages, setChannels],
  );

  useEffect(() => {
    if (!activeConversationId || document.hidden) return;
    acknowledgeVisibleMessages(activeConversationId);
  }, [activeConversationId, acknowledgeVisibleMessages, messagesByChat, selectedChat?.id]);

  useEffect(() => {
    const socket = callSocketRef?.current;
    const acknowledgeAfterConnection = () => {
      if (activeConversationId && !document.hidden) {
        acknowledgeVisibleMessages(activeConversationId);
      }
    };
    socket?.on("connect", acknowledgeAfterConnection);
    if (!activeConversationId) {
      return () => socket?.off("connect", acknowledgeAfterConnection);
    }
    const markActiveChatRead = () => {
      if (document.hidden) return;
      markChatAsRead({ chatId: activeConversationId }).catch(() => {});
    };
    window.addEventListener("focus", markActiveChatRead);
    document.addEventListener("visibilitychange", markActiveChatRead);
    markActiveChatRead();
    return () => {
      window.removeEventListener("focus", markActiveChatRead);
      document.removeEventListener("visibilitychange", markActiveChatRead);
      socket?.off("connect", acknowledgeAfterConnection);
    };
  }, [
    acknowledgeVisibleMessages,
    activeConversationId,
    callSocketRef,
    markChatAsRead,
    selectedChat?.id,
    selectedChat?.subtitle,
    selectedChat?.type,
  ]);

  return { markChatAsRead };
}
