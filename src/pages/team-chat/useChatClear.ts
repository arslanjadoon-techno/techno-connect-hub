import { clearChatHistoryService } from "@/services/Team-chat/chat.service";
import { clearCachedChatMessages } from "../team-chat/chatMessageIndexedDb";
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
    if (chatId == null) return;

    const confirmed = await requestConfirmation({
      title: "Clear chat?",
      message:
        "Clear all messages from this chat for your account? Other participants will keep their history.",
      confirmLabel: "Clear chat",
    });

    if (!confirmed) return;

    try {
      // 1. Clear the authoritative server-side chat history first.
      await clearChatHistoryService(chatId);

      // 2. Resolve the identifiers used by the existing UI/cache.
      const clearedKeys = [
        selectedChat.id,
        selectedChat.chatId,
        selectedChat.raw?.id,
        selectedChat.raw?.chat_id,
        selectedChat.raw?.chatId,
        getChannelId(selectedChat.raw),
      ]
        .filter((key: unknown) => key !== null && key !== undefined && String(key).trim() !== "")
        .map(String);

      const uniqueKeys = [...new Set(clearedKeys)];

      // 3. Invalidate in-flight message/history work.
      uniqueKeys.forEach((key) => {
        const currentVersion = chatClearVersionsRef.current.get(key) || 0;

        chatClearVersionsRef.current.set(key, currentVersion + 1);
      });

      // 4. Clear IndexedDB cache records for these identifiers.
      // Cache cleanup failure should not undo a successful server clear.
      try {
        await Promise.all(uniqueKeys.map((key) => clearCachedChatMessages(key)));
      } catch (cacheError) {
        console.warn(
          "Chat history was cleared on the server, but IndexedDB cleanup failed:",
          cacheError,
        );
      }

      // 5. Clear messages from React state.
      setMessagesByChat((prev: Record<string, any[]>) => {
        const next = { ...prev };

        uniqueKeys.forEach((key) => {
          next[key] = [];
        });

        return next;
      });

      // 6. Reset pagination for the selected conversation.
      setMessagePaginationByChat((prev: any) => ({
        ...prev,
        [String(selectedChat.id ?? chatId)]: {
          hasMore: false,
          nextCursor: null,
        },
      }));

      // 7. Clear unread state.
      clearUnreadForChat({
        chatId,
        userId: selectedChat.type === "person" ? selectedChat.id : "",
      });

      // 8. Clear the last-message preview in channel lists.
      setChannels((prev: any[]) =>
        prev.map((item) => {
          const itemIds = [item?.id, item?.chat_id, item?.chatId, getChannelId(item)]
            .filter(
              (key: unknown) => key !== null && key !== undefined && String(key).trim() !== "",
            )
            .map(String);

          const matchesSelectedChat = itemIds.some((id) => uniqueKeys.includes(id));

          return matchesSelectedChat
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

      // 9. Clear the last-message preview for direct chats.
      setBuddies((prev: any[]) =>
        prev.map((buddy) => {
          const matchesSelectedBuddy =
            selectedChat.type === "person" &&
            String(getBuddySendId(buddy)) === String(selectedChat.id);

          return matchesSelectedBuddy
            ? {
                ...buddy,
                lastMessage: null,
                last_message: null,
                lastMessageAt: null,
                last_message_at: null,
              }
            : buddy;
        }),
      );
    } catch (error) {
      // Report server or other critical operation failures.
      setSendError(normalizeChatError(error));
    }
  };

  return { handleClearChat };
}
