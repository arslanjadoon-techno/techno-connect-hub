import { useCallback, useEffect } from "react";
import { markConversationReadService } from "@/services/Team-chat/chat.service";
import { getChannelId } from "./chatHealper";

export function useChatMarkRead({ activeConversationId, selectedChat, setChannels }: any) {
  const markChatAsRead = useCallback(async ({ chatId }: any = {}) => {
    if (!chatId) return;
    const response: any = await markConversationReadService(chatId);
    const markedChatId = String(response.data?.data?.chatId || response.data?.data?.chat_id || chatId);

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
  }, [setChannels]);

  useEffect(() => {
    if (!activeConversationId) return undefined;
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
    };
  }, [activeConversationId, markChatAsRead, selectedChat?.id, selectedChat?.subtitle, selectedChat?.type]);

  return { markChatAsRead };
}
