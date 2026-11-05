import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import type { AppNotification } from "@/lib/types";
import { useChatRealtime } from "../team-chat/useChatRealtime";
import {
  getImageUrl,
  getMessageSenderId,
  getMessageText,
} from "../team-chat/chatHealper";
import { CHAT_APP_BASE_PATH } from "../team-chat/chatRoutes";
import { playMessageNotificationSound, showChatNotification } from "../team-chat/chatNotifications";

/** Keeps chat notifications alive while the user is working elsewhere in MIS. */
export default function GlobalChatNotifications() {
  const { user } = useAuth();
  const { data, set } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const notificationsRef = useRef(data.notifications);
  notificationsRef.current = data.notifications;

  const onMessage = useCallback(
    (payload: Record<string, any> = {}) => {
      const message = payload?.message || payload;
      const chatId = payload?.chatId || payload?.chat_id || message?.conversationId || message?.chatId;
      const messageId = message?.id || message?.messageId || message?.message_id;
      const senderId = getMessageSenderId(message);

      if (!chatId || !messageId || !senderId || String(senderId) === String(user?.id)) return;

      const notificationId = `chat-message-${String(messageId)}`;
      if (notificationsRef.current.some((item) => item.id === notificationId)) return;

      const sender = message?.sender || {};
      const senderName =
        sender?.name || sender?.displayName || sender?.display_name || sender?.email || "New message";
      const body = getMessageText(message) || "You received a new chat message.";
      const link = `${CHAT_APP_BASE_PATH}/${encodeURIComponent(String(chatId))}`;

      const notification: AppNotification = {
        id: notificationId,
        userId: String(user?.id || ""),
        title: senderName,
        body,
        link,
        createdAt: new Date().toISOString(),
        read: false,
      };

      notificationsRef.current = [notification, ...notificationsRef.current].slice(0, 100);
      set("notifications", notificationsRef.current);

      showChatNotification({
        title: senderName,
        body,
        icon: getImageUrl(sender),
        tag: `chat-${String(chatId)}`,
        url: link,
        onClick: () => navigate(link),
      });
      playMessageNotificationSound();
    },
    [navigate, set, user?.id],
  );

  useChatRealtime({
    // ChatSystem owns the full realtime connection on chat pages. This
    // listener owns it everywhere else, preventing duplicate notifications.
    enabled: Boolean(user) && !location.pathname.startsWith(CHAT_APP_BASE_PATH),
    onMessage,
  });

  return null;
}
