import { deleteConversationMessageService } from "@/services/Team-chat/chat.service";
import { normalizeChatError } from "./chatHealper";
import { normalizeRealtimeMessage } from "./chatMessageNormalization";

type ChatRecord = Record<string, any>;

type ChatDeleteOptions = {
  currentUserId: string;
  messagesByChat: Record<string, ChatRecord[]>;
  requestConfirmation: (options: ChatRecord) => Promise<boolean>;
  selectedChat: ChatRecord | null;
  setMessagesByChat: (updater: any) => void;
  setSendError: (value: string) => void;
};

export function useChatDeleteMessages({
  currentUserId,
  messagesByChat,
  requestConfirmation,
  selectedChat,
  setMessagesByChat,
  setSendError,
}: ChatDeleteOptions) {
  const handleDeleteMessages = async (messages: ChatRecord[] | ChatRecord = []) => {
    const messageList = Array.isArray(messages)
      ? messages
      : messages && typeof messages === "object"
        ? [messages]
        : [];
    if (!selectedChat || messageList.length === 0) return false;

    const chatId = selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;
    const messageIds = messageList
      .map((message) => message?.id)
      .filter((messageId) => messageId !== null && messageId !== undefined && messageId !== "")
      .map(String);
    if (!chatId || messageIds.length === 0) return false;

    const confirmed = await requestConfirmation({
      title: messageIds.length === 1 ? "Delete message?" : "Delete messages?",
      message: `Delete ${messageIds.length === 1 ? "this message" : `${messageIds.length} messages`}? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!confirmed) return false;

    const keys = Array.from(new Set([selectedChat.id, selectedChat.chatId].filter(Boolean).map(String)));
    const snapshots = new Map<string, ChatRecord[]>(
      keys.map((key) => [key, messagesByChat[key] || []]),
    );
    setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
      const next = { ...previous };
      keys.forEach((key) => {
        const current = previous[key] || [];
        next[key] = current.map((message) =>
          messageIds.includes(String(message.id))
            ? {
                ...message,
                text: "This message was deleted",
                deletedAt: new Date().toISOString(),
                edited: false,
                sendState: "sent",
              }
            : message,
        );
      });
      return next;
    });

    try {
      const results = await Promise.allSettled(
        messageIds.map((messageId) => deleteConversationMessageService(chatId, messageId)),
      );
      const successfulIds = new Set<string>();
      const deletedById = new Map<string, ChatRecord>();
      const failedIds = new Set<string>();

      results.forEach((result, index) => {
        const messageId = messageIds[index];
        if (result.status === "rejected") {
          failedIds.add(messageId);
          return;
        }
        successfulIds.add(messageId);
        const response: any = result.value;
        const payload = response?.data?.data || response?.data || response;
        const deletedMessage = normalizeRealtimeMessage(payload, { ...selectedChat, currentUserId });
        if (deletedMessage) deletedById.set(String(deletedMessage.id), deletedMessage);
      });

      if (successfulIds.size === 0) {
        throw results.find((result) => result.status === "rejected")?.reason || new Error("Messages could not be deleted");
      }

      setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
        const next = { ...previous };
        keys.forEach((key) => {
          const original = snapshots.get(key) || [];
          next[key] = (previous[key] || []).map((message) => {
            const id = String(message.id);
            if (failedIds.has(id)) return original.find((item) => String(item.id) === id) || message;
            if (!successfulIds.has(id)) return message;
            return deletedById.get(id) || message;
          });
        });
        return next;
      });

      if (failedIds.size > 0) {
        setSendError(`${failedIds.size} message(s) could not be deleted.`);
      }
      return true;
    } catch (error) {
      setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
        const next = { ...previous };
        keys.forEach((key) => {
          next[key] = snapshots.get(key) || previous[key] || [];
        });
        return next;
      });
      setSendError(normalizeChatError(error));
      return false;
    }
  };

  return handleDeleteMessages;
}
