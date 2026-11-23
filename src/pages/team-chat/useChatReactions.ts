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
  const next = reactions.reduce<ChatRecord[]>((result, reaction: ChatRecord) => {
    const users = Array.isArray(reaction.users) ? reaction.users.map(String) : [];
    // `reacted` is normalized for the current user. It is more reliable than
    // comparing IDs here because the API may return a chat-identity ID while
    // the session stores the provider/user ID.
    const hadUser = Boolean(reaction.reacted) || Boolean(userId && users.includes(userId));
    const isTarget = reaction.emoji === emoji;

    // A user may have only one reaction on a message. When adding a new
    // emoji, remove that user from every previous emoji first. When removing
    // the target emoji, remove the user and decrement the count immediately
    // so the UI does not wait for a realtime refresh to become correct.
    const shouldRemoveUser = hadUser && (isTarget ? !add : add);
    const nextUsers = shouldRemoveUser ? users.filter((id: string) => id !== userId) : users;
    const nextCount = Math.max(0, Number(reaction.count || 0) - (shouldRemoveUser ? 1 : 0));

    if (nextCount > 0) {
      result.push({
        ...reaction,
        count: nextCount,
        // `reacted` describes the current user, not whether anyone selected
        // this emoji. A target reaction owned by another user must still be
        // counted when the current user adds the same emoji.
        reacted: isTarget ? (add ? hadUser : false) : add ? false : Boolean(reaction.reacted),
        users: nextUsers,
      });
    }
    return result;
  }, []);

  if (!add) return { ...message, reactions: next };

  const target = next.find((reaction: ChatRecord) => reaction.emoji === emoji);
  if (target) {
    const users = Array.isArray(target.users) ? target.users.map(String) : [];
    const alreadyReacted = Boolean(target.reacted) || Boolean(userId && users.includes(userId));
    if (userId && !users.includes(userId)) users.push(userId);
    target.count = Number(target.count || 0) + (alreadyReacted ? 0 : 1);
    target.reacted = true;
    target.users = users;
  } else {
    next.unshift({ emoji, count: 1, reacted: true, users: userId ? [userId] : [] });
  }
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
