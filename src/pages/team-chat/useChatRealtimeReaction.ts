import { useCallback } from "react";
import { getImageUrl, getMessageText } from "./chatHealper";
import { resolveLocalChatKey } from "./chatMessageNormalization";
import { showChatNotification } from "./chatNotifications";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";

export function useChatRealtimeReaction({
  channels,
  buddies,
  currentUserEmail,
  currentUserId,
  mutedChatIds,
  navigate,
}: any) {
  return useCallback(
    ({ chatId, reaction, message }: any) => {
      const actorId = String(
        reaction?.actor?.id ||
          reaction?.actor?.userId ||
          reaction?.actor?.user_id ||
          reaction?.actor?.appUserId ||
          "",
      );
      const actorEmail = String(
        reaction?.actor?.email || reaction?.actor?.email_id || reaction?.actor?.mailid || "",
      ).toLowerCase();
      if (
        !chatId ||
        !reaction?.emoji ||
        mutedChatIds.includes(String(chatId)) ||
        (actorId && actorId === currentUserId) ||
        (actorEmail && actorEmail === currentUserEmail)
      )
        return;

      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      const actorName =
        reaction?.actor?.name ||
        reaction?.actor?.display_name ||
        reaction?.actor?.email ||
        "Someone";
      const messagePreview = getMessageText(message);
      showChatNotification({
        title: `${actorName} reacted ${reaction.emoji}`,
        body: messagePreview ? `To your message: ${messagePreview}` : "To your message",
        icon: getImageUrl(reaction?.actor),
        tag: `reaction-${chatId}-${message?.id || message?.message_id || ""}`,
        url: `${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey || chatId)}`,
        onClick: () => {
          if (localKey) navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey)}`);
        },
      });
    },
    [buddies, channels, currentUserEmail, currentUserId, mutedChatIds, navigate],
  );
}
