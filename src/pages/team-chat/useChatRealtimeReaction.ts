import { useCallback } from "react";
import { getImageUrl, getMessageText } from "./chatHealper";
import { showChatNotification } from "./chatNotifications";
import { getChatRoute } from "./chatRoutes";
import {
  getRealtimeConversationId,
  getRealtimeMessage,
  getRealtimeMessageId,
  getRealtimeReaction,
  getRealtimeReactionEmoji,
} from "./chatRealtimePayload";
import { resolveLocalChatKey } from "./chatMessageNormalization";

type ChatRecord = Record<string, any>;

const getReactionActor = (reaction: ChatRecord): ChatRecord =>
  reaction?.actor ||
  reaction?.user ||
  reaction?.User ||
  reaction?.identity ||
  reaction?.Identity ||
  {};

const getReactionActorId = (reaction: ChatRecord): string => {
  const actor = getReactionActor(reaction);
  return String(
    reaction?.userId ||
      reaction?.user_id ||
      reaction?.appUserId ||
      reaction?.app_user_id ||
      actor?.id ||
      actor?.userId ||
      actor?.user_id ||
      actor?.appUserId ||
      actor?.app_user_id ||
      "",
  ).trim();
};

const getReactionActorName = (reaction: ChatRecord): string => {
  const actor = getReactionActor(reaction);
  return String(
    actor?.name ||
      actor?.display_name ||
      actor?.displayName ||
      actor?.email ||
      actor?.Email ||
      "",
  ).trim();
};

const addRealtimeReactionToMessage = (
  message: ChatRecord,
  reaction: ChatRecord,
  currentUserId: string,
): ChatRecord => {
  const emoji = getRealtimeReactionEmoji(reaction);
  if (!emoji) return message;

  const actorId = getReactionActorId(reaction);
  const actorName = getReactionActorName(reaction);
  const actorIsCurrentUser = Boolean(actorId && actorId === String(currentUserId));
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  let targetFound = false;

  const nextReactions = reactions.reduce<ChatRecord[]>((result, currentReaction: ChatRecord) => {
    const currentEmoji = String(currentReaction?.emoji || "");
    const users = Array.isArray(currentReaction?.users)
      ? currentReaction.users.map(String)
      : [];
    const userDetails = Array.isArray(currentReaction?.userDetails)
      ? currentReaction.userDetails
      : [];
    const actorIndex = actorId ? users.indexOf(actorId) : -1;
    const actorDetailIndex = actorId
      ? userDetails.findIndex((user: ChatRecord) => String(user?.id || "") === actorId)
      : -1;
    const actorAlreadyPresent = actorIndex >= 0 || actorDetailIndex >= 0;

    if (currentEmoji === emoji) {
      targetFound = true;
      if (actorAlreadyPresent) {
        result.push(currentReaction);
        return result;
      }

      const nextUsers = actorId ? [...users, actorId] : users;
      const nextUserDetails =
        actorId && actorName
          ? [...userDetails, { id: actorId, name: actorName }]
          : userDetails;
      result.push({
        ...currentReaction,
        count: Number(currentReaction.count || 0) + 1,
        reacted: Boolean(currentReaction.reacted) || actorIsCurrentUser,
        users: nextUsers,
        userDetails: nextUserDetails,
      });
      return result;
    }

    // The backend allows one reaction per user per message. An added emoji
    // replaces that user's previous emoji, so remove the old bucket locally.
    if (actorAlreadyPresent) {
      const nextCount = Math.max(0, Number(currentReaction.count || 0) - 1);
      if (nextCount > 0) {
        result.push({
          ...currentReaction,
          count: nextCount,
          reacted: actorIsCurrentUser ? false : Boolean(currentReaction.reacted),
          users: actorIndex >= 0 ? users.filter((_, index) => index !== actorIndex) : users,
          userDetails:
            actorDetailIndex >= 0
              ? userDetails.filter((_, index) => index !== actorDetailIndex)
              : userDetails,
        });
      }
      return result;
    }

    result.push(currentReaction);
    return result;
  }, []);

  if (!targetFound) {
    nextReactions.push({
      emoji,
      count: 1,
      reacted: actorIsCurrentUser,
      users: actorId ? [actorId] : [],
      userDetails: actorId && actorName ? [{ id: actorId, name: actorName }] : [],
    });
  }

  return { ...message, reactions: nextReactions };
};

export function useChatRealtimeReaction({
  channels,
  buddies,
  currentUserEmail,
  currentUserId,
  mutedChatIds,
  selectedChat,
  setMessagesByChat,
}: any) {
  return useCallback(
    (payload: any = {}) => {
      const reaction = getRealtimeReaction(payload);
      const reactionEmoji = getRealtimeReactionEmoji(reaction);
      const message = getRealtimeMessage(payload);
      const chatId = getRealtimeConversationId(payload, message);
      const messageId = getRealtimeMessageId(payload, message);
      const actor = getReactionActor(reaction);
      const actorId = String(
        actor?.id ||
          actor?.userId ||
          actor?.user_id ||
          actor?.appUserId ||
          actor?.app_user_id ||
          actor?.identityId ||
          actor?.identity_id ||
          "",
      );
      const actorEmail = String(
        actor?.email || actor?.email_id || actor?.mailid || "",
      ).toLowerCase();

      if (chatId && messageId && setMessagesByChat) {
        const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
        const stateKeys = Array.from(
          new Set(
            [localKey, chatId, selectedChat?.id, selectedChat?.chatId]
              .filter(Boolean)
              .map(String),
          ),
        );

        setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
          const next = { ...previous };
          stateKeys.forEach((key) => {
            next[key] = (previous[key] || []).map((currentMessage) =>
              String(currentMessage?.id || "") === String(messageId)
                ? addRealtimeReactionToMessage(currentMessage, reaction, String(currentUserId || ""))
                : currentMessage,
            );
          });
          return next;
        });
      }

      if (
        !chatId ||
        !reactionEmoji ||
        mutedChatIds.includes(String(chatId)) ||
        (actorId && actorId === String(currentUserId)) ||
        (actorEmail && actorEmail === String(currentUserEmail).toLowerCase())
      )
        return;

      const actorName =
        actor?.name || actor?.display_name || actor?.displayName || actor?.email || "Someone";
      const messagePreview = getMessageText(message);
      showChatNotification({
        title: `${actorName} reacted ${reactionEmoji}`,
        body: messagePreview ? `To your message: ${messagePreview}` : "To your message",
        icon: getImageUrl(actor),
        tag: `reaction-${chatId}-${message?.id || message?.message_id || ""}-${String(reactionEmoji)}`,
        dedupeKey: `chat-reaction:${String(chatId)}:${String(message?.id || message?.message_id || "")}:${String(reactionEmoji)}`,
        // chatId is the persisted conversation ID. The local message store
        // may use a participant/user ID for direct chats, but that ID must
        // never be used as the notification route.
        url: getChatRoute(chatId),
      });
    },
    [
      buddies,
      channels,
      currentUserEmail,
      currentUserId,
      mutedChatIds,
      selectedChat?.chatId,
      selectedChat?.id,
      setMessagesByChat,
    ],
  );
}
