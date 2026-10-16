import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  formatMessageDateLabel,
  getBuddyName,
  getImageUrl,
  getMessageDayKey,
} from "../chatHealper";
import { ReadyToSendState } from "./ChatWindowStates";
import MessageRow from "./MessageRow";

type ChatMessage = Record<string, any>;

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
    // handleForwardMessage,
    handlePinMessage,
    handleReaction,
    handleReplyToMessage,
    hasOlderMessages = false,
    highlightedMessageId,
    loadingOlderMessages = false,
    mentionableUsers = [],
    messageInfoVersions = {},
    onLoadOlderMessages,
    selectedChat,
    selectedMessageIds = [],
    setActionsMessage,
    setEmojiAnchor,
    setEmojiTarget,
    setHighlightedMessageId,
    setSelectedMessageIds,
  } = props;

  const olderMessagesSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingOlderRef = useRef(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  console.log(selectedChat, "selected");

  // Keep the loading guard synchronized with the parent loading state.
  useEffect(() => {
    loadingOlderRef.current = loadingOlderMessages;
  }, [loadingOlderMessages]);

  // Load older messages when the top sentinel becomes visible.
  useEffect(() => {
    const sentinel = olderMessagesSentinelRef.current;

    if (
      !sentinel ||
      !hasOlderMessages ||
      !onLoadOlderMessages ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !loadingOlderRef.current && hasOlderMessages) {
          // Set the guard before calling the parent to prevent duplicate calls.
          loadingOlderRef.current = true;
          onLoadOlderMessages();
        }
      },
      {
        root: chatBoxRef?.current || null,
        rootMargin: "240px 0px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [chatBoxRef, hasOlderMessages, loadingOlderMessages, onLoadOlderMessages]);

  // Clear the highlight timeout when this component unmounts.
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Build a lookup map for replies instead of repeatedly scanning all messages.
  const messageById = useMemo(() => {
    const map = new Map<string, ChatMessage>();

    for (const message of currentMessages as ChatMessage[]) {
      if (message.id != null) {
        map.set(String(message.id), message);
      }
    }

    return map;
  }, [currentMessages]);

  const getMessageDate = (message: ChatMessage) =>
    message.sentAt ?? message.timestamp ?? message.createdAt ?? message.created_at ?? null;

  const scrollToMessage = (messageId: string) => {
    const container = chatBoxRef?.current;

    if (!container) return;

    const target = Array.from(container.querySelectorAll<HTMLElement>("[data-message-id]")).find(
      (element) => element.dataset.messageId === messageId,
    );

    if (!target) {
      console.warn("Message is not currently rendered:", messageId);
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    setHighlightedMessageId?.(messageId);

    if (highlightTimeoutRef.current !== null) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMessageId?.(null);
      highlightTimeoutRef.current = null;
    }, 1400);
  };

  return (
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
                const selectedMessages = (currentMessages as ChatMessage[]).filter((message) =>
                  selectedMessageIds.includes(String(message.id)),
                );

                handleDeleteMessages?.(selectedMessages);
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
            onClick={() => {
              if (!loadingOlderRef.current && typeof onLoadOlderMessages === "function") {
                loadingOlderRef.current = true;
                onLoadOlderMessages();
              }
            }}
          >
            {loadingOlderMessages ? "Loading…" : "Load older messages"}
          </Button>
        </div>
      )}

      {currentMessages.length === 0 ? (
        <ReadyToSendState selectedChat={selectedChat} />
      ) : (
        (currentMessages as ChatMessage[]).map((message, index) => {
          const messageId = message.id != null ? String(message.id) : "";

          const replyId = message.replyToMessageId ?? message.replyTo ?? message.reply_to;

          const repliedMessage =
            message.repliedMessage || (replyId != null ? messageById.get(String(replyId)) : null);

          const messageDate = getMessageDate(message);
          const dayKey = messageDate ? getMessageDayKey(messageDate) : "unknown-date";

          const previous = currentMessages[index - 1] as ChatMessage | undefined;

          const previousDate = previous ? getMessageDate(previous) : null;

          const previousDayKey = previousDate ? getMessageDayKey(previousDate) : "";

          const previousAuthor = previous?.authorId ?? previous?.sender?.id ?? previous?.senderId;

          const currentAuthor = message.authorId ?? message.sender?.id ?? message.senderId;

          const showGroupAvatar =
            selectedChat?.type !== "channel" ||
            String(previousAuthor ?? "") !== String(currentAuthor ?? "");

          return (
            <div
              key={messageId || `${dayKey}-${index}`}
              data-message-id={messageId || undefined}
              className={
                highlightedMessageId === messageId && messageId
                  ? "rounded-lg bg-primary/10 ring-2 ring-primary/40 transition-colors"
                  : "transition-colors"
              }
            >
              {dayKey !== previousDayKey && messageDate && (
                <div className="my-4 text-center text-[11px] font-medium text-muted-foreground">
                  {formatMessageDateLabel(messageDate)}
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
                mentionableUsers={selectedChat?.type === "channel" ? mentionableUsers : []}
                showAvatar={showGroupAvatar}
                messageInfoVersion={messageInfoVersions[messageId] || 0}
                onCopy={handleCopyMessage}
                onDelete={handleDeleteMessages}
                onEdit={handleEditMessage}
                onForward={(item: ChatMessage) => setActionsMessage(item)}
                onBlock={handleBlockUser}
                onPin={handlePinMessage}
                onReact={(item: ChatMessage, emoji: string) => handleReaction?.(item.id, emoji)}
                onReply={handleReplyToMessage}
                selectionMode={selectedMessageIds.length > 0}
                selected={selectedMessageIds.includes(messageId)}
                onSelect={(selectedMessage: ChatMessage) => {
                  const id = String(selectedMessage.id);

                  setSelectedMessageIds((previousIds: string[]) =>
                    previousIds.includes(id)
                      ? previousIds.filter((item) => item !== id)
                      : [...previousIds, id],
                  );
                }}
                onJumpToMessage={(targetMessageId: string) => {
                  scrollToMessage(String(targetMessageId));
                }}
                blocked={blockedUserIds.includes(String(message.authorId ?? ""))}
                onOpenReactionPicker={(item: ChatMessage, element: HTMLElement) => {
                  setEmojiTarget(item);
                  setEmojiAnchor(element);
                }}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
