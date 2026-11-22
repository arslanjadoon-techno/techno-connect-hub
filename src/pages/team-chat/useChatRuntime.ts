import { useCallback, useEffect, useRef } from "react";
import { getBuddyEmail, getBuddySendId, getChannelId } from "./chatHealper";
import { useChatConversationView } from "./useChatConversationView";
import { useChatRealtime } from "./useChatRealtime";
import { useChatRealtimeAvatar } from "./useChatRealtimeAvatar";
import { useChatRealtimeMessage } from "./useChatRealtimeMessage";
import { useChatRealtimeMessageUpdate } from "./useChatRealtimeMessageUpdate";
import { useChatRealtimeMessageDelivered } from "./useChatRealtimeMessageDelivered";
import { useChatRealtimeMessageStatus } from "./useChatRealtimeMessageStatus";
import { useChatRealtimeMessageRead } from "./useChatRealtimeMessageRead";
import { useChatRealtimeMemberRemoved } from "./useChatRealtimeMemberRemoved";
import { useChatRealtimePresence } from "./useChatRealtimePresence";
import { useChatRealtimeReaction } from "./useChatRealtimeReaction";
import { useChatRealtimeCalls } from "./useChatRealtimeCalls";
import { useChatClear } from "./useChatClear";
import { useChatMarkRead } from "./useChatMarkRead";
import { useChatMute } from "./useChatMute";
import { useChatOlderMessages } from "./useChatOlderMessages";
import { getActiveConversationCallsService } from "@/services/Team-chat/chat.service";
import { getChatMessagesService } from "@/services/Team-chat/chat.service";
import { getStoredUser } from "@/lib/api/client";
import { normalizeCall, PENDING_CALL_STORAGE_KEY } from "./ChatSystemUtils";
import { normalizeChatMessages, unwrapChatMessagesResponse } from "./chatMessageNormalization";
import { getMessageClientId, getMessageServerId, mergeChatMessages } from "./chatMessageState";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";
import {
  getChatStateKeys,
  getConversationRecordId,
  upsertConversationRecord,
} from "./chatConversationKeys";
import {
  getPendingChatSends,
  getCachedChatState,
  saveCachedChatMessages,
  saveCachedChatMessagesAndCursor,
  updatePendingChatSend,
} from "./chatMessageIndexedDb";
import {
  isPendingChatSendActive,
  pendingChatSendMessageKeys,
  pendingChatSendToChat,
  pendingChatSendToOptimisticMessage,
} from "./pendingChatSendUtils";

type ChatRecord = Record<string, any>;
type ChatRuntimeOptions = Record<string, any>;
const CHAT_RECONNECT_PAGE_SIZE = 100;

