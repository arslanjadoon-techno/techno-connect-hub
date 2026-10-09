import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type RefObject } from "react";
import {
  ArrowLeft,
  AlertCircle,
  Ban,
  BellOff,
  Bold,
  CalendarDays,
  Italic,
  Mic,
  MoreHorizontal,
  Paperclip,
  Search,
  CheckCircle2,
  Send,
  Smile,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelName,
  getImageUrl,
  getMessageDayKey,
  formatMessageDateLabel,
} from "../chatHealper";
import { EmptyChatState, ReadyToSendState } from "./ChatWindowStates";
import { ForwardMessageDialog, PinnedMessageBanner } from "./ChatWindowPanels";
import EmojiPicker from "./EmojiPicker";
import MessageRow from "./MessageRow";
import ConversationMediaDialog from "./ConversationMediaDialog";
import InternalCallPanel from "../calls/InternalCallPanel";
import ScheduleCallDialog from "../calls/ScheduleCallDialog";
import GroupActions from "./GroupActions";

type ChatRecord = Record<string, any>;
type MessageRecord = Record<string, any>;

interface ChatWindowProps {
  activeCall?: ChatRecord | null;
  availableChats?: ChatRecord[];
  callStarting?: boolean;
  chatBoxRef?: RefObject<HTMLDivElement | null>;
  callSocketRef?: RefObject<any>;
  currentUser?: ChatRecord;
  currentMessages?: MessageRecord[];
  messageInfoVersions?: Record<string, number>;
  editingMessage?: MessageRecord | null;
  enterToSend?: boolean;
  handleFileUpload?: (event: ChangeEvent<HTMLInputElement>) => void;
  onVoiceMessage?: (file: File) => void;
  handleCancelComposerMode?: () => void;
  handleEditMessage?: (message: MessageRecord) => void;
  handleForwardMessage?: (message: MessageRecord, target: ChatRecord) => void;
  handlePinMessage?: (message: MessageRecord) => void;
  handleDeleteMessages?: (...args: any[]) => any;
  handleBlockUser?: (...args: any[]) => any;
  blockedUserIds?: string[];
  handleCopyMessage?: (message: MessageRecord) => void;
  handleReaction?: (messageId: string | number, emoji: string) => void;
  handleReplyToMessage?: (message: MessageRecord) => void;
  handleSend?: () => void;
  onEndActiveCall?: () => void;
  onLeaveGroup?: (chatId: string | number) => void;
  onTransferOwnership?: (chatId: string | number, memberId: string | number) => Promise<void>;
  onRemoveGroupMember?: (chatId: string | number, memberId: string | number) => Promise<void>;
  onLoadOlderMessages?: () => void;
  hasOlderMessages?: boolean;
  loadingOlderMessages?: boolean;
  inputValue?: string;
  mentionableUsers?: ChatRecord[];
  mutedGroupIds?: string[];
  pendingFiles?: File[];
  removePendingFile?: (index: number) => void;
  selectedChat?: ChatRecord | null;
  sendError?: string;
  sending?: boolean;
  replyToMessage?: MessageRecord | null;
  onStartConversationCall?: (type: "audio" | "video") => void;
  onSearchMessages?: () => void;
  onScheduleCall?: () => void;
  onOpenChatMenu?: () => void;
  onOpenMedia?: () => void;
  onOpenAddMembers?: () => void;
  onToggleGroupMute?: (...args: any[]) => any;
  onClearChat?: (...args: any[]) => any;
  onTyping?: (typing: boolean) => void;
  typingUser?: boolean | string;
  setInputValue?: (value: string) => void;
  setSelectedChat?: (...args: any[]) => any;
  uploading?: boolean;
}

function getChatTitle(chat?: ChatRecord | null) {
  if (!chat) return "Conversation";
  return chat.type === "channel" ? String(getChannelName(chat)) : getBuddyName(chat.raw || chat);
}

