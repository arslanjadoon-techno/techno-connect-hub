import { useCallback, useEffect, useRef } from "react";
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

  const linkForNotification = useCallback((type?: string, requestId?: string | number) => {
    const normalizedType = String(type || "").toLowerCase();
    if (normalizedType === "otp_manager") return "/otp/manager";
    if (normalizedType === "otp_backoffice_pending") return "/otp/backoffice";
    if (normalizedType === "otp") return "/chat";
    if (normalizedType.startsWith("otp:")) {
      return `${CHAT_APP_BASE_PATH}/${encodeURIComponent(String(type).slice("otp:".length))}`;
    }

    const chatPrefix = normalizedType.startsWith("chat_message:")
      ? "chat_message:"
      : normalizedType.startsWith("chat_reaction:")
        ? "chat_reaction:"
        : undefined;
    if (chatPrefix) {
      return `${CHAT_APP_BASE_PATH}/${encodeURIComponent(String(type).slice(chatPrefix.length))}`;
    }
    return requestId ? `/expenses/requests/${encodeURIComponent(String(requestId))}` : undefined;
  }, []);

  const addPersistentNotification = useCallback(
    (payload: any = {}) => {
      const item = payload?.notification || payload;
      if (!item || item.id === undefined || item.id === null) return;

      const id = String(item.id);
      const notification: AppNotification = {
        id,
        userId: item.userId == null ? String(user?.id || "") : String(item.userId),
        requestId: item.requestId,
        type: item.type,
        title: item.title || "Notification",
        body: item.message ?? item.body ?? "",
        link: item.link || linkForNotification(item.type, item.requestId),
        createdAt: item.createdAt || new Date().toISOString(),
        read: Boolean(item.isRead ?? item.read),
      };

      if (notificationsRef.current.some((existing) => existing.id === id)) return;
      const syntheticIndex = notificationsRef.current.findIndex(
        (existing) =>
          existing.id.startsWith("chat-message-") &&
          existing.type &&
          notification.type &&
          existing.type === notification.type &&
          existing.body === notification.body,
      );
      if (syntheticIndex >= 0) {
        const next = [...notificationsRef.current];
        next[syntheticIndex] = notification;
        notificationsRef.current = next;
      } else {
        notificationsRef.current = [notification, ...notificationsRef.current].slice(0, 100);
      }
      set("notifications", notificationsRef.current);

      // message:new already owns browser alerts for chat messages and system
      // messages. The persistent event only replaces the temporary bell item.
      const notificationType = String(notification.type || "").toLowerCase();
      const isChatNotification =
        notificationType === "chat_message" ||
        notificationType === "chat_reaction" ||
        notificationType.startsWith("chat_message:") ||
        notificationType.startsWith("chat_reaction:");
      const linkedChatId = notificationType.startsWith("otp:")
        ? notificationType.slice("otp:".length)
        : "";
      const activeChatId = location.pathname.startsWith(`${CHAT_APP_BASE_PATH}/`)
        ? decodeURIComponent(location.pathname.slice(`${CHAT_APP_BASE_PATH}/`.length).split("/")[0])
        : "";
      if (isChatNotification || (linkedChatId && activeChatId === linkedChatId)) return;

      const shown = showChatNotification({
        title: notification.title,
        body: notification.body,
        tag: `app-notification-${id}`,
        dedupeKey: `notification:${id}`,
        url: notification.link,
        onClick: () => notification.link && navigate(notification.link),
      });
      if (shown) playMessageNotificationSound();
    },
    [linkForNotification, location.pathname, navigate, set, user?.id],
  );

  const onMessage = useCallback(
    (payload: Record<string, any> = {}) => {
      const message = payload?.message || payload;
      const chatId = payload?.chatId || payload?.chat_id || message?.conversationId || message?.chatId;
      const messageId = message?.id || message?.messageId || message?.message_id;
      const senderId = getMessageSenderId(message);

      if (!chatId || !messageId || !senderId || String(senderId) === String(user?.id)) return;

      // ChatSystem has the active-conversation state and applies mute, DND,
      // visibility, and read-status rules. The root connection remains alive,
      // but it must not produce a second browser alert while Chat is mounted.
      if (location.pathname.startsWith(CHAT_APP_BASE_PATH)) return;

      const notificationId = `chat-message-${String(messageId)}`;
      if (notificationsRef.current.some((item) => item.id === notificationId)) return;

      const sender = message?.sender || {};
      const senderName =
        sender?.name || sender?.displayName || sender?.display_name || sender?.email || "New message";
      const body = getMessageText(message) || "You received a new chat message.";
      const link = `${CHAT_APP_BASE_PATH}/${encodeURIComponent(String(chatId))}`;
      const persistentType = `chat_message:${String(chatId)}`;
      if (
        notificationsRef.current.some(
          (item) =>
            item.type === persistentType &&
            item.title === senderName &&
            item.body === body,
        )
      ) {
        return;
      }

      const notification: AppNotification = {
        id: notificationId,
        userId: String(user?.id || ""),
        title: senderName,
        body,
        link,
        type: persistentType,
        createdAt: new Date().toISOString(),
        read: false,
      };

      notificationsRef.current = [notification, ...notificationsRef.current].slice(0, 100);
      set("notifications", notificationsRef.current);

      const shown = showChatNotification({
        title: senderName,
        body,
        icon: getImageUrl(sender),
        tag: `chat-${String(chatId)}`,
        dedupeKey: `chat-message:${String(messageId)}`,
        url: link,
        onClick: () => navigate(link),
      });
      if (shown) playMessageNotificationSound();
    },
    [location.pathname, navigate, set, user?.id],
  );

  useEffect(() => {
    const handleWindowNotification = (event: Event) => {
      addPersistentNotification((event as CustomEvent).detail);
    };

    window.addEventListener("app:notification", handleWindowNotification);
    return () => window.removeEventListener("app:notification", handleWindowNotification);
  }, [addPersistentNotification]);

  useChatRealtime({
    // The Chat page has its own stateful realtime connection. Keep this shell
    // listener for the other MIS modules so we do not maintain two SignalR
    // connections or process the same event twice while Chat is open.
    enabled: Boolean(user) && !location.pathname.startsWith(CHAT_APP_BASE_PATH),
    onMessage,
    onNotification: addPersistentNotification,
  });

  return null;
}
