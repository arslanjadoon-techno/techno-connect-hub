import { useCallback } from "react";
import {
  getBuddyEmail,
  getBuddySendId,
  getChannelId,
  getImageUrl,
  getMessageSenderId,
  getMessageText,
  getUnreadCount,
} from "./chatHealper";
import { normalizeRealtimeMessage, resolveLocalChatKey } from "./chatMessageNormalization";
import { getMessageTimestamp, isMessageReadByUser, messageMentionsUser } from "./ChatSystemUtils";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";
import { playMessageNotificationSound, showChatNotification } from "./chatNotifications";
import { markConversationReadService } from "@/services/Team-chat/chat.service";

type ChatRecord = Record<string, any>;

type ChatRealtimeMessageOptions = {
  blockedUserIds: string[];
  buddies: ChatRecord[];
  channels: ChatRecord[];
  currentUser: ChatRecord | null;
  currentUserEmail: string;
  currentUserId: string;
  currentStatus: string;
  messagesByChat: Record<string, ChatRecord[]>;
  mutedChatIds: string[];
  mentionNotifications: boolean;
  navigate: (path: string) => void;
  handledRealtimeMessageKeysRef: { current: Set<string> };
  realtimeStartedAtRef: { current: number };
  selectedChat: ChatRecord | null;
  setChannels: (updater: any) => void;
  setMessagesByChat: (updater: any) => void;
};

