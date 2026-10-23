import { useEffect, type ReactNode } from "react";
import {
  ArrowLeft,
  Ban,
  Bell,
  BellOff,
  CalendarDays,
  MoreHorizontal,
  Paperclip,
  Search,
  Trash2,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "../chatHealper";
import GroupActions from "./GroupActions";

function MenuItem({
  icon: Icon,
  children,
  onClick,
  destructive = false,
}: {
  icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-normal focus-visible:outline-none ${
        destructive
          ? "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10"
          : "hover:bg-accent focus-visible:bg-accent"
      }`}
      onClick={onClick}
    >
      <Icon className={`h-4 w-4 shrink-0 ${destructive ? "" : "text-muted-foreground"}`} />
      {children}
    </button>
  );
}

export default function ChatWindowHeader(props: Record<string, any>) {
  const {
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
    onDeleteGroup,
    onRemoveGroupMember,
    onScheduleCall,
    onSearchMessages,
    onToggleGroupMute,
    onTransferOwnership,
    isGroupOwner,
    selectedChat,
    selectedUserBlocked,
    setChatMenuOpen,
    setGroupInfoOpen,
    setGroupMenuAnchor,
    filteredSearchMessages = [],
    setLeaveConfirmOpen,
    setMediaDialogOpen,
    setMessageSearchOpen,
    setMessageSearchTerm,
    setScheduleCallOpen,
    setSelectedChat,
    title,
    typingUser,
    searchLoading = false,
    searchError = "",
  } = props;

  const displayTitle = String(title || "Conversation");
  const memberCount = Array.isArray(groupMembers) ? groupMembers.length : 0;
  const subtitle = typingUser
    ? "typing…"
    : isGroup
      ? memberCount > 0
        ? `${memberCount} ${memberCount === 1 ? "member" : "members"}`
        : "Group conversation"
      : "Direct message";

  const closeSearch = () => {
    setMessageSearchOpen(false);
    setMessageSearchTerm("");
  };

  // Escape closes the chat options menu.
  useEffect(() => {
    if (!chatMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChatMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [chatMenuOpen, setChatMenuOpen]);

  const closeMenuAnd = (action?: () => void) => () => {
    action?.();
    setChatMenuOpen(false);
  };

  return (
    <>
      <header className="relative flex min-h-16 items-center gap-3 border-b bg-card px-3 py-2">
        <Button
          size="icon"
          variant="ghost"
          className="md:hidden"
          aria-label="Back to chats"
          title="Back to chats"
          onClick={() => setSelectedChat?.(null)}
        >
          <ArrowLeft />
        </Button>

        {/* On phones the title gives way to the search box while searching. */}
        <Avatar
          className={`h-10 w-10 bg-primary/10 text-primary ${messageSearchOpen ? "hidden sm:flex" : ""}`}
        >
          <AvatarImage src={getImageUrl(selectedChat)} />
          <AvatarFallback>
            {isGroup ? <UsersRound className="h-5 w-5" /> : displayTitle.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className={`min-w-0 flex-1 ${messageSearchOpen ? "hidden sm:block" : ""}`}>
          <h2 className="truncate text-base font-normal" title={displayTitle}>
            {displayTitle}
          </h2>
          <p
            className={`truncate text-xs ${typingUser ? "text-primary" : "text-muted-foreground"}`}
            aria-live="polite"
          >
            {subtitle}
          </p>
        </div>

        {messageSearchOpen ? (
          <div className="relative z-50 min-w-0 flex-1 sm:w-[280px] sm:flex-none">
            <div className="flex h-9 w-full items-center rounded-lg border border-primary bg-primary/5 px-2">
              <Search className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <input
                autoFocus
                type="search"
                aria-label="Search messages in this conversation"
                value={messageSearchTerm}
                onChange={(event) => setMessageSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeSearch();
                }}
                placeholder="Search messages"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] outline-none"
              />

              <button
                type="button"
                aria-label="Close message search"
                onClick={closeSearch}
                className="rounded p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {messageSearchTerm.trim() && (
              <div className="absolute left-0 right-0 top-full mt-2 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
                {searchLoading ? (
                  <p
                    role="status"
                    aria-live="polite"
                    className="px-3 py-3 text-center text-xs text-muted-foreground"
                  >
                    Searching messages…
                  </p>
                ) : searchError ? (
                  <p role="alert" className="px-3 py-3 text-center text-xs text-destructive">
                    {searchError}
                  </p>
                ) : filteredSearchMessages.length > 0 ? (
                  filteredSearchMessages.map((message: any, index: number) => (
                    <button
                      key={message.id ?? index}
                      type="button"
                      className="block w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      onClick={() => {
                        if (!message.id) return;
                        closeSearch();
                        props.onJumpToMessage?.(String(message.id));
                      }}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="truncate text-xs text-primary">
                          {message.sender?.name || message.authorName || "Unknown user"}
                        </span>

                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {message.createdAt
                            ? new Date(message.createdAt).toLocaleString([], {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      <p className="line-clamp-2 break-words text-sm leading-5 text-muted-foreground">
                        {message.text || "Attachment"}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                    No messages match "{messageSearchTerm.trim()}".
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            title="Search messages"
            aria-label="Search messages"
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
          aria-label="More chat options"
          aria-haspopup="menu"
          aria-expanded={isGroup ? Boolean(groupMenuAnchor) : Boolean(chatMenuOpen)}
          data-chat-menu-trigger
          onClick={(event) => {
            if (isGroup) {
              setGroupMenuAnchor((anchor: HTMLElement | null) =>
                anchor ? null : event.currentTarget,
              );
            } else {
              setChatMenuOpen((open: boolean) => !open);
            }

            onOpenChatMenu?.();
          }}
        >
          <MoreHorizontal />
        </Button>

        {chatMenuOpen && (
          <div
            ref={chatMenuRef}
            role="menu"
            aria-label="Chat options"
            className="absolute right-3 top-14 z-50 w-60 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl"
          >
            <MenuItem
              icon={CalendarDays}
              onClick={closeMenuAnd(() => {
                setScheduleCallOpen(true);
                onScheduleCall?.();
              })}
            >
              Schedule a meeting
            </MenuItem>

            <MenuItem icon={Paperclip} onClick={closeMenuAnd(() => setMediaDialogOpen(true))}>
              Media, links &amp; files
            </MenuItem>

            <MenuItem
              icon={isGroupMuted ? Bell : BellOff}
              onClick={closeMenuAnd(() => onToggleGroupMute?.(selectedChat?.id))}
            >
              {isGroupMuted ? "Unmute notifications" : "Mute notifications"}
            </MenuItem>

            <div className="my-1 border-t" role="separator" />

            <MenuItem icon={Trash2} destructive onClick={closeMenuAnd(() => onClearChat?.())}>
              Clear chat
            </MenuItem>

            {!isGroup && (
              <MenuItem
                icon={Ban}
                destructive
                onClick={closeMenuAnd(() =>
                  handleBlockUser?.({ authorId: selectedChat?.id, sender: selectedChat }),
                )}
              >
                {selectedUserBlocked ? "Unblock user" : "Block user"}
              </MenuItem>
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
          onDeleteGroup={onDeleteGroup}
          onTransferOwnership={onTransferOwnership}
          onRemoveMember={onRemoveGroupMember}
          isGroupAdmin={isGroupAdmin}
          isGroupOwner={isGroupOwner}
          onOpenInfo={() => setGroupInfoOpen(true)}
          onOpenAddMembers={() => {
            setGroupInfoOpen(false);
            onOpenAddMembers?.();
          }}
          onOpenMedia={() => setMediaDialogOpen(true)}
          onClearChat={onClearChat}
          onOpenLeaveConfirm={() => setLeaveConfirmOpen(true)}
          onToggleMute={() => onToggleGroupMute?.(selectedChat?.id)}
          open={Boolean(groupMenuAnchor)}
          selectedChat={selectedChat}
        />
      )}
    </>
  );
}
