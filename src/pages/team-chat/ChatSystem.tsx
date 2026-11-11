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
  const { id } = useParams();
  const pageState = useChatPageState();
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
    setStatusSaving,
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
    sending,
    setSending,
    uploading,
    setUploading,
    sendError,
    setSendError,
    sendClickLockRef,
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
    handleStatusChange,
    handleToggleChatMute,
    handleClearChat,
    markChatAsRead,
  } = useChatRuntime({
    ...pageState,
    blockedUserIds,
    filterBlockedMessages,
    navigate,
    onNotification: handleRealtimeNotification,
    requestConfirmation,
    setSendError,
    callsEnabled: CALLS_ENABLED,
  });

  const { fetchChatData, loadDirectChatHistory, loadChannelHistory } = useChatData({
    ...pageState,
    clearUnreadForChat,
    id,
    isCurrentUserRecord,
    isSelfConversation,
    setBlockedUserIds,
    setSendError,
  });

  const {
    handleLeaveGroup,
    handleDeleteGroup,
    handleTransferOwnership,
    handleRemoveGroupMember,
  } =
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
    initialFetchStartedRef,
    loadChannelHistory,
    loadDirectChatHistory,
    loadedChatHistoryRef,
    searchTerm,
    selectedChat,
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
    markChatAsRead,
    navigate,
    setSelectedChat,
    setSendError,
  });

  const {
    addableGroupMembers,
    groupMembers,
    handleAddGroupMembers,
    handleCreateGroup,
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

  const handleSend = useChatSend({
    blockedUserIds,
    currentUser,
    currentUserId,
    editingMessage,
    inputValue,
    pendingFiles,
    refreshSelectedChatMessages,
    replyToMessage,
    selectedChat,
    selectedMentionableUsers,
    sendClickLockRef,
    setEditingMessage,
    setInputValue,
    setMessagesByChat,
    setPendingFiles,
    setReplyToMessage,
    setSelectedChat,
    setBuddies,
    setChannels,
    setSendError,
    setSending,
    setUploading,
    uniqueUsersByIdentity,
  });

  const handleOTPRequest = async (request: {
    type: string;
    amount: number;
    notes: string;
  }) => {
    if (!canRequestOtp(permissions)) {
      setSendError("You do not have permission to request an OTP.");
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
      `🔐 OTP Request\n👤 Requested by: ${requesterName}\n📋 Type: ${requestType}\n💰 Amount: $${request.amount.toFixed(2)}\n📝 Reason: ${request.notes}`,
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
        managedUsersLoading,
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
        sending,
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
        uploading,
      }}
    />
  );
}
