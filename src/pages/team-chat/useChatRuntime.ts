import { useCallback, useEffect, useRef } from "react";
import { getBuddyEmail, getBuddySendId, getChannelId, normalizePresence } from "./chatHealper";
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
import { useChatPresence } from "./useChatPresence";
import { useChatAvatar } from "./useChatAvatar";
import { useChatOlderMessages } from "./useChatOlderMessages";
import { getActiveConversationCallsService } from "@/services/Team-chat/chat.service";
import { getChatMessagesService } from "@/services/Team-chat/chat.service";
import { getStoredUser } from "@/lib/api/client";
import { normalizeCall, PENDING_CALL_STORAGE_KEY } from "./ChatSystemUtils";
import { normalizeChatMessages } from "./chatMessageNormalization";

type ChatRecord = Record<string, any>;
type ChatRuntimeOptions = Record<string, any>;

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
    setStatusSaving,
    setTypingUsersByChat,
    setAvatarUploading,
    avatarUploading,
    statusSaving,
    setMessagePaginationByChat,
    setLoadingOlderMessages,
    chatBoxRef,
    filterBlockedMessages,
    loadingOlderMessages,
    messagePaginationByChat,
    searchTerm,
  } = options;
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
    currentUserId,
    setMessageInfoVersions,
    setMessagesByChat,
  });
  const handleRealtimeReactionAdded = useChatRealtimeReaction({
    channels,
    buddies,
    currentUserEmail,
    currentUserId,
    mutedChatIds,
    navigate,
  });
  const handleRealtimePresence = useChatRealtimePresence({
    currentUserId,
    setCurrentStatus,
    setProfileUser,
    setBuddies,
    setSelectedChat,
  });
  const handleRealtimeAvatar = useChatRealtimeAvatar({
    currentUserId,
    setBuddies,
    setProfileUser,
  });
  const loadOlderMessages = useChatOlderMessages({
    selectedChat,
    loadingOlderMessages,
    messagePaginationByChat,
    chatBoxRef,
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
    navigate,
    handledRealtimeMessageKeysRef,
    realtimeStartedAtRef,
    selectedChat,
    setChannels,
    setMessagesByChat,
  });

  const handleRealtimeReconnected = useCallback(async () => {
    handledRealtimeMessageKeysRef.current.clear();
    if (!selectedChat) return;
    const chatId = selectedChat.chatId || selectedChat.id;
    if (!chatId) return;

    try {
      const response: any = await getChatMessagesService(chatId, { limit: 100 });
      const latest = normalizeChatMessages(response?.data?.data || response?.data, {
        ...selectedChat,
        chatId,
        currentUserId,
      });
      const keys = Array.from(new Set([selectedChat.id, chatId].filter(Boolean).map(String)));
      setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
        const next = { ...previous };
        keys.forEach((key) => {
          const pending = (previous[key] || []).filter(
            (message) => message.sendState === "sending" || message.sendState === "failed",
          );
          const loadedIds = new Set(latest.map((message) => String(message.id)));
          next[key] = [
            ...latest,
            ...pending.filter((message) => !loadedIds.has(String(message.id))),
          ];
        });
        return next;
      });
    } catch {
      // The next reconnect or normal conversation refresh remains the recovery path.
    }
  }, [currentUserId, handledRealtimeMessageKeysRef, selectedChat, setMessagesByChat]);

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
    setSelectedChat,
  });

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
    onReactionAdded: handleRealtimeReactionAdded,
    onPresence: handleRealtimePresence,
    onAvatar: handleRealtimeAvatar,
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
  const { handleStatusChange } = useChatPresence({
    statusSaving,
    setStatusSaving,
    setCurrentStatus,
    setProfileUser,
    setLoadError,
    selectedChat,
    clearUnreadForChat,
    normalizePresence,
  });
  const { handleAvatarUpload } = useChatAvatar({
    avatarUploading,
    setAvatarUploading,
    setLoadError,
    setProfileUser,
  });
  const { handleToggleChatMute } = useChatMute({ setMutedChatIds, setSendError });
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

  const { markChatAsRead } = useChatMarkRead({ activeConversationId, selectedChat, setChannels });

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
    handleStatusChange,
    handleAvatarUpload,
    handleToggleChatMute,
    handleClearChat,
    markChatAsRead,
  };
}
