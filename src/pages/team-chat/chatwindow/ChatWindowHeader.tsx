import {
  ArrowLeft,
  Ban,
  BellOff,
  CalendarDays,
  MoreHorizontal,
  Paperclip,
  Search,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "../chatHealper";
import GroupActions from "./GroupActions";

export default function ChatWindowHeader(props: Record<string, any>) {
  const {
    chatBoxRef,
    chatMenuOpen,
    chatMenuRef,
    currentUser,
    groupInfoOpen,
    groupMembers,
    groupMenuAnchor,
    handleBlockUser,
    isGroup,
    isGroupAdmin,
    isGroupMuted,
    isSamePerson,
    leaveConfirmOpen,
    messageSearchOpen,
    messageSearchTerm,
    onClearChat,
    onOpenAddMembers,
    onOpenChatMenu,
    onLeaveGroup,
    onRemoveGroupMember,
    onScheduleCall,
    onSearchMessages,
    onToggleGroupMute,
    onTransferOwnership,
    selectedChat,
    selectedUserBlocked,
    setChatMenuOpen,
    setGroupInfoOpen,
    setGroupMenuAnchor,
    setLeaveConfirmOpen,
    setMediaDialogOpen,
    setMessageSearchOpen,
    setMessageSearchTerm,
    setScheduleCallOpen,
    setSelectedChat,
    title,
    typingUser,
  } = props;

  return (
    <>
      <header className="relative flex min-h-16 items-center gap-3 border-b bg-card px-3 py-2">
        <Button
          size="icon"
          variant="ghost"
          className="md:hidden"
          onClick={() => setSelectedChat?.(null)}
        >
          <ArrowLeft />
        </Button>
        <Avatar className="h-10 w-10 bg-primary/10 text-primary">
          <AvatarImage src={getImageUrl(selectedChat)} />
          <AvatarFallback>
            {isGroup ? <UsersRound className="h-5 w-5" /> : title.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {typingUser ? "typing…" : isGroup ? "Group conversation" : "Direct message"}
          </p>
        </div>
        {messageSearchOpen ? (
          <div className="flex h-9 w-[min(280px,calc(100vw-16px))] items-center rounded-lg border border-primary bg-primary/5 px-2">
            <Search className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={messageSearchTerm}
              onChange={(event) => setMessageSearchTerm(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setMessageSearchOpen(false)}
              placeholder="Search messages"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] outline-none"
            />
            <button
              type="button"
              aria-label="Close message search"
              onClick={() => {
                setMessageSearchOpen(false);
                setMessageSearchTerm("");
              }}
              className="rounded p-1 hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            title="Search messages"
            onClick={() => {
              setMessageSearchOpen(true);
              onSearchMessages?.();
            }}
          >
            <Search />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          title="More chat options"
          data-chat-menu-trigger
          onClick={(event) => {
            if (isGroup)
              setGroupMenuAnchor((anchor: HTMLElement | null) =>
                anchor ? null : event.currentTarget,
              );
            else setChatMenuOpen((open: boolean) => !open);
            onOpenChatMenu?.();
          }}
        >
          <MoreHorizontal />
        </Button>
        {chatMenuOpen && (
          <div
            ref={chatMenuRef}
            className="absolute right-3 top-14 z-50 w-60 overflow-hidden rounded-2xl border bg-popover p-2 text-popover-foreground shadow-xl"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-accent"
              onClick={() => {
                setScheduleCallOpen(true);
                setChatMenuOpen(false);
                onScheduleCall?.();
              }}
            >
              <CalendarDays className="h-4 w-4" /> Schedule a meeting
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-accent"
              onClick={() => {
                setMediaDialogOpen(true);
                setChatMenuOpen(false);
              }}
            >
              <Paperclip className="h-4 w-4" /> Media, links &amp; files
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-destructive hover:bg-destructive/10"
              onClick={() => {
                onClearChat?.();
                setChatMenuOpen(false);
              }}
            >
              <Trash2 className="h-4 w-4" /> Clear chat
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-accent"
              onClick={() => {
                onToggleGroupMute?.(selectedChat?.id);
                setChatMenuOpen(false);
              }}
            >
              <BellOff className="h-4 w-4" /> Mute notifications
            </button>
            {!isGroup && (
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-destructive hover:bg-destructive/10"
                onClick={() => {
                  handleBlockUser?.({ authorId: selectedChat?.id, sender: selectedChat });
                  setChatMenuOpen(false);
                }}
              >
                <Ban className="h-4 w-4" /> {selectedUserBlocked ? "Unblock user" : "Block user"}
              </button>
            )}
          </div>
        )}
      </header>
      {isGroup && (
        <GroupActions
          anchorEl={groupMenuAnchor}
          currentUser={currentUser}
          groupInfoOpen={groupInfoOpen}
          groupMembers={groupMembers}
          isGroupMuted={isGroupMuted}
          isSamePerson={isSamePerson}
          leaveConfirmOpen={leaveConfirmOpen}
          onCloseInfo={() => setGroupInfoOpen(false)}
          onCloseLeaveConfirm={() => setLeaveConfirmOpen(false)}
          onCloseMenu={() => setGroupMenuAnchor(null)}
          onLeaveGroup={onLeaveGroup}
          onTransferOwnership={onTransferOwnership}
          onRemoveMember={onRemoveGroupMember}
          isGroupAdmin={isGroupAdmin}
          onOpenInfo={() => setGroupInfoOpen(true)}
          onOpenAddMembers={() => {
            setGroupInfoOpen(false);
            onOpenAddMembers?.();
          }}
          onOpenMedia={() => {
            setMediaDialogOpen(true);
          }}
          onClearChat={onClearChat}
          onOpenLeaveConfirm={() => setLeaveConfirmOpen(true)}
          onToggleMute={() => onToggleGroupMute?.(selectedChat.id)}
          open={Boolean(groupMenuAnchor)}
          selectedChat={selectedChat}
        />
      )}
    </>
  );
}
