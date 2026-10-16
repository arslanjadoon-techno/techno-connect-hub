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
  markChatAsRead: (args: ChatRecord) => Promise<unknown>;
  navigate: (path: string) => void;
  setSelectedChat: (value: any) => void;
  setSendError: (value: string) => void;
};

export function useChatSelection({
  clearUnreadForChat,
  currentUserEmail,
  currentUserId,
  loadedChatHistoryRef,
  markChatAsRead,
  navigate,
  setSelectedChat,
  setSendError,
}: ChatSelectionOptions) {
  const selectBuddy = async (buddy: ChatRecord) => {
    const email = getBuddyEmail(buddy);
    const sendId = getBuddySendId(buddy);
    if (!sendId) return;

    let directConversationId = buddy?.directConversationId || buddy?.chat_id || buddy?.chatId;
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
      markChatAsRead({ chatId: directConversationId, userId: sendId, email }).catch(() => {});
    }
    if (directConversationId) {
      navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(directConversationId)}`);
    }
  };

  const selectChannel = (channel: ChatRecord) => {
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
    markChatAsRead({ chatId: channelId }).catch(() => {});
    navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(channelId)}`);
  };

  return { selectBuddy, selectChannel };
}