export default function ChatWindow({
  activeCall,
  availableChats = [],
  callStarting = false,
  chatBoxRef,
  currentUser,
  currentMessages = [],
  messageInfoVersions = {},
  editingMessage,
  enterToSend = false,
  handleFileUpload,
  onVoiceMessage,
  handleCancelComposerMode,
  handleEditMessage,
  handleForwardMessage,
  handlePinMessage,
  handleDeleteMessages,
  handleBlockUser,
  blockedUserIds = [],
  handleCopyMessage,
  handleReaction,
  handleReplyToMessage,
  handleSend,
  onEndActiveCall,
  onLeaveGroup,
  onTransferOwnership,
  onRemoveGroupMember,
  onLoadOlderMessages,
  hasOlderMessages = false,
  loadingOlderMessages = false,
  inputValue = "",
  mentionableUsers = [],
  mutedGroupIds = [],
  pendingFiles = [],
  removePendingFile,
  selectedChat,
  sendError,
  sending = false,
  replyToMessage,
  onStartConversationCall,
  onSearchMessages,
  onScheduleCall,
  onOpenChatMenu,
  onOpenMedia,
  onToggleGroupMute,
  onClearChat,
  onOpenAddMembers,
  onTyping,
  typingUser,
  setInputValue,
  setSelectedChat,
  uploading = false,
}: ChatWindowProps) {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [actionsMessage, setActionsMessage] = useState<MessageRecord | null>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [emojiTarget, setEmojiTarget] = useState<MessageRecord | null>(null);
  const [recording, setRecording] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [scheduleCallOpen, setScheduleCallOpen] = useState(false);
  const sendMessageIsSuccess = Boolean(sendError && /copied|unblocked|removed|saved|updated|success/i.test(sendError));
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<HTMLElement | null>(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [voiceRecorder, setVoiceRecorder] = useState<MediaRecorder | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const selectedUserBlocked = Boolean(
    selectedChat?.type === "person" && blockedUserIds.includes(String(selectedChat.id)),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!chatMenuOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setChatMenuOpen(false);
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-chat-menu-trigger]")) return;
      if (!chatMenuRef.current?.contains(target as Node)) setChatMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [chatMenuOpen]);

  const setText = (value: string) => {
    setInputValue?.(value);
    onTyping?.(value.length > 0);
  };

  const handleComposerChange = (value: string, cursor: number) => {
    setText(value);
    if (!selectedChat || selectedChat.type !== "channel") {
      setMentionQuery(null);
      return;
    }
    const beforeCursor = value.slice(0, cursor);
    const mentionMatch = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
    setMentionQuery(mentionMatch ? mentionMatch[1] : null);
  };

  const insertMention = (member: ChatRecord) => {
    const input = composerInputRef.current;
    const value = String(inputValue || "");
    const cursor = input?.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    const mentionStart = beforeCursor.lastIndexOf("@");
    const name = getBuddyName(member);
    const nextValue = `${value.slice(0, mentionStart)}@${name} ${value.slice(cursor)}`;
    setText(nextValue);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      input?.focus();
      const nextCursor = mentionStart + name.length + 2;
      input?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const applyTextFormat = (marker: string) => {
    const input = composerInputRef.current;
    const value = String(inputValue || "");
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    const selected = value.slice(start, end);
    setText(`${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    });
  };

  const insertEmoji = (emoji: string) => {
    const input = composerInputRef.current;
    const value = String(inputValue || "");
    const cursor = input?.selectionStart ?? value.length;
    setText(`${value.slice(0, cursor)}${emoji}${value.slice(cursor)}`);
    requestAnimationFrame(() => {
      input?.focus();
      const next = cursor + emoji.length;
      input?.setSelectionRange(next, next);
    });
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey || (!enterToSend && !event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    handleSend?.();
  };

  const toggleRecording = async () => {
    if (recording) {
      voiceRecorder?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      onVoiceMessage?.(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }));
      setRecording(false);
      setVoiceRecorder(null);
    };
    recorder.start();
    setVoiceRecorder(recorder);
    setRecording(true);
  };

  if (!selectedChat) return <EmptyChatState />;

  const title = getChatTitle(selectedChat);
  const chatId = selectedChat.chatId || selectedChat.id;
  const isGroup = selectedChat.type === "channel";
  const rawGroupMembers =
    selectedChat.participants || selectedChat.members || selectedChat.raw?.participants || [];
  const groupMembers = Array.from(
    new Map(
      rawGroupMembers.map((member: ChatRecord) => {
        const identity = String(
          getBuddyEmail(member) || getBuddySendId(member) || getBuddyName(member),
        ).toLowerCase();
        return [identity, member];
      }),
    ).values(),
  );
  const isGroupMuted = mutedGroupIds.includes(String(selectedChat.id));
  const isSamePerson = (first: ChatRecord, second?: ChatRecord) => {
    if (!first || !second) return false;
    const values = (person: ChatRecord) =>
      [
        person.id,
        person.userId,
        person.user_id,
        person.appUserId,
        person.app_user_id,
        person.email,
        person.email_id,
      ]
        .filter((value) => value != null && String(value).trim())
        .map((value) => String(value).trim().toLowerCase());
    const firstValues = values(first);
    return values(second).some((value) => firstValues.includes(value));
  };
  const creatorId =
    selectedChat.ownerId ||
    selectedChat.owner_id ||
    selectedChat.creatorId ||
    selectedChat.creator_id ||
    selectedChat.createdBy ||
    selectedChat.created_by ||
    selectedChat.raw?.ownerId ||
    selectedChat.raw?.owner_id ||
    selectedChat.raw?.creatorId ||
    selectedChat.raw?.creator_id ||
    selectedChat.raw?.createdBy ||
    selectedChat.raw?.created_by;
  const isGroupAdmin = groupMembers.some(
    (member: ChatRecord) =>
      isSamePerson(member, currentUser) &&
      (member.isAdmin === true ||
        member.is_admin === true ||
        member.isOwner === true ||
        member.is_owner === true ||
        (creatorId != null && String(creatorId) === String(getBuddySendId(member))) ||
        String(getBuddyEmail(member) || "").toLowerCase() === "admin@techno.com" ||
        ["owner", "admin", "administrator"].includes(
          String(
            member.conversationRole ||
              member.conversation_role ||
              member.memberRole ||
              member.member_role ||
              member.role ||
              member.roleName ||
              member.role_name ||
              "",
          ).toLowerCase(),
        )),
  );
  const pinnedMessages = currentMessages.filter((message) => message.metadata?.pinned);
  const latestPinnedMessage = pinnedMessages[pinnedMessages.length - 1] || null;

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <header className="relative flex min-h-16 items-center gap-3 border-b bg-card px-3 py-2">
        {/* Scheduling temporarily disabled.
        <Button size="icon" variant="ghost" title="Schedule call">
          <CalendarDays />
        </Button>
        */}
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
        {/* Call controls temporarily disabled.
        {onStartConversationCall && <>
          <Button size="icon" variant="ghost" onClick={() => onStartConversationCall("audio")}><Phone /></Button>
          <Button size="icon" variant="ghost" onClick={() => onStartConversationCall("video")}><Video /></Button>
        </>}
        */}
        {messageSearchOpen ? (
          <div className="flex h-9 w-[min(280px,calc(100vw-16px))] items-center rounded-lg border border-primary bg-primary/5 px-2 transition-all">
            <Search className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={messageSearchTerm}
              onChange={(event) => setMessageSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setMessageSearchOpen(false);
              }}
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
            if (isGroup) {
              setGroupMenuAnchor((anchor) => (anchor ? null : event.currentTarget));
            } else setChatMenuOpen((open) => !open);
            onOpenChatMenu?.();
          }}
        >
          <MoreHorizontal />
        </Button>
        {chatMenuOpen && (
          <div ref={chatMenuRef} className="absolute right-3 top-14 z-50 w-60 overflow-hidden rounded-2xl border bg-popover p-2 text-popover-foreground shadow-xl">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-accent"
              onClick={() => {
                setScheduleCallOpen(true);
                setChatMenuOpen(false);
                onScheduleCall?.();
              }}
            >
              <CalendarDays className="h-4 w-4" />
              Schedule a meeting
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
              <Trash2 className="h-4 w-4" />
              Clear chat
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-accent"
              onClick={() => {
                onToggleGroupMute?.(selectedChat?.id);
                setChatMenuOpen(false);
              }}
            >
              <BellOff className="h-4 w-4" />
              Mute notifications
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
                <Ban className="h-4 w-4" />
                {selectedUserBlocked ? "Unblock user" : "Block user"}
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
          onOpenMedia={() => setMediaDialogOpen(true)}
          onClearChat={onClearChat}
          onOpenLeaveConfirm={() => setLeaveConfirmOpen(true)}
          onToggleMute={() => onToggleGroupMute?.(selectedChat.id)}
          open={Boolean(groupMenuAnchor)}
          selectedChat={selectedChat}
        />
      )}

      {messageSearchOpen && messageSearchTerm.trim() && (
        <div className="absolute right-3 top-16 z-40 max-h-56 w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          {currentMessages
            .filter((message) =>
              String(message.text || "")
                .toLowerCase()
                .includes(messageSearchTerm.trim().toLowerCase()),
            )
            .map((message) => (
              <button
                key={message.id}
                type="button"
                className="block w-full truncate rounded px-3 py-2 text-left text-xs hover:bg-accent"
                onClick={() => setMessageSearchOpen(false)}
              >
                {message.text || "Attachment"}
              </button>
            ))}
          {currentMessages.every(
            (message) =>
              !String(message.text || "")
                .toLowerCase()
                .includes(messageSearchTerm.trim().toLowerCase()),
          ) && (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">No messages found</p>
          )}
        </div>
      )}

      {activeCall && (
        <InternalCallPanel
          activeCall={activeCall as any}
          onEnd={onEndActiveCall || (() => undefined)}
        />
      )}
      <PinnedMessageBanner
        latestPinnedMessage={latestPinnedMessage}
        pinnedCount={pinnedMessages.length}
        onClick={() => {
          if (!latestPinnedMessage?.id) return;
          const target = chatBoxRef?.current?.querySelector<HTMLElement>(
            `[data-message-id="${CSS.escape(String(latestPinnedMessage.id))}"]`,
          );
          target?.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedMessageId(String(latestPinnedMessage.id));
          window.setTimeout(() => setHighlightedMessageId(null), 1400);
        }}
      />

      <div
        ref={chatBoxRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 px-1 pb-0 pt-2 sm:px-2 sm:pt-3"
      >
        {selectedMessageIds.length > 0 && (
          <div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs shadow-sm">
            <span>{selectedMessageIds.length} message(s) selected</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  const selected = currentMessages.filter((item) => selectedMessageIds.includes(String(item.id)));
                  handleDeleteMessages?.(selected);
                  setSelectedMessageIds([]);
                }}
              >Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedMessageIds([])}>Cancel</Button>
            </div>
          </div>
        )}
        {hasOlderMessages && (
          <div className="mb-3 text-center">
            <Button
              size="sm"
              variant="outline"
              disabled={loadingOlderMessages}
              onClick={onLoadOlderMessages}
            >
              {loadingOlderMessages ? "Loading…" : "Load older messages"}
            </Button>
          </div>
        )}
        {currentMessages.length === 0 ? (
          <ReadyToSendState selectedChat={selectedChat as any} />
        ) : (
          currentMessages.map((message, index) => {
            const replyId = message.replyToMessageId || message.replyTo || message.reply_to;
            const repliedMessage =
              message.repliedMessage ||
              (replyId
                ? currentMessages.find((candidate) => String(candidate.id) === String(replyId))
                : null);
            const dayKey = getMessageDayKey(message.sentAt || message.timestamp || Date.now());
            const previous = currentMessages[index - 1];
            const previousDayKey = previous
              ? getMessageDayKey(previous.sentAt || previous.timestamp || Date.now())
              : "";
            const previousAuthor = previous?.authorId || previous?.sender?.id || previous?.senderId;
            const currentAuthor = message.authorId || message.sender?.id || message.senderId;
            const showGroupAvatar =
              selectedChat.type !== "channel" ||
              String(previousAuthor || "") !== String(currentAuthor || "");
            return (
              <div
                key={message.id || `${dayKey}-${index}`}
                data-message-id={message.id ? String(message.id) : undefined}
                className={highlightedMessageId === String(message.id) ? "rounded-lg bg-primary/10 ring-2 ring-primary/40 transition-colors" : "transition-colors"}
              >
                {dayKey !== previousDayKey && (
                  <div className="my-4 text-center text-[11px] font-medium text-muted-foreground">
                    {formatMessageDateLabel(message.sentAt || message.timestamp || Date.now())}
                  </div>
                )}
                <MessageRow
                  authorName={message.authorName || getBuddyName(message.sender)}
                  chatId={chatId}
                  currentUser={currentUser}
                  message={{
                    ...message,
                    authorAvatarUrl:
                      message.authorAvatarUrl || getImageUrl(message.sender) || getImageUrl(selectedChat),
                    repliedMessage: repliedMessage || message.repliedMessage,
                  }}
                  mentionableUsers={selectedChat.type === "channel" ? mentionableUsers : []}
                  showAvatar={showGroupAvatar}
                  messageInfoVersion={messageInfoVersions[String(message.id)] || 0}
                  onCopy={handleCopyMessage}
                  onDelete={handleDeleteMessages}
                  onEdit={handleEditMessage}
                  onForward={(item) => setActionsMessage(item)}
                  onBlock={handleBlockUser}
                  onPin={handlePinMessage}
                  onReact={(item, emoji) => handleReaction?.(item.id, emoji)}
                  onReply={handleReplyToMessage}
                  selectionMode={selectedMessageIds.length > 0}
                  selected={selectedMessageIds.includes(String(message.id))}
                  onSelect={(selectedMessage) => {
                    const id = String(selectedMessage.id);
                    setSelectedMessageIds((previous) =>
                      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
                    );
                  }}
                  onJumpToMessage={(messageId) => {
                    const target = chatBoxRef?.current?.querySelector<HTMLElement>(
                      `[data-message-id="${CSS.escape(messageId)}"]`,
                    );
                    target?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setHighlightedMessageId(messageId);
                    window.setTimeout(() => setHighlightedMessageId(null), 1400);
                  }}
                  blocked={blockedUserIds.includes(String(message.authorId))}
                  onOpenReactionPicker={(item, element) => {
                    setEmojiTarget(item);
                    setEmojiAnchor(element);
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {replyToMessage && (
        <div className="flex items-center gap-2 border-t bg-muted/40 px-3 py-2 text-xs">
          <span className="min-w-0 flex-1 truncate">
            Replying to {replyToMessage.authorName || "message"}
          </span>
          <Button size="sm" variant="ghost" onClick={handleCancelComposerMode}>
            Cancel
          </Button>
        </div>
      )}
      {editingMessage && (
        <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-2 text-xs">
          <span>Editing message</span>
          <Button size="sm" variant="ghost" onClick={handleCancelComposerMode}>
            Cancel
          </Button>
        </div>
      )}
      {sendError && (
        <div
          role={sendMessageIsSuccess ? "status" : "alert"}
          className={`flex items-center gap-2 border-t px-3 py-2 text-xs ${
            sendMessageIsSuccess
              ? "bg-muted/40 text-muted-foreground"
              : "bg-destructive/5 text-destructive"
          }`}
        >
          {sendMessageIsSuccess ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="min-w-0 break-words">{sendError}</span>
        </div>
      )}
      <footer className="sticky bottom-0 z-10 shrink-0 border-t bg-card p-1.5">
        <div className="overflow-hidden rounded-xl border bg-background">
          <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileUpload} />
          {pendingFiles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-3 pt-2">
              {pendingFiles.map((file, index) => (
                <button
                  type="button"
                  key={`${file.name}-${index}`}
                  className="flex shrink-0 items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs"
                  onClick={() => removePendingFile?.(index)}
                >
                  {file.type.startsWith("audio/") ? (
                    <audio
                      controls
                      preload="metadata"
                      src={URL.createObjectURL(file)}
                      className="h-8 max-w-[220px]"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  ) : file.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : null}
                  <span className="max-w-[220px] truncate">{file.name}</span> ×
                </button>
              ))}
            </div>
          )}
          {recording && (
            <div className="flex items-center gap-2 border-b bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              Recording voice message… click the microphone to stop
            </div>
          )}
          {mentionQuery !== null && (
            <div className="max-h-48 overflow-y-auto border-b bg-popover p-1 shadow-sm">
              {groupMembers
                .filter((member) =>
                  getBuddyName(member).toLowerCase().includes(mentionQuery.toLowerCase()),
                )
                .slice(0, 8)
                .map((member) => (
                  <button
                    key={String(getBuddySendId(member) || getBuddyEmail(member))}
                    type="button"
                    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertMention(member);
                    }}
                  >
                    <span className="font-medium">{getBuddyName(member)}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {getBuddyEmail(member)}
                    </span>
                  </button>
                ))}
            </div>
          )}
          <Textarea
            ref={composerInputRef}
            value={inputValue}
            placeholder="Write a message…"
            disabled={sending}
            onChange={(event) =>
              handleComposerChange(event.target.value, event.target.selectionStart || 0)
            }
            onKeyDown={onComposerKeyDown}
            onBlur={() => onTyping?.(false)}
            rows={1}
            className="min-h-[42px] resize-none rounded-none border-0 px-3 py-2 text-sm shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between border-t px-1.5 py-1">
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                disabled={uploading || sending}
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <Paperclip className="h-[18px] w-[18px]" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Emoji"
                disabled={sending}
                onClick={(event) => setEmojiAnchor(event.currentTarget)}
              >
                <Smile className="h-[18px] w-[18px]" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Bold"
                disabled={sending}
                onClick={() => applyTextFormat("**")}
              >
                <Bold className="h-[18px] w-[18px]" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Italic"
                disabled={sending}
                onClick={() => applyTextFormat("*")}
              >
                <Italic className="h-[18px] w-[18px]" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleRecording}
                title={recording ? "Stop recording" : "Record voice message"}
              >
                <Mic className={`h-[18px] w-[18px] ${recording ? "text-destructive" : ""}`} />
              </Button>
            </div>
            <Button
              size="sm"
              disabled={sending || (!inputValue.trim() && pendingFiles.length === 0)}
              onClick={handleSend}
              className="gap-1.5 px-4"
            >
              Send <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>{enterToSend ? "Enter sends" : "Ctrl+Enter sends"}</span>
          <span>{pendingFiles.length > 0 ? `${pendingFiles.length} attachment(s)` : ""}</span>
        </div>
      </footer>
      <EmojiPicker
        anchorEl={emojiAnchor}
        onClose={() => {
          setEmojiAnchor(null);
          setEmojiTarget(null);
        }}
        onSelect={(emoji) => {
          if (emojiTarget?.id != null) handleReaction?.(emojiTarget.id, emoji);
          else insertEmoji(emoji);
        }}
      />
      <ConversationMediaDialog
        messages={currentMessages}
        open={mediaDialogOpen}
        onClose={() => setMediaDialogOpen(false)}
      />
      <ScheduleCallDialog
        currentUser={currentUser}
        selectedChat={selectedChat}
        open={scheduleCallOpen}
        onClose={() => setScheduleCallOpen(false)}
      />
      <ForwardMessageDialog
        availableChats={availableChats}
        forwardMessage={actionsMessage}
        selectedChat={selectedChat}
        onClose={() => setActionsMessage(null)}
        onForwardToChat={(target) => {
          if (actionsMessage) handleForwardMessage?.(actionsMessage, target);
          setActionsMessage(null);
        }}
      />
    </section>
  );
}
