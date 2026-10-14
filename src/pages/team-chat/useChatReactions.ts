import {
  addMessageReactionService,
  removeMessageReactionService,
} from "@/services/Team-chat/chat.service";

type ChatRecord = Record<string, any>;

const getChatKeys = (chat: ChatRecord): string[] =>
  Array.from(
    new Set([chat.id, chat.chatId, chat.directConversationId].filter(Boolean).map(String)),
  );

const updateReactionLocally = (
  message: ChatRecord,
  emoji: string,
  userId: string,
  add: boolean,
): ChatRecord => {
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  const index = reactions.findIndex((reaction: ChatRecord) => reaction.emoji === emoji);

  if (index < 0) {
    return add
      ? {
          ...message,
          reactions: [
            { emoji, count: 1, reacted: true, users: userId ? [userId] : [] },
            ...reactions,
          ],
        }
      : message;
  }

  const next = [...reactions];
  const current = next[index];
  const users = Array.isArray(current.users) ? current.users.map(String) : [];
  const nextUsers = add
    ? Array.from(new Set([...users, userId].filter(Boolean)))
    : users.filter((id: string) => id !== userId);
  const nextCount = add
    ? Number(current.count || 0) + 1
    : Math.max(0, Number(current.count || 0) - 1);

  if (nextCount === 0) next.splice(index, 1);
  else next[index] = { ...current, count: nextCount, reacted: add, users: nextUsers };
  return { ...message, reactions: next };
};

export function useChatReactions({
  currentUserId = "",
  selectedChat,
  messagesByChat,
  setMessagesByChat,
  setSendError,
}: any) {
  const handleReaction = async (messageId: any, emoji: string) => {
    if (!selectedChat || !messageId || !emoji) return;
    const keys = getChatKeys(selectedChat);
    const messages = keys.flatMap((key) => messagesByChat[key] || []);
    const targetMessage = messages.find(
      (message: ChatRecord) => String(message.id) === String(messageId),
    );
    if (targetMessage?.direction === "outbound") return;

    const chatId =
      selectedChat.type === "channel"
        ? selectedChat.id || selectedChat.chatId
        : selectedChat.chatId || selectedChat.directConversationId || selectedChat.id;
    if (!chatId) return;

    const existingReaction = targetMessage?.reactions?.find(
      (reaction: ChatRecord) => reaction.emoji === emoji && reaction.reacted,
    );
    const add = !existingReaction;

    const applyLocal = (shouldAdd: boolean) =>
      setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
        const next = { ...previous };
        keys.forEach((key) => {
          next[key] = (previous[key] || []).map((message) =>
            String(message.id) === String(messageId)
              ? updateReactionLocally(message, emoji, String(currentUserId), shouldAdd)
              : message,
          );
        });
        return next;
      });

    applyLocal(add);
    try {
      if (add) await addMessageReactionService(chatId, messageId, emoji);
      else await removeMessageReactionService(chatId, messageId, emoji);
    } catch (error) {
      applyLocal(!add);
      setSendError(error instanceof Error ? error.message : "Unable to update reaction.");
    }
  };

  return { handleReaction };
}
