import ChatSidebar from "./ChatSidebar";
import ChatBodyPanels from "./ChatBodyPanels";
import ChatWindow from "./chatwindow/ChatWindow";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";
import IncomingCallDialog from "./calls/IncomingCallDialog";
// import AdminPage from "./AdminPage";
import {
  AddMembersDialog,
  GroupCreationDialog,
  GroupCreationPage,
} from "./chatwindow/GroupDialogs";
import { ChatConfirmationDialog, ChatNotice } from "./ChatSystemOverlays";
import ChatCallOverlay from "./ChatCallOverlay";
import { getBuddySendId } from "./chatHealper";
import { updateNote } from "@/services/Team-chat/chat.service";

export default function ChatSystemView(props: Record<string, any>) {
  const {
    addMembersDialogOpen,
    addMemberUserIds,
    addMembersError,
    addableGroupMembers,
    addingMembers,
    activeCall,
    activeCallIsAccepted,
    // adminPage,
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
    callsEnabled,
    chatBoxRef,
    closeConfirmation,
    confirmationDialog,
    conversationItems,
    creatingGroup,
    currentMessages,
    currentStatus,
    currentUser,
    deleteNote,
    desktopNotifications,
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
    onDesktopNotificationsChange,
    handleStatusChange,
    handleToggleChatMute,
    handleTransferOwnership,
    handleVoiceMessage,
    hasOlderMessages,
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
  } = props;

  return (
    <>
      <div
        className={`chat-shell grid h-full min-h-0 w-full min-w-0 grid-rows-1 overflow-hidden bg-background text-foreground ${
          standalone
            ? "h-[100dvh] min-h-[100dvh]"
            : "-mx-3 -mt-3 -mb-3 w-[calc(100%+1.5rem)] h-[calc(100%+1.5rem)] min-h-0 sm:-mx-4 sm:-mt-4 sm:-mb-4 sm:w-[calc(100%+2rem)] sm:h-[calc(100%+2rem)] lg:-mx-6 lg:-mt-6 lg:-mb-6 lg:w-[calc(100%+3rem)] lg:h-[calc(100%+3rem)]"
        } ${
          showConversationSidebar
            ? "grid-cols-1 sm:grid-cols-[250px_minmax(0,1fr)] md:grid-cols-[280px_minmax(0,1fr)]"
            : "grid-cols-1"
        }`}
      >
        {showConversationSidebar && (
          <ChatSidebar
            avatarUploading={avatarUploading}
            currentStatus={currentStatus}
            enterToSend={enterToSend}
            mentionNotifications={mentionNotifications}
            onMentionNotificationsChange={setMentionNotifications}
            desktopNotifications={desktopNotifications}
            onDesktopNotificationsChange={onDesktopNotificationsChange}
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
            blockedUsers={[...buddies, ...conversationItems].filter((user, index, all) => {
              const id = String(getBuddySendId(user) || user.id || user.userId || "");
              return (
                blockedUserIds.includes(id) &&
                all.findIndex(
                  (item) => String(getBuddySendId(item) || item.id || item.userId || "") === id,
                ) === index
              );
            })}
            onUnblockUser={(userId) => handleBlockUser({ authorId: userId })}
            searchTerm={searchTerm}
            selectedChat={selectedChat}
            statusSaving={statusSaving}
            currentUser={currentUser}
            setSearchTerm={setSearchTerm}
          />
        )}
        {settingsPage ? (
          <div aria-hidden="true" className="hidden" />
        ) : // : adminPage ? (
        //   <AdminPage embedded />
        // )
        groupPage ? (
          <GroupCreationPage
            onClose={() => navigate(CHAT_APP_BASE_PATH)}
            onCreate={handleCreateGroup}
            onSearchChange={setGroupSearch}
            onSelectMember={toggleGroupUser}
            members={groupMembers}
            loading={managedUsersLoading}
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
            notesLoading={notesLoading}
            notesError={notesError}
            libraryMessages={libraryMessages}
            libraryLoading={libraryLoading}
            libraryError={libraryError}
            callStarting={callStarting || Boolean(activeCall) || Boolean(incomingCall)}
            onBack={() => navigate(CHAT_APP_BASE_PATH)}
            onCloseNotes={() => navigate(CHAT_APP_BASE_PATH)}
            onSaveNote={saveNote}
            onDeleteNote={deleteNote}
            onToggleNote={(note: any, field: "isPinned" | "isArchived") => {
              const payload = {
                title: note.title || "",
                content: note.body || "",
                isPinned: field === "isPinned" ? !note.isPinned : Boolean(note.isPinned),
                isArchived: field === "isArchived" ? !note.isArchived : Boolean(note.isArchived),
              };
              setNotes((previous: any[]) =>
                previous.map((item: any) =>
                  String(item.id) === String(note.id)
                    ? {
                        ...item,
                        isPinned: payload.isPinned,
                        isArchived: payload.isArchived,
                        updatedAt: new Date().toISOString(),
                      }
                    : item,
                ),
              );
              updateNote(note.id, payload)
                .then((response: any) => {
                  const updated = response?.data?.data || response?.data || response;
                  if (!updated?.id) return;
                  setNotes((previous: any[]) =>
                    previous.map((item: any) =>
                      String(item.id) === String(note.id)
                        ? {
                            ...item,
                            isPinned: payload.isPinned,
                            isArchived: payload.isArchived,
                            updatedAt: updated.updatedAt || item.updatedAt,
                          }
                        : item,
                    ),
                  );
                })
                .catch((error) =>
                  setNotesError(error instanceof Error ? error.message : "Unable to update note."),
                );
            }}
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
            hasOlderMessages={hasOlderMessages}
            loadingOlderMessages={loadingOlderMessages}
            onLoadOlderMessages={loadOlderMessages}
            handleFileUpload={(event) => handleFileUpload(event, selectedChat)}
            onVoiceMessage={(file) => handleVoiceMessage(file, selectedChat)}
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
            onStartConversationCall={callsEnabled ? handleStartConversationCall : undefined}
            onOpenAddMembers={openAddMembersDialog}
            onOpenMedia={() => navigate(`${CHAT_APP_BASE_PATH}/media`)}
            onToggleGroupMute={handleToggleChatMute}
            onClearChat={handleClearChat}
            setInputValue={setInputValue}
            setSelectedChat={setSelectedChat}
            uploading={uploading}
          />
        )}
      </div>
      {callsEnabled && (
        <>
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
        </>
      )}
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
        loading={managedUsersLoading}
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
        onSearchChange={setGroupSearch}
      />
    </>
  );
}
