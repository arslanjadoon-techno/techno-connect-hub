import { useCallback } from "react";
import { getImageUrl, getMessageText } from "./chatHealper";
import { showChatNotification } from "./chatNotifications";
import { getChatRoute } from "./chatRoutes";
import {
  getRealtimeConversationId,
  getRealtimeMessage,
  getRealtimeReaction,
  getRealtimeReactionEmoji,
} from "./chatRealtimePayload";

export function useChatRealtimeReaction({
  currentUserEmail,
  currentUserId,
  mutedChatIds,
}: any) {
  return useCallback(
    (payload: any = {}) => {
      const reaction = getRealtimeReaction(payload);
      const reactionEmoji = getRealtimeReactionEmoji(reaction);
      const message = getRealtimeMessage(payload);
      const chatId = getRealtimeConversationId(payload, message);
      const actor =
        reaction?.actor ||
        reaction?.user ||
        reaction?.User ||
        reaction?.identity ||
        reaction?.Identity ||
        {};
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
    [currentUserEmail, currentUserId, mutedChatIds],
  );
}
