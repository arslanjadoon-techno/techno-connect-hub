import { useRef, useState, type ChangeEvent, type KeyboardEvent, type RefObject } from "react";
import { ArrowLeft, Mic, Paperclip, Phone, Send, UsersRound, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getBuddyName,
  getChannelName,
  getImageUrl,
  getMessageDayKey,
  formatMessageDateLabel,
} from "../chatHealper";
import { EmptyChatState, ReadyToSendState } from "./ChatWindowStates";
import { ForwardMessageDialog } from "./ChatWindowPanels";
import EmojiPicker from "./EmojiPicker";
import MessageRow from "./MessageRow";
import InternalCallPanel from "../calls/InternalCallPanel";

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
  return chat.type === "channel" ? String(getChannelName(chat)) : getBuddyName(chat);
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
  onLoadOlderMessages,
  hasOlderMessages = false,
  loadingOlderMessages = false,
  inputValue = "",
  mentionableUsers = [],
  pendingFiles = [],
  removePendingFile,
  selectedChat,
  sendError,
  sending = false,
  replyToMessage,
  onStartConversationCall,
  onOpenAddMembers,
  onTyping,
  typingUser,
  setInputValue,
  setSelectedChat,
  uploading = false,
}: ChatWindowProps) {
  const [actionsMessage, setActionsMessage] = useState<MessageRecord | null>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [emojiTarget, setEmojiTarget] = useState<MessageRecord | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceRecorder, setVoiceRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setText = (value: string) => {
    setInputValue?.(value);
    onTyping?.(value.length > 0);
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey || (!enterToSend && !event.ctrlKey)) return;
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

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background text-foreground">
      <header className="flex min-h-16 items-center gap-3 border-b bg-card px-3 py-2">
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
        <Button
          size="icon"
          variant="ghost"
          disabled={callStarting}
          onClick={() => onStartConversationCall?.("audio")}
        >
          <Phone />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={callStarting}
          onClick={() => onStartConversationCall?.("video")}
        >
          <Video />
        </Button>
        {isGroup && (
          <Button size="icon" variant="ghost" onClick={onOpenAddMembers}>
            <UsersRound />
          </Button>
        )}
      </header>

      {activeCall && (
        <InternalCallPanel
          activeCall={activeCall as any}
          onEnd={onEndActiveCall || (() => undefined)}
        />
      )}

      <div ref={chatBoxRef} className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-2 py-3">
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
            const dayKey = getMessageDayKey(message.sentAt || message.timestamp || Date.now());
            const previous = currentMessages[index - 1];
            const previousDayKey = previous
              ? getMessageDayKey(previous.sentAt || previous.timestamp || Date.now())
              : "";
            return (
              <div key={message.id || `${dayKey}-${index}`}>
                {dayKey !== previousDayKey && (
                  <div className="my-4 text-center text-[11px] font-medium text-muted-foreground">
                    {formatMessageDateLabel(message.sentAt || message.timestamp || Date.now())}
                  </div>
                )}
                <MessageRow
                  authorName={message.authorName || getBuddyName(message.sender)}
                  chatId={chatId}
                  currentUser={currentUser}
                  message={message}
                  messageInfoVersion={messageInfoVersions[String(message.id)] || 0}
                  onCopy={handleCopyMessage}
                  onDelete={handleDeleteMessages}
                  onEdit={handleEditMessage}
                  onForward={(item) => setActionsMessage(item)}
                  onBlock={handleBlockUser}
                  onPin={handlePinMessage}
                  onReact={(item, emoji) => handleReaction?.(item.id, emoji)}
                  onReply={handleReplyToMessage}
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
      {pendingFiles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t px-3 py-2">
          {pendingFiles.map((file, index) => (
            <button
              type="button"
              key={`${file.name}-${index}`}
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => removePendingFile?.(index)}
            >
              {file.name} ×
            </button>
          ))}
        </div>
      )}
      {sendError && <p className="border-t px-3 py-2 text-xs text-destructive">{sendError}</p>}
      <footer className="border-t bg-card p-3">
        <div className="flex items-center gap-2 rounded-xl border bg-background p-2">
          <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileUpload} />
          <Button
            size="icon"
            variant="ghost"
            disabled={uploading || sending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip />
          </Button>
          <Input
            value={inputValue}
            placeholder="Write a message…"
            disabled={sending}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onComposerKeyDown}
            onBlur={() => onTyping?.(false)}
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleRecording}
            title={recording ? "Stop recording" : "Record voice message"}
          >
            <Mic className={recording ? "text-destructive" : ""} />
          </Button>
          <Button
            size="icon"
            disabled={sending || (!inputValue.trim() && pendingFiles.length === 0)}
            onClick={handleSend}
          >
            <Send />
          </Button>
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
        }}
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
