import { AlertCircle, Bold, CheckCircle2, Italic, Mic, Paperclip, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import EmojiPicker from "./EmojiPicker";
import ConversationMediaDialog from "./ConversationMediaDialog";
import ScheduleCallDialog from "../calls/ScheduleCallDialog";
import { ForwardMessageDialog } from "./ChatWindowPanels";
import { getBuddyEmail, getBuddyName, getBuddySendId } from "../chatHealper";

export default function ChatComposerPanel(props: Record<string, any>) {
  const {
    actionsMessage,
    applyTextFormat,
    availableChats = [],
    composerInputRef,
    currentMessages = [],
    currentUser,
    editingMessage,
    emojiAnchor,
    emojiTarget,
    enterToSend,
    fileInputRef,
    groupMembers = [],
    handleComposerChange,
    handleForwardMessage,
    handleSend,
    inputValue = "",
    insertEmoji,
    insertMention,
    mentionQuery,
    onComposerKeyDown,
    onTyping,
    pendingFiles = [],
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
    setRecording,
    setScheduleCallOpen,
    toggleRecording,
    uploading,
    scheduleCallOpen,
    mediaDialogOpen,
    setMediaDialogOpen,
    handleCancelComposerMode,
  } = props;

  return (
    <>
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
          className={`flex items-center gap-2 border-t px-3 py-2 text-xs ${sendMessageIsSuccess ? "bg-muted/40 text-muted-foreground" : "bg-destructive/5 text-destructive"}`}
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
          <input ref={fileInputRef} type="file" multiple hidden onChange={props.handleFileUpload} />
          {pendingFiles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-3 pt-2">
              {pendingFiles.map((file: File, index: number) => (
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
              {(selectedChat?.type === "channel" ? groupMembers : [])
                .filter((member: any) =>
                  getBuddyName(member).toLowerCase().includes(mentionQuery.toLowerCase()),
                )
                .slice(0, 8)
                .map((member: any) => (
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
            disabled={Boolean(uploading || (editingMessage && sending))}
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
                disabled={Boolean(uploading || (editingMessage && sending))}
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <Paperclip className="h-[18px] w-[18px]" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Emoji"
                disabled={Boolean(uploading || (editingMessage && sending))}
                onClick={(event) => setEmojiAnchor(event.currentTarget)}
              >
                <Smile className="h-[18px] w-[18px]" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Bold"
                disabled={Boolean(uploading || (editingMessage && sending))}
                onClick={() => applyTextFormat("**")}
              >
                <Bold className="h-[18px] w-[18px]" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Italic"
                disabled={Boolean(uploading || (editingMessage && sending))}
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
              disabled={Boolean(
                uploading ||
                  (editingMessage && sending) ||
                  (!inputValue.trim() && pendingFiles.length === 0),
              )}
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
          if (emojiTarget?.id != null) props.handleReaction?.(emojiTarget.id, emoji);
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
    </>
  );
}
