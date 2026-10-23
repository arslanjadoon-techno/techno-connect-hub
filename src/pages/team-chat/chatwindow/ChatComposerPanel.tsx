import { useLayoutEffect, useMemo, type KeyboardEvent } from "react";
import { AlertCircle, CheckCircle2, Mic, Paperclip, Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import EmojiPicker from "./EmojiPicker";
import ConversationMediaDialog from "./ConversationMediaDialog";
import ScheduleCallDialog from "../calls/ScheduleCallDialog";
import { ForwardMessageDialog } from "./ChatWindowPanels";
import { getBuddyEmail, getBuddyName, getBuddySendId } from "../chatHealper";
import { AttachmentPreview } from "./AttachmentPreview";

const MAX_INPUT_HEIGHT = 224; // px, about 9 lines; scrolls after this

export default function ChatComposerPanel(props: Record<string, any>) {
  const {
    actionsMessage,
    availableChats = [],
    composerInputRef,
    currentMessages = [],
    currentUser,
    editingMessage,
    emojiAnchor,
    emojiTarget,
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
    setScheduleCallOpen,
    toggleRecording,
    uploading,
    scheduleCallOpen,
    mediaDialogOpen,
    setMediaDialogOpen,
    handleCancelComposerMode,
  } = props;

  // Grow the text box with its content so longer messages stay visible.
  useLayoutEffect(() => {
    const el = composerInputRef?.current as HTMLTextAreaElement | null;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_INPUT_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_INPUT_HEIGHT ? "auto" : "hidden";
  }, [inputValue, composerInputRef]);

  const busy = Boolean(uploading || (editingMessage && sending));
  const canSend = !busy && (inputValue.trim().length > 0 || pendingFiles.length > 0);

  const mentionCandidates = useMemo(() => {
    if (selectedChat?.type !== "channel" && selectedChat?.type !== "group") {
      return [];
    }

    const currentIds = new Set(
      [
        currentUser?.id,
        currentUser?.userId,
        currentUser?.user_id,
        currentUser?.appUserId,
        currentUser?.app_user_id,
      ]
        .filter((id) => id != null && id !== "")
        .map((id) => String(id).toLowerCase()),
    );

    const currentEmail = String(currentUser?.email ?? currentUser?.email_id ?? "")
      .trim()
      .toLowerCase();

    return groupMembers.map((member: any) => {
      const memberIds = [
        member.id,
        member.userId,
        member.user_id,
        member.appUserId,
        member.app_user_id,
      ]
        .filter((id) => id != null && id !== "")
        .map((id) => String(id).toLowerCase());

      const email = String(getBuddyEmail(member) ?? "")
        .trim()
        .toLowerCase();

      const name = String(getBuddyName(member) || "");

      const isSelf =
        memberIds.some((id: string) => currentIds.has(id)) ||
        (!!currentEmail && currentEmail === email);

      return { member, email, name, isSelf };
    });
  }, [groupMembers, currentUser, selectedChat?.type]);

  const filteredMentionMembers = useMemo(() => {
    if (mentionQuery === null) return [];

    const query = mentionQuery.toLowerCase();

    return mentionCandidates
      .filter(({ name, isSelf }) => !isSelf && name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [mentionCandidates, mentionQuery]);

  // Enter sends. Shift+Enter inserts a new line (the textarea's default behavior).
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // While the mention list is open, Enter picks the first match instead of sending.
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      mentionQuery !== null &&
      filteredMentionMembers.length > 0
    ) {
      event.preventDefault();
      insertMention(filteredMentionMembers[0].member);
      return;
    }

    // Let the parent handle anything else first (for example Escape closing the mention list).
    onComposerKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) handleSend?.();
    }
  };

  const bannerBase = "flex items-center gap-2 border-t px-3 py-2 text-xs";

  return (
    <>
      {replyToMessage && (
        <div className={`${bannerBase} bg-muted/40`}>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            Replying to{" "}
            <span className="text-foreground">{replyToMessage.authorName || "message"}</span>
          </span>
          <Button size="sm" variant="ghost" onClick={handleCancelComposerMode}>
            Cancel
          </Button>
        </div>
      )}
      {editingMessage && (
        <div className={`${bannerBase} justify-between bg-muted/40`}>
          <span>Editing message</span>
          <Button size="sm" variant="ghost" onClick={handleCancelComposerMode}>
            Cancel
          </Button>
        </div>
      )}
      {sendError && (
        <div
          role={sendMessageIsSuccess ? "status" : "alert"}
          className={`${bannerBase} ${sendMessageIsSuccess ? "bg-muted/40 text-muted-foreground" : "bg-destructive/5 text-destructive"}`}
        >
          {sendMessageIsSuccess ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="min-w-0 break-words">{sendError}</span>
        </div>
      )}

      <footer className="sticky bottom-0 z-10 shrink-0 border-t bg-card p-2">
        <div className="overflow-hidden rounded-xl border bg-background focus-within:ring-1 focus-within:ring-ring">
          <input ref={fileInputRef} type="file" multiple hidden onChange={props.handleFileUpload} />

          {pendingFiles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-3 pt-2">
              {pendingFiles.map((file: File, index: number) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex shrink-0 items-center gap-2 rounded-md border bg-muted/40 py-1 pl-2 pr-1 text-xs"
                >
                  <AttachmentPreview file={file} />
                  <span className="max-w-[200px] truncate">{file.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                    onClick={() => removePendingFile?.(index)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {recording && (
            <div className="flex items-center gap-2 border-b bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              Recording voice message. Select the microphone to stop.
            </div>
          )}

          {mentionQuery !== null && filteredMentionMembers.length > 0 && (
            <div className="max-h-48 overflow-y-auto border-b bg-popover p-1">
              {filteredMentionMembers.map(({ member, email, name }) => (
                <button
                  key={String(getBuddySendId(member) || email)}
                  type="button"
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertMention(member);
                  }}
                >
                  <span>{name}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">
                    {getBuddyEmail(member)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-1 px-1.5 py-1">
            <Button
              size="icon"
              variant="ghost"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              aria-label="Attach file"
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </Button>

            <Textarea
              ref={composerInputRef}
              value={inputValue}
              placeholder="Write a message"
              aria-label="Message"
              disabled={busy}
              onChange={(event) =>
                handleComposerChange(event.target.value, event.target.selectionStart || 0)
              }
              onKeyDown={handleKeyDown}
              onBlur={() => onTyping?.(false)}
              rows={1}
              className="min-h-[40px] flex-1 resize-none rounded-none border-0 bg-transparent px-1 py-2 text-sm font-normal shadow-none focus-visible:ring-0"
            />

            <Button
              size="icon"
              variant="ghost"
              title="Emoji"
              aria-label="Emoji"
              disabled={busy}
              onClick={(event) => setEmojiAnchor(event.currentTarget)}
            >
              <Smile className="h-[18px] w-[18px]" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleRecording}
              title={recording ? "Stop recording" : "Record voice message"}
              aria-label={recording ? "Stop recording" : "Record voice message"}
            >
              <Mic className={`h-[18px] w-[18px] ${recording ? "text-destructive" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="mt-1 flex justify-between px-1 text-[11px] text-muted-foreground">
          <span>Enter to send, Shift+Enter for a new line</span>
          <span>
            {pendingFiles.length > 0
              ? `${pendingFiles.length} ${pendingFiles.length === 1 ? "attachment" : "attachments"}`
              : ""}
          </span>
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
