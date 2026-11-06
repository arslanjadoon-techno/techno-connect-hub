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
    ({ chatId, reaction, message: rawMessage }: any) => {
      // Older backend builds wrapped the message one extra time inside the
      // reaction payload. Accept both shapes so the notification never renders
      // an object as "[object Object]" during a rolling deployment.
      const message =
        rawMessage?.message && typeof rawMessage.message === "object"
          ? rawMessage.message
          : rawMessage;
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
          "",
      );
      const actorEmail = String(
        actor?.email || actor?.email_id || actor?.mailid || "",
      ).toLowerCase();
      if (
        !chatId ||
        !reaction?.emoji ||
        mutedChatIds.includes(String(chatId)) ||
        (actorId && actorId === String(currentUserId)) ||
        (actorEmail && actorEmail === String(currentUserEmail).toLowerCase())
      )
        return;

      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      const actorName =
        actor?.name ||
        actor?.display_name ||
        actor?.displayName ||
        actor?.email ||
        "Someone";
      const messagePreview = getMessageText(message);
      showChatNotification({
        title: `${actorName} reacted ${reaction.emoji}`,
        body: messagePreview ? `To your message: ${messagePreview}` : "To your message",
        icon: getImageUrl(actor),
        tag: `reaction-${chatId}-${message?.id || message?.message_id || ""}`,
        dedupeKey: `chat-reaction:${String(chatId)}:${String(message?.id || message?.message_id || "")}:${String(reaction?.emoji)}`,
        url: `${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey || chatId)}`,
        onClick: () => {
          if (localKey) navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey)}`);
        },
      });
    },
    [buddies, channels, currentUserEmail, currentUserId, mutedChatIds, navigate],
  );
}
