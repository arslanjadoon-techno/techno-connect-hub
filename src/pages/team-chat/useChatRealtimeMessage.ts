import { useCallback, useRef } from "react";
import {
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
  handledRealtimeMessageKeysRef?: { current: Set<string> };
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
  const fallbackHandledMessageKeysRef = useRef(new Set<string>());
  const messageKeysRef = handledRealtimeMessageKeysRef || fallbackHandledMessageKeysRef;

  const handleRealtimeMessage = useCallback(
    ({ chatId, message }: { chatId: string | number; message: ChatRecord }) => {
      if (!chatId || !message) return;

      const senderId = getMessageSenderId(message);
      const isOwnMessage = senderId && senderId === currentUserId;

      if (!isOwnMessage && blockedUserIds.includes(String(senderId))) {
        return;
      }

      const messageId =
        message?.message_id ||
        message?.messageId ||
        message?.id ||
        message?.createdAt ||
        message?.timestamp ||
        "";

      const hasMessageId =
        messageId !== undefined && messageId !== null && String(messageId).trim().length > 0;

      const realtimeMessageKey = `${String(chatId)}:${String(messageId)}`;

      if (hasMessageId && messageKeysRef.current.has(realtimeMessageKey)) {
        return;
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

      if (!normalizedMessage) {
        return;
      }

      if (blockedUserIds.includes(String(normalizedMessage.authorId))) {
        return;
      }

      // Record the event only after validation so invalid messages can be retried.
      if (hasMessageId) {
        messageKeysRef.current.add(realtimeMessageKey);
      }

      const selectedChatIds = [
        selectedChat?.id,
        selectedChat?.chatId,
        selectedChat?.raw?.id,
        selectedChat?.raw?.chat_id,
        selectedChat?.raw?.chatId,
        selectedChat?.raw?.conversationId,
        selectedChat?.raw?.conversation_id,
      ]
        .filter((value) => value !== undefined && value !== null && String(value).length > 0)
        .map(String);

      const isActiveChat = selectedChatIds.includes(String(chatId));

      const chatKeys = Array.from(
        new Set(
          [localKey, ...(isActiveChat ? [selectedChat?.id, selectedChat?.chatId] : [])]
            .filter((value) => value !== undefined && value !== null && String(value).length > 0)
            .map(String),
        ),
      );

      const existingMessages = chatKeys.reduce<ChatRecord[]>((allMessages, key) => {
        return [...allMessages, ...(messagesByChat[key] || [])];
      }, []);

      const normalizedMessageId =
        normalizedMessage.id ?? normalizedMessage.message_id ?? normalizedMessage.messageId;

      const hasNormalizedMessageId =
        normalizedMessageId !== undefined &&
        normalizedMessageId !== null &&
        String(normalizedMessageId).length > 0;

      const isAlreadyLoaded =
        hasNormalizedMessageId &&
        existingMessages.some((item) => {
          const existingId = item.id ?? item.message_id ?? item.messageId;

          return (
            existingId !== undefined &&
            existingId !== null &&
            String(existingId).length > 0 &&
            String(existingId) === String(normalizedMessageId)
          );
        });

      const messageTimestamp = getMessageTimestamp(message);
      const isNewSinceRealtimeStarted =
        !messageTimestamp || messageTimestamp >= realtimeStartedAtRef.current;

      const isReadByCurrentUser = isMessageReadByUser(message, currentUserId, currentUserEmail);
      const isMentioned = messageMentionsUser(message, currentUserId, currentUserEmail);
      const shouldTreatAsRead = isActiveChat && !document.hidden;

      // Insert the incoming message, or reconcile its optimistic version.
      if (chatKeys.length > 0) {
        setMessagesByChat((prev: Record<string, ChatRecord[]>) => {
          const next = { ...prev };

          chatKeys.forEach((key) => {
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
            } else {
              const alreadyExists = existing.some(
                (item: ChatRecord) => String(item.id) === String(normalizedMessage.id),
              );

              if (!alreadyExists) {
                next[key] = [...existing, normalizedMessage];
              }
            }
          });

          return next;
        });
      }

      // Update the conversation preview and unread count.
      setChannels((prev: ChatRecord[]) => {
        let matchedExistingConversation = false;

        const nextChannels = prev.map((channel: ChatRecord) => {
          const channelId = String(getChannelId(channel) ?? "");
          const conversationId = String(channel?.chat_id ?? channel?.chatId ?? channel?.id ?? "");

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

        // Create a conversation preview when this chat is not currently in the list.
        const sender = message?.sender && typeof message.sender === "object" ? message.sender : {};

        const matchingBuddy = buddies.find(
          (buddy) => String(getBuddySendId(buddy)) === String(senderId),
        );

        const senderUser = {
          ...sender,
          id: senderId,
          user_id: senderId,
          name:
            sender?.name ||
            sender?.display_name ||
            sender?.displayName ||
            matchingBuddy?.name ||
            "Chat user",
          email: sender?.email || sender?.email_id || matchingBuddy?.email || "",
        };

        const initialUnreadCount = !isOwnMessage && !shouldTreatAsRead ? 1 : 0;

        return [
          {
            id: String(chatId),
            chat_id: String(chatId),
            type: "direct",
            isDirect: true,
            title: senderUser.name,
            participants: [senderUser, currentUser].filter(Boolean),
            unreadCount: initialUnreadCount,
            unread_count: initialUnreadCount,
            lastMessage: message,
          },
          ...nextChannels,
        ];
      });

      const isDoNotDisturb =
        String(currentStatus || "")
          .trim()
          .toLowerCase() === "dnd";

      const shouldNotify =
        !isOwnMessage &&
        !shouldTreatAsRead &&
        !isDoNotDisturb &&
        !isAlreadyLoaded &&
        isNewSinceRealtimeStarted &&
        !isReadByCurrentUser;

      const shouldNotifyMention = shouldNotify && isMentioned && mentionNotifications;

      if (shouldNotify) {
        const isMuted = mutedChatIds.includes(String(chatId)) && !shouldNotifyMention;

        if (!isMuted) {
          const matchingBuddy = buddies.find(
            (buddy) => String(getBuddySendId(buddy)) === String(senderId),
          );

          const senderName =
            message?.sender?.name ||
            message?.sender?.display_name ||
            matchingBuddy?.name ||
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
        acknowledgeDelivery: !isOwnMessage && hasMessageId,
        acknowledgeRead: shouldTreatAsRead && !isOwnMessage && hasMessageId,
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
      messageKeysRef,
      realtimeStartedAtRef,
      selectedChat,
      setChannels,
      setMessagesByChat,
    ],
  );

  return handleRealtimeMessage;
}
