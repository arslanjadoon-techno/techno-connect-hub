import { useCallback, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { ChatBodyView } from "./ChatBodyPanels";
// import {
//   getBuddyEmail,
//   getBuddyName,
//   getBuddySendId,
//   getChannelId,
//   getChannelName,
// } from "./chatHealper";
import { useChatComposer } from "./useChatComposer";
import { useChatMessageHistory } from "./useChatMessageHistory";
import { useChatMessageList } from "./useChatMessageList";
import { useChatMessageActions } from "./useChatMessageActions";
import { useChatGroupActions } from "./useChatGroupActions";
import { useChatNotes } from "./useChatNotes";
import { useChatLibrary } from "./useChatLibrary";
import { useChatSend } from "./useChatSend";
import { useChatData } from "./useChatData";
import { useChatCallActions } from "./useChatCallActions";
import { useChatSelection } from "./useChatSelection";
import { useChatGroupComposer } from "./useChatGroupComposer";
import { useChatDeleteMessages } from "./useChatDeleteMessages";
import { useChatRuntime } from "./useChatRuntime";
import { useChatLifecycle } from "./useChatLifecycle";
import { useChatConfirmation } from "./useChatConfirmation";
import { useChatModeration } from "./useChatModeration";
import { useChatPageState } from "./useChatPageState";
import ChatSystemView from "./ChatSystemView";
import { useCallTone } from "./calls/useCallTone";
import { canRequestOtp } from "@/lib/otp-access";
import { useAuth } from "@/lib/auth";
const CALLS_ENABLED = false;
type ChatState = Record<string, any> | null;
export default function ChatSystem({ standalone = false, adminPage = false }) {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const groupPage = location.pathname.endsWith("/groups/new");
  const bodyView: ChatBodyView = location.pathname.endsWith("/calls")
    ? "calls"
    : location.pathname.endsWith("/media")
      ? "media"
      : location.pathname.endsWith("/notes")
        ? "notes"
        : "conversations";
  const showConversationSidebar = bodyView === "conversations" && !groupPage;
  const routeParams = useParams();
  const wildcardSegments = String(routeParams["*"] || "")
    .split("/")
    .filter(Boolean);
  const wildcardId = wildcardSegments[0];
  const nonConversationSegments = new Set(["calls", "media", "notes", "groups"]);
  const id =
    routeParams.id ||
    (wildcardId && !nonConversationSegments.has(wildcardId.toLowerCase()) ? wildcardId : undefined);
  const pageState = useChatPageState();
  const pendingSendRetryRef = useRef<((clientMessageId: string) => Promise<void>) | null>(null);
  const {
    activeCall,
    addMemberUserIds,
    addMembersDialogOpen,
    addMembersError,
    addingMembers,
    buddies,
    callError,
    callMinimized,
    callNotice,
    callResponding,
    callStarting,
    channels,
    chatBoxRef,
    chatClearVersionsRef,
    creatingGroup,
    currentUser,
    currentUserEmail,
    currentUserId,
    groupDialogOpen,
    groupError,
    groupSearch,
    groupTitle,
    groupUserCacheRef,
    groupUserIds,
    handledRealtimeMessageKeysRef,
    initialFetchStartedRef,
    incomingCall,
    libraryError,
    libraryLoading,
    libraryMessages,
    loadError,
    loadedChatHistoryRef,
    loading,
    loadingChatHistoryRef,
    loadingOlderMessages,
    managedUsers,
    managedUsersLoading,
    messageInfoVersions,
    messagePaginationByChat,
    messagesByChat,
    mutedChatIds,
    notes,
    notesError,
    notesLoading,
    profileUser,
    realtimeStartedAtRef,
    searchTerm,
    selectedChat,
    typingUsersByChat,
  } = pageState;

  const handleRealtimeNotification = useCallback((payload: any) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("app:notification", { detail: payload }));
  }, []);
  const {
    setActiveCall,
    setAddMemberUserIds,
    setAddMembersDialogOpen,
    setAddMembersError,
    setAddingMembers,
    setBuddies,
    setCallError,
    setCallMinimized,
    setCallNotice,
    setCallResponding,
    setCallStarting,
    setChannels,
    setCreatingGroup,
    setCurrentStatus,
    setGroupDialogOpen,
    setGroupError,
    setGroupSearch,
    setGroupTitle,
    setGroupUserIds,
    setIncomingCall,
    setLibraryError,
    setLibraryLoading,
    setLibraryMessages,
    setLoadError,
    setLoading,
    setLoadingOlderMessages,
    setManagedUsers,
    setManagedUsersLoading,
    setMentionNotifications,
    setMessageInfoVersions,
    setMessagePaginationByChat,
    setMessagesByChat,
    setMutedChatIds,
    setNotes,
    setNotesError,
    setNotesLoading,
    setProfileUser,
    setSearchTerm,
    setSelectedChat,
    setTab,
    setTypingUsersByChat,
  } = pageState;

  const { refreshSelectedChatMessages } = useChatMessageHistory({
    selectedChat,
    setMessagesByChat,
  });
  const { currentMessages } = useChatMessageList({ selectedChat, messagesByChat });
  const {
    inputValue,
    setInputValue,
    replyToMessage,
    setReplyToMessage,
    editingMessage,
    setEditingMessage,
    pendingFiles,
    setPendingFiles,
    editingSaving,
    setEditingSaving,
    sendError,
    setSendError,
    inputValueRef,
    pendingFilesRef,
    handleFileUpload,
    removePendingFile,
    handleVoiceMessage,
    handleReplyToMessage,
    handleEditMessage,
    handleCancelComposerMode,
  } = useChatComposer();
  const { handleCopyMessage, handleForwardMessage, handlePinMessage, handleReaction } =
    useChatMessageActions({
      selectedChat,
      currentUserId,
      messagesByChat,
      setSendError,
      refreshSelectedChatMessages,
      setMessagesByChat,
    });
  const [confirmationDialog, setConfirmationDialog] = useState<ChatState>(null);
  const confirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  useCallTone(incomingCall ? "incoming" : activeCall?.status === "ringing" ? "outgoing" : null);

  const { closeConfirmation, requestConfirmation } = useChatConfirmation({
    confirmationResolverRef,
    setConfirmationDialog,
  });

  const { blockedUserIds, filterBlockedMessages, handleBlockUser, setBlockedUserIds } =
    useChatModeration({
      requestConfirmation,
      setMessagesByChat,
      setSendError,
    });

  const { saveNote, deleteNote } = useChatNotes({
    bodyView,
    currentUserId,
    notes,
    setNotes,
    setNotesLoading,
    setNotesError,
  });
  useChatLibrary({
    bodyView,
    currentUserId,
    setLibraryLoading,
    setLibraryError,
    setLibraryMessages,
  });
  const {
    allVisibleBuddies,
    activeConversationId,
    conversationItems,
    isCurrentUserRecord,
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
    callSocketRef,
    clearUnreadForChat,
    isSelfConversation,
    loadOlderMessages,
    handleToggleChatMute,
    handleClearChat,
  } = useChatRuntime({
    ...pageState,
    blockedUserIds,
    filterBlockedMessages,
    navigate,
    onNotification: handleRealtimeNotification,
    requestConfirmation,
    pendingSendRetryRef,
    setSendError,
    callsEnabled: CALLS_ENABLED,
  });

  const {
    fetchChatData,
    searchChatUsers,
    loadDirectChatHistory,
    loadChannelHistory,
    userSearchLoading,
  } = useChatData({
    ...pageState,
    clearUnreadForChat,
    id,
    isCurrentUserRecord,
    isSelfConversation,
    setBlockedUserIds,
    setSendError,
  });

  const { handleLeaveGroup, handleDeleteGroup, handleTransferOwnership, handleRemoveGroupMember } =
    useChatGroupActions({
      setChannels,
      setMessagesByChat,
      setMutedChatIds,
      setSelectedChat,
      setSendError,
      navigate,
      fetchChatData,
    });

  const { activeCallIsAccepted, filteredItems } = useChatLifecycle({
    activeCall,
    conversationItems,
    fetchChatData,
    searchChatUsers,
    initialFetchStartedRef,
    loadChannelHistory,
    loadDirectChatHistory,
    loadedChatHistoryRef,
    searchTerm,
    selectedChat,
    routeChatId: id,
    setCallMinimized,
    setEditingMessage,
    setPendingFiles,
    setReplyToMessage,
  });

  const { selectBuddy, selectChannel } = useChatSelection({
    clearUnreadForChat,
    currentUserEmail,
    currentUserId,
    loadedChatHistoryRef,
    navigate,
    setSelectedChat,
    setSendError,
  });

  const {
    addableGroupMembers,
    groupMembers,
    handleAddGroupMembers,
    handleCreateGroup,
    loadMoreManagedUsers,
    managedUsersHasMore,
    openAddMembersDialog,
    selectedGroupMembers,
    selectedGroupParticipantIds,
    selectedMentionableUsers,
    toggleAddMemberUser,
    toggleGroupUser,
  } = useChatGroupComposer({
    ...pageState,
    groupPage,
    allVisibleBuddies,
    isCurrentUserRecord,
    uniqueUsersByIdentity,
    visibleChannels,
    loadChannelHistory,
    navigate,
  });

  const { handleEndActiveCall, handleRespondToCall, handleStartConversationCall } =
    useChatCallActions({
      ...pageState,
      blockedUserIds,
      callsEnabled: CALLS_ENABLED,
      setSendError,
    });

  const { handleSend, uploadProgress, cancelUpload } = useChatSend({
    blockedUserIds,
    currentUser,
    currentUserId,
    editingMessage,
    inputValueRef,
    pendingFilesRef,
    pendingSendRetryRef,
    refreshSelectedChatMessages,
    replyToMessage,
    selectedChat,
    selectedMentionableUsers,
    setEditingMessage,
    setEditingSaving,
    setInputValue,
    setMessagesByChat,
    setPendingFiles,
    setReplyToMessage,
    setSelectedChat,
    setBuddies,
    setChannels,
    setSendError,
    uniqueUsersByIdentity,
  });

  const handleOTPRequest = async (request: {
    type: string;
    amount: number;
    otpCount: number;
    storeId: string;
    storeName: string;
    notes: string;
  }) => {
    if (!canRequestOtp(permissions)) {
      setSendError("You do not have permission to request an OTP.");
      return;
    }

    if (!Number.isInteger(request.otpCount) || request.otpCount < 1 || request.otpCount > 3) {
      setSendError("You can request between 1 and 3 OTPs.");
      return;
    }

    const assignedStores = Array.isArray(currentUser?.stores)
      ? currentUser.stores
          .map((store: Record<string, unknown>) => ({
            id: String(store?.id ?? "").trim(),
            name: String(store?.name ?? "").trim(),
          }))
          .filter((store: { id: string; name: string }) => store.id && store.name)
      : [];
    const fallbackStore = {
      id: String(currentUser?.store?.id ?? currentUser?.storeId ?? "").trim(),
      name: String(
        currentUser?.store?.name || currentUser?.storeName || currentUser?.store_name || "",
      ).trim(),
    };
    const requestedStore =
      assignedStores.find(
        (store) => store.id === request.storeId && store.name === request.storeName.trim(),
      ) ??
      (!assignedStores.length && fallbackStore.id && fallbackStore.name === request.storeName.trim()
        ? fallbackStore
        : null);
    if (!requestedStore) {
      setSendError("Your user account does not have a current store assigned.");
      return;
    }

    const requestTypes: Record<string, string> = {
      "qpay-removal": "QPay removal",
      refund: "Refund",
      "payment-type": "Payment type change",
    };
    const requestType = requestTypes[request.type] || request.type;
    const requesterName =
      currentUser?.name || currentUser?.displayName || currentUser?.fullName || "A team member";
    await handleSend(
      [
        `🔐 OTP Request\n👤 Requested by: ${requesterName}\n📋 Type: ${requestType}\n💰 Amount: $${request.amount.toFixed(2)}\n📝 Reason: ${request.notes}`,
        `OTPs needed: ${request.otpCount}`,
        `🏪 Current store ID: ${requestedStore.id}`,
        `🏪 Current store: ${requestedStore.name}`,
      ].join("\n"),
    );
  };

  const handleDeleteMessages = useChatDeleteMessages({
    currentUserId,
    messagesByChat,
    requestConfirmation,
    selectedChat,
    setMessagesByChat,
    setSendError,
  });

  return (
    <ChatSystemView
      {...{
        addMembersDialogOpen,
        addMemberUserIds,
        addMembersError,
        addableGroupMembers,
        addingMembers,
        activeCall,
        activeCallIsAccepted,
        adminPage,
        bodyView,
        blockedUserIds,
        buddies,
        callError,
        callMinimized,
        callNotice,
        callResponding,
        callSocketRef,
        callStarting,
        callsEnabled: CALLS_ENABLED,
        chatBoxRef,
        closeConfirmation,
        confirmationDialog,
        conversationItems,
        creatingGroup,
        currentMessages,
        currentUser,
        deleteNote,
        editingMessage,
        fetchChatData,
        filteredItems,
        groupDialogOpen,
        groupError,
        groupMembers,
        groupPage,
        groupSearch,
        groupTitle,
        handleAddGroupMembers,
        handleBlockUser,
        handleCancelComposerMode,
        handleClearChat,
        handleCopyMessage,
        handleCreateGroup,
        handleDeleteMessages,
        handleOTPRequest,
        handleEditMessage,
        handleEndActiveCall,
        handleFileUpload,
        handleForwardMessage,
        handleLeaveGroup,
        handleDeleteGroup,
        handlePinMessage,
        handleReaction,
        handleRemoveGroupMember,
        handleReplyToMessage,
        handleRespondToCall,
        handleSend,
        onVoiceError: setSendError,
        uploadProgress,
        cancelUpload,
        handleStartConversationCall,
        openAddMembersDialog,
        handleToggleChatMute,
        handleTransferOwnership,
        handleVoiceMessage,
        hasOlderMessages: Boolean(messagePaginationByChat[selectedChat?.id]?.hasMore),
        inputValue,
        incomingCall,
        libraryError,
        libraryLoading,
        libraryMessages,
        loadError,
        loadOlderMessages,
        loading,
        loadingOlderMessages,
        loadMoreManagedUsers,
        managedUsersLoading,
        managedUsersHasMore,
        messageInfoVersions,
        mutedChatIds,
        navigate,
        notes,
        notesError,
        notesLoading,
        pendingFiles,
        removePendingFile,
        replyToMessage,
        saveNote,
        searchTerm,
        selectBuddy,
        selectChannel,
        selectedChat,
        selectedGroupMembers,
        selectedMentionableUsers,
        sendError,
        editingSaving,
        setAddMembersDialogOpen,
        setGroupDialogOpen,
        setGroupSearch,
        setGroupTitle,
        setInputValue,
        setCallMinimized,
        setCallNotice,
        setNotes,
        setNotesError,
        setSearchTerm,
        setSelectedChat,
        showConversationSidebar,
        standalone,
        toggleAddMemberUser,
        toggleGroupUser,
        typingUsersByChat,
        userSearchLoading,
      }}
    />
  );
}
