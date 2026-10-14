import { useRef, useState } from "react";
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
const CALLS_ENABLED = false;
type ChatState = Record<string, any> | null;
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
  const pageState = useChatPageState();
  const {
    activeCall,
    addMemberUserIds,
    addMembersDialogOpen,
    addMembersError,
    addingMembers,
    avatarUploading,
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
    currentStatus,
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
    mentionNotifications,
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
    statusSaving,
    typingUsersByChat,
  } = pageState;
  const {
    setActiveCall,
    setAddMemberUserIds,
    setAddMembersDialogOpen,
    setAddMembersError,
    setAddingMembers,
    setAvatarUploading,
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
    enterToSend,
    setEnterToSend,
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
    handleEnterToSendChange,
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
    handleAvatarUpload,
    handleToggleChatMute,
    handleClearChat,
    markChatAsRead,
  } = useChatRuntime({
    ...pageState,
    blockedUserIds,
    filterBlockedMessages,
    navigate,
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
    setEnterToSend,
    setBlockedUserIds,
    setSendError,
  });

  const { handleLeaveGroup, handleTransferOwnership, handleRemoveGroupMember } =
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
    chatBoxRef,
    conversationItems,
    fetchChatData,
    initialFetchStartedRef,
    loadChannelHistory,
    loadDirectChatHistory,
    loadedChatHistoryRef,
    messagesByChat,
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
    setChannels,
    setSendError,
    setSending,
    setUploading,
    uniqueUsersByIdentity,
  });

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
        avatarUploading,
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
        currentStatus,
        currentUser,
        deleteNote,
        editingMessage,
        enterToSend,
        fetchChatData,
        filteredItems,
        groupDialogOpen,
        groupError,
        groupMembers,
        groupPage,
        groupSearch,
        groupTitle,
        handleAddGroupMembers,
        handleAvatarUpload,
        handleBlockUser,
        handleCancelComposerMode,
        handleClearChat,
        handleCopyMessage,
        handleCreateGroup,
        handleDeleteMessages,
        handleEditMessage,
        handleEndActiveCall,
        handleEnterToSendChange,
        handleFileUpload,
        handleForwardMessage,
        handleLeaveGroup,
        handlePinMessage,
        handleReaction,
        handleRemoveGroupMember,
        handleReplyToMessage,
        handleRespondToCall,
        handleSend,
        handleStartConversationCall,
        openAddMembersDialog,
        handleStatusChange,
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
        mentionNotifications,
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
        setMentionNotifications,
        setNotes,
        setNotesError,
        setSearchTerm,
        setSelectedChat,
        settingsPage,
        showConversationSidebar,
        standalone,
        statusSaving,
        toggleAddMemberUser,
        toggleGroupUser,
        typingUsersByChat,
        uploading,
      }}
    />
  );
}
