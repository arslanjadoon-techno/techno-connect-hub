import { clearChatHistoryService } from "@/services/Team-chat/chat.service";
import { getBuddySendId, getChannelId, normalizeChatError } from "./chatHealper";

export function useChatClear({
  selectedChat,
  requestConfirmation,
  chatClearVersionsRef,
  setMessagesByChat,
  setMessagePaginationByChat,
  clearUnreadForChat,
  setChannels,
  setBuddies,
  setSendError,
}: any) {
  const handleClearChat = async () => {
    if (!selectedChat) return;
    const chatId = selectedChat.chatId || selectedChat.id;
    const confirmed = await requestConfirmation({
      title: "Clear chat?",
      message:
        "Clear all messages from this chat for your account? Other participants will keep their history.",
      confirmLabel: "Clear chat",
    });
    if (!confirmed) return;
    try {
      await clearChatHistoryService(chatId);
      const clearedKeys = [
        selectedChat.id,
        selectedChat.chatId,
        selectedChat.raw?.id,
        selectedChat.raw?.chat_id,
        selectedChat.raw?.chatId,
        getChannelId(selectedChat.raw),
      ]
        .filter(Boolean)
        .map(String);
      clearedKeys.forEach((key) =>
        chatClearVersionsRef.current.set(key, (chatClearVersionsRef.current.get(key) || 0) + 1),
      );
      setMessagesByChat((prev: Record<string, any[]>) => {
        const next = { ...prev };
        clearedKeys.forEach((key) => {
          next[key] = [];
        });
        return next;
      });
      setMessagePaginationByChat((prev: any) => ({
        ...prev,
        [selectedChat.id]: { hasMore: false, nextCursor: null },
      }));
      clearUnreadForChat({ chatId, userId: selectedChat.type === "person" ? selectedChat.id : "" });
      setChannels((prev: any[]) =>
        prev.map((item) => {
          const ids = [item?.id, item?.chat_id, item?.chatId, getChannelId(item)]
            .filter(Boolean)
            .map(String);
          const selectedIds = [selectedChat.id, selectedChat.chatId].filter(Boolean).map(String);
          return ids.some((id) => selectedIds.includes(id))
            ? {
                ...item,
                lastMessage: null,
                last_message: null,
                lastMessageAt: null,
                last_message_at: null,
              }
            : item;
        }),
      );
      setBuddies((prev: any[]) =>
        prev.map((buddy) =>
          selectedChat.type === "person" &&
          String(getBuddySendId(buddy)) === String(selectedChat.id)
            ? {
                ...buddy,
                lastMessage: null,
                last_message: null,
                lastMessageAt: null,
                last_message_at: null,
              }
            : buddy,
        ),
      );
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };
  return { handleClearChat };
}
