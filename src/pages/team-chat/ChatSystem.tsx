import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ChatSidebar from "./ChatSidebar";
import ChatBodyPanels, { type ChatBodyView, type ChatNote } from "./ChatBodyPanels";
import ChatWindow from "./chatwindow/ChatWindow";
import { buildConversationItems } from "./conversationListModal";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";
import {
  getArrayPayload,
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
  getMessageAttachments,
  getMessageSenderId,
  getMessageText,
  getUnreadCount,
  normalizeChatMessages,
  normalizeChatError,
  normalizeRealtimeMessage,
  resolveLocalChatKey,
} from "./chatHealper";
import {
  showChatNotification,
  playCallNotificationSound,
  playMessageNotificationSound,
} from "./chatNotifications";
import { useChatRealtime } from "./useChatRealtime";
import IncomingCallDialog from "./calls/IncomingCallDialog";
import InternalCallPanel from "./calls/InternalCallPanel";
import { useCallTone } from "./calls/useCallTone";
import {
  getChatMessagesService,
  getChatSettingsService,
  clearChatHistoryService,
  getChatStatusService,
  getChatUsersService,
  getChatConversationsService,
  searchChatMessagesService,
  addGroupMembersService,
  addMessageReactionService,
  createGroupChatService,
  deleteConversationMessageService,
  editConversationMessageService,
  leaveGroupConversationService,
  removeGroupMemberService,
  transferGroupOwnershipService,
  markConversationReadService,
  openDirectChatService,
  pinConversationMessageService,
  removeMessageReactionService,
  sendConversationMessageService,
  sendDirectMessageService,
  shareConversationFileService,
  startConversationCallService,
  endConversationCallService,
  getActiveConversationCallsService,
  respondConversationCallService,
  updateChatAvatarService,
  updateChatAvatarUrlService,
  updateChatStatusService,
  updateChatSettingsService,
} from "@/services/Team-chat/chat.service";
import { getStoredUser } from "@/lib/api/client";
import { getInitial } from "./sidebar/chatSidebarUtils";
import {
  AddMembersDialog,
  GroupCreationDialog,
  GroupCreationPage,
} from "./chatwindow/GroupDialogs";
import AdminPage from "./AdminPage";
import { ChatConfirmationDialog, ChatNotice } from "./ChatSystemOverlays";
import ChatCallOverlay from "./ChatCallOverlay";
import {
  PENDING_CALL_STORAGE_KEY,
  getMessageTimestamp,
  getConversationActivityTime,
  normalizeCall,
  hasConversationHistory,
  messageMentionsUser,
  textContainsMention,
  isMessageReadByUser,
  getConversationIdFromResponse,
} from "./ChatSystemUtils";

