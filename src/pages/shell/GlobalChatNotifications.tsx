import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import type { AppNotification } from "@/lib/types";
import { useChatRealtime } from "../team-chat/useChatRealtime";
import {
  getImageUrl,
  getBuddyName,
  getMessageSenderId,
  getMessageText,
} from "../team-chat/chatHealper";
import { CHAT_APP_BASE_PATH, getChatRoute } from "../team-chat/chatRoutes";
import { playMessageNotificationSound, showChatNotification } from "../team-chat/chatNotifications";
import { getNotificationLink } from "./notificationUtils";
import { useChatRealtimeReaction } from "../team-chat/useChatRealtimeReaction";
import {
  getRealtimeConversationId,
  getRealtimeMessage,
  getRealtimeMessageId,
} from "../team-chat/chatRealtimePayload";

const EMPTY_CHAT_RECORDS: Record<string, any>[] = [];
const EMPTY_MUTED_CHAT_IDS: string[] = [];

/** Keeps chat notifications alive while the user is working elsewhere in MIS. */
export default function GlobalChatNotifications() {
  const { user } = useAuth();
  const { data, set } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const notificationsRef = useRef(data.notifications);
  notificationsRef.current = data.notifications;
  const onReaction = useChatRealtimeReaction({
    channels: EMPTY_CHAT_RECORDS,
    buddies: EMPTY_CHAT_RECORDS,
    currentUserEmail: user?.email || "",
    currentUserId: user?.id || "",
    mutedChatIds: EMPTY_MUTED_CHAT_IDS,
  });

  const addPersistentNotification = useCallback(
    (payload: any = {}) => {
      const item =
        payload?.notification ||
        payload?.data?.notification ||
        (payload?.data && typeof payload.data === "object" ? payload.data : payload);
      if (!item || item.id === undefined || item.id === null) return;

      const id = String(item.id);
      const notification: AppNotification = {
        id,
        userId: item.userId == null ? String(user?.id || "") : String(item.userId),
        requestId: item.requestId,
        type: item.type,
        title: item.title || "Notification",
        body: item.message ?? item.body ?? "",
        link: item.link || getNotificationLink(item.type, item.requestId),
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
      const replacedSyntheticMessage = syntheticIndex >= 0;
      if (syntheticIndex >= 0) {
        const next = [...notificationsRef.current];
        next[syntheticIndex] = notification;
        notificationsRef.current = next;
      } else {
        notificationsRef.current = [notification, ...notificationsRef.current].slice(0, 100);
      }
      set("notifications", notificationsRef.current);

      // Chat messages normally arrive through message:new. The shared
      // notification:new event below is also allowed to alert, so a missed or
      // delayed message:new does not leave users in another MIS module silent.
      const notificationType = String(notification.type || "").toLowerCase();
      const isChatMessageNotification =
        notificationType === "chat_message" || notificationType.startsWith("chat_message:");
      const isChatReactionNotification =
        notificationType === "chat_reaction" || notificationType.startsWith("chat_reaction:");
      const linkedChatId = notificationType.startsWith("otp:")
        ? notificationType.slice("otp:".length)
        : "";
      const isInsideChatModule =
        location.pathname === CHAT_APP_BASE_PATH ||
        location.pathname.startsWith(`${CHAT_APP_BASE_PATH}/`);
      const activeChatId = location.pathname.startsWith(`${CHAT_APP_BASE_PATH}/`)
        ? decodeURIComponent(location.pathname.slice(`${CHAT_APP_BASE_PATH}/`.length).split("/")[0])
        : "";
      if (isInsideChatModule || (linkedChatId && activeChatId === linkedChatId)) return;

      // A chat message can arrive through both notification:new and message:new.
      // If message:new already created the temporary item and desktop alert,
      // notification:new only replaces that item with the server notification.
      if (isChatMessageNotification && replacedSyntheticMessage) return;

      // The reaction event owns reaction alerts because it contains the message
      // id used for reliable cross-tab deduplication.
      if (isChatReactionNotification) return;

      const shown = showChatNotification({
        title: notification.title,
        body: notification.body,
        tag: `app-notification-${id}`,
        dedupeKey: `notification:${id}`,
        url: notification.link,
      });
      if (shown) playMessageNotificationSound();
    },
    [location.pathname, set, user?.id],
  );

  const onMessage = useCallback(
    (payload: Record<string, any> = {}) => {
      const message = getRealtimeMessage(payload);
      const chatId = getRealtimeConversationId(payload, message);
      const messageId = getRealtimeMessageId(payload, message);
      const senderId = getMessageSenderId(message);

      if (!chatId || !messageId || !senderId || String(senderId) === String(user?.id)) return;

      // ChatSystem has the active-conversation state and applies mute, DND,
      // visibility, and read-status rules. The root connection remains alive,
      // but it must not produce a second browser alert while Chat is mounted.
      if (location.pathname.startsWith(CHAT_APP_BASE_PATH)) return;

      const notificationId = `chat-message-${String(messageId)}`;
      if (notificationsRef.current.some((item) => item.id === notificationId)) return;

      const sender = message?.sender || {};
      const senderName = [getBuddyName(sender), sender?.email || sender?.email_id].find(
        (name) => name && !/^(chat\s*user|chatuser)$/i.test(String(name).trim()),
      ) || "New message";
      const body = getMessageText(message) || "You received a new chat message.";
      const link = getChatRoute(chatId);
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
        // Keep each message visible in browsers that replace notifications
        // with the same tag, including Edge.
        tag: `chat-${String(chatId)}-${String(messageId)}`,
        dedupeKey: `chat-message:${String(messageId)}`,
        url: link,
      });
      if (shown) playMessageNotificationSound();
    },
    [location.pathname, set, user?.id],
  );

  useEffect(() => {
    const handleWindowNotification = (event: Event) => {
      addPersistentNotification((event as CustomEvent).detail);
    };

    const navigateToNotification = (value: unknown) => {
      if (typeof value !== "string" || !value.trim()) return;

      try {
        const target = new URL(value, window.location.origin);
        if (target.origin !== window.location.origin) return;

        navigate(`${target.pathname}${target.search}${target.hash}`);
      } catch {
        // Ignore malformed notification URLs instead of leaving the app shell.
      }
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "chat-notification-click") return;
      navigateToNotification(event.data.url);
    };

    const handlePageNotificationClick = (event: Event) => {
      navigateToNotification((event as CustomEvent<{ url?: unknown }>).detail?.url);
    };

    window.addEventListener("app:notification", handleWindowNotification);
    window.addEventListener("chat-notification-click", handlePageNotificationClick);
    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      window.removeEventListener("app:notification", handleWindowNotification);
      window.removeEventListener("chat-notification-click", handlePageNotificationClick);
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [addPersistentNotification, navigate]);

  useChatRealtime({
    // The Chat page has its own stateful realtime connection. Keep this shell
    // listener for the other MIS modules so we do not maintain two SignalR
    // connections or process the same event twice while Chat is open.
    enabled: Boolean(user) && !location.pathname.startsWith(CHAT_APP_BASE_PATH),
    onMessage,
    onReactionAdded: onReaction,
    onNotification: addPersistentNotification,
  });

  return null;
}
