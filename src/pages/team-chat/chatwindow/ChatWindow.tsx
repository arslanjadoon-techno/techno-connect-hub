import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { getBuddyEmail, getBuddyName, getBuddySendId } from "../chatHealper";
import { EmptyChatState } from "./ChatWindowStates";
import { PinnedMessageBanner } from "./ChatWindowPanels";
import InternalCallPanel from "../calls/InternalCallPanel";
import ChatWindowHeader from "./ChatWindowHeader";
import ChatMessageList from "./ChatMessageList";
import ChatComposerPanel from "./ChatComposerPanel";
import { searchChatMessagesService } from "@/services/Team-chat/chat.service";

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

// Stable defaults. A new `[]` or `{}` on every render would break memoization of the children.
const EMPTY_LIST: any[] = [];
const EMPTY_OBJECT: Record<string, number> = {};

const SEARCH_DEBOUNCE_MS = 300;
const TYPING_IDLE_MS = 2500;
const HIGHLIGHT_MS = 1800;
const ADMIN_ROLES = ["owner", "admin", "administrator"];

// Memoized so typing in the composer does not re-render the header and the whole message list.
const MemoHeader = memo(ChatWindowHeader);
const MemoMessageList = memo(ChatMessageList);

function getChatTitle(chat?: ChatRecord | null) {
  if (!chat) return "Conversation";

  if (chat.type === "group" || chat.type === "channel") {
    return String(chat.title || "Group chat");
  }

  return getBuddyName(chat.raw || chat);
}

function isSamePerson(first?: ChatRecord, second?: ChatRecord) {
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
}

function voiceFileName(mimeType: string) {
  const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
  return `voice-${Date.now()}.${ext}`;
}

