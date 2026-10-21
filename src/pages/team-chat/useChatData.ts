import { useCallback, useState } from "react";
import {
  getArrayPayload,
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
  normalizeChatError,
  normalizePresence,
} from "./chatHealper";
import { getCachedChatMessages, saveCachedChatMessages } from "./chatMessageIndexedDb";
import { setChatNotificationsEnabled } from "./chatNotifications";
import { normalizeChatMessages } from "./chatMessageNormalization";
import {
  markConversationReadService,
  getChatConversationsService,
  getChatMessagesService,
  getChatSettingsService,
  getChatStatusService,
  getChatUsersService,
  updateChatSettingsService,
  updateChatStatusService,
} from "@/services/Team-chat/chat.service";
import { getStoredUser } from "@/lib/api/client";

type ChatRecord = Record<string, any>;

type ChatDataOptions = {
  chatClearVersionsRef: { current: Map<string, number> };
  clearUnreadForChat: (chat: ChatRecord) => void;
  currentUserId: string;
  id?: string;
  isCurrentUserRecord: (user: ChatRecord) => boolean;
  isSelfConversation: (conversation: ChatRecord) => boolean;
  loadedChatHistoryRef: { current: Set<string> };
  loadingChatHistoryRef: { current: Set<string> };
  selectedChat: ChatRecord | null;
  setBlockedUserIds: (value: any) => void;
  setBuddies: (value: any) => void;
  setChannels: (value: any) => void;
  setCurrentStatus: (value: any) => void;
  setEnterToSend: (value: any) => void;
  setLoadError: (value: any) => void;
  setLoading: (value: any) => void;
  setMentionNotifications: (value: any) => void;
  setMessagePaginationByChat: (value: any) => void;
  setMessagesByChat: (value: any) => void;
  setMutedChatIds: (value: any) => void;
  setProfileUser: (value: any) => void;
  setSelectedChat: (value: any) => void;
  setSendError: (value: any) => void;
  setTab: (value: any) => void;
};

/**
 * Unwrap the chat-settings response regardless of envelope shape.
 * Accepts { data: { data: {...} } }, { data: {...} }, or the object itself.
 */
function unwrapEnvelope<T = any>(response: any): T {
  if (!response) return {} as T;
  return (response?.data?.data ?? response?.data ?? response) as T;
}

/**
 * Unwrap a messages response. Handles every envelope shape that legacy
 * backends have returned, without re-evaluating the same property chain
 * four times.
 */
function unwrapMessagesResponse(response: any): any {
  if (!response) return {};
  const candidates: any[] = [
    response?.data?.data?.data?.messages && response.data.data.data,
    response?.data?.data?.messages && response.data.data,
    response?.data?.messages && response.data,
    response?.data?.data,
    response?.data,
    response,
  ];
  return candidates.find(Boolean) ?? {};
}

