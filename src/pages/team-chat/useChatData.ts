import { useCallback } from "react";
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
import { usersService } from "@/services/user-manager/users.service";

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
  setManagedUsers: (value: any) => void;
  setMentionNotifications: (value: any) => void;
  setMessagePaginationByChat: (value: any) => void;
  setMessagesByChat: (value: any) => void;
  setMutedChatIds: (value: any) => void;
  setProfileUser: (value: any) => void;
  setSelectedChat: (value: any) => void;
  setSendError: (value: any) => void;
  setTab: (value: any) => void;
};

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
  setManagedUsers,
  setMentionNotifications,
  setMessagePaginationByChat,
  setMessagesByChat,
  setMutedChatIds,
  setProfileUser,
  setSelectedChat,
  setSendError,
  setTab,
}: ChatDataOptions) {
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
        // Opening a user must not create a conversation. A direct conversation
        // is created only by the first outgoing message.
        const chatId = chat.chatId || null;
        if (!chatId) return;

        setSelectedChat((prev: ChatRecord | null) =>
          prev?.id === chat.id ? { ...prev, chatId } : prev,
        );
        const messagesResponse: any = await getChatMessagesService(chatId, { limit: 100 });
        if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) return;
        const historyPayload = messagesResponse?.data?.data?.messages
          ? messagesResponse.data.data
          : messagesResponse?.data?.messages
            ? messagesResponse.data
            : messagesResponse?.data?.data?.data?.messages
              ? messagesResponse.data.data.data
              : messagesResponse?.data?.data || messagesResponse?.data || {};
        const normalizedMessages = normalizeChatMessages(historyPayload, { ...chat, chatId });

        setMessagesByChat((prev: Record<string, ChatRecord[]>) => ({
          ...prev,
          [chat.id]: normalizedMessages,
          [chatId]: normalizedMessages,
        }));
        setMessagePaginationByChat((prev: Record<string, ChatRecord>) => ({
          ...prev,
          [chat.id]: historyPayload?.pagination || { hasMore: false },
          [chatId]: historyPayload?.pagination || { hasMore: false },
        }));
      } catch (error) {
        setSendError(normalizeChatError(error));
      } finally {
        loadingChatHistoryRef.current.delete(chatKey);
      }
    },
    [clearUnreadForChat],
  );

  const loadChannelHistory = useCallback(async (chat: ChatRecord) => {
    if (!chat || chat.type !== "channel" || !chat.id) return;

    const chatKey = String(chat.id);
    const requestClearVersion = chatClearVersionsRef.current.get(chatKey) || 0;

    loadedChatHistoryRef.current.add(chatKey);

    try {
      const messagesResponse: any = await getChatMessagesService(chat.id, { limit: 100 });
      if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) return;
      const historyPayload = messagesResponse?.data?.data?.messages
        ? messagesResponse.data.data
        : messagesResponse?.data?.messages
          ? messagesResponse.data
          : messagesResponse?.data?.data?.data?.messages
            ? messagesResponse.data.data.data
            : messagesResponse?.data?.data || messagesResponse?.data || {};
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
  }, []);

  const fetchChatData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [
        buddyResponse,
        channelResponse,
        statusResponse,
        settingsResponse,
        managedUsersResponse,
      ]: any[] = await Promise.all([
        getChatUsersService({ excludeSelf: true }),
        getChatConversationsService(),
        getChatStatusService().catch(() => null),
        getChatSettingsService().catch(() => null),
        usersService.getAll({ page: 1, size: 1000 }).catch(() => null),
      ]);

      const persistedSettings =
        settingsResponse?.data?.data || settingsResponse?.data || settingsResponse || {};
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
      const usersFromManagement: ChatRecord[] = getArrayPayload(
        managedUsersResponse?.data?.data ?? managedUsersResponse?.data ?? managedUsersResponse,
      );
      const chatConversations: ChatRecord[] = getArrayPayload(
        channelResponse?.data?.data ?? channelResponse?.data,
      ) as ChatRecord[];
      if (import.meta.env.DEV) {
        console.groupCollapsed("[Pingly chat] conversation sources");
        console.groupEnd();
      }
      const otherChatUsers = chatUsers.filter((user) => !isCurrentUserRecord(user));
      const otherConversations = chatConversations.filter(
        (conversation) => !isSelfConversation(conversation),
      );
      setBuddies(chatUsers);
      setManagedUsers(usersFromManagement.filter((user) => !isCurrentUserRecord(user)));
      setChannels(chatConversations);
      const statusPayload = statusResponse?.data?.data || statusResponse?.data || {};
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
        const buddyFromConversation = otherChatUsers.find(
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
          otherChatUsers.find((item) =>
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
          // A refresh restores the group from the URL before the history
          // effect runs. Persist the read state here as well so the initial
          // unread count cannot remain visible for the restored group.
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
  }, [currentUserId, id, isCurrentUserRecord, isSelfConversation, selectedChat]);

  return { fetchChatData, loadDirectChatHistory, loadChannelHistory };
}
