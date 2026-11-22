import { useCallback } from "react";
import {
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
} from "./chatHealper";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";

type ChatRecord = Record<string, any>;

type ChatSelectionOptions = {
  clearUnreadForChat: (chat: ChatRecord) => void;
  currentUserEmail: string;
  currentUserId: string;
  loadedChatHistoryRef: { current: Set<string> };
  navigate: (path: string) => void;
  setSelectedChat: (value: any) => void;
  setSendError: (value: string) => void;
};

export function useChatSelection({
  clearUnreadForChat,
  currentUserEmail,
  currentUserId,
  loadedChatHistoryRef,
  navigate,
  setSelectedChat,
  setSendError,
}: ChatSelectionOptions) {
  const selectBuddy = useCallback(
    async (buddy: ChatRecord) => {
      const email = getBuddyEmail(buddy);
      const sendId = getBuddySendId(buddy);
      if (!sendId) return;

      const directConversationId = buddy?.directConversationId || buddy?.chat_id || buddy?.chatId;
      const chat = {
        type: "person",
        source: "local",
        id: sendId,
        chatId: directConversationId || null,
        title: getBuddyName(buddy),
        subtitle: email,
        raw: buddy,
        imageUrl: getImageUrl(buddy),
        currentUserId,
        currentUserEmail,
      };

      setSelectedChat(chat);
      setSendError("");
      loadedChatHistoryRef.current.delete(String(sendId));
      clearUnreadForChat({ chatId: directConversationId, userId: sendId, email });
      if (directConversationId) {
        navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(directConversationId)}`);
      }
    },
    [
      clearUnreadForChat,
      currentUserEmail,
      currentUserId,
      loadedChatHistoryRef,
      navigate,
      setSelectedChat,
      setSendError,
    ],
  );

  const selectChannel = useCallback(
    (channel: ChatRecord) => {
      const channelId = getChannelId(channel);
      if (!channelId) return;

      const chat = {
        type: "channel",
        source: "local",
        id: channelId,
        title: getChannelName(channel),
        subtitle: channelId,
        lastMessage: channel.lastMessage || channel.last_message,
        participants: channel.participants || channel.members || [],
        raw: channel,
        imageUrl: getImageUrl(channel),
        currentUserId,
        currentUserEmail,
      };

      setSelectedChat(chat);
      setSendError("");
      loadedChatHistoryRef.current.delete(String(channelId));
      clearUnreadForChat({ chatId: channelId });
      navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(channelId)}`);
    },
    [
      clearUnreadForChat,
      currentUserEmail,
      currentUserId,
      loadedChatHistoryRef,
      navigate,
      setSelectedChat,
      setSendError,
    ],
  );

  return { selectBuddy, selectChannel };
}
