import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  formatMessageDateLabel,
  getBuddyName,
  getImageUrl,
  getMessageDayKey,
} from "../chatHealper";
import { ReadyToSendState } from "./ChatWindowStates";
import MessageRow from "./MessageRow";

export default function ChatMessageList(props: Record<string, any>) {
  const {
    blockedUserIds = [],
    chatBoxRef,
    chatId,
    currentMessages = [],
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
    mentionableUsers = [],
    messageInfoVersions = {},
    messageSearchOpen,
    messageSearchTerm,
    onLoadOlderMessages,
    selectedChat,
    selectedMessageIds = [],
    setActionsMessage,
    setEmojiAnchor,
    setEmojiTarget,
    setHighlightedMessageId,
    setMessageSearchOpen,
    setSelectedMessageIds,
  } = props;
  const olderMessagesSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = olderMessagesSentinelRef.current;
    if (!sentinel || !hasOlderMessages || !onLoadOlderMessages) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !loadingOlderMessages) onLoadOlderMessages();
      },
      { root: chatBoxRef?.current || null, rootMargin: "240px 0px 0px", threshold: 0.01 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [chatBoxRef, hasOlderMessages, loadingOlderMessages, onLoadOlderMessages]);

  return (
    <>
      {messageSearchOpen && messageSearchTerm.trim() && (
        <div className="absolute right-3 top-16 z-40 max-h-56 w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          {currentMessages
            .filter((message: any) =>
              String(message.text || "")
                .toLowerCase()
                .includes(messageSearchTerm.trim().toLowerCase()),
            )
            .map((message: any) => (
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
            (message: any) =>
              !String(message.text || "")
                .toLowerCase()
                .includes(messageSearchTerm.trim().toLowerCase()),
          ) && (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">No messages found</p>
          )}
        </div>
      )}
      <div
        ref={chatBoxRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 px-1 pb-0 pt-2 sm:px-2 sm:pt-3"
      >
        <div ref={olderMessagesSentinelRef} aria-hidden="true" className="h-px w-full" />
        {selectedMessageIds.length > 0 && (
          <div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs shadow-sm">
            <span>{selectedMessageIds.length} message(s) selected</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  handleDeleteMessages?.(
                    currentMessages.filter((item: any) =>
                      selectedMessageIds.includes(String(item.id)),
                    ),
                  );
                  setSelectedMessageIds([]);
                }}
              >
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedMessageIds([])}>
                Cancel
              </Button>
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
          <ReadyToSendState selectedChat={selectedChat} />
        ) : (
          currentMessages.map((message: any, index: number) => {
            const replyId = message.replyToMessageId || message.replyTo || message.reply_to;
            const repliedMessage =
              message.repliedMessage ||
              (replyId
                ? currentMessages.find((candidate: any) => String(candidate.id) === String(replyId))
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
                className={
                  highlightedMessageId === String(message.id)
                    ? "rounded-lg bg-primary/10 ring-2 ring-primary/40 transition-colors"
                    : "transition-colors"
                }
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
                      message.authorAvatarUrl ||
                      getImageUrl(message.sender) ||
                      getImageUrl(selectedChat),
                    repliedMessage: repliedMessage || message.repliedMessage,
                  }}
                  mentionableUsers={selectedChat.type === "channel" ? mentionableUsers : []}
                  showAvatar={showGroupAvatar}
                  messageInfoVersion={messageInfoVersions[String(message.id)] || 0}
                  onCopy={handleCopyMessage}
                  onDelete={handleDeleteMessages}
                  onEdit={handleEditMessage}
                  onForward={(item: any) => setActionsMessage(item)}
                  onBlock={handleBlockUser}
                  onPin={handlePinMessage}
                  onReact={(item: any, emoji: string) => handleReaction?.(item.id, emoji)}
                  onReply={handleReplyToMessage}
                  selectionMode={selectedMessageIds.length > 0}
                  selected={selectedMessageIds.includes(String(message.id))}
                  onSelect={(selectedMessage: any) => {
                    const id = String(selectedMessage.id);
                    setSelectedMessageIds((previous: string[]) =>
                      previous.includes(id)
                        ? previous.filter((item) => item !== id)
                        : [...previous, id],
                    );
                  }}
                  onJumpToMessage={(messageId: string) => {
                    const target = chatBoxRef?.current?.querySelector(
                      `[data-message-id="${CSS.escape(messageId)}"]`,
                    ) as HTMLElement | null;
                    target?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setHighlightedMessageId(messageId);
                    window.setTimeout(() => setHighlightedMessageId(null), 1400);
                  }}
                  blocked={blockedUserIds.includes(String(message.authorId))}
                  onOpenReactionPicker={(item: any, element: HTMLElement) => {
                    setEmojiTarget(item);
                    setEmojiAnchor(element);
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