export function useChatRealtimeMessage({
  blockedUserIds,
  buddies,
  channels,
  currentUser,
  currentUserEmail,
  currentUserId,
  currentStatus,
  messagesByChat,
  mutedChatIds,
  mentionNotifications,
  navigate,
  handledRealtimeMessageKeysRef,
  realtimeStartedAtRef,
  selectedChat,
  setChannels,
  setMessagesByChat,
}: ChatRealtimeMessageOptions) {
  const handleRealtimeMessage = useCallback(
    ({ chatId, message }: { chatId: string | number; message: ChatRecord }) => {
      if (!chatId || !message) return;

      const senderId = getMessageSenderId(message);
      const isOwnMessage = senderId && senderId === currentUserId;
      if (!isOwnMessage && blockedUserIds.includes(String(senderId))) return;
      const messageId =
        message?.message_id ||
        message?.messageId ||
        message?.id ||
        message?.createdAt ||
        message?.timestamp ||
        "";
      const realtimeMessageKey = `${String(chatId)}:${String(messageId)}`;

      if (messageId && handledRealtimeMessageKeysRef.current.has(realtimeMessageKey)) {
        return;
      }

      if (messageId) {
        handledRealtimeMessageKeysRef.current.add(realtimeMessageKey);
      }

      const localKey = resolveLocalChatKey({
        chatId,
        channels,
        buddies,
        currentUserId,
      });
      const normalizedMessage = normalizeRealtimeMessage(message, {
        ...(selectedChat || {}),
        id: localKey || selectedChat?.id,
        currentUserId,
      });

      if (!normalizedMessage) return;
      if (blockedUserIds.includes(String(normalizedMessage.authorId))) return;

      const selectedChatIds = [
        selectedChat?.id,
        selectedChat?.chatId,
        selectedChat?.raw?.id,
        selectedChat?.raw?.chat_id,
        selectedChat?.raw?.chatId,
        selectedChat?.raw?.conversationId,
        selectedChat?.raw?.conversation_id,
      ]
        .filter(Boolean)
        .map(String);
      const isActiveChat = selectedChatIds.includes(String(chatId));
      const messageKeys = Array.from(
        new Set(
          [localKey, ...(isActiveChat ? [selectedChat?.id, selectedChat?.chatId] : [])]
            .filter(Boolean)
            .map(String),
        ),
      );
      const existingMessages = messageKeys.reduce<ChatRecord[]>(
        (allMessages, key) => [...allMessages, ...(messagesByChat[key] || [])],
        [],
      );
      const isAlreadyLoaded = existingMessages.some(
        (item) => String(item.id) === String(normalizedMessage.id),
      );
      const messageTimestamp = getMessageTimestamp(message);
      const isNewSinceRealtimeStarted =
        !messageTimestamp || messageTimestamp >= realtimeStartedAtRef.current;
      const isReadByCurrentUser = isMessageReadByUser(message, currentUserId, currentUserEmail);
      const isMentioned = messageMentionsUser(message, currentUserId, currentUserEmail);

      const shouldTreatAsRead = isActiveChat && !document.hidden;

      if (messageKeys.length > 0) {
        setMessagesByChat((prev: Record<string, ChatRecord[]>) => {
          const next = { ...prev };
          messageKeys.forEach((key) => {
            const existing = next[key] || [];
            const clientMessageId = normalizedMessage.clientMessageId;
            const optimisticIndex = clientMessageId
              ? existing.findIndex(
                  (item) => String(item.clientMessageId) === String(clientMessageId),
                )
              : -1;
            if (optimisticIndex >= 0) {
              const updated = [...existing];
              updated[optimisticIndex] = {
                ...updated[optimisticIndex],
                ...normalizedMessage,
                sendState: "sent",
                deliveryStatus: normalizedMessage.deliveryStatus || "sent",
              };
              next[key] = updated;
            } else if (
              !existing.some((item: ChatRecord) => String(item.id) === String(normalizedMessage.id))
            ) {
              next[key] = [...existing, normalizedMessage];
            }
          });
          return next;
        });
      }

      setChannels((prev: ChatRecord[]) => {
        let matchedExistingConversation = false;
        const nextChannels = prev.map((channel: ChatRecord) => {
          const channelId = String(getChannelId(channel));
          const conversationId = String(channel?.chat_id || channel?.chatId || channel?.id || "");

          if (channelId !== String(chatId) && conversationId !== String(chatId)) {
            return channel;
          }

          matchedExistingConversation = true;
          const currentUnreadCount = getUnreadCount(channel);
          const nextUnreadCount =
            !isOwnMessage && !shouldTreatAsRead ? currentUnreadCount + 1 : currentUnreadCount;
          return {
            ...channel,
            lastMessage: message,
            unreadCount: nextUnreadCount,
            unread_count: nextUnreadCount,
          };
        });

        if (matchedExistingConversation || isOwnMessage) {
          return nextChannels;
        }

        const sender = message?.sender || {};
        const senderUser = {
          ...(typeof sender === "object" ? sender : {}),
          id: senderId,
          user_id: senderId,
          name:
            sender?.name ||
            sender?.display_name ||
            sender?.displayName ||
            buddies.find((buddy) => getBuddySendId(buddy) === senderId)?.name ||
            "Chat user",
          email:
            sender?.email ||
            sender?.email_id ||
            buddies.find((buddy) => getBuddySendId(buddy) === senderId)?.email ||
            "",
        };

        return [
          {
            id: String(chatId),
            chat_id: String(chatId),
            type: "direct",
            isDirect: true,
            title: senderUser.name,
            participants: [senderUser, currentUser].filter(Boolean),
            unreadCount: !isOwnMessage && !shouldTreatAsRead ? 1 : 0,
            unread_count: !isOwnMessage && !shouldTreatAsRead ? 1 : 0,
            lastMessage: message,
          },
          ...nextChannels,
        ];
      });

      const shouldNotify =
        !isOwnMessage &&
        !shouldTreatAsRead &&
        currentStatus !== "dnd" &&
        !isAlreadyLoaded &&
        isNewSinceRealtimeStarted &&
        !isReadByCurrentUser;
      const shouldNotifyMention = shouldNotify && isMentioned && mentionNotifications;

      if (shouldNotify) {
        const isMuted = mutedChatIds.includes(String(chatId)) && !shouldNotifyMention;
        if (!isMuted) {
          const senderName =
            message?.sender?.name ||
            message?.sender?.display_name ||
            buddies.find((buddy) => getBuddySendId(buddy) === senderId)?.name ||
            "Someone";

          showChatNotification({
            title: shouldNotifyMention ? `${senderName} mentioned you` : senderName,
            body: shouldNotifyMention
              ? `${senderName}: ${getMessageText(message)}`
              : getMessageText(message),
            icon: getImageUrl(message?.sender),
            tag: `chat-${chatId}`,
            url: localKey
              ? `${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey)}`
              : CHAT_APP_BASE_PATH,
            onClick: () => {
              if (localKey) {
                navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey)}`);
              }
            },
          });
          playMessageNotificationSound();
        }
      }

      if (shouldTreatAsRead && !isOwnMessage) {
        markConversationReadService(chatId).catch(() => {});
      }

      return {
        acknowledgeDelivery: !isOwnMessage,
        acknowledgeRead: shouldTreatAsRead && !isOwnMessage,
      };
    },
    [
      blockedUserIds,
      buddies,
      channels,
      currentUser,
      currentUserEmail,
      currentUserId,
      currentStatus,
      messagesByChat,
      mutedChatIds,
      mentionNotifications,
      navigate,
      realtimeStartedAtRef,
      selectedChat,
      setChannels,
      setMessagesByChat,
    ],
  );

  return handleRealtimeMessage;
}