export function useChatRuntime(options: ChatRuntimeOptions) {
  const {
    activeCall,
    blockedUserIds,
    buddies,
    callResponding,
    callsEnabled,
    channels,
    chatClearVersionsRef,
    currentStatus,
    currentUser,
    currentUserEmail,
    currentUserId,
    handledRealtimeMessageKeysRef,
    incomingCall,
    mentionNotifications,
    messagesByChat,
    mutedChatIds,
    managedUsers,
    navigate,
    requestConfirmation,
    realtimeStartedAtRef,
    selectedChat,
    setActiveCall,
    setBuddies,
    setCallError,
    setCallNotice,
    setChannels,
    setCurrentStatus,
    setIncomingCall,
    setLoadError,
    setMessageInfoVersions,
    setMessagesByChat,
    setMutedChatIds,
    setProfileUser,
    setSelectedChat,
    setSendError,
    setTypingUsersByChat,
    setMessagePaginationByChat,
    setLoadingOlderMessages,
    filterBlockedMessages,
    loadingOlderMessages,
    messagePaginationByChat,
    searchTerm,
    onNotification,
    pendingSendRetryRef,
  } = options;
  const reconnectSyncInFlightRef = useRef<Promise<void> | null>(null);
  const handleRealtimeMessageUpdated = useChatRealtimeMessageUpdate({
    channels,
    buddies,
    currentUserId,
    selectedChat,
    setMessagesByChat,
  });
  const handleRealtimeMessageDelivered = useChatRealtimeMessageDelivered({
    channels,
    buddies,
    currentUserId,
    setMessagesByChat,
  });
  const { handleMessageAccepted, handleMessageFailed } = useChatRealtimeMessageStatus({
    setMessagesByChat,
    setSendError,
  });
  const handleRealtimeMessageRead = useChatRealtimeMessageRead({
    channels,
    buddies,
    currentUser,
    currentUserEmail,
    currentUserId,
    setMessageInfoVersions,
    setMessagesByChat,
    setChannels,
    setBuddies,
  });
  const handleRealtimeReactionAdded = useChatRealtimeReaction({
    channels,
    buddies,
    currentUserEmail,
    currentUserId,
    mutedChatIds,
  });
  const handleRealtimePresence = useChatRealtimePresence({
    currentUserId,
    setCurrentStatus,
    setProfileUser,
    setBuddies,
    setChannels,
    setSelectedChat,
  });
  const handleRealtimeAvatar = useChatRealtimeAvatar({
    currentUserId,
    setBuddies,
    setChannels,
    setMessagesByChat,
    setProfileUser,
    setSelectedChat,
  });
  const loadOlderMessages = useChatOlderMessages({
    selectedChat,
    loadingOlderMessages,
    messagePaginationByChat,
    filterBlockedMessages,
    setLoadingOlderMessages,
    setMessagesByChat,
    setMessagePaginationByChat,
    setSendError,
  });
  useEffect(() => {
    if (!callsEnabled) return undefined;
    if (!currentUserId) return undefined;
    let cancelled = false;

    getActiveConversationCallsService()
      .then((response: any) => {
        if (cancelled) return;
        const payload = response?.data?.data || response?.data || response;
        const calls = payload?.calls || payload || [];
        const call = Array.isArray(calls)
          ? calls.find((candidate) =>
              ["ringing", "connecting", "accepted"].includes(
                String(candidate?.status || "").toLowerCase(),
              ),
            )
          : null;
        const normalizedCall = normalizeCall(call);
        if (!normalizedCall?.id) {
          try {
            const savedCall = normalizeCall(
              JSON.parse(localStorage.getItem(PENDING_CALL_STORAGE_KEY) || "null"),
            );
            if (savedCall?.id && String(savedCall.status || "").toLowerCase() === "ringing") {
              setIncomingCall(savedCall);
            }
          } catch {
            localStorage.removeItem(PENDING_CALL_STORAGE_KEY);
          }
          return;
        }
        const status = String(normalizedCall.status || "").toLowerCase();
        const startedById =
          normalizedCall.startedBy?.id ||
          normalizedCall.startedBy?.userId ||
          normalizedCall.startedBy?.user_id;
        const acceptedById =
          normalizedCall.acceptedBy?.id ||
          normalizedCall.acceptedBy?.userId ||
          normalizedCall.acceptedBy?.user_id;
        const currentUserAccepted =
          String(startedById) === currentUserId || String(acceptedById) === currentUserId;
        if (status === "accepted" || status === "connecting") {
          if (currentUserAccepted) setActiveCall(normalizedCall);
          else setIncomingCall(normalizedCall);
        } else if (String(startedById) === currentUserId) {
          setActiveCall(normalizedCall);
        } else if (status === "ringing") {
          setIncomingCall(normalizedCall);
        }
      })
      .catch(() => {
        try {
          const savedCall = normalizeCall(
            JSON.parse(localStorage.getItem(PENDING_CALL_STORAGE_KEY) || "null"),
          );
          if (savedCall?.id && String(savedCall.status || "").toLowerCase() === "ringing") {
            setIncomingCall(savedCall);
          }
        } catch {
          localStorage.removeItem(PENDING_CALL_STORAGE_KEY);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const {
    allVisibleBuddies,
    activeConversationId,
    conversationItems,
    isCurrentUserRecord,
    isSelfConversation,
    uniqueUsersByIdentity,
    visibleBuddies,
    visibleChannels,
    visibleDirectChannels,
    visibleGroupChannels,
  } = useChatConversationView({
    buddies,
    channels,
    currentUser,
    currentUserEmail,
    currentUserId,
    managedUsers,
    messagesByChat,
    searchTerm,
    selectedChat,
  });

  const handleRealtimeMessage = useChatRealtimeMessage({
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
    handledRealtimeMessageKeysRef,
    realtimeStartedAtRef,
    selectedChat,
    setBuddies,
    setChannels,
    setMessagesByChat,
  });

  const resumePendingSends = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const pendingSends = await getPendingChatSends(currentUserId);
      for (const pending of pendingSends) {
        if (pending.status === "cancelled") continue;

        const optimisticMessage = pendingChatSendToOptimisticMessage(pending, currentUser);
        const keys = pendingChatSendMessageKeys(pending, selectedChat);
        setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
          const next = { ...previous };
          keys.forEach((key) => {
            next[key] = mergeChatMessages(previous[key] || [], [optimisticMessage]);
          });
          return next;
        });

        if (isPendingChatSendActive(pending.status)) {
          if (pending.nextRetryAt && pending.nextRetryAt > Date.now()) continue;
          let foundInHistory = false;
          if (pending.chatId) {
            try {
              const response: any = await getChatMessagesService(pending.chatId, { limit: 100 });
              const history = normalizeChatMessages(unwrapChatMessagesResponse(response), {
                ...(selectedChat || pendingChatSendToChat(pending)),
                chatId: pending.chatId,
                currentUserId,
              });
              const confirmed = history.find(
                (message) => getMessageClientId(message) === pending.clientMessageId,
              );
              if (confirmed) {
                foundInHistory = true;
                const keys = pendingChatSendMessageKeys(pending, selectedChat);
                setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
                  const next = { ...previous };
                  keys.forEach((key) => {
                    next[key] = mergeChatMessages(previous[key] || [], [
                      { ...confirmed, sendState: "accepted", deliveryStatus: "sent" },
                    ]);
                  });
                  return next;
                });
                await Promise.all(keys.map((key) => saveCachedChatMessages(key, [confirmed])));
                await updatePendingChatSend(pending.clientMessageId, {
                  status: "accepted",
                  ...(confirmed.id ? { serverMessageId: String(confirmed.id) } : {}),
                  error: undefined,
                  unknownOutcome: false,
                  nextRetryAt: undefined,
                });
              }
            } catch {
              // A history read failure is not evidence that the message failed.
              // The idempotent retry below remains the recovery path.
            }
          }

          if (!foundInHistory) {
            // Retry with the exact persisted clientMessageId. The backend's
            // idempotency check returns the original message if it committed.
            void pendingSendRetryRef?.current?.(pending.clientMessageId);
          }
        }
      }
    } catch (error) {
      // Chat remains usable when IndexedDB is unavailable or blocked. The
      // current session's send path still works without durable recovery.
      console.warn("Could not resume pending chat sends", error);
    }
  }, [currentUser, currentUserId, pendingSendRetryRef, selectedChat, setMessagesByChat]);

  useEffect(() => {
    void resumePendingSends();
  }, [resumePendingSends]);

  const handleRealtimeReconnected = useCallback(async () => {
    const existingSync = reconnectSyncInFlightRef.current;
    if (existingSync) return existingSync;

    const sync = (async () => {
      handledRealtimeMessageKeysRef?.current?.clear();
      void resumePendingSends();

      const getPersistedConversationId = (chat: ChatRecord | null | undefined) => {
        if (!chat) return "";

        const explicitId = [
          chat.chatId,
          chat.chat_id,
          chat.conversationId,
          chat.conversation_id,
          chat.directConversationId,
        ]
          .filter(Boolean)
          .map(String)[0];
        if (explicitId) return explicitId;

        const type = String(chat.type || chat.conversationType || "").toLowerCase();
        const isPersistedConversation =
          chat.isDirect === true || type === "direct" || type === "group" || type === "channel";

        // A local person row uses id for the peer/user id until its first
        // message creates a server conversation. Never send that user id to
        // the history endpoint as if it were a conversation id.
        return isPersistedConversation ? String(getConversationRecordId(chat) || "") : "";
      };

      const candidates = [selectedChat, ...(Array.isArray(channels) ? channels : [])].filter(
        Boolean,
      ) as ChatRecord[];
      const conversationsById = new Map<string, ChatRecord>();
      candidates.forEach((chat) => {
        const chatId = getPersistedConversationId(chat);
        if (chatId && !conversationsById.has(chatId)) conversationsById.set(chatId, chat);
      });

      const syncConversation = async (conversation: ChatRecord) => {
        const chatId = getPersistedConversationId(conversation);
        if (!chatId) return;

        const primaryChatKey = String(conversation.id || chatId);
        const keys = Array.from(new Set([...getChatStateKeys(conversation), chatId]));
        const cachedState = await getCachedChatState(primaryChatKey);
        let cursor = cachedState.syncCursor;
        let isInitialRecoveryRequest = !cursor;
        let hasMore = false;

        do {
          const response: any = await getChatMessagesService(chatId, {
            limit: CHAT_RECONNECT_PAGE_SIZE,
            ...(cursor ? { after: cursor } : {}),
          });
          const payload = unwrapChatMessagesResponse(response);
          const recoveredPage = normalizeChatMessages(payload, {
            ...conversation,
            chatId,
            currentUserId,
          });
          const pagination = payload?.pagination || {};
          const nextCursor = String(pagination.nextCursor || pagination.syncCursor || "").trim();
          const pageCursor = isInitialRecoveryRequest
            ? String(pagination.syncCursor || "").trim()
            : nextCursor;

          // Advance the cursor only after the page and watermark are persisted
          // together. A failed page is retried from the last durable cursor.
          if (pageCursor) {
            await saveCachedChatMessagesAndCursor(primaryChatKey, recoveredPage, pageCursor);
          } else {
            await saveCachedChatMessages(primaryChatKey, recoveredPage);
          }

          setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
            const next = { ...previous };
            keys.forEach((key) => {
              const current = mergeChatMessages(previous[key] || [], recoveredPage);
              const pending = (previous[key] || []).filter(
                (message) =>
                  message.sendState === "pending" ||
                  message.sendState === "sending" ||
                  message.sendState === "retrying" ||
                  message.sendState === "failed",
              );
              const loadedIds = new Set(
                current.flatMap((message) =>
                  [getMessageServerId(message), getMessageClientId(message)]
                    .filter(Boolean)
                    .map(String),
                ),
              );
              next[key] = mergeChatMessages(
                current,
                pending.filter(
                  (message) =>
                    !loadedIds.has(getMessageServerId(message)) &&
                    !loadedIds.has(getMessageClientId(message)),
                ),
              );
            });
            return next;
          });

          if (isInitialRecoveryRequest) {
            cursor = pageCursor || cursor;
            // Without a cursor, hasMore describes older history, not missed
            // newer messages. Do not walk the entire history on reconnect.
            hasMore = false;
            isInitialRecoveryRequest = false;
          } else if (!recoveredPage.length || !nextCursor || nextCursor === cursor) {
            hasMore = false;
          } else {
            cursor = nextCursor;
            hasMore = Boolean(pagination.hasMore);
          }
        } while (hasMore);
      };

      const pendingConversations = [...conversationsById.values()];
      let nextConversationIndex = 0;
      const syncWorker = async () => {
        while (nextConversationIndex < pendingConversations.length) {
          const conversation = pendingConversations[nextConversationIndex++];
          try {
            await syncConversation(conversation);
          } catch (error) {
            // One inaccessible/deleted conversation must not prevent the rest
            // of the sidebar from recovering after a reconnect.
            console.warn("[ChatSync] Conversation recovery failed", error);
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(4, pendingConversations.length) }, () => syncWorker()),
      );
    })();

    reconnectSyncInFlightRef.current = sync;
    try {
      await sync;
    } catch (error) {
      // The durable cursor was not advanced when a page failed. The next
      // reconnect retries from the last successfully persisted page.
      console.warn("[ChatSync] Reconnect history synchronization failed", error);
    } finally {
      if (reconnectSyncInFlightRef.current === sync) {
        reconnectSyncInFlightRef.current = null;
      }
    }
  }, [
    currentUserId,
    channels,
    handledRealtimeMessageKeysRef,
    resumePendingSends,
    selectedChat,
    setMessagesByChat,
  ]);

  const {
    handleRealtimeCallRinging,
    handleRealtimeCallAccepted,
    handleRealtimeCallClosed,
    handleRealtimeCallDeclined,
    handleRealtimeCallCancelled,
    handleRealtimeCallEnded,
    handleRealtimeCallMissed,
  } = useChatRealtimeCalls({
    activeCall,
    incomingCall,
    blockedUserIds,
    buddies,
    currentUserId,
    setActiveCall,
    setIncomingCall,
    setCallError,
    setCallNotice,
  });

  const handleRealtimeMemberRemoved = useChatRealtimeMemberRemoved({
    currentUserId,
    selectedChat,
    navigate,
    setChannels,
    setMessagesByChat,
    setSelectedChat,
  });

  const handleRealtimeConversationUpdated = useCallback(
    (payload: any = {}) => {
      const chatId = String(payload?.chatId || payload?.conversationId || "");
      const conversation = payload?.conversation;
      if (!chatId || !conversation) return;

      const normalizedConversation = {
        ...conversation,
        id: conversation.id || conversation.conversationId || conversation.chatId || chatId,
      };

      setChannels((previous: ChatRecord[]) =>
        upsertConversationRecord(previous, normalizedConversation),
      );
      setSelectedChat((previous: ChatRecord | null) => {
        if (!previous) return previous;
        const ids = [previous.id, previous.chatId].filter(Boolean).map(String);
        if (!ids.includes(chatId)) return previous;
        return {
          ...previous,
          // The API uses type="group" while the existing UI uses type="channel" for
          // both group and channel conversations. Preserve the UI discriminator.
          ...normalizedConversation,
          type: previous.type,
          title: normalizedConversation.title || previous.title,
          participants: normalizedConversation.participants || previous.participants,
          raw: { ...(previous.raw || {}), ...normalizedConversation },
        };
      });
    },
    [setChannels, setSelectedChat],
  );

  const handleRealtimeConversationDeleted = useCallback(
    (payload: any = {}) => {
      const chatId = String(payload?.chatId || payload?.conversationId || "");
      if (!chatId) return;
      setChannels((previous: ChatRecord[]) =>
        previous.filter((item) => getConversationRecordId(item) !== chatId),
      );
      setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
        const next = { ...previous };
        delete next[chatId];
        return next;
      });
      if ([selectedChat?.id, selectedChat?.chatId].filter(Boolean).map(String).includes(chatId)) {
        setSelectedChat(null);
        navigate(CHAT_APP_BASE_PATH);
      }
    },
    [
      navigate,
      selectedChat?.chatId,
      selectedChat?.id,
      setChannels,
      setMessagesByChat,
      setSelectedChat,
    ],
  );

  const callSocketRef = useChatRealtime({
    enabled: Boolean(currentUserId),
    activeConversationId,
    onMessage: handleRealtimeMessage,
    onMessageAccepted: handleMessageAccepted,
    onMessageFailed: handleMessageFailed,
    onReconnected: handleRealtimeReconnected,
    onMessageUpdated: handleRealtimeMessageUpdated,
    onMessageDelivered: handleRealtimeMessageDelivered,
    onTyping: useCallback(({ chatId, userId, name, typing }: any) => {
      setTypingUsersByChat((prev: Record<string, ChatRecord | null>) => ({
        ...prev,
        [String(chatId)]: typing ? { userId: String(userId), name } : null,
      }));
    }, []),
    onMessageRead: handleRealtimeMessageRead,
    onMemberRemoved: handleRealtimeMemberRemoved,
    onConversationUpdated: handleRealtimeConversationUpdated,
    onConversationDeleted: handleRealtimeConversationDeleted,
    onReactionAdded: handleRealtimeReactionAdded,
    onPresence: handleRealtimePresence,
    onAvatar: handleRealtimeAvatar,
    onNotification,
    onCallStarted: handleRealtimeCallAccepted,
    onCallRinging: handleRealtimeCallRinging,
    onCallAccepted: handleRealtimeCallAccepted,
    onCallDeclined: handleRealtimeCallDeclined,
    onCallCancelled: handleRealtimeCallCancelled,
    onCallEnded: handleRealtimeCallEnded,
    onCallMissed: handleRealtimeCallMissed,
  });

  const clearUnreadForChat = useCallback(
    ({ chatId, userId, email }: ChatRecord = {}) => {
      const conversationId = chatId ? String(chatId) : "";
      const participantId = userId ? String(userId) : "";
      const participantEmail = String(email || "").toLowerCase();

      setChannels((previous: ChatRecord[]) =>
        previous.map((channel: ChatRecord) => {
          const channelIds = [channel?.id, channel?.chatId, channel?.chat_id, getChannelId(channel)]
            .filter(Boolean)
            .map(String);
          return conversationId && channelIds.includes(conversationId)
            ? { ...channel, unreadCount: 0, unread_count: 0 }
            : channel;
        }),
      );
      if (!participantId && !participantEmail) return;

      setBuddies((previous: ChatRecord[]) =>
        previous.map((buddy: ChatRecord) => {
          const buddyId = String(getBuddySendId(buddy) || "");
          const buddyEmail = String(getBuddyEmail(buddy) || "").toLowerCase();
          return buddyId === participantId || (participantEmail && buddyEmail === participantEmail)
            ? { ...buddy, unreadCount: 0, unread_count: 0 }
            : buddy;
        }),
      );
    },
    [setBuddies, setChannels],
  );
  const { handleToggleChatMute } = useChatMute({
    mutedChatIds,
    setMutedChatIds,
    setSendError,
  });
  const { handleClearChat } = useChatClear({
    selectedChat,
    requestConfirmation,
    chatClearVersionsRef,
    setMessagesByChat,
    setMessagePaginationByChat,
    clearUnreadForChat,
    setChannels,
    setBuddies,
    setSendError,
  });

  useChatMarkRead({
    activeConversationId,
    callSocketRef,
    currentUser,
    currentUserEmail,
    currentUserId,
    messagesByChat,
    selectedChat,
    setChannels,
  });

  return {
    allVisibleBuddies,
    activeConversationId,
    conversationItems,
    isCurrentUserRecord,
    isSelfConversation,
    uniqueUsersByIdentity,
    visibleBuddies,
    visibleChannels,
    visibleDirectChannels,
    visibleGroupChannels,
    handleRealtimeMessageUpdated,
    handleRealtimeMessageDelivered,
    handleRealtimeMessageRead,
    handleRealtimeReactionAdded,
    handleRealtimePresence,
    handleRealtimeAvatar,
    handleRealtimeCallRinging,
    handleRealtimeCallAccepted,
    handleRealtimeCallClosed,
    handleRealtimeCallDeclined,
    handleRealtimeCallCancelled,
    handleRealtimeCallEnded,
    handleRealtimeCallMissed,
    handleRealtimeMemberRemoved,
    loadOlderMessages,
    callSocketRef,
    clearUnreadForChat,
    handleToggleChatMute,
    handleClearChat,
  };
}