export function useChatData({
  chatClearVersionsRef,
  clearUnreadForChat,
  currentUserId,
  id,
  isCurrentUserRecord,
  isSelfConversation,
  loadedChatHistoryRef,
  loadingChatHistoryRef,
  selectedChat,
  setBlockedUserIds,
  setBuddies,
  setChannels,
  setCurrentStatus,
  setEnterToSend,
  setLoadError,
  setLoading,
  setMentionNotifications,
  setMessagePaginationByChat,
  setMessagesByChat,
  setMutedChatIds,
  setProfileUser,
  setSelectedChat,
  setSendError,
  setTab,
}: ChatDataOptions) {
  // Owned by the hook; passed down to <ChatSidebar /> as a prop so it doesn't
  // fetch settings a second time.
  const [desktopNotifications, setDesktopNotifications] = useState<boolean | undefined>();

  const loadDirectChatHistory = useCallback(
    async (chat: ChatRecord) => {
      if (!chat || chat.type !== "person" || !chat.id) return;

      const chatKey = String(chat.id);

      if (loadingChatHistoryRef.current.has(chatKey)) return;

      loadingChatHistoryRef.current.add(chatKey);

      const requestClearVersion = chatClearVersionsRef.current.get(chatKey) || 0;

      loadedChatHistoryRef.current.add(chatKey);

      clearUnreadForChat({
        chatId: chat.chatId,
        userId: chat.id,
        email: chat.subtitle || getBuddyEmail(chat.raw),
      });

      try {
        const chatId = chat.chatId || null;
        if (!chatId) return;

        setSelectedChat((prev: ChatRecord | null) =>
          prev?.id === chat.id ? { ...prev, chatId } : prev,
        );

        // 1. Read cache using the same key used by the chat UI.
        const cachedMessages = await getCachedChatMessages(chat.id);

        if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) {
          return;
        }

        if (cachedMessages.length > 0) {
          setMessagesByChat((prev: Record<string, ChatRecord[]>) => ({
            ...prev,
            [chat.id]: cachedMessages,
            [chatId]: cachedMessages,
          }));
        }

        // 2. Fetch fresh history.
        const messagesResponse: any = await getChatMessagesService(chatId, { limit: 100 });

        if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) {
          return;
        }

        const historyPayload = unwrapMessagesResponse(messagesResponse);

        const normalizedMessages = normalizeChatMessages(historyPayload, { ...chat, chatId });

        // 3. Merge server history with cached messages without duplicates.
        const existingMessages = cachedMessages.length > 0 ? cachedMessages : [];

        const mergedMap = new Map<string, ChatRecord>();

        for (const message of [...existingMessages, ...normalizedMessages]) {
          const messageId = String(
            message.id ??
              message.messageId ??
              message.message_id ??
              message.clientMessageId ??
              message.client_message_id ??
              [
                message.senderId ?? message.sender_id ?? "",
                message.createdAt ?? message.created_at ?? "",
                message.content ?? message.message ?? message.text ?? "",
              ].join("|"),
          );

          mergedMap.set(messageId, {
            ...mergedMap.get(messageId),
            ...message,
          });
        }

        const mergedMessages = Array.from(mergedMap.values());

        setMessagesByChat((prev: Record<string, ChatRecord[]>) => ({
          ...prev,
          [chat.id]: mergedMessages,
          [chatId]: mergedMessages,
        }));

        // 4. Persist merged messages for the next visit.
        await saveCachedChatMessages(chat.id, mergedMessages);

        setMessagePaginationByChat((prev: Record<string, ChatRecord>) => ({
          ...prev,
          [chat.id]: historyPayload?.pagination || { hasMore: false },
          [chatId]: historyPayload?.pagination || { hasMore: false },
        }));

        console.log("[ChatCache] Direct history cached:", chat.id, mergedMessages.length);
      } catch (error) {
        setSendError(normalizeChatError(error));
        console.error("[ChatCache] Direct history failed:", error);
      } finally {
        loadingChatHistoryRef.current.delete(chatKey);
      }
    },
    [
      clearUnreadForChat,
      chatClearVersionsRef,
      loadedChatHistoryRef,
      loadingChatHistoryRef,
      setMessagePaginationByChat,
      setMessagesByChat,
      setSelectedChat,
      setSendError,
    ],
  );

  const loadChannelHistory = useCallback(
    async (chat: ChatRecord) => {
      if (!chat || chat.type !== "channel" || !chat.id) return;

      const chatKey = String(chat.id);
      const requestClearVersion = chatClearVersionsRef.current.get(chatKey) || 0;

      loadedChatHistoryRef.current.add(chatKey);

      try {
        const messagesResponse: any = await getChatMessagesService(chat.id, { limit: 100 });
        if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) return;

        const historyPayload = unwrapMessagesResponse(messagesResponse);
        const normalizedMessages = normalizeChatMessages(historyPayload, {
          ...chat,
          chatId: chat.id,
        });

        setMessagesByChat((prev: Record<string, ChatRecord[]>) => ({
          ...prev,
          [chat.id]: normalizedMessages,
        }));
        setMessagePaginationByChat((prev: Record<string, ChatRecord>) => ({
          ...prev,
          [chat.id]: historyPayload?.pagination || { hasMore: false },
        }));
      } catch (error) {
        setSendError(normalizeChatError(error));
      }
    },
    [
      chatClearVersionsRef,
      loadedChatHistoryRef,
      setMessagePaginationByChat,
      setMessagesByChat,
      setSendError,
    ],
  );

  const fetchChatData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [
        buddyResponse,
        channelResponse,
        statusResponse,
        settingsResponse,
      ]: any[] = await Promise.all([
        getChatUsersService({ excludeSelf: true }),
        getChatConversationsService(),
        getChatStatusService().catch((err) => {
          console.warn("[chat] status load failed", err);
          return null;
        }),
        getChatSettingsService().catch((err) => {
          console.warn("[chat] settings load failed", err);
          return null;
        }),
      ]);

      const persistedSettings = unwrapEnvelope<Record<string, any>>(settingsResponse);

      // desktopNotifications is owned by this hook now, not ChatSidebar.
      if (typeof persistedSettings.desktopNotifications === "boolean") {
        setDesktopNotifications(persistedSettings.desktopNotifications);
        setChatNotificationsEnabled(persistedSettings.desktopNotifications);
      }

      if (typeof persistedSettings.enterToSend === "boolean") {
        const savedEnterToSend = localStorage.getItem("chat_enter_to_send");
        const restoredEnterToSend =
          savedEnterToSend === "true" ||
          (savedEnterToSend !== "false" && persistedSettings.enterToSend);
        setEnterToSend(restoredEnterToSend);
        if (savedEnterToSend === "true" && !persistedSettings.enterToSend) {
          updateChatSettingsService({ enterToSend: true }).catch(() => {});
        }
      }

      if (typeof persistedSettings.mentionNotifications === "boolean") {
        setMentionNotifications(persistedSettings.mentionNotifications);
        localStorage.setItem(
          "chat_mention_notifications",
          String(persistedSettings.mentionNotifications),
        );
      }

      if (Array.isArray(persistedSettings.mutedChatIds)) {
        setMutedChatIds(persistedSettings.mutedChatIds.map(String));
      }

      if (Array.isArray(persistedSettings.blockedUserIds)) {
        setBlockedUserIds(persistedSettings.blockedUserIds.map(String));
      }

      // ChatUsersController returns a plain array; conversation endpoints return { data }.
      const chatUsers: ChatRecord[] = getArrayPayload(
        buddyResponse?.data?.data ?? buddyResponse?.data,
      ) as ChatRecord[];
      const chatConversations: ChatRecord[] = getArrayPayload(
        channelResponse?.data?.data ?? channelResponse?.data,
      ) as ChatRecord[];

      const otherConversations = chatConversations.filter(
        (conversation) => !isSelfConversation(conversation),
      );

      setBuddies(chatUsers);
      setChannels(chatConversations);

      const statusPayload = unwrapEnvelope<Record<string, any>>(statusResponse);
      const backendUser = statusPayload.user || statusPayload;

      const savedPresence = normalizePresence(localStorage.getItem("chat_presence"));
      const serverPresence = normalizePresence(backendUser?.presence || backendUser?.status);
      const restoredPresence =
        savedPresence && savedPresence !== "online" && serverPresence === "online"
          ? savedPresence
          : serverPresence || savedPresence || "online";

      setCurrentStatus(restoredPresence);

      if (savedPresence && savedPresence !== "online" && serverPresence !== savedPresence) {
        updateChatStatusService(savedPresence).catch(() => {});
      }

      if (backendUser) {
        setProfileUser((prev: ChatRecord | null) => {
          const nextUser = {
            ...(getStoredUser() || {}),
            ...(prev || {}),
            ...backendUser,
            avatarUrl: getImageUrl(backendUser) || getImageUrl(prev),
            imageUrl: getImageUrl(backendUser) || getImageUrl(prev),
          };
          localStorage.setItem("user", JSON.stringify(nextUser));
          return nextUser;
        });
      } else {
        const tokenUser = getStoredUser();
        if (tokenUser) {
          localStorage.setItem("user", JSON.stringify(tokenUser));
          setProfileUser(tokenUser);
        }
      }

      if (id && !selectedChat) {
        const decodedId = decodeURIComponent(id);
        const directConversation = otherConversations.find(
          (conversation) =>
            String(conversation?.chat_id || conversation?.chatId || conversation?.id || "") ===
              decodedId &&
            (conversation?.isDirect ||
              conversation?.type === "direct" ||
              conversation?.conversationType === "direct"),
        );
        const conversationPeer = directConversation?.participants?.find(
          (participant: ChatRecord) => !isCurrentUserRecord(participant),
        );
        const buddyFromConversation = chatUsers.find(
          (item) =>
            conversationPeer &&
            [
              item?.id,
              item?.userId,
              item?.user_id,
              item?.appUserId,
              item?.app_user_id,
              item?.username,
              item?.email,
              item?.email_id,
            ]
              .filter(Boolean)
              .some((value) =>
                [
                  conversationPeer?.id,
                  conversationPeer?.userId,
                  conversationPeer?.user_id,
                  conversationPeer?.appUserId,
                  conversationPeer?.app_user_id,
                  conversationPeer?.username,
                  conversationPeer?.email,
                  conversationPeer?.email_id,
                ]
                  .filter(Boolean)
                  .some((peerValue) => String(value) === String(peerValue)),
              ),
        );

        const buddy =
          chatUsers.find((item) =>
            [getBuddySendId(item), getBuddyEmail(item)].some(
              (value) => String(value) === decodedId,
            ),
          ) ||
          buddyFromConversation ||
          conversationPeer;

        const channel = otherConversations.find((item) => getChannelId(item) === decodedId);

        if (buddy) {
          const matchedConversation =
            directConversation ||
            otherConversations.find(
              (conversation) =>
                Array.isArray(conversation?.participants) &&
                conversation.participants.some(
                  (participant) =>
                    String(getBuddySendId(participant)) === String(getBuddySendId(buddy)) ||
                    String(getBuddyEmail(participant)).toLowerCase() ===
                      String(getBuddyEmail(buddy)).toLowerCase(),
                ),
            );

          const conversationParticipant = matchedConversation?.participants?.find(
            (participant: ChatRecord) => !isCurrentUserRecord(participant),
          );
          const conversationSender =
            matchedConversation?.lastMessage?.sender || matchedConversation?.last_message?.sender;

          const resolvedName = [
            conversationParticipant,
            conversationSender,
            buddyFromConversation,
            buddy,
          ]
            .map((candidate) => getBuddyName(candidate))
            .find((name) => name && !/^(chat\s*user|chatuser)$/i.test(name));

          const resolvedBuddy = resolvedName
            ? { ...buddy, name: resolvedName, display_name: resolvedName }
            : buddy;

          setSelectedChat({
            type: "person",
            source: "local",
            id: getBuddySendId(resolvedBuddy),
            chatId:
              buddy?.directConversationId ||
              buddy?.chat_id ||
              buddy?.chatId ||
              matchedConversation?.chat_id ||
              matchedConversation?.chatId ||
              matchedConversation?.id ||
              null,
            title: getBuddyName(resolvedBuddy),
            subtitle: getBuddyEmail(resolvedBuddy),
            imageUrl: getImageUrl(resolvedBuddy),
            currentUserId,
            raw: resolvedBuddy,
          });
          setTab("conversations");
        } else if (channel) {
          const restoredChannelId = getChannelId(channel);

          setSelectedChat({
            type: "channel",
            source: "local",
            id: restoredChannelId,
            title: getChannelName(channel),
            subtitle: restoredChannelId,
            imageUrl: getImageUrl(channel),
            currentUserId,
            raw: channel,
          });

          setChannels((previousChannels: ChatRecord[]) =>
            previousChannels.map((conversation: ChatRecord) =>
              String(getChannelId(conversation)) === String(restoredChannelId)
                ? { ...conversation, unreadCount: 0, unread_count: 0 }
                : conversation,
            ),
          );
          markConversationReadService(restoredChannelId).catch(() => {});
          setTab("conversations");
        }
      }
    } catch (error) {
      setLoadError(normalizeChatError(error));
    } finally {
      setLoading(false);
    }
  }, [
    currentUserId,
    id,
    isCurrentUserRecord,
    isSelfConversation,
    selectedChat?.id, // ← stable primitive, not whole object
    setBlockedUserIds,
    setBuddies,
    setChannels,
    setCurrentStatus,
    setEnterToSend,
    setLoadError,
    setLoading,
    setMentionNotifications,
    setMutedChatIds,
    setProfileUser,
    setSelectedChat,
    setTab,
  ]);

  return {
    fetchChatData,
    loadDirectChatHistory,
    loadChannelHistory,
    desktopNotifications,
    setDesktopNotifications,
  };
}
