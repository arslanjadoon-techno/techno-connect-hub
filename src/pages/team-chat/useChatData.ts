import { useCallback, useEffect, useRef, useState } from "react";
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
import { dedupeConversationRecords } from "./chatConversationKeys";
import {
  markConversationReadService,
  getChatConversationsService,
  getChatMessagesService,
  getChatSettingsService,
  getChatStatusService,
  getChatUsersService,
  updateChatStatusService,
} from "@/services/Team-chat/chat.service";
import { getStoredUser } from "@/lib/api/client";

type ChatRecord = Record<string, any>;

function getMessageKey(message: ChatRecord): string {
  const id =
    message.id ??
    message.messageId ??
    message.message_id ??
    message.clientMessageId ??
    message.client_message_id;

  if (id !== undefined && id !== null && String(id).trim() !== "") return String(id);

  return [
    message.senderId ?? message.sender_id ?? message.authorId ?? "",
    message.sentAt ?? message.sent_at ?? message.createdAt ?? message.created_at ?? "",
    message.content ?? message.message ?? message.text ?? "",
  ].join("|");
}

function mergeMessages(...groups: ChatRecord[][]): ChatRecord[] {
  const merged = new Map<string, ChatRecord>();
  for (const group of groups) {
    for (const message of group) {
      const key = getMessageKey(message);
      merged.set(key, { ...merged.get(key), ...message });
    }
  }

  return Array.from(merged.values()).sort((first, second) => {
    const firstTime = new Date(
      first.sentAt || first.createdAt || first.created_at || first.timestamp || 0,
    ).getTime();
    const secondTime = new Date(
      second.sentAt || second.createdAt || second.created_at || second.timestamp || 0,
    ).getTime();
    const timeOrder =
      (Number.isFinite(firstTime) ? firstTime : 0) -
      (Number.isFinite(secondTime) ? secondTime : 0);
    return timeOrder || getMessageKey(first).localeCompare(getMessageKey(second));
  });
}

