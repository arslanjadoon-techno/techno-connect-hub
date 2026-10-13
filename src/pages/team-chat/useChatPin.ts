import { pinConversationMessageService } from "@/services/Team-chat/chat.service";
import { normalizeRealtimeMessage } from "./chatMessageNormalization";

type ChatRecord = Record<string, any>;

const getChatKeys = (chat: ChatRecord): string[] =>
  Array.from(new Set([chat.id, chat.chatId].filter(Boolean).map(String)));

export function useChatPin({ selectedChat, currentUserId, setMessagesByChat, setSendError }: any) {
  const handlePinMessage = async (message: ChatRecord) => {
    if (!selectedChat || !message?.id) return;
    const chatId = selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;
    if (!chatId) {
      setSendError("Open this conversation before pinning a message.");
      return;
    }

    const keys = getChatKeys(selectedChat);
    const pinned = !Boolean(message.metadata?.pinned);
    const applyLocal = (isPinned: boolean) =>
      setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
        const next = { ...previous };
        keys.forEach((key) => {
          next[key] = (previous[key] || []).map((item) =>
            String(item.id) === String(message.id)
              ? { ...item, metadata: { ...(item.metadata || {}), pinned: isPinned } }
              : item,
          );
        });
        return next;
      });

    applyLocal(pinned);
    try {
      const response: any = await pinConversationMessageService(chatId, message.id, pinned);
      const payload = response?.data?.data || response?.data || response;
      const updated = normalizeRealtimeMessage(payload, { ...selectedChat, currentUserId });
      if (updated) {
        setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
          const next = { ...previous };
          keys.forEach((key) => {
            next[key] = (previous[key] || []).map((item) =>
              String(item.id) === String(updated.id) ? { ...item, ...updated } : item,
            );
          });
          return next;
        });
      }
    } catch (error) {
      applyLocal(!pinned);
      setSendError(error instanceof Error ? error.message : "Unable to update pinned message.");
    }
  };

  return { handlePinMessage };
}