export default function ChatSystem({ standalone = false, adminPage = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const settingsPage = location.pathname.endsWith("/settings");
  const groupPage = location.pathname.endsWith("/groups/new");
  const bodyView: ChatBodyView = location.pathname.endsWith("/calls")
    ? "calls"
    : location.pathname.endsWith("/media")
      ? "media"
      : location.pathname.endsWith("/notes")
        ? "notes"
        : "conversations";
  const showConversationSidebar = bodyView === "conversations" && !groupPage;
  const { id } = useParams();
  const chatBoxRef = useRef(null);
  const initialFetchStartedRef = useRef(false);
  const loadedChatHistoryRef = useRef(new Set());
  const handledRealtimeMessageKeysRef = useRef(new Set());
  const chatClearVersionsRef = useRef(new Map());
  const realtimeStartedAtRef = useRef(Date.now());

  const [, setTab] = useState("conversations");
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [libraryMessages, setLibraryMessages] = useState([]);
  const [notes, setNotes] = useState<ChatNote[]>([]);
  const [buddies, setBuddies] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [messageInfoVersions, setMessageInfoVersions] = useState({});
  const [typingUsersByChat, setTypingUsersByChat] = useState({});
  const [messagePaginationByChat, setMessagePaginationByChat] = useState({});
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [enterToSend, setEnterToSend] = useState(
    () => localStorage.getItem("chat_enter_to_send") === "true",
  );
  const [mentionNotifications, setMentionNotifications] = useState(
    () => localStorage.getItem("chat_mention_notifications") !== "false",
  );
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupUserIds, setGroupUserIds] = useState([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupError, setGroupError] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);
  const [addMemberUserIds, setAddMemberUserIds] = useState([]);
  const [addMembersError, setAddMembersError] = useState("");
  const [addingMembers, setAddingMembers] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(
    () => localStorage.getItem("chat_presence") || "online",
  );
  const [statusSaving, setStatusSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [callMinimized, setCallMinimized] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStarting, setCallStarting] = useState(false);
  const [callResponding, setCallResponding] = useState(false);
  const [callError, setCallError] = useState("");
  const [callNotice, setCallNotice] = useState("");
  const [confirmationDialog, setConfirmationDialog] = useState(null);
  const confirmationResolverRef = useRef(null);
  useCallTone(incomingCall ? "incoming" : activeCall?.status === "ringing" ? "outgoing" : null);

  const requestConfirmation = useCallback(
    (options) =>
      new Promise((resolve) => {
        confirmationResolverRef.current = resolve;
        setConfirmationDialog({
          title: options?.title || "Please confirm",
          message: options?.message || "Are you sure you want to continue?",
          confirmLabel: options?.confirmLabel || "Confirm",
          confirmColor: options?.confirmColor || "error",
        });
      }),
    [],
  );

  const closeConfirmation = (confirmed) => {
    confirmationResolverRef.current?.(confirmed);
    confirmationResolverRef.current = null;
    setConfirmationDialog(null);
  };

  const [mutedChatIds, setMutedChatIds] = useState([]);
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const filterBlockedMessages = useCallback(
    (messages = []) =>
      messages.filter((message) => !blockedUserIds.includes(String(message.authorId))),
    [blockedUserIds],
  );
  const [profileUser, setProfileUser] = useState(() => {
    const tokenUser = getStoredUser();

    if (tokenUser) return tokenUser;

    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const currentUser = profileUser;
  const currentUserId = String(
    currentUser?.appUserId ||
      currentUser?.app_user_id ||
      currentUser?.userId ||
      currentUser?.user_id ||
      currentUser?.id ||
      "",
  );
  const currentUserEmail = String(
    currentUser?.email || currentUser?.email_id || currentUser?.mailid || "",
  ).toLowerCase();
  const notesStorageKey = `pingly_notes_${currentUserId || "guest"}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(notesStorageKey) || "[]");
      setNotes(Array.isArray(saved) ? saved : []);
    } catch {
      setNotes([]);
    }
  }, [notesStorageKey]);

  useEffect(() => {
    if (bodyView !== "calls" && bodyView !== "media") return undefined;

    let cancelled = false;
    setLibraryLoading(true);
    setLibraryError("");

    searchChatMessagesService({ type: bodyView, limit: 100 })
      .then((response) => {
        if (cancelled) return;
        const messages =
          response.data?.data?.messages || response.data?.data?.data || response.data?.data || [];
        setLibraryMessages(normalizeChatMessages(messages, { currentUserId }));
      })
      .catch((error) => {
        if (!cancelled) {
          setLibraryError(error instanceof Error ? error.message : "Unable to load chat library.");
        }
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bodyView, currentUserId]);

  const saveNote = useCallback(
    ({
      id,
      title,
      body,
      reminderAt,
    }: {
      id: string | number | null;
      title: string;
      body: string;
      reminderAt: string;
    }) => {
      const now = new Date().toISOString();
      const next: ChatNote = {
        id: id || globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        reminderAt: reminderAt ? new Date(reminderAt).toISOString() : "",
        updatedAt: now,
      };
      setNotes((previous) => {
        const nextNotes = id
          ? previous.map((note) => (note.id === id ? { ...note, ...next } : note))
          : [next, ...previous];
        localStorage.setItem(notesStorageKey, JSON.stringify(nextNotes));
        return nextNotes;
      });
    },
    [notesStorageKey],
  );

  const deleteNote = useCallback(
    (id: ChatNote["id"]) => {
      setNotes((previous) => {
        const nextNotes = previous.filter((note) => note.id !== id);
        localStorage.setItem(notesStorageKey, JSON.stringify(nextNotes));
        return nextNotes;
      });
    },
    [notesStorageKey],
  );

  useEffect(() => {
    if (!currentUserId) return undefined;
    let cancelled = false;

    getActiveConversationCallsService()
      .then((response) => {
        if (cancelled) return;
        const calls = response.data?.data?.calls || response.data?.data || [];
        const call = Array.isArray(calls)
          ? calls.find((candidate) =>
              ["ringing", "connecting", "accepted"].includes(
                String(candidate?.status || "").toLowerCase(),
              ),
            )
          : null;
        const normalizedCall = normalizeCall(call);
        if (!normalizedCall?.id) return;
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

  const isCurrentUserRecord = useCallback(
    (item) => {
      const itemIds = [
        item?.id,
        item?.userId,
        item?.user_id,
        item?.appUserId,
        item?.app_user_id,
        item?.identityId,
        item?.chatIdentityId,
        item?.chat_identity_id,
      ]
        .filter(Boolean)
        .map(String);
      const itemEmails = [
        item?.email,
        item?.email_id,
        item?.mailid,
        item?.providerEmail,
        item?.provider_email,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return (
        (currentUserId && itemIds.includes(currentUserId)) ||
        (currentUserEmail && itemEmails.includes(currentUserEmail))
      );
    },
    [currentUserEmail, currentUserId],
  );

  const getUserIdentityKey = useCallback((user) => {
    const email = String(
      user?.email || user?.email_id || user?.mailid || user?.primary_email || user?.emailid || "",
    )
      .trim()
      .toLowerCase();

    if (email && email.includes("@")) return `email:${email}`;

    const name = String(getBuddyName(user)).trim().toLowerCase();
    if (name && name !== "chat user") return `name:${name}`;

    return `id:${String(getBuddySendId(user) || "")
      .trim()
      .toLowerCase()}`;
  }, []);

  const getUserMergeScore = useCallback((user) => {
    let score = 0;
    if (getImageUrl(user)) score += 8;
    if (user?.directConversationId || user?.chat_id || user?.chatId) score += 6;
    if (getUnreadCount(user) > 0) score += 4;
    if (String(getBuddyEmail(user)).includes("@")) score += 2;
    if (getBuddyName(user) && getBuddyName(user) !== "Chat User") score += 1;
    return score;
  }, []);

  const mergeUserRecords = useCallback(
    (first, second) => {
      if (!first) return second;
      if (!second) return first;

      const preferred = getUserMergeScore(second) >= getUserMergeScore(first) ? second : first;
      const fallback = preferred === second ? first : second;
      const preferredImage = getImageUrl(preferred);
      const fallbackImage = getImageUrl(fallback);

      return {
        ...fallback,
        ...preferred,
        id: getBuddySendId(preferred) || getBuddySendId(fallback),
        user_id: getBuddySendId(preferred) || getBuddySendId(fallback),
        email: String(getBuddyEmail(preferred)).includes("@")
          ? getBuddyEmail(preferred)
          : getBuddyEmail(fallback),
        name: getBuddyName(preferred) || getBuddyName(fallback),
        display_name:
          preferred.display_name || preferred.name || fallback.display_name || fallback.name,
        avatarUrl: preferredImage || fallbackImage,
        imageUrl: preferredImage || fallbackImage,
        unreadCount: Math.max(getUnreadCount(first), getUnreadCount(second)),
        unread_count: Math.max(getUnreadCount(first), getUnreadCount(second)),
      };
    },
    [getUserMergeScore],
  );

  const uniqueUsersByIdentity = useCallback(
    (users = []) => {
      const usersByKey = new Map();

      users.forEach((user) => {
        const key = getUserIdentityKey(user);
        if (!key || key === "id:") return;
        usersByKey.set(key, mergeUserRecords(usersByKey.get(key), user));
      });

      return Array.from(usersByKey.values());
    },
    [getUserIdentityKey, mergeUserRecords],
  );

  const isSelfConversation = useCallback(
    (conversation) => {
      const participants = Array.isArray(conversation?.participants)
        ? conversation.participants
        : [];
      const isDirect =
        conversation?.isDirect ||
        conversation?.type === "direct" ||
        conversation?.conversationType === "direct";

      if (!isDirect) return false;
      if (participants.length > 0) {
        return participants.every((participant) => isCurrentUserRecord(participant));
      }

      const title = String(
        conversation?.title || conversation?.name || conversation?.display_name || "",
      ).toLowerCase();

      return (
        title === "myself" ||
        title === "me" ||
        title === String(currentUser?.name || "").toLowerCase() ||
        (currentUserEmail && title === currentUserEmail)
      );
    },
    [currentUser?.name, currentUserEmail, isCurrentUserRecord],
  );

  const activeConversationId =
    selectedChat?.type === "channel" ? selectedChat.id : selectedChat?.chatId || null;

  const visibleBuddies = useMemo(() => {
    const getUserIds = (user) =>
      [user?.id, user?.userId, user?.user_id, user?.appUserId, user?.app_user_id]
        .filter(Boolean)
        .map(String);
    const directParticipants = channels
      .filter(
        (conversation) =>
          !isSelfConversation(conversation) &&
          hasConversationHistory(conversation) &&
          (conversation?.isDirect ||
            String(conversation?.type || "").toLowerCase() === "direct" ||
            String(conversation?.conversationType || "").toLowerCase() === "direct"),
      )
      .flatMap((conversation) =>
        Array.isArray(conversation?.participants) ? conversation.participants : [],
      );
    const hasPreviousDirectConversation = (buddy) => {
      const buddyIds = getUserIds(buddy);
      const buddyEmail = String(getBuddyEmail(buddy) || "").toLowerCase();
      return directParticipants.some(
        (participant) =>
          getUserIds(participant).some((participantId) => buddyIds.includes(participantId)) ||
          (buddyEmail && String(getBuddyEmail(participant)).toLowerCase() === buddyEmail),
      );
    };

    return uniqueUsersByIdentity(
      buddies.filter(
        (buddy) => !isCurrentUserRecord(buddy) && hasPreviousDirectConversation(buddy),
      ),
    );
  }, [buddies, channels, isCurrentUserRecord, isSelfConversation, uniqueUsersByIdentity]);
  const allVisibleBuddies = useMemo(
    () => uniqueUsersByIdentity(buddies.filter((buddy) => !isCurrentUserRecord(buddy))),
    [buddies, isCurrentUserRecord, uniqueUsersByIdentity],
  );
  const visibleChannels = useMemo(
    () => channels.filter((channel) => !isSelfConversation(channel)),
    [channels, isSelfConversation],
  );
  const visibleGroupChannels = useMemo(
    () =>
      visibleChannels.filter(
        (channel) =>
          !channel?.isDirect &&
          String(channel?.type || "").toLowerCase() !== "direct" &&
          String(channel?.conversationType || "").toLowerCase() !== "direct",
      ),
    [visibleChannels],
  );
  const visibleDirectChannels = useMemo(
    () =>
      visibleChannels.filter(
        (channel) =>
          channel?.isDirect ||
          String(channel?.type || "").toLowerCase() === "direct" ||
          String(channel?.conversationType || "").toLowerCase() === "direct",
      ),
    [visibleChannels],
  );
  const legacyConversationItems = useMemo(() => {
    // The Chats tab is a recent-conversations list. Do not show users until
    // a conversation/history record exists for them.
    const buddiesForList = searchTerm.trim() ? allVisibleBuddies : visibleBuddies;
    const directRows = buddiesForList.map((buddy) => {
      const buddyId = String(getBuddySendId(buddy));
      const buddyEmail = String(getBuddyEmail(buddy)).toLowerCase();
      const buddyName = String(getBuddyName(buddy)).trim().toLowerCase();
      const matchingDirectConversation = visibleDirectChannels.find((channel) => {
        const participants = Array.isArray(channel?.participants) ? channel.participants : [];

        return participants.some((participant) => {
          const participantId = String(getBuddySendId(participant));
          const participantEmail = String(getBuddyEmail(participant)).toLowerCase();
          const participantName = String(getBuddyName(participant)).trim().toLowerCase();
          return (
            (buddyId && participantId === buddyId) ||
            (buddyEmail && participantEmail === buddyEmail) ||
            (buddyName && participantName === buddyName)
          );
        });
      });
      const conversationPeer = matchingDirectConversation?.participants?.find(
        (participant) => !isCurrentUserRecord(participant),
      );
      const lastMessageSender =
        matchingDirectConversation?.lastMessage?.sender ||
        matchingDirectConversation?.last_message?.sender;
      const conversationDisplayName =
        [conversationPeer, lastMessageSender, buddy]
          .map((candidate) => getBuddyName(candidate))
          .find((name) => name && name !== "Chat User") || getBuddyName(buddy);
      const directConversationId =
        matchingDirectConversation?.chat_id ||
        matchingDirectConversation?.chatId ||
        matchingDirectConversation?.id ||
        buddy?.directConversationId ||
        buddy?.chat_id ||
        buddy?.chatId ||
        "";
      return {
        ...(matchingDirectConversation || {}),
        ...buddy,
        id: getBuddySendId(buddy) || getBuddySendId(conversationPeer),
        name: conversationDisplayName,
        display_name: conversationDisplayName,
        userId:
          buddy?.userId ||
          buddy?.appUserId ||
          getBuddySendId(buddy) ||
          getBuddySendId(conversationPeer),
        user_id: buddy?.user_id || getBuddySendId(buddy) || getBuddySendId(conversationPeer),
        directConversationId,
        unreadCount: matchingDirectConversation
          ? getUnreadCount(matchingDirectConversation)
          : getUnreadCount(buddy),
        lastMessage:
          matchingDirectConversation?.lastMessage ||
          matchingDirectConversation?.last_message ||
          buddy?.lastMessage ||
          buddy?.last_message,
        last_message:
          matchingDirectConversation?.last_message ||
          matchingDirectConversation?.lastMessage ||
          buddy?.last_message,
        lastMessageTime:
          matchingDirectConversation?.lastMessageTime ||
          matchingDirectConversation?.last_message_time ||
          matchingDirectConversation?.lastMessageAt ||
          matchingDirectConversation?.last_message_at ||
          buddy?.lastMessageTime ||
          buddy?.last_message_time,
        lastMessageAt:
          matchingDirectConversation?.lastMessageAt ||
          matchingDirectConversation?.last_message_at ||
          buddy?.lastMessageAt ||
          buddy?.last_message_at,
        __conversationType: "person",
      };
    });

    // Conversations are the source of truth for chats that already exist. A
    // user record can differ slightly from the participant record (for
    // example userId vs appUserId), which previously made the chat disappear
    // until the user searched for it. Add any direct conversation that was
    // not matched above by using its non-self participant as the row.
    if (!searchTerm.trim()) {
      visibleDirectChannels.forEach((channel) => {
        const participants = Array.isArray(channel?.participants) ? channel.participants : [];
        const peer = participants.find((participant) => !isCurrentUserRecord(participant));
        if (!peer) return;

        const peerIds = [
          getBuddySendId(peer),
          getBuddyEmail(peer),
          getBuddyName(peer),
          peer?.id,
          peer?.userId,
          peer?.user_id,
          peer?.appUserId,
          peer?.app_user_id,
          peer?.username,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        const alreadyAdded = directRows.some((row) =>
          [getBuddySendId(row), getBuddyEmail(row), getBuddyName(row)]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
            .some((value) => peerIds.includes(value)),
        );
        if (alreadyAdded) return;

        const matchedBuddy = allVisibleBuddies.find((buddy) =>
          [
            getBuddySendId(buddy),
            getBuddyEmail(buddy),
            getBuddyName(buddy),
            buddy?.id,
            buddy?.userId,
            buddy?.user_id,
            buddy?.appUserId,
            buddy?.app_user_id,
            buddy?.username,
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
            .some((value) => peerIds.includes(value)),
        );
        const displayPeer = matchedBuddy || peer;

        directRows.push({
          ...channel,
          ...displayPeer,
          directConversationId: channel?.chat_id || channel?.chatId || channel?.id || "",
          unreadCount: getUnreadCount(channel),
          lastMessage: channel?.lastMessage || channel?.last_message,
          last_message: channel?.last_message || channel?.lastMessage,
          lastMessageTime: channel?.lastMessageTime || channel?.last_message_time,
          lastMessageAt: channel?.lastMessageAt || channel?.last_message_at,
          __conversationType: "person",
        });
      });
    }

    const activeDirectFallback =
      selectedChat?.type === "person" && selectedChat?.chatId
        ? [
            {
              ...selectedChat.raw,
              ...selectedChat,
              id: selectedChat.id,
              directConversationId: selectedChat.chatId,
              type: "direct",
              isDirect: true,
              lastMessage: messagesByChat[selectedChat.id]?.at(-1) || selectedChat.lastMessage,
              lastMessageAt: selectedChat.lastMessageAt || new Date().toISOString(),
              __conversationType: "person",
            },
          ]
        : [];

    const items = [
      ...activeDirectFallback,
      ...directRows.map((row) => {
        const genericName = /^(chat\s*user|chatuser)$/i.test(String(getBuddyName(row)).trim());
        if (!genericName) return row;

        const rowIds = [getBuddySendId(row), getBuddyEmail(row), row?.directConversationId]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        const matchingConversation =
          visibleDirectChannels.find((conversation) => {
            const conversationIds = [
              conversation?.id,
              conversation?.chatId,
              conversation?.chat_id,
              conversation?.publicId,
              conversation?.public_id,
              ...(Array.isArray(conversation?.participants)
                ? conversation.participants.flatMap((participant) => [
                    getBuddySendId(participant),
                    getBuddyEmail(participant),
                  ])
                : []),
            ]
              .filter(Boolean)
              .map((value) => String(value).toLowerCase());
            return rowIds.some((value) => conversationIds.includes(value));
          }) || (visibleDirectChannels.length === 1 ? visibleDirectChannels[0] : null);

        if (!matchingConversation) return row;
        const peer = matchingConversation.participants?.find(
          (participant) => !isCurrentUserRecord(participant),
        );
        const sender =
          matchingConversation.lastMessage?.sender || matchingConversation.last_message?.sender;
        const displayName =
          [peer, sender]
            .map((candidate) => getBuddyName(candidate))
            .find((name) => name && !/^(chat\s*user|chatuser)$/i.test(name)) || getBuddyName(row);

        return {
          ...row,
          ...(peer || {}),
          id: getBuddySendId(row) || getBuddySendId(peer),
          userId: getBuddySendId(row) || getBuddySendId(peer),
          user_id: getBuddySendId(row) || getBuddySendId(peer),
          name: displayName,
          display_name: displayName,
          directConversationId:
            matchingConversation.chat_id || matchingConversation.chatId || matchingConversation.id,
          lastMessage:
            matchingConversation.lastMessage ||
            matchingConversation.last_message ||
            row.lastMessage,
          lastMessageAt:
            matchingConversation.lastMessageAt ||
            matchingConversation.last_message_at ||
            row.lastMessageAt,
        };
      }),
      ...visibleGroupChannels.map((channel) => ({
        ...channel,
        __conversationType: "channel",
      })),
    ];

    const currentName = String(
      currentUser?.name || currentUser?.displayName || currentUser?.display_name || "",
    )
      .trim()
      .toLowerCase();
    const currentEmail = String(currentUserEmail || "")
      .trim()
      .toLowerCase();
    const filteredItems = items.filter((item) => {
      if (item.__conversationType === "channel") return true;
      if (isCurrentUserRecord(item)) return false;
      const itemName = String(getBuddyName(item) || "")
        .trim()
        .toLowerCase();
      const itemEmail = String(getBuddyEmail(item) || "")
        .trim()
        .toLowerCase();
      return (
        !(currentName && itemName === currentName) && !(currentEmail && itemEmail === currentEmail)
      );
    });

    const uniqueItems = Array.from(
      new Map(
        filteredItems.map((item) => [
          item.__conversationType === "channel"
            ? `group:${getChannelId(item)}`
            : `chat:${getBuddySendId(item) || getBuddyEmail(item)}`,
          item,
        ]),
      ).values(),
    );

    return uniqueItems
      .map((item, index) => ({ item, index }))
      .sort((first, second) => {
        const activityDelta =
          getConversationActivityTime(second.item) - getConversationActivityTime(first.item);
        return activityDelta || first.index - second.index;
      })
      .map(({ item }) => item);
  }, [
    allVisibleBuddies,
    isCurrentUserRecord,
    currentUser?.displayName,
    currentUser?.display_name,
    currentUser?.name,
    currentUserEmail,
    searchTerm,
    messagesByChat,
    selectedChat,
    visibleBuddies,
    visibleDirectChannels,
    visibleGroupChannels,
  ]);
  const conversationItems = useMemo(() => {
    const modeledItems = buildConversationItems({
      allVisibleBuddies,
      visibleBuddies,
      visibleDirectChannels,
      visibleGroupChannels,
      searchTerm,
      selectedChat,
      messagesByChat,
      currentUser,
      currentUserEmail,
      isCurrentUserRecord,
      getUnreadCount,
    });
    return modeledItems.length > 0 ? modeledItems : legacyConversationItems;
  }, [
    allVisibleBuddies,
    currentUser,
    currentUserEmail,
    isCurrentUserRecord,
    legacyConversationItems,
    messagesByChat,
    searchTerm,
    selectedChat,
    visibleBuddies,
    visibleDirectChannels,
    visibleGroupChannels,
  ]);

  const totalUnreadCount = useMemo(() => {
    const countsByConversation = new Map();

    conversationItems.forEach((item) => {
      const conversationKey =
        item?.directConversationId ||
        item?.chat_id ||
        item?.chatId ||
        getChannelId(item) ||
        getBuddySendId(item) ||
        getBuddyEmail(item);

      if (!conversationKey) return;

      const key = String(conversationKey);
      countsByConversation.set(
        key,
        Math.max(countsByConversation.get(key) || 0, getUnreadCount(item)),
      );
    });

    return Array.from(countsByConversation.values()).reduce((total, count) => total + count, 0);
  }, [conversationItems]);

  const handleRealtimeMessage = useCallback(
    ({ chatId, message }) => {
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
          [localKey, ...(isActiveChat ? [selectedChat?.id] : [])].filter(Boolean).map(String),
        ),
      );
      const existingMessages = messageKeys.reduce(
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
        setMessagesByChat((prev) => {
          const next = { ...prev };
          messageKeys.forEach((key) => {
            const existing = next[key] || [];
            if (!existing.some((item) => String(item.id) === String(normalizedMessage.id))) {
              next[key] = [...existing, normalizedMessage];
            }
          });
          return next;
        });
      }

      setChannels((prev) => {
        let matchedExistingConversation = false;
        const nextChannels = prev.map((channel) => {
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

      // Realtime updates the badge immediately. Refresh the conversation rows
      // as a reconciliation step so counts remain correct across tabs/devices.
      getChatConversationsService()
        .then((response) => {
          setChannels(getArrayPayload(response.data?.data));
        })
        .catch(() => {});

      const shouldNotify =
        !isOwnMessage &&
        currentStatus !== "dnd" &&
        (!isActiveChat || document.hidden) &&
        !isAlreadyLoaded &&
        isNewSinceRealtimeStarted &&
        !isReadByCurrentUser;
      const shouldNotifyMention = shouldNotify && isMentioned && mentionNotifications;

      if (shouldNotify) {
        if (mutedChatIds.includes(String(chatId)) && !shouldNotifyMention) return;

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

      if (shouldTreatAsRead && !isOwnMessage) {
        markConversationReadService(chatId).catch(() => {});
      }
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
      selectedChat,
    ],
  );

  const handleRealtimeMessageUpdated = useCallback(
    ({ chatId, message }) => {
      if (!chatId || !message) return;

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

      if (!localKey || !normalizedMessage) return;

      setMessagesByChat((prev) => ({
        ...prev,
        [localKey]: (prev[localKey] || []).map((item) =>
          String(item.id) === String(normalizedMessage.id)
            ? { ...item, ...normalizedMessage }
            : item,
        ),
      }));
    },
    [buddies, channels, currentUserId, selectedChat],
  );

  const handleRealtimeMessageDelivered = useCallback(
    ({ chatId, messageId }) => {
      if (!chatId || !messageId) return;
      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      if (!localKey) return;
      setMessagesByChat((prev) => ({
        ...prev,
        [localKey]: (prev[localKey] || []).map((message) =>
          String(message.id) === String(messageId) && message.deliveryStatus !== "seen"
            ? { ...message, deliveryStatus: "delivered" }
            : message,
        ),
      }));
    },
    [buddies, channels, currentUserId],
  );

  const handleRealtimeMessageRead = useCallback(
    ({ chatId, userId, readAt, readStates = [] }) => {
      if (!chatId || !readAt || String(userId) === currentUserId) return;
      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      if (!localKey) return;
      // Message info dialogs use this version to refresh their delivery/read
      // recipients as soon as a participant's read receipt arrives.
      setMessageInfoVersions((prev) => ({
        ...prev,
        [localKey]: (prev[localKey] || 0) + 1,
      }));
      const otherReaders = readStates.filter(
        (reader) => reader.userId && String(reader.userId) !== currentUserId,
      );
      setMessagesByChat((prev) => ({
        ...prev,
        [localKey]: (prev[localKey] || []).map((message) => {
          if (message.direction !== "outbound" || otherReaders.length === 0) return message;
          const sentAt = new Date(message.sentAt).getTime();
          const seenByAll = otherReaders.every(
            (reader) => reader.readAt && new Date(reader.readAt).getTime() >= sentAt,
          );
          return seenByAll ? { ...message, deliveryStatus: "seen" } : message;
        }),
      }));
    },
    [buddies, channels, currentUserId],
  );

  const handleRealtimeReactionAdded = useCallback(
    ({ chatId, reaction, message }) => {
      const actorId = String(
        reaction?.actor?.id ||
          reaction?.actor?.userId ||
          reaction?.actor?.user_id ||
          reaction?.actor?.appUserId ||
          "",
      );
      const actorEmail = String(
        reaction?.actor?.email || reaction?.actor?.email_id || reaction?.actor?.mailid || "",
      ).toLowerCase();
      if (
        !chatId ||
        !reaction?.emoji ||
        mutedChatIds.includes(String(chatId)) ||
        (actorId && actorId === currentUserId) ||
        (actorEmail && actorEmail === currentUserEmail)
      ) {
        return;
      }

      const localKey = resolveLocalChatKey({
        chatId,
        channels,
        buddies,
        currentUserId,
      });
      const actorName =
        reaction?.actor?.name ||
        reaction?.actor?.display_name ||
        reaction?.actor?.email ||
        "Someone";
      const messagePreview = getMessageText(message);

      showChatNotification({
        title: `${actorName} reacted ${reaction.emoji}`,
        body: messagePreview ? `To your message: ${messagePreview}` : "To your message",
        icon: getImageUrl(reaction?.actor),
        tag: `reaction-${chatId}-${message?.id || message?.message_id || ""}`,
        url: `${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey || chatId)}`,
        onClick: () => {
          if (localKey) {
            navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey)}`);
          }
        },
      });
    },
    [buddies, channels, currentUserEmail, currentUserId, mutedChatIds, navigate],
  );

  const handleRealtimePresence = useCallback(({ userId, presence, user }) => {
    if (!userId) return;

    const nextPresence = presence || user?.presence || user?.status;

    setBuddies((prev) =>
      prev.map((buddy) =>
        String(getBuddySendId(buddy)) === String(userId)
          ? {
              ...buddy,
              ...user,
              presence: nextPresence,
              status: nextPresence,
            }
          : buddy,
      ),
    );

    setSelectedChat((prev) => {
      if (!prev || prev.type === "channel") return prev;

      const selectedUserId = String(getBuddySendId(prev.raw) || prev.id || "");
      const selectedEmail = String(getBuddyEmail(prev.raw) || prev.subtitle || "").toLowerCase();
      const eventEmail = String(user?.email || user?.email_id || user?.mailid || "").toLowerCase();

      if (selectedUserId !== String(userId) && (!eventEmail || selectedEmail !== eventEmail)) {
        return prev;
      }

      return {
        ...prev,
        raw: {
          ...(prev.raw || {}),
          ...(user || {}),
          presence: nextPresence,
          status: nextPresence,
        },
      };
    });
  }, []);

  const handleRealtimeAvatar = useCallback(
    ({ userId, avatarUrl, user }) => {
      if (!userId) return;

      const nextAvatarUrl = avatarUrl || getImageUrl(user);

      setBuddies((prev) =>
        prev.map((buddy) =>
          String(getBuddySendId(buddy)) === String(userId)
            ? { ...buddy, ...user, avatarUrl: nextAvatarUrl, imageUrl: nextAvatarUrl }
            : buddy,
        ),
      );

      if (String(userId) === currentUserId) {
        setProfileUser((prev) => {
          const nextUser = {
            ...(prev || {}),
            ...(user || {}),
            avatarUrl: nextAvatarUrl,
            imageUrl: nextAvatarUrl,
          };
          localStorage.setItem("user", JSON.stringify(nextUser));
          return nextUser;
        });
      }
    },
    [currentUserId],
  );

  const handleRealtimeCallRinging = useCallback(
    ({ call }) => {
      const normalizedCall = normalizeCall(call);
      if (!normalizedCall?.id) return;
      if (activeCall?.id || incomingCall?.id) return;
      const callerId =
        normalizedCall.startedBy?.id ||
        normalizedCall.startedBy?.userId ||
        normalizedCall.startedBy?.user_id;
      if (blockedUserIds.includes(String(callerId))) return;
      if (String(callerId) === currentUserId) {
        setActiveCall(normalizedCall);
        return;
      }
      setCallError("");
      setIncomingCall(normalizedCall);
      localStorage.setItem(PENDING_CALL_STORAGE_KEY, JSON.stringify(normalizedCall));
      showChatNotification({
        title: `Incoming ${normalizedCall.type === "video" ? "video" : "audio"} call`,
        body: `${normalizedCall.startedBy?.name || "A chat user"} is calling you`,
        tag: `chat-call-${normalizedCall.id}`,
        url: `${CHAT_APP_BASE_PATH}/${encodeURIComponent(normalizedCall.chatId || "")}`,
        preserveCall: true,
        requireInteraction: true,
      });
      playCallNotificationSound();
    },
    [activeCall?.id, blockedUserIds, currentUserId, incomingCall?.id],
  );

  const handleRealtimeCallAccepted = useCallback(
    ({ call }) => {
      if (!call?.id) return;
      const peerId = call.startedBy?.id || call.startedBy?.userId || call.startedBy?.user_id;
      if (blockedUserIds.includes(String(peerId)) && String(peerId) !== currentUserId) return;
      const acceptedById =
        call.acceptedBy?.id || call.acceptedBy?.userId || call.acceptedBy?.user_id;
      // In a group call, an acceptance event is broadcast to every member.
      // Only the participant who accepted and the caller should enter the
      // active room; other members must keep their incoming notification.
      const shouldOpenRoom =
        String(acceptedById) === String(currentUserId) || String(peerId) === String(currentUserId);
      if (!shouldOpenRoom) return;
      setIncomingCall((prev) => (prev?.id === call.id ? null : prev));
      setActiveCall(call);
      showChatNotification({
        title: "Call accepted",
        body: "Your chat call is ready.",
        tag: `chat-call-${call.id}`,
      });
    },
    [blockedUserIds, currentUserId],
  );

  const handleRealtimeCallClosed = useCallback(({ call }) => {
    if (!call?.id) return;
    localStorage.removeItem(PENDING_CALL_STORAGE_KEY);
    setIncomingCall((prev) => (prev?.id === call.id ? null : prev));
    setActiveCall((prev) => (prev?.id === call.id ? null : prev));
  }, []);

  const handleRealtimeCallDeclined = useCallback(
    ({ call }) => {
      handleRealtimeCallClosed({ call });
      if (String(call?.startedBy?.id) === currentUserId) {
        showChatNotification({
          title: "Call declined",
          body: "The other user declined your call.",
          tag: `chat-call-${call?.id}`,
        });
      }
    },
    [currentUserId, handleRealtimeCallClosed],
  );

  const handleRealtimeCallCancelled = useCallback(
    ({ call }) => {
      handleRealtimeCallClosed({ call });
      if (String(call?.startedBy?.id) !== currentUserId) {
        showChatNotification({
          title: "Call cancelled",
          body: `${call?.startedBy?.name || "The caller"} cancelled the call.`,
          tag: `chat-call-${call?.id}`,
        });
      }
    },
    [currentUserId, handleRealtimeCallClosed],
  );

  const handleRealtimeCallEnded = useCallback(({ call }) => {
    if (!call?.id) return;
    setActiveCall((prev) => (prev?.id === call.id ? null : prev));
  }, []);

  const handleRealtimeCallMissed = useCallback(({ call }) => {
    if (!call?.id) return;
    setIncomingCall((prev) => (prev?.id === call.id ? null : prev));
    setActiveCall((prev) => (prev?.id === call.id ? null : prev));
    setCallNotice("The user is offline, busy, or in Do Not Disturb. A missed call was saved.");
  }, []);

  const handleRealtimeMemberRemoved = useCallback(
    ({ chatId, removedUser, systemMessage }) => {
      if (!chatId || !removedUser) return;
      const removedUserId = String(getBuddySendId(removedUser) || removedUser.userId || "");
      const isCurrentUserRemoved = removedUserId === currentUserId;

      if (systemMessage && !isCurrentUserRemoved) {
        const normalizedMessage = normalizeRealtimeMessage(systemMessage, {
          id: selectedChat?.id || chatId,
          currentUserId,
        });
        if (normalizedMessage) {
          setMessagesByChat((prev) => ({
            ...prev,
            [String(chatId)]: [...(prev[String(chatId)] || []), normalizedMessage],
          }));
        }
      }

      setChannels((prev) =>
        prev
          .map((channel) =>
            String(getChannelId(channel)) === String(chatId)
              ? {
                  ...channel,
                  participants: (channel.participants || []).filter(
                    (participant) => String(getBuddySendId(participant)) !== removedUserId,
                  ),
                }
              : channel,
          )
          .filter(
            (channel) => !isCurrentUserRemoved || String(getChannelId(channel)) !== String(chatId),
          ),
      );

      if (
        isCurrentUserRemoved &&
        String(selectedChat?.chatId || selectedChat?.id) === String(chatId)
      ) {
        setSelectedChat(null);
        navigate(CHAT_APP_BASE_PATH);
      } else if (!isCurrentUserRemoved && String(selectedChat?.id) === String(chatId)) {
        setSelectedChat((prev) =>
          prev
            ? {
                ...prev,
                raw: {
                  ...(prev.raw || {}),
                  participants: (prev.raw?.participants || []).filter(
                    (participant) => String(getBuddySendId(participant)) !== removedUserId,
                  ),
                },
              }
            : prev,
        );
      }

      setSendError(`${getBuddyName(removedUser)} was removed from the group.`);
    },
    [currentUserId, navigate, selectedChat?.chatId, selectedChat?.id],
  );

  const callSocketRef = useChatRealtime({
    enabled: Boolean(currentUserId),
    activeConversationId,
    onMessage: handleRealtimeMessage,
    onMessageUpdated: handleRealtimeMessageUpdated,
    onMessageDelivered: handleRealtimeMessageDelivered,
    onTyping: useCallback(({ chatId, userId, name, typing }) => {
      setTypingUsersByChat((prev) => ({
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

  const clearUnreadForChat = useCallback(() => {}, []);

  const markChatAsRead = useCallback(async ({ chatId } = {}) => {
    if (!chatId) return;

    const response = await markConversationReadService(chatId);
    const markedChatId = String(
      response.data?.data?.chatId || response.data?.data?.chat_id || chatId,
    );

    // The successful read response is already database-backed. Apply its
    // zero unread count immediately so the badge changes in realtime.
    setChannels((previousChannels) =>
      previousChannels.map((channel) => {
        const channelIds = [channel?.id, channel?.chatId, channel?.chat_id, getChannelId(channel)]
          .filter(Boolean)
          .map(String);

        return channelIds.includes(markedChatId)
          ? {
              ...channel,
              unreadCount: 0,
              unread_count: 0,
            }
          : channel;
      }),
    );
  }, []);

  useEffect(() => {
    if (!activeConversationId) return undefined;

    const markActiveChatRead = () => {
      if (document.hidden) return;
      markChatAsRead({
        chatId: activeConversationId,
        userId: selectedChat?.type === "person" ? selectedChat.id : "",
        email: selectedChat?.type === "person" ? selectedChat.subtitle : "",
      }).catch(() => {});
    };

    window.addEventListener("focus", markActiveChatRead);
    document.addEventListener("visibilitychange", markActiveChatRead);
    markActiveChatRead();

    return () => {
      window.removeEventListener("focus", markActiveChatRead);
      document.removeEventListener("visibilitychange", markActiveChatRead);
    };
  }, [
    activeConversationId,
    markChatAsRead,
    selectedChat?.id,
    selectedChat?.subtitle,
    selectedChat?.type,
  ]);

  const loadDirectChatHistory = useCallback(
    async (chat) => {
      if (!chat || chat.type !== "person" || !chat.id) return;

      const chatKey = String(chat.id);
      const requestClearVersion = chatClearVersionsRef.current.get(chatKey) || 0;

      loadedChatHistoryRef.current.add(chatKey);
      clearUnreadForChat({
        chatId: chat.chatId,
        userId: chat.id,
        email: chat.subtitle || getBuddyEmail(chat.raw),
      });

      try {
        const openResponse = await openDirectChatService(chat.id);
        const chatId = getConversationIdFromResponse(openResponse);

        if (!chatId) return;

        setSelectedChat((prev) => (prev?.id === chat.id ? { ...prev, chatId } : prev));
        await markChatAsRead({
          chatId,
          userId: chat.id,
          email: chat.subtitle || getBuddyEmail(chat.raw),
        });
        const messagesResponse = await getChatMessagesService(chatId);
        // Loading history also updates the participant's lastReadAt in the
        // database. Fetch the conversation list once more so the badge reflects
        // that persisted state, even if an earlier refresh was still in flight.
        await markChatAsRead({ chatId });
        if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) return;
        const normalizedMessages = filterBlockedMessages(
          normalizeChatMessages(messagesResponse.data?.data, chat),
        );

        setMessagesByChat((prev) => ({
          ...prev,
          [chat.id]: normalizedMessages,
        }));
        setMessagePaginationByChat((prev) => ({
          ...prev,
          [chat.id]: messagesResponse.data?.data?.pagination || { hasMore: false },
        }));
      } catch (error) {
        setSendError(normalizeChatError(error));
      }
    },
    [clearUnreadForChat, filterBlockedMessages, markChatAsRead],
  );

  const loadChannelHistory = useCallback(
    async (chat) => {
      if (!chat || chat.type !== "channel" || !chat.id) return;

      const chatKey = String(chat.id);
      const requestClearVersion = chatClearVersionsRef.current.get(chatKey) || 0;

      loadedChatHistoryRef.current.add(chatKey);

      try {
        await markChatAsRead({ chatId: chat.id });
        const messagesResponse = await getChatMessagesService(chat.id);
        await markChatAsRead({ chatId: chat.id });
        if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) return;
        const normalizedMessages = filterBlockedMessages(
          normalizeChatMessages(messagesResponse.data?.data, chat),
        );

        setMessagesByChat((prev) => ({
          ...prev,
          [chat.id]: normalizedMessages,
        }));
        setMessagePaginationByChat((prev) => ({
          ...prev,
          [chat.id]: messagesResponse.data?.data?.pagination || { hasMore: false },
        }));
      } catch (error) {
        setSendError(normalizeChatError(error));
      }
    },
    [filterBlockedMessages, markChatAsRead],
  );

  const loadOlderMessages = useCallback(async () => {
    if (!selectedChat || loadingOlderMessages) return;

    const chatKey = selectedChat.id;
    const pagination = messagePaginationByChat[chatKey];
    if (!pagination?.hasMore || !pagination.nextCursor) return;

    const chatId = selectedChat.chatId || selectedChat.id;
    const previousHeight = chatBoxRef.current?.scrollHeight || 0;
    setLoadingOlderMessages(true);

    try {
      const response = await getChatMessagesService(chatId, {
        limit: 50,
        before: pagination.nextCursor,
      });
      const payload = response.data?.data;
      const olderMessages = filterBlockedMessages(normalizeChatMessages(payload, selectedChat));

      setMessagesByChat((prev) => {
        const existing = prev[chatKey] || [];
        const existingIds = new Set(existing.map((message) => String(message.id)));
        const uniqueOlder = olderMessages.filter((message) => !existingIds.has(String(message.id)));
        return { ...prev, [chatKey]: [...uniqueOlder, ...existing] };
      });
      setMessagePaginationByChat((prev) => ({
        ...prev,
        [chatKey]: payload?.pagination || { hasMore: false },
      }));

      requestAnimationFrame(() => {
        if (chatBoxRef.current) {
          chatBoxRef.current.scrollTop += chatBoxRef.current.scrollHeight - previousHeight;
        }
      });
    } catch (error) {
      setSendError(normalizeChatError(error));
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [
    chatBoxRef,
    filterBlockedMessages,
    loadingOlderMessages,
    messagePaginationByChat,
    selectedChat,
  ]);

  const fetchChatData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [buddyResponse, channelResponse, statusResponse, settingsResponse] = await Promise.all([
        getChatUsersService({ excludeSelf: true }),
        getChatConversationsService(),
        getChatStatusService().catch(() => null),
        getChatSettingsService().catch(() => null),
      ]);

      const persistedSettings = settingsResponse?.data?.data || settingsResponse?.data || {};
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
      const chatUsers = getArrayPayload(buddyResponse.data?.data ?? buddyResponse.data);
      const chatConversations = getArrayPayload(channelResponse.data?.data ?? channelResponse.data);
      if (import.meta.env.DEV) {
        console.groupCollapsed("[Pingly chat] conversation sources");
        console.log("GET /api/v1/chat/users", chatUsers);
        console.log("GET /api/v1/chat/conversations", chatConversations);
        console.groupEnd();
      }
      const otherChatUsers = chatUsers.filter((user) => !isCurrentUserRecord(user));
      const otherConversations = chatConversations.filter(
        (conversation) => !isSelfConversation(conversation),
      );
      setBuddies(chatUsers);
      setChannels(chatConversations);
      const statusPayload = statusResponse?.data?.data || statusResponse?.data || {};
      const backendUser = statusPayload.user || statusPayload;
      const savedPresence = localStorage.getItem("chat_presence");
      const serverPresence = backendUser?.presence || backendUser?.status;
      const restoredPresence =
        savedPresence && savedPresence !== "online" && serverPresence === "online"
          ? savedPresence
          : serverPresence || savedPresence || "online";
      setCurrentStatus(restoredPresence);
      if (savedPresence && savedPresence !== "online" && serverPresence !== savedPresence) {
        updateChatStatusService(savedPresence).catch(() => {});
      }
      if (backendUser) {
        setProfileUser((prev) => {
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
          (participant) => !isCurrentUserRecord(participant),
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
            (participant) => !isCurrentUserRecord(participant),
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
          setChannels((previousChannels) =>
            previousChannels.map((conversation) =>
              String(getChannelId(conversation)) === String(restoredChannelId)
                ? { ...conversation, unreadCount: 0, unread_count: 0 }
                : conversation,
            ),
          );
          markConversationReadService(restoredChannelId).catch(() => {});
          setTab("conversations");
        }
      } else if (!id && !selectedChat) {
        const firstBuddy = otherChatUsers.find((user) => getBuddySendId(user));
        const firstChannel = otherConversations.find((conversation) => getChannelId(conversation));

        if (firstBuddy) {
          setSelectedChat({
            type: "person",
            source: "local",
            id: getBuddySendId(firstBuddy),
            chatId:
              firstBuddy.directConversationId || firstBuddy.chat_id || firstBuddy.chatId || null,
            title: getBuddyName(firstBuddy),
            subtitle: getBuddyEmail(firstBuddy),
            imageUrl: getImageUrl(firstBuddy),
            currentUserId,
            raw: firstBuddy,
          });
        } else if (firstChannel) {
          const firstChannelId = getChannelId(firstChannel);
          setSelectedChat({
            type: "channel",
            source: "local",
            id: firstChannelId,
            title: getChannelName(firstChannel),
            subtitle: firstChannelId,
            imageUrl: getImageUrl(firstChannel),
            currentUserId,
            raw: firstChannel,
          });
        }
      }
    } catch (error) {
      setLoadError(normalizeChatError(error));
    } finally {
      setLoading(false);
    }
  }, [currentUserId, id, isCurrentUserRecord, isSelfConversation, selectedChat]);

  useEffect(() => {
    if (initialFetchStartedRef.current) return;

    initialFetchStartedRef.current = true;
    fetchChatData();
  }, [fetchChatData]);

  useEffect(() => {
    if (
      selectedChat?.type === "person" &&
      selectedChat.id &&
      !loadedChatHistoryRef.current.has(selectedChat.id)
    ) {
      loadDirectChatHistory(selectedChat);
    }
  }, [loadDirectChatHistory, selectedChat]);

  useEffect(() => {
    if (
      selectedChat?.type === "channel" &&
      selectedChat.id &&
      !loadedChatHistoryRef.current.has(selectedChat.id)
    ) {
      loadChannelHistory(selectedChat);
    }
  }, [loadChannelHistory, selectedChat]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messagesByChat, selectedChat]);

  useEffect(() => {
    setPendingFiles([]);
    setReplyToMessage(null);
    setEditingMessage(null);
  }, [selectedChat?.id]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return conversationItems.filter((item) => {
      const isChannel = item.__conversationType === "channel";
      const name = isChannel ? getChannelName(item) : getBuddyName(item);
      const secondary = isChannel ? getChannelId(item) : getBuddyEmail(item);
      return !term || name.toLowerCase().includes(term) || secondary.toLowerCase().includes(term);
    });
  }, [conversationItems, searchTerm]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.groupCollapsed("[Pingly chat] rendered conversation list");
    console.table(
      filteredItems.map((item) => ({
        tab: item.__conversationType === "channel" ? "Groups" : "Chats",
        name: item.__conversationType === "channel" ? getChannelName(item) : getBuddyName(item),
        id: item.__conversationType === "channel" ? getChannelId(item) : getBuddySendId(item),
        conversationId: item.directConversationId || item.chatId || item.chat_id || item.id,
        lastActivity:
          item.lastMessageAt || item.lastMessage?.createdAt || item.lastMessageTime || "",
      })),
    );
    console.groupEnd();
  }, [filteredItems]);

  const currentMessages = selectedChat ? messagesByChat[selectedChat.id] || [] : [];
  const activeCallIsAccepted = activeCall?.status === "accepted";

  useEffect(() => {
    if (activeCall?.id) setCallMinimized(false);
  }, [activeCall?.id]);

  const selectBuddy = async (buddy) => {
    const email = getBuddyEmail(buddy);
    const sendId = getBuddySendId(buddy);
    if (!sendId) return;

    let directConversationId = buddy?.directConversationId || buddy?.chat_id || buddy?.chatId;
    if (!directConversationId) {
      try {
        const response = await openDirectChatService(sendId);
        directConversationId = getConversationIdFromResponse(response);
      } catch (error) {
        setSendError(normalizeChatError(error));
        return;
      }
    }

    const chat = {
      type: "person",
      source: "local",
      id: sendId,
      chatId: directConversationId || null,
      title: getBuddyName(buddy),
      subtitle: email,
      raw: buddy,
      imageUrl: getImageUrl(buddy),
      currentUserId,
    };

    setSelectedChat(chat);
    setSendError("");
    loadedChatHistoryRef.current.delete(sendId);
    clearUnreadForChat({ chatId: directConversationId, userId: sendId, email });
    if (directConversationId) {
      markChatAsRead({ chatId: directConversationId, userId: sendId, email }).catch(() => {});
    }
    navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(directConversationId || sendId)}`);
  };

  const selectChannel = (channel) => {
    const channelId = getChannelId(channel);
    if (!channelId) return;

    const chat = {
      type: "channel",
      source: "local",
      id: channelId,
      title: getChannelName(channel),
      subtitle: channelId,
      raw: channel,
      imageUrl: getImageUrl(channel),
      currentUserId,
    };

    setSelectedChat(chat);
    setSendError("");
    loadedChatHistoryRef.current.delete(channelId);
    clearUnreadForChat({ chatId: channelId });
    markChatAsRead({ chatId: channelId }).catch(() => {});
    navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(channelId)}`);
  };

  const toggleGroupUser = (userId) => {
    setGroupUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((selectedId) => selectedId !== userId)
        : [...prev, userId],
    );
  };

  const handleCreateGroup = async () => {
    if (creatingGroup) return;
    if (!groupTitle.trim()) {
      setGroupError("Enter a group name.");
      return;
    }
    if (groupUserIds.length === 0) {
      setGroupError("Select at least one person.");
      return;
    }

    setCreatingGroup(true);
    setGroupError("");

    try {
      const response = await createGroupChatService({
        title: groupTitle.trim(),
        userIds: groupUserIds,
      });
      const conversation = response.data?.data;
      const channelId = getChannelId(conversation);

      setChannels((prev) => [conversation, ...prev]);
      setSelectedChat({
        type: "channel",
        source: "local",
        id: channelId,
        title: getChannelName(conversation),
        subtitle: channelId,
        raw: conversation,
        imageUrl: getImageUrl(conversation),
        currentUserId,
      });
      setTab("conversations");
      setGroupDialogOpen(false);

      if (channelId) {
        navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(channelId)}`);
      }
    } catch (error) {
      setGroupError(normalizeChatError(error));
    } finally {
      setCreatingGroup(false);
    }
  };

  const groupMembers = useMemo(
    () =>
      allVisibleBuddies.filter((buddy) => {
        const search = groupSearch.trim().toLowerCase();
        if (!search) return true;
        return `${getBuddyName(buddy)} ${getBuddyEmail(buddy)}`.toLowerCase().includes(search);
      }),
    [allVisibleBuddies, groupSearch],
  );

  const selectedGroupMembers = useMemo(
    () => allVisibleBuddies.filter((buddy) => groupUserIds.includes(String(getBuddySendId(buddy)))),
    [allVisibleBuddies, groupUserIds],
  );

  const selectedGroupParticipantIds = useMemo(() => {
    const participants = Array.isArray(selectedChat?.raw?.participants)
      ? selectedChat.raw.participants
      : [];

    return new Set(
      participants.map((participant) => String(getBuddySendId(participant) || "")).filter(Boolean),
    );
  }, [selectedChat]);

  const addableGroupMembers = useMemo(
    () =>
      allVisibleBuddies.filter(
        (buddy) => !selectedGroupParticipantIds.has(String(getBuddySendId(buddy))),
      ),
    [allVisibleBuddies, selectedGroupParticipantIds],
  );
  const selectedMentionableUsers = useMemo(() => {
    if (!selectedChat) return [];

    if (selectedChat.type !== "channel") {
      return selectedChat.raw ? [selectedChat.raw] : [];
    }

    const participants = Array.isArray(selectedChat.raw?.participants)
      ? selectedChat.raw.participants
      : [];
    const participantIds = new Set(
      participants.map((participant) => String(getBuddySendId(participant) || "")).filter(Boolean),
    );

    return uniqueUsersByIdentity(
      allVisibleBuddies.filter((user) => participantIds.has(String(getBuddySendId(user)))),
    );
  }, [allVisibleBuddies, selectedChat, uniqueUsersByIdentity]);

  const openAddMembersDialog = () => {
    setAddMemberUserIds([]);
    setAddMembersError("");
    setAddMembersDialogOpen(true);
  };

  const toggleAddMemberUser = (userId) => {
    setAddMemberUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((selectedId) => selectedId !== userId)
        : [...prev, userId],
    );
  };

  const handleAddGroupMembers = async () => {
    if (!selectedChat || selectedChat.type !== "channel" || addingMembers) return;
    if (addMemberUserIds.length === 0) {
      setAddMembersError("Select at least one person.");
      return;
    }

    setAddingMembers(true);
    setAddMembersError("");

    try {
      const response = await addGroupMembersService(selectedChat.id, addMemberUserIds);
      const updatedConversation =
        response.data?.data?.conversation || response.data?.data || selectedChat.raw;

      setChannels((prev) =>
        prev.map((channel) =>
          getChannelId(channel) === selectedChat.id ? updatedConversation : channel,
        ),
      );
      setSelectedChat((prev) =>
        prev?.id === selectedChat.id
          ? {
              ...prev,
              title: getChannelName(updatedConversation),
              raw: updatedConversation,
              imageUrl: getImageUrl(updatedConversation),
            }
          : prev,
      );
      setAddMembersDialogOpen(false);
    } catch (error) {
      setAddMembersError(normalizeChatError(error));
    } finally {
      setAddingMembers(false);
    }
  };

  const handleToggleChatMute = (chatId) => {
    if (!chatId) return;

    setMutedChatIds((prev) => {
      const normalizedChatId = String(chatId);
      const next = prev.includes(normalizedChatId)
        ? prev.filter((id) => id !== normalizedChatId)
        : [...prev, normalizedChatId];

      updateChatSettingsService({ mutedChatIds: next }).catch(() => {
        setSendError("Chat notification setting could not be saved.");
      });
      return next;
    });
  };

  const handleClearChat = async () => {
    if (!selectedChat) return;
    const chatId = selectedChat.chatId || selectedChat.id;
    const confirmed = await requestConfirmation({
      title: "Clear chat?",
      message:
        "Clear all messages from this chat for your account? Other participants will keep their history.",
      confirmLabel: "Clear chat",
    });
    if (!confirmed) return;

    try {
      await clearChatHistoryService(chatId);
      const clearedKeys = [
        selectedChat.id,
        selectedChat.chatId,
        selectedChat.raw?.id,
        selectedChat.raw?.chat_id,
        selectedChat.raw?.chatId,
        getChannelId(selectedChat.raw),
      ]
        .filter(Boolean)
        .map(String);
      clearedKeys.forEach((key) => {
        chatClearVersionsRef.current.set(key, (chatClearVersionsRef.current.get(key) || 0) + 1);
      });
      setMessagesByChat((prev) => {
        const next = { ...prev };
        clearedKeys.forEach((key) => {
          next[key] = [];
        });
        return next;
      });
      setMessagePaginationByChat((prev) => ({
        ...prev,
        [selectedChat.id]: { hasMore: false, nextCursor: null },
      }));
      clearUnreadForChat({ chatId, userId: selectedChat.type === "person" ? selectedChat.id : "" });
      setChannels((prev) =>
        prev.map((item) => {
          const itemIds = [item?.id, item?.chat_id, item?.chatId, getChannelId(item)]
            .filter(Boolean)
            .map(String);
          const selectedIds = [selectedChat.id, selectedChat.chatId].filter(Boolean).map(String);
          return itemIds.some((itemId) => selectedIds.includes(itemId))
            ? {
                ...item,
                lastMessage: null,
                last_message: null,
                lastMessageAt: null,
                last_message_at: null,
              }
            : item;
        }),
      );
      setBuddies((prev) =>
        prev.map((buddy) =>
          selectedChat.type === "person" &&
          String(getBuddySendId(buddy)) === String(selectedChat.id)
            ? {
                ...buddy,
                lastMessage: null,
                last_message: null,
                lastMessageAt: null,
                last_message_at: null,
              }
            : buddy,
        ),
      );
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  const handleLeaveGroup = async (chatId) => {
    if (!chatId) return;

    try {
      await leaveGroupConversationService(chatId);
      setChannels((prev) =>
        prev.filter((channel) => String(getChannelId(channel)) !== String(chatId)),
      );
      setMessagesByChat((prev) => {
        const next = { ...prev };
        delete next[String(chatId)];
        return next;
      });
      setMutedChatIds((prev) => {
        const next = prev.filter((id) => id !== String(chatId));
        updateChatSettingsService({ mutedChatIds: next }).catch(() => {});
        return next;
      });
      setSelectedChat(null);
      navigate(CHAT_APP_BASE_PATH);
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  const handleTransferOwnership = async (chatId, userId) => {
    if (!chatId || !userId) return;

    try {
      await transferGroupOwnershipService(chatId, userId);
      await fetchChatData();
      setSendError("");
    } catch (error) {
      setSendError(normalizeChatError(error));
      throw error;
    }
  };

  const handleRemoveGroupMember = async (chatId, userId) => {
    if (!chatId || !userId) return;
    try {
      await removeGroupMemberService(chatId, userId);
      await fetchChatData();
      setSendError("");
    } catch (error) {
      setSendError(normalizeChatError(error));
      throw error;
    }
  };

  const handleStatusChange = async (presence) => {
    if (statusSaving) return;

    setStatusSaving(true);
    setCurrentStatus(presence);
    localStorage.setItem("chat_presence", presence);

    try {
      const response = await updateChatStatusService(presence);
      const savedUser = response.data?.data || response.data || {};
      setProfileUser((previous) => ({
        ...(previous || {}),
        ...savedUser,
        presence,
        status: presence,
      }));
      if (selectedChat?.type === "channel") {
        clearUnreadForChat({ chatId: selectedChat.id });
      } else if (selectedChat?.type === "person") {
        clearUnreadForChat({
          chatId: selectedChat.chatId,
          userId: selectedChat.id,
          email: selectedChat.subtitle || getBuddyEmail(selectedChat.raw),
        });
      }
    } catch (error) {
      setLoadError(normalizeChatError(error));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file || avatarUploading) return;

    setAvatarUploading(true);
    setLoadError("");

    try {
      const response = await updateChatAvatarService(file);
      // ChatUsersController returns the user DTO directly (not { data: { user } }).
      const updatedUser = response.data?.data?.user || response.data?.data || response.data;
      const nextAvatarUrl = getImageUrl(updatedUser);

      setProfileUser((prev) => {
        const nextUser = {
          ...(prev || {}),
          ...(updatedUser || {}),
          avatarUrl: nextAvatarUrl,
          imageUrl: nextAvatarUrl,
        };
        localStorage.setItem("user", JSON.stringify(nextUser));
        return nextUser;
      });
    } catch (error) {
      // Keep profile uploads usable when S3 is temporarily unreachable.
      if (file.size <= 350_000) {
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const response = await updateChatAvatarUrlService(dataUrl);
          const updatedUser = response.data?.data?.user || response.data?.data || response.data;
          const nextAvatarUrl = getImageUrl(updatedUser);
          setProfileUser((prev) => {
            const nextUser = {
              ...(prev || {}),
              ...(updatedUser || {}),
              avatarUrl: nextAvatarUrl,
              imageUrl: nextAvatarUrl,
            };
            localStorage.setItem("user", JSON.stringify(nextUser));
            return nextUser;
          });
          setLoadError("");
          return;
        } catch (fallbackError) {
          setLoadError(normalizeChatError(fallbackError));
          return;
        }
      }
      setLoadError(normalizeChatError(error));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleStartConversationCall = async (type, options = {}) => {
    if ((!selectedChat && !options.chatId) || callStarting) return;
    if (selectedChat?.type === "person" && blockedUserIds.includes(String(selectedChat.id))) {
      setCallNotice("Unblock this user before starting a call.");
      return;
    }

    setCallStarting(true);
    setSendError("");
    setCallError("");

    try {
      let chatId =
        options.chatId ||
        (selectedChat?.type === "channel" ? selectedChat.id : selectedChat?.chatId);

      if (!chatId && selectedChat?.type === "person") {
        const openResponse = await openDirectChatService(selectedChat.id);
        chatId = getConversationIdFromResponse(openResponse);

        if (chatId) {
          setSelectedChat((prev) => (prev?.id === selectedChat.id ? { ...prev, chatId } : prev));
        }
      }

      if (!chatId) {
        setSendError("Open this conversation before starting a call.");
        return;
      }

      const response = await startConversationCallService(chatId, type);
      const call = response.data?.data;
      if (call?.status === "missed") {
        setActiveCall(null);
        setCallNotice("The user is offline, busy, or in Do Not Disturb. A missed call was saved.");
      } else {
        setActiveCall(call);
      }
    } catch (error) {
      const message = error?.response?.data?.message || normalizeChatError(error);
      const existingCall = error?.response?.data?.details?.call;
      if (existingCall?.id) setActiveCall(existingCall);
      setCallNotice(message);
    } finally {
      setCallStarting(false);
    }
  };

  const handleRespondToCall = async (action) => {
    const chatId =
      incomingCall?.chatId ||
      incomingCall?.chat_id ||
      incomingCall?.conversationId ||
      incomingCall?.conversation_id;
    if (!incomingCall?.id || !chatId || callResponding) return;
    setCallResponding(true);
    setSendError("");
    setCallError("");
    try {
      const response = await respondConversationCallService(chatId, incomingCall.id, action);
      const call = normalizeCall(response.data?.data);
      setIncomingCall(null);
      localStorage.removeItem(PENDING_CALL_STORAGE_KEY);
      if (action === "accept") {
        setActiveCall(call);
      }
    } catch (error) {
      const message = error?.response?.data?.message || normalizeChatError(error);
      setCallError(message);
      setCallNotice(message);
      const code = error?.response?.data?.code;
      if (code === "CHAT_CALL_ALREADY_ANSWERED" || code === "CHAT_CALL_NOT_FOUND") {
        setIncomingCall(null);
      }
    } finally {
      setCallResponding(false);
    }
  };

  const handleEndActiveCall = async () => {
    if (!activeCall?.id || !activeCall?.chatId) {
      setActiveCall(null);
      setCallMinimized(false);
      return;
    }

    try {
      await endConversationCallService(activeCall.chatId, activeCall.id);
    } catch (error) {
      setCallNotice(normalizeChatError(error));
    } finally {
      setActiveCall(null);
      setCallMinimized(false);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length || !selectedChat || uploading || sending) return;

    setPendingFiles((prev) => [...prev, ...files]);
    setSendError("");
  };

  const removePendingFile = (fileIndex) => {
    setPendingFiles((prev) => prev.filter((_, index) => index !== fileIndex));
  };

  const handleVoiceMessage = (file) => {
    if (!file || !selectedChat) return;
    setPendingFiles((previous) => [...previous, file]);
    setSendError("");
  };

  const refreshSelectedChatMessages = async (chatId) => {
    if (!chatId || !selectedChat) return;

    const messagesResponse = await getChatMessagesService(chatId);
    setMessagesByChat((prev) => ({
      ...prev,
      [selectedChat.id]: filterBlockedMessages(
        normalizeChatMessages(messagesResponse.data?.data, selectedChat),
      ),
    }));
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    const filesToSend = pendingFiles;
    if ((!text && filesToSend.length === 0) || !selectedChat || sending) return;
    if (selectedChat.type === "person" && blockedUserIds.includes(String(selectedChat.id))) {
      setSendError("Unblock this user before sending messages.");
      return;
    }
    const mentionedUsers = uniqueUsersByIdentity(selectedMentionableUsers)
      .filter((buddy) => {
        const name = getBuddyName(buddy);
        const email = getBuddyEmail(buddy);
        return textContainsMention(text, name) || textContainsMention(text, email);
      })
      .map((buddy) => ({
        userId: String(getBuddySendId(buddy)),
        displayName: getBuddyName(buddy),
        email: getBuddyEmail(buddy),
      }));
    const messageOptions = {
      ...(mentionedUsers.length ? { metadata: { mentions: mentionedUsers } } : {}),
      ...(replyToMessage?.id ? { replyTo: replyToMessage.id } : {}),
    };

    setSending(true);
    setUploading(filesToSend.length > 0);
    setSendError("");

    try {
      let chatId = selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;

      if (editingMessage) {
        if (!chatId || !text || filesToSend.length > 0) return;
        await editConversationMessageService(chatId, editingMessage.id, text);
        await refreshSelectedChatMessages(chatId);
        setInputValue("");
        setEditingMessage(null);
        setReplyToMessage(null);
        return;
      }

      if (selectedChat.type === "channel") {
        if (text) {
          await sendConversationMessageService(selectedChat.id, text, messageOptions);
        }
      } else if (text) {
        const response = chatId
          ? await sendConversationMessageService(chatId, text, messageOptions)
          : await sendDirectMessageService(selectedChat.id, text, messageOptions);
        const data = response.data?.data || {};
        chatId = data?.chatId || data?.chat?.chat_id || data?.chat?.data?.chat_id || chatId || null;

        if (chatId) {
          setSelectedChat((prev) => (prev?.id === selectedChat.id ? { ...prev, chatId } : prev));
        }
      } else if (!chatId) {
        const openResponse = await openDirectChatService(selectedChat.id);
        chatId = getConversationIdFromResponse(openResponse);

        if (chatId) {
          setSelectedChat((prev) => (prev?.id === selectedChat.id ? { ...prev, chatId } : prev));
        }
      }

      if (filesToSend.length > 0 && chatId) {
        await Promise.all(filesToSend.map((file) => shareConversationFileService(chatId, file)));
      }

      if (chatId) {
        await refreshSelectedChatMessages(chatId);
        // A newly created direct conversation is not present in the initial
        // sidebar snapshot. Reconcile the conversation list after the first
        // message so it immediately appears under Chats.
        const conversationResponse = await getChatConversationsService();
        const refreshedConversations = getArrayPayload(
          conversationResponse.data?.data ?? conversationResponse.data,
        );
        setChannels(() => {
          const conversations = [...refreshedConversations];
          if (selectedChat.type !== "person") return conversations;

          const conversationKey = String(chatId);
          const alreadyPresent = conversations.some(
            (conversation) =>
              String(conversation?.id || conversation?.chatId || conversation?.chat_id || "") ===
              conversationKey,
          );
          if (alreadyPresent) return conversations;

          const peer = selectedChat.raw || selectedChat;
          conversations.push({
            id: chatId,
            chat_id: chatId,
            chatId,
            type: "direct",
            isDirect: true,
            participants: [currentUser, peer].filter(Boolean),
            lastMessageAt: new Date().toISOString(),
            lastMessage: {
              id: `local-${Date.now()}`,
              conversationId: chatId,
              text,
              createdAt: new Date().toISOString(),
              sender: currentUser,
            },
          });
          return conversations;
        });
      }

      setInputValue("");
      setPendingFiles([]);
      setReplyToMessage(null);
      setEditingMessage(null);
    } catch (error) {
      setSendError(normalizeChatError(error));
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleEnterToSendChange = (enabled) => {
    setEnterToSend(enabled);
    localStorage.setItem("chat_enter_to_send", String(enabled));
    updateChatSettingsService({ enterToSend: enabled }).catch(() => {
      setSendError("Enter-to-send setting could not be saved.");
    });
  };

  const handleReaction = async (messageId, emoji) => {
    if (!selectedChat || !messageId || !emoji) return;
    const targetMessage = (messagesByChat[selectedChat.id] || []).find(
      (message) => String(message.id) === String(messageId),
    );
    if (targetMessage?.direction === "outbound") return;

    const chatId = selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;

    if (!chatId) return;

    const existingReaction = (messagesByChat[selectedChat.id] || [])
      .find((message) => String(message.id) === String(messageId))
      ?.reactions?.find((reaction) => reaction.emoji === emoji && reaction.reacted);

    try {
      if (existingReaction) {
        await removeMessageReactionService(chatId, messageId, emoji);
      } else {
        await addMessageReactionService(chatId, messageId, emoji);
      }
    } catch (error) {
      setSendError(normalizeChatError(error));
      return;
    }

    await refreshSelectedChatMessages(chatId);
  };

  const handleReplyToMessage = (message) => {
    setEditingMessage(null);
    setReplyToMessage(message);
  };

  const handleEditMessage = (message) => {
    if (message?.direction !== "outbound") return;
    const messageAge = Date.now() - new Date(message.sentAt).getTime();
    if (!Number.isFinite(messageAge) || messageAge < 0 || messageAge > 10 * 60 * 1000) {
      setSendError("Messages can only be edited within 10 minutes.");
      return;
    }
    setReplyToMessage(null);
    setEditingMessage(message);
    setInputValue(message.text || "");
  };

  const handlePinMessage = async (message) => {
    if (!selectedChat || !message?.id) return;

    const chatId = selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;

    if (!chatId) {
      setSendError("Open this conversation before pinning a message.");
      return;
    }

    const pinned = !message.metadata?.pinned;

    try {
      const response = await pinConversationMessageService(chatId, message.id, pinned);
      const updatedMessage = normalizeRealtimeMessage(response.data?.data, {
        ...selectedChat,
        currentUserId,
      });

      if (!updatedMessage) return;

      setMessagesByChat((prev) => ({
        ...prev,
        [selectedChat.id]: (prev[selectedChat.id] || []).map((item) =>
          String(item.id) === String(updatedMessage.id) ? { ...item, ...updatedMessage } : item,
        ),
      }));
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  const handleDeleteMessages = async (messages = []) => {
    const messageList = Array.isArray(messages)
      ? messages
      : messages && typeof messages === "object"
        ? [messages]
        : [];

    if (!selectedChat || messageList.length === 0) return false;
    const chatId = selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;
    // Message IDs can come from REST, realtime events, or optimistic state.
    // Keep them as strings so the request and local state use the same key.
    const messageIds = messageList
      .map((message) => message?.id)
      .filter((messageId) => messageId !== null && messageId !== undefined && messageId !== "")
      .map(String);
    if (!chatId || messageIds.length === 0) return false;
    const confirmed = await requestConfirmation({
      title: messageIds.length === 1 ? "Delete message?" : "Delete messages?",
      message: `Delete ${messageIds.length === 1 ? "this message" : `${messageIds.length} messages`}? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!confirmed) return false;

    try {
      const results = await Promise.allSettled(
        messageIds.map((messageId) => deleteConversationMessageService(chatId, messageId)),
      );
      const successfulIds = new Set();
      const deletedById = new Map();

      results.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const messageId = messageIds[index];
        successfulIds.add(messageId);
        const deletedMessage = normalizeRealtimeMessage(result.value.data?.data, {
          ...selectedChat,
          currentUserId,
        });
        if (deletedMessage) deletedById.set(String(deletedMessage.id), deletedMessage);
      });

      if (successfulIds.size === 0) {
        throw (
          results.find((result) => result.status === "rejected")?.reason ||
          new Error("Messages could not be deleted")
        );
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [selectedChat.id]: (prev[selectedChat.id] || []).map((message) =>
          successfulIds.has(String(message.id))
            ? deletedById.get(String(message.id)) || {
                ...message,
                text: "This message was deleted",
                deletedAt: new Date().toISOString(),
                edited: false,
              }
            : message,
        ),
      }));

      if (successfulIds.size !== messageIds.length) {
        setSendError(`${messageIds.length - successfulIds.size} message(s) could not be deleted.`);
      }
      return true;
    } catch (error) {
      setSendError(normalizeChatError(error));
      return false;
    }
  };

  const handleBlockUser = async (message) => {
    const userId = message?.authorId;
    if (!userId) return;
    const isBlocked = blockedUserIds.includes(String(userId));
    const confirmed = await requestConfirmation({
      title: isBlocked ? "Unblock user?" : "Block user?",
      message: isBlocked
        ? "Allow messages from this user again?"
        : "You will no longer receive messages from this user.",
      confirmLabel: isBlocked ? "Unblock" : "Block",
    });
    if (!confirmed) return;

    try {
      setBlockedUserIds((prev) => {
        const next = isBlocked
          ? prev.filter((id) => id !== String(userId))
          : [...prev, String(userId)];
        updateChatSettingsService({ blockedUserIds: next }).catch(() => {
          setSendError("Blocked-user setting could not be saved.");
        });
        return next;
      });
      if (!isBlocked) {
        setMessagesByChat((prev) =>
          Object.fromEntries(
            Object.entries(prev).map(([chatKey, messages]) => [
              chatKey,
              messages.filter((item) => String(item.authorId) !== String(userId)),
            ]),
          ),
        );
      }
      setSendError(isBlocked ? "User unblocked." : "User blocked.");
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  const handleCopyMessage = async (message) => {
    const text = String(message?.text || "").trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setSendError("Message copied.");
    } catch {
      setSendError("Unable to copy message.");
    }
  };

  const handleCancelComposerMode = () => {
    setReplyToMessage(null);
    setEditingMessage(null);
    setInputValue("");
  };

  const handleForwardMessage = async (message, target) => {
    const text = String(message?.text || "").trim();
    if (!text || !target) return;

    const isChannelTarget = target.__conversationType === "channel";
    const targetChatId = isChannelTarget
      ? getChannelId(target)
      : target.directConversationId || target.chat_id || target.chatId;

    try {
      if (isChannelTarget || targetChatId) {
        await sendConversationMessageService(targetChatId, text, {
          metadata: { forwardedFrom: message.id },
        });
      } else {
        await sendDirectMessageService(getBuddySendId(target), text, {
          metadata: { forwardedFrom: message.id },
        });
      }
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  return (
    <>
      <div
        className={`chat-shell grid w-full min-w-0 overflow-hidden bg-background text-foreground ${
          standalone
            ? "h-[100dvh] min-h-[100dvh]"
            : "h-[calc(100dvh-48px)] min-h-0 md:min-h-[620px]"
        } ${showConversationSidebar ? "grid-cols-1 sm:grid-cols-[280px_minmax(0,1fr)] md:grid-cols-[320px_minmax(0,1fr)]" : "grid-cols-1"}`}
      >
        {showConversationSidebar && (
          <ChatSidebar
            avatarUploading={avatarUploading}
            currentStatus={currentStatus}
            enterToSend={enterToSend}
            mentionNotifications={mentionNotifications}
            onMentionNotificationsChange={setMentionNotifications}
            onEnterToSendChange={handleEnterToSendChange}
            filteredItems={filteredItems}
            loadError={loadError}
            loading={loading}
            onAvatarUpload={handleAvatarUpload}
            settingsPage={settingsPage}
            onSettingsClose={() => navigate(CHAT_APP_BASE_PATH)}
            onRefresh={fetchChatData}
            onSelectBuddy={selectBuddy}
            onSelectChannel={selectChannel}
            onStatusChange={handleStatusChange}
            searchTerm={searchTerm}
            selectedChat={selectedChat}
            statusSaving={statusSaving}
            currentUser={currentUser}
            setSearchTerm={setSearchTerm}
          />
        )}
        {adminPage ? (
          <AdminPage embedded />
        ) : groupPage ? (
          <GroupCreationPage
            onClose={() => navigate(CHAT_APP_BASE_PATH)}
            onCreate={handleCreateGroup}
            onSearchChange={setGroupSearch}
            onSelectMember={toggleGroupUser}
            members={groupMembers}
            selectedMembers={selectedGroupMembers}
            search={groupSearch}
            title={groupTitle}
            error={groupError}
            onTitleChange={setGroupTitle}
            creating={creatingGroup}
          />
        ) : bodyView !== "conversations" ? (
          <ChatBodyPanels
            view={bodyView}
            notes={notes}
            libraryMessages={libraryMessages}
            libraryLoading={libraryLoading}
            libraryError={libraryError}
            callStarting={callStarting || Boolean(activeCall) || Boolean(incomingCall)}
            onBack={() => navigate(CHAT_APP_BASE_PATH)}
            onCloseNotes={() => navigate(CHAT_APP_BASE_PATH)}
            onSaveNote={saveNote}
            onDeleteNote={deleteNote}
            onStartCallFromHistory={({ chatId, type }) =>
              handleStartConversationCall(type === "video" ? "video" : "audio", { chatId })
            }
          />
        ) : (
          <ChatWindow
            activeCall={activeCallIsAccepted ? null : activeCall}
            callSocketRef={callSocketRef}
            chatBoxRef={chatBoxRef}
            callStarting={callStarting || Boolean(activeCall) || Boolean(incomingCall)}
            availableChats={conversationItems}
            currentUser={currentUser}
            messageInfoVersions={messageInfoVersions}
            editingMessage={editingMessage}
            enterToSend={enterToSend}
            currentMessages={currentMessages}
            typingUser={typingUsersByChat[String(selectedChat?.chatId || selectedChat?.id)]}
            onTyping={(typing) =>
              callSocketRef.current?.emit("typing:update", {
                chatId: selectedChat?.chatId || selectedChat?.id,
                typing,
              })
            }
            hasOlderMessages={Boolean(messagePaginationByChat[selectedChat?.id]?.hasMore)}
            loadingOlderMessages={loadingOlderMessages}
            onLoadOlderMessages={loadOlderMessages}
            handleFileUpload={handleFileUpload}
            onVoiceMessage={handleVoiceMessage}
            handleCancelComposerMode={handleCancelComposerMode}
            handleEditMessage={handleEditMessage}
            handleForwardMessage={handleForwardMessage}
            handlePinMessage={handlePinMessage}
            handleDeleteMessages={handleDeleteMessages}
            handleBlockUser={handleBlockUser}
            blockedUserIds={blockedUserIds}
            handleCopyMessage={handleCopyMessage}
            handleReaction={handleReaction}
            handleReplyToMessage={handleReplyToMessage}
            handleSend={handleSend}
            onEndActiveCall={handleEndActiveCall}
            onLeaveGroup={handleLeaveGroup}
            onTransferOwnership={handleTransferOwnership}
            onRemoveGroupMember={handleRemoveGroupMember}
            inputValue={inputValue}
            mutedGroupIds={mutedChatIds}
            mentionableUsers={selectedMentionableUsers}
            pendingFiles={pendingFiles}
            removePendingFile={removePendingFile}
            selectedChat={selectedChat}
            sendError={sendError}
            sending={sending}
            replyToMessage={replyToMessage}
            onStartConversationCall={handleStartConversationCall}
            onOpenAddMembers={openAddMembersDialog}
            onToggleGroupMute={handleToggleChatMute}
            onClearChat={handleClearChat}
            setInputValue={setInputValue}
            setSelectedChat={setSelectedChat}
            uploading={uploading}
          />
        )}
      </div>
      <IncomingCallDialog
        call={incomingCall}
        error={callError}
        responding={callResponding}
        onAccept={() => handleRespondToCall("accept")}
        onDecline={() => handleRespondToCall("decline")}
      />
      <ChatCallOverlay
        activeCall={activeCall}
        accepted={activeCallIsAccepted}
        minimized={callMinimized}
        onMinimize={() => setCallMinimized(true)}
        onRestore={() => setCallMinimized(false)}
        onEnd={handleEndActiveCall}
      />
      <ChatNotice message={callNotice} onClose={() => setCallNotice("")} />
      <ChatConfirmationDialog
        dialog={confirmationDialog}
        onClose={() => closeConfirmation(false)}
        onConfirm={() => closeConfirmation(true)}
      />
      <GroupCreationDialog
        open={groupDialogOpen}
        page={groupPage}
        onClose={() => {
          setGroupDialogOpen(false);
          if (groupPage) navigate(CHAT_APP_BASE_PATH);
        }}
        onCreate={handleCreateGroup}
        onSearchChange={setGroupSearch}
        onSelectMember={toggleGroupUser}
        onTitleChange={setGroupTitle}
        members={groupMembers}
        selectedMembers={selectedGroupMembers}
        search={groupSearch}
        title={groupTitle}
        error={groupError}
        creating={creatingGroup}
      />
      <AddMembersDialog
        open={addMembersDialogOpen}
        onClose={() => setAddMembersDialogOpen(false)}
        onAdd={handleAddGroupMembers}
        onSelect={toggleAddMemberUser}
        members={addableGroupMembers}
        selectedIds={addMemberUserIds}
        error={addMembersError}
        adding={addingMembers}
      />
    </>
  );
}