type ChatDataOptions = {
  chatClearVersionsRef: { current: Map<string, number> };
  clearUnreadForChat: (chat: ChatRecord) => void;
  currentUserId: string;
  id?: string;
  isCurrentUserRecord: (user: ChatRecord) => boolean;
  isSelfConversation: (conversation: ChatRecord) => boolean;
  loadedChatHistoryRef: { current: Set<string> };
  loadingChatHistoryRef: { current: Set<string> };
  messagesByChat: Record<string, ChatRecord[]>;
  selectedChat: ChatRecord | null;
  setBlockedUserIds: (value: any) => void;
  setBuddies: (value: any) => void;
  setChannels: (value: any) => void;
  setCurrentStatus: (value: any) => void;
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
  messagesByChat,
  selectedChat,
  setBlockedUserIds,
  setBuddies,
  setChannels,
  setCurrentStatus,
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
  const messagesByChatRef = useRef(messagesByChat);
  const initialChatUsersRef = useRef<ChatRecord[]>([]);
  const latestUserSearchRef = useRef("");
  const userSearchRequestRef = useRef(0);
  messagesByChatRef.current = messagesByChat;

  useEffect(() => {
    const isCurrentUser = (record: ChatRecord | null | undefined, profile: ChatRecord) => {
      if (!record) return false;
      const recordIds = [
        record.id,
        record.userId,
        record.user_id,
        record.appUserId,
        record.app_user_id,
      ]
        .filter((value) => value != null && String(value).trim() !== "")
        .map(String);
      const profileIds = [profile.id, profile.userId, profile.appUserId]
        .filter((value) => value != null && String(value).trim() !== "")
        .map(String);
      const recordEmail = String(record.email || record.providerEmail || "").trim().toLowerCase();
      const profileEmail = String(profile.email || profile.providerEmail || "")
        .trim()
        .toLowerCase();
      return (
        recordIds.some((value) => profileIds.includes(value)) ||
        Boolean(recordEmail && profileEmail && recordEmail === profileEmail)
      );
    };

    const applyProfile = (profile: ChatRecord | null | undefined) => {
      if (!profile) return;

      const imageUrl = getImageUrl(profile);
      const profileFields = {
        ...profile,
        ...(Object.prototype.hasOwnProperty.call(profile, "profileImage")
          ? { profileImage: profile.profileImage }
          : {}),
        avatarUrl: imageUrl,
        imageUrl,
      };

      setProfileUser((previous: ChatRecord | null) => ({
        ...(previous || {}),
        ...profileFields,
      }));
      setBuddies((previous: ChatRecord[]) =>
        previous.map((record) =>
          isCurrentUser(record, profile) ? { ...record, ...profileFields } : record,
        ),
      );
      setChannels((previous: ChatRecord[]) =>
        previous.map((conversation) => ({
          ...conversation,
          ...(Array.isArray(conversation.participants)
            ? {
                participants: conversation.participants.map((participant: ChatRecord) =>
                  isCurrentUser(participant, profile)
                    ? { ...participant, ...profileFields }
                    : participant,
                ),
              }
            : {}),
          ...(conversation.lastMessage?.sender && isCurrentUser(conversation.lastMessage.sender, profile)
            ? {
                lastMessage: {
                  ...conversation.lastMessage,
                  sender: { ...conversation.lastMessage.sender, ...profileFields },
                },
              }
            : {}),
        })),
      );
      setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
        const next = { ...previous };
        Object.entries(previous).forEach(([chatKey, messages]) => {
          next[chatKey] = messages.map((message) => {
            const senderMatches = isCurrentUser(message.sender, profile) ||
              isCurrentUser(
                {
                  id: message.authorId || message.author_id || message.senderId || message.sender_id,
                  email: message.authorEmail || message.author_email,
                },
                profile,
              );
            return senderMatches
              ? {
                  ...message,
                  authorAvatarUrl: imageUrl,
                  sender: { ...(message.sender || {}), ...profileFields },
                }
              : message;
          });
        });
        return next;
      });
    };

    const onProfileUpdated = (event: Event) =>
      applyProfile((event as CustomEvent<ChatRecord>).detail);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "user" || !event.newValue) return;
      try {
        applyProfile(JSON.parse(event.newValue) as ChatRecord);
      } catch {
        // Ignore malformed local storage values.
      }
    };

    window.addEventListener("user:profile-updated", onProfileUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("user:profile-updated", onProfileUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [setBuddies, setChannels, setMessagesByChat, setProfileUser]);

  const loadDirectChatHistory = useCallback(
    async (chat: ChatRecord) => {
      if (!chat || chat.type !== "person" || !chat.id) return;

      const chatKey = String(chat.id);

      if (loadingChatHistoryRef.current.has(chatKey)) return;

      loadingChatHistoryRef.current.add(chatKey);

      const requestClearVersion = chatClearVersionsRef.current.get(chatKey) || 0;

      clearUnreadForChat({
        chatId: chat.chatId,
        userId: chat.id,
        email: chat.subtitle || getBuddyEmail(chat.raw),
      });

      try {
        const chatId = chat.chatId || null;
        // A new direct chat has no conversation ID until its first message.
        // Do not mark it as loaded or a later history retry will be skipped.
        if (!chatId) return;

        loadedChatHistoryRef.current.add(chatKey);

        setSelectedChat((prev: ChatRecord | null) =>
          prev?.id === chat.id ? { ...prev, chatId } : prev,
        );

        // 1. Read cache using the same key used by the chat UI.
        const cachedMessages = await getCachedChatMessages(chat.id);

        if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) {
          return;
        }

        if (cachedMessages.length > 0) {
          setMessagesByChat((prev: Record<string, ChatRecord[]>) => {
            const merged = mergeMessages(
              cachedMessages,
              prev[chat.id] || [],
              prev[chatId] || [],
            );
            return { ...prev, [chat.id]: merged, [chatId]: merged };
          });
        }

        // 2. Fetch fresh history.
        const messagesResponse: any = await getChatMessagesService(chatId, { limit: 100 });

        if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) {
          return;
        }

        const historyPayload = unwrapMessagesResponse(messagesResponse);

        const normalizedMessages = normalizeChatMessages(historyPayload, { ...chat, chatId });

        // Preserve the unread boundary returned by the API long enough for the
        // chat view to open on the first unread message. The read call may run
        // immediately after opening, so deriving this later from unreadCount
        // would lose the position.
        const unreadCount = Math.max(0, Number(historyPayload?.unreadCount) || 0);
        const unreadIncoming = normalizedMessages.filter(
          (message: ChatRecord) => message.direction !== "outbound",
        );
        const unreadIds = new Set(
          (unreadCount > 0
            ? unreadIncoming.slice(Math.max(0, unreadIncoming.length - unreadCount))
            : []
          ).map((message) => String(message.id)),
        );
        const messagesWithUnreadState: ChatRecord[] = normalizedMessages.map(
          (message: ChatRecord) => ({
            ...message,
            isUnread: unreadIds.has(String(message.id)),
          }),
        );
        const firstUnreadMessageId = messagesWithUnreadState.find((message) => message.isUnread)?.id;

        // 3. Merge server history, cache, and any SignalR messages that arrived
        // while the request was in flight. The server wins for the same ID, but
        // a genuinely newer realtime message is never discarded.
        const currentMessages = mergeMessages(
          messagesByChatRef.current[chat.id] || [],
          messagesByChatRef.current[chatId] || [],
        );
        const mergedMessages = mergeMessages(
          cachedMessages,
          messagesWithUnreadState,
          currentMessages,
        );

        setMessagesByChat((prev: Record<string, ChatRecord[]>) => {
          const latest = mergeMessages(
            mergedMessages,
            prev[chat.id] || [],
            prev[chatId] || [],
          );
          return { ...prev, [chat.id]: latest, [chatId]: latest };
        });

        setSelectedChat((prev: ChatRecord | null) =>
          prev?.id === chat.id
            ? { ...prev, firstUnreadMessageId: firstUnreadMessageId || null }
            : prev,
        );

        // 4. Persist merged messages for the next visit.
        await saveCachedChatMessages(chat.id, mergedMessages);

        setMessagePaginationByChat((prev: Record<string, ChatRecord>) => ({
          ...prev,
          [chat.id]: historyPayload?.pagination || { hasMore: false },
          [chatId]: historyPayload?.pagination || { hasMore: false },
        }));

        console.log("[ChatCache] Direct history cached:", chat.id, mergedMessages.length);
      } catch (error) {
        loadedChatHistoryRef.current.delete(chatKey);
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
        const unreadCount = Math.max(0, Number(historyPayload?.unreadCount) || 0);
        const unreadIncoming = normalizedMessages.filter(
          (message: ChatRecord) => message.direction !== "outbound",
        );
        const unreadIds = new Set(
          (unreadCount > 0
            ? unreadIncoming.slice(Math.max(0, unreadIncoming.length - unreadCount))
            : []
          ).map((message) => String(message.id)),
        );
        const messagesWithUnreadState: ChatRecord[] = normalizedMessages.map(
          (message: ChatRecord) => ({
            ...message,
            isUnread: unreadIds.has(String(message.id)),
          }),
        );

        const currentMessages = mergeMessages(messagesByChatRef.current[chat.id] || []);
        const mergedMessages = mergeMessages(messagesWithUnreadState, currentMessages);

        setMessagesByChat((prev: Record<string, ChatRecord[]>) => {
          const latest = mergeMessages(mergedMessages, prev[chat.id] || []);
          return { ...prev, [chat.id]: latest };
        });
        setSelectedChat((prev: ChatRecord | null) =>
          prev?.id === chat.id
            ? {
                ...prev,
                firstUnreadMessageId:
                  mergedMessages.find((message) => message.isUnread)?.id || null,
              }
            : prev,
        );
        setMessagePaginationByChat((prev: Record<string, ChatRecord>) => ({
          ...prev,
          [chat.id]: historyPayload?.pagination || { hasMore: false },
        }));
      } catch (error) {
        loadedChatHistoryRef.current.delete(chatKey);
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
      const chatConversations: ChatRecord[] = dedupeConversationRecords(
        getArrayPayload(
          channelResponse?.data?.data ?? channelResponse?.data,
        ) as ChatRecord[],
      );

      const otherConversations = chatConversations.filter(
        (conversation) => !isSelfConversation(conversation),
      );

      initialChatUsersRef.current = chatUsers;
      if (!latestUserSearchRef.current) setBuddies(chatUsers);
      setChannels(chatConversations);

      const statusPayload = unwrapEnvelope<Record<string, any>>(statusResponse);
      const backendUser = statusPayload.user || statusPayload;

      const savedPresence = normalizePresence(localStorage.getItem("chat_presence"));
      const serverPresence = normalizePresence(backendUser?.presence || backendUser?.status);
      // The browser value represents the current authenticated session. The
      // backend value can still be Offline briefly while the new SignalR
      // connection is coming online, so do not restore the previous session's
      // status over the fresh login default.
      const restoredPresence = savedPresence || serverPresence || "online";

      setCurrentStatus(restoredPresence);
      // Keep the root MIS notification listener on the same presence policy
      // when the user leaves the Chat page. The chat page still owns the
      // authoritative API update; this value is only the local policy cache.
      localStorage.setItem("chat_presence", restoredPresence);

      if (savedPresence && savedPresence !== "online" && serverPresence !== savedPresence) {
        updateChatStatusService(savedPresence).catch(() => {});
      }

      if (backendUser) {
        setProfileUser((prev: ChatRecord | null) => {
          const backendImage = getImageUrl(backendUser);
          const previousImage = getImageUrl(prev);
          const storedImage = getImageUrl(getStoredUser() as ChatRecord | null);
          // User Management is authoritative. If the chat identity has not been
          // refreshed yet, do not overwrite a valid persisted profile with null.
          const resolvedImage = backendImage || previousImage || storedImage;
          const nextUser = {
            ...(getStoredUser() || {}),
            ...(prev || {}),
            ...backendUser,
            profileImage: resolvedImage || null,
            avatarUrl: resolvedImage,
            imageUrl: resolvedImage,
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
    selectedChat,
    setBlockedUserIds,
    setBuddies,
    setChannels,
    setCurrentStatus,
    setLoadError,
    setLoading,
    setMentionNotifications,
    setMutedChatIds,
    setProfileUser,
    setSelectedChat,
    setTab,
  ]);

  const searchChatUsers = useCallback(
    async (search: string) => {
      const query = search.trim();
      const requestId = ++userSearchRequestRef.current;
      latestUserSearchRef.current = query;

      if (!query) {
        setBuddies(initialChatUsersRef.current);
        return;
      }

      const response: any = await getChatUsersService({
        excludeSelf: true,
        search: query,
        limit: 50,
      });
      const chatUsers: ChatRecord[] = getArrayPayload(
        response?.data?.data ?? response?.data,
      ) as ChatRecord[];

      // A slower response for an older term must never replace the current
      // search results.
      if (requestId !== userSearchRequestRef.current || latestUserSearchRef.current !== query) {
        return;
      }

      setBuddies(chatUsers);
    },
    [setBuddies],
  );

  return {
    fetchChatData,
    searchChatUsers,
    loadDirectChatHistory,
    loadChannelHistory,
    desktopNotifications,
    setDesktopNotifications,
  };
}
