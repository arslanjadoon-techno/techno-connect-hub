import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { getBuddyEmail, getBuddyName, getBuddySendId, getChannelName } from "../chatHealper";
import { EmptyChatState } from "./ChatWindowStates";
import { PinnedMessageBanner } from "./ChatWindowPanels";
import InternalCallPanel from "../calls/InternalCallPanel";
import ChatWindowHeader from "./ChatWindowHeader";
import ChatMessageList from "./ChatMessageList";
import ChatComposerPanel from "./ChatComposerPanel";

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
  const sendMessageIsSuccess = Boolean(
    sendError && /copied|unblocked|removed|saved|updated|success/i.test(sendError),
  );
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
  const rawGroupMembers: ChatRecord[] = (selectedChat.participants ||
    selectedChat.members ||
    selectedChat.raw?.participants ||
    []) as ChatRecord[];
  const groupMembers: ChatRecord[] = Array.from(
    new Map<string, ChatRecord>(
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
      <ChatWindowHeader
        {...{
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
          onOpenMedia,
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
        }}
      />
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
      <ChatMessageList
        {...{
          blockedUserIds,
          chatBoxRef,
          chatId,
          currentMessages,
          currentUser,
          handleBlockUser,
          handleCopyMessage,
          handleDeleteMessages,
          handleEditMessage,
          handleForwardMessage,
          handlePinMessage,
          handleReaction,
          handleReplyToMessage,
          hasOlderMessages,
          highlightedMessageId,
          loadingOlderMessages,
          mentionableUsers,
          messageInfoVersions,
          messageSearchOpen,
          messageSearchTerm,
          onLoadOlderMessages,
          selectedChat,
          selectedMessageIds,
          setActionsMessage,
          setEmojiAnchor,
          setEmojiTarget,
          setHighlightedMessageId,
          setMessageSearchOpen,
          setSelectedMessageIds,
        }}
      />
      <ChatComposerPanel
        {...{
          actionsMessage,
          applyTextFormat,
          availableChats,
          composerInputRef,
          currentMessages,
          currentUser,
          editingMessage,
          emojiAnchor,
          emojiTarget,
          enterToSend,
          fileInputRef,
          groupMembers,
          handleComposerChange,
          handleFileUpload,
          handleForwardMessage,
          handleReaction,
          handleSend,
          inputValue,
          insertEmoji,
          insertMention,
          mentionQuery,
          onComposerKeyDown,
          onTyping,
          pendingFiles,
          recording,
          removePendingFile,
          replyToMessage,
          selectedChat,
          sendError,
          sendMessageIsSuccess,
          sending,
          setActionsMessage,
          setEmojiAnchor,
          setEmojiTarget,
          setMediaDialogOpen,
          setScheduleCallOpen,
          scheduleCallOpen,
          mediaDialogOpen,
          toggleRecording,
          uploading,
          handleCancelComposerMode,
        }}
      />
    </section>
  );
}