export default function ChatWindow({
  activeCall,
  availableChats = EMPTY_LIST,
  chatBoxRef,
  currentUser,
  currentMessages = EMPTY_LIST,
  messageInfoVersions = EMPTY_OBJECT,
  editingMessage,
  handleFileUpload,
  onVoiceMessage,
  handleCancelComposerMode,
  handleEditMessage,
  handleForwardMessage,
  handlePinMessage,
  handleDeleteMessages,
  handleBlockUser,
  blockedUserIds = EMPTY_LIST,
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
  mentionableUsers = EMPTY_LIST,
  mutedGroupIds = EMPTY_LIST,
  pendingFiles = EMPTY_LIST,
  removePendingFile,
  selectedChat,
  sendError,
  sending = false,
  replyToMessage,
  onSearchMessages,
  onScheduleCall,
  onOpenChatMenu,
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
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [scheduleCallOpen, setScheduleCallOpen] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<HTMLElement | null>(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<MessageRecord[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const chatMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const searchRequestId = useRef(0);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActive = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const discardRecording = useRef(false);

  const chatId = selectedChat?.chatId || selectedChat?.id;
  const selectedType = String(selectedChat?.type ?? selectedChat?.raw?.type ?? "")
    .trim()
    .toLowerCase();
  const isGroup = selectedType === "group" || selectedType === "channel";
  const sendMessageIsSuccess = Boolean(
    sendError && /copied|unblocked|removed|saved|updated|success/i.test(sendError),
  );
  const selectedUserBlocked = Boolean(
    selectedChat?.type === "person" && blockedUserIds.includes(String(selectedChat.id)),
  );

  /* ---------------------------- derived data ---------------------------- */

  const rawParticipants = selectedChat?.participants;
  const rawMembers = selectedChat?.members;
  const rawRawParticipants = selectedChat?.raw?.participants;
  const groupMembers = useMemo<ChatRecord[]>(() => {
    const raw: ChatRecord[] = rawParticipants ?? rawMembers ?? rawRawParticipants ?? EMPTY_LIST;
    return Array.from(
      new Map<string, ChatRecord>(
        raw.map((member) => {
          const identity = String(
            getBuddyEmail(member) || getBuddySendId(member) || getBuddyName(member),
          ).toLowerCase();
          return [identity, member];
        }),
      ).values(),
    );
  }, [rawParticipants, rawMembers, rawRawParticipants]);

  const chatRole = selectedChat?.role ?? selectedChat?.raw?.role;
  const isGroupAdmin = useMemo(() => {
    if (!isGroup) return false;
    const participant = groupMembers.find((member) => isSamePerson(member, currentUser));
    const role = String(
      chatRole ??
        participant?.conversationRole ??
        participant?.conversation_role ??
        participant?.memberRole ??
        participant?.member_role ??
        participant?.role ??
        "",
    )
      .trim()
      .toLowerCase();
    return ADMIN_ROLES.includes(role);
  }, [isGroup, groupMembers, currentUser, chatRole]);

  const isGroupMuted = mutedGroupIds.includes(String(selectedChat?.id));

  const { latestPinnedMessage, pinnedCount } = useMemo(() => {
    let latest: MessageRecord | null = null;
    let count = 0;
    for (const message of currentMessages) {
      if (message.metadata?.pinned) {
        latest = message;
        count += 1;
      }
    }
    return { latestPinnedMessage: latest, pinnedCount: count };
  }, [currentMessages]);

  /* ------------------------------ helpers ------------------------------- */

  const scrollToMessage = useCallback(
    (messageId: string) => {
      const target = chatBoxRef?.current?.querySelector<HTMLElement>(
        `[data-message-id="${CSS.escape(messageId)}"]`,
      );
      if (!target) return false;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedMessageId(null), HIGHLIGHT_MS);
      return true;
    },
    [chatBoxRef],
  );

  const jumpToMessage = useCallback(
    (messageId: string) => {
      setMessageSearchOpen(false);
      // Wait a frame: closing the search can change which messages are rendered.
      requestAnimationFrame(() => scrollToMessage(messageId));
    },
    [scrollToMessage],
  );

  // Send "typing" once when the user starts, and "stopped" after a pause. Not on every keystroke.
  const signalTyping = useCallback(
    (typing: boolean) => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = null;
      if (typing) {
        if (!typingActive.current) {
          typingActive.current = true;
          onTyping?.(true);
        }
        typingTimer.current = setTimeout(() => {
          typingActive.current = false;
          onTyping?.(false);
        }, TYPING_IDLE_MS);
      } else if (typingActive.current) {
        typingActive.current = false;
        onTyping?.(false);
      }
    },
    [onTyping],
  );

  const stopRecording = useCallback((discard = false) => {
    discardRecording.current = discard;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      recorderRef.current = null;
      setRecording(false);
    }
  }, []);

  /* ------------------------------ effects ------------------------------- */

  // Switching chats starts fresh: no leftover search, menus, selection, mention list or recording.
  useEffect(() => {
    setMessageSearchOpen(false);
    setMessageSearchTerm("");
    setMentionQuery(null);
    setSelectedMessageIds([]);
    setGroupMenuAnchor(null);
    setGroupInfoOpen(false);
    setLeaveConfirmOpen(false);
    setChatMenuOpen(false);
    setEmojiAnchor(null);
    setEmojiTarget(null);
    setActionsMessage(null);
    setHighlightedMessageId(null);
    stopRecording(true);
    signalTyping(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Clear timers and release the microphone when the window unmounts.
  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      discardRecording.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    },
    [],
  );

  // The composer was cleared (message sent), so the typing indicator should stop.
  useEffect(() => {
    if (!inputValue) signalTyping(false);
  }, [inputValue, signalTyping]);

  // Debounced message search for the active chat. Older responses are ignored.
  useEffect(() => {
    const term = messageSearchTerm.trim();
    const requestId = ++searchRequestId.current;

    if (!messageSearchOpen || !term || !chatId) {
      setSearchResults((previous) => (previous.length ? [] : previous));
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    setSearchResults((previous) => (previous.length ? [] : previous));
    setSearchError("");

    const timer = window.setTimeout(async () => {
      if (requestId !== searchRequestId.current) return;
      setSearchLoading(true);

      try {
        const response: any = await searchChatMessagesService({
          q: term,
          chatId: String(chatId),
          limit: 25,
        });
        if (requestId !== searchRequestId.current) return;
        const results = response?.data?.data;
        setSearchResults(Array.isArray(results) ? results : []);
      } catch {
        if (requestId === searchRequestId.current) {
          setSearchResults([]);
          setSearchError("Unable to search messages. Please try again.");
        }
      } finally {
        if (requestId === searchRequestId.current) setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [messageSearchTerm, messageSearchOpen, chatId]);

  // Close the chat options menu on Escape or an outside click.
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

  /* ----------------------------- composer ------------------------------- */

  const setText = (value: string) => {
    setInputValue?.(value);
    signalTyping(value.length > 0);
  };

  const handleComposerChange = (value: string, cursor: number) => {
    setText(value);

    if (!isGroup) {
      setMentionQuery(null);
      return;
    }

    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (member: ChatRecord) => {
    const input = composerInputRef.current;
    const value = String(inputValue || "");
    const cursor = input?.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    const mentionStart = beforeCursor.lastIndexOf("@");
    const name = getBuddyName(member);
    setText(`${value.slice(0, mentionStart)}@${name} ${value.slice(cursor)}`);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      input?.focus();
      const nextCursor = mentionStart + name.length + 2;
      input?.setSelectionRange(nextCursor, nextCursor);
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

  // Enter sends and Shift+Enter adds a new line. Both are handled in ChatComposerPanel;
  // this only closes the mention list on Escape.
  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape" && mentionQuery !== null) {
      event.preventDefault();
      setMentionQuery(null);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      stopRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Permission denied or no microphone: stay in the normal state.
      setRecording(false);
      return;
    }

    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    discardRecording.current = false;
    recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (!discardRecording.current && chunks.length > 0) {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type });
        onVoiceMessage?.(new File([blob], voiceFileName(type), { type }));
      }
      recorderRef.current = null;
      setRecording(false);
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  };

  if (!selectedChat) return <EmptyChatState />;

  const title = getChatTitle(selectedChat);

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <MemoHeader
        {...{
          chatMenuOpen,
          chatMenuRef,
          onJumpToMessage: jumpToMessage,
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
          filteredSearchMessages: searchResults,
          searchLoading,
          searchError,
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
        pinnedCount={pinnedCount}
        onClick={() => {
          if (latestPinnedMessage?.id) scrollToMessage(String(latestPinnedMessage.id));
        }}
      />
      <MemoMessageList
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
          availableChats,
          composerInputRef,
          currentMessages,
          currentUser,
          editingMessage,
          emojiAnchor,
          emojiTarget,
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
          onTyping: signalTyping,
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