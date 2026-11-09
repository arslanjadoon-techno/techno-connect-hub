import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  formatMessageDateLabel,
  getBuddyName,
  getBuddySendId,
  getImageUrl,
  getMessageDayKey,
} from "../chatHealper";
import { ReadyToSendState } from "./ChatWindowStates";
import MessageRow from "./MessageRow";

type ChatMessage = Record<string, any>;

function messageIdOf(message: ChatMessage | undefined): string {
  return String(
    message?.id ??
      message?.messageId ??
      message?.message_id ??
      message?.clientMessageId ??
      message?.client_message_id ??
      "",
  );
}

function distanceFromBottom(container: HTMLElement): number {
  return container.scrollHeight - container.scrollTop - container.clientHeight;
}

function usableAuthorName(value: unknown): string {
  const name = String(value || "").trim();
  if (!name || /^(chat\s*user|chatuser)$/i.test(name) || /^\d+$/.test(name)) return "";
  return name;
}

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
    onViewUser,
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
  const contentRef = useRef<HTMLDivElement | null>(null);
  const loadingOlderRef = useRef(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atBottomRef = useRef(true);
  const scrollSnapshotRef = useRef({
    chatKey: "",
    count: 0,
    firstId: "",
    lastId: "",
    scrollHeight: 0,
  });
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

  // Remember whether the reader was at the latest message before React inserts
  // the next message. This lets incoming messages append without moving a
  // reader who is browsing older history.
  useEffect(() => {
    const container = chatBoxRef?.current;
    if (!container) return;

    const handleScroll = () => {
      atBottomRef.current = distanceFromBottom(container) <= 32;
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [chatBoxRef]);

  // Scroll only after the message DOM has been committed. Initial loads and
  // chat switches go to the latest message; appends go there only when the
  // reader was already at the bottom; prepends preserve the visible message.
  useLayoutEffect(() => {
    const container = chatBoxRef?.current;
    if (!container) return;

    const chatKey = String(chatId ?? selectedChat?.id ?? "");
    const firstId = messageIdOf(currentMessages[0]);
    const lastId = messageIdOf(currentMessages[currentMessages.length - 1]);
    const previous = scrollSnapshotRef.current;
    const chatChanged = previous.chatKey !== chatKey;
    const initialMessagesLoaded =
      !chatChanged && previous.count === 0 && currentMessages.length > 0;
    const addedMessages = currentMessages.length > previous.count;
    const prependedMessages =
      !chatChanged &&
      addedMessages &&
      firstId !== previous.firstId;
    const appendedMessages =
      !chatChanged &&
      addedMessages &&
      !prependedMessages &&
      lastId !== previous.lastId;

    if (chatChanged || initialMessagesLoaded) {
      container.scrollTop = container.scrollHeight;
      atBottomRef.current = true;
    } else if (prependedMessages) {
      container.scrollTop += container.scrollHeight - previous.scrollHeight;
    } else if (appendedMessages && atBottomRef.current) {
      container.scrollTop = container.scrollHeight;
      atBottomRef.current = true;
    }

    scrollSnapshotRef.current = {
      chatKey,
      count: currentMessages.length,
      firstId,
      lastId,
      scrollHeight: container.scrollHeight,
    };
  }, [chatBoxRef, chatId, currentMessages, selectedChat?.id]);

  // Attachments and avatar images can change the content height after the
  // message render. Keep a reader who was already at the bottom anchored there
  // without disturbing someone browsing older messages.
  useEffect(() => {
    const container = chatBoxRef?.current;
    const content = contentRef.current;
    if (!container || !content || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) container.scrollTop = container.scrollHeight;
      scrollSnapshotRef.current.scrollHeight = container.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [chatBoxRef]);

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

    const elements = container.querySelectorAll("[data-message-id]") as NodeListOf<HTMLElement>;
    const target = Array.from(elements).find((element) => element.dataset.messageId === messageId);

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
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-transparent px-1 pb-0 pt-2 sm:px-2 sm:pt-3"
    >
      <div ref={contentRef}>
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

          const previousDirection = String(previous?.direction || "inbound").toLowerCase();
          const currentDirection = String(message.direction || "inbound").toLowerCase();

          const isGroupChat = selectedChat?.type === "channel" || selectedChat?.type === "group";
          const showGroupAvatar =
            (!isGroupChat ||
              index === 0 ||
              previousDayKey !== dayKey ||
              String(previousAuthor ?? "") !== String(currentAuthor ?? "") ||
              previousDirection !== currentDirection);

          const senderProfile =
            (selectedChat?.participants || selectedChat?.raw?.participants || []).find(
              (participant: ChatMessage) => {
                const participantId = String(getBuddySendId(participant) || "");
                return participantId && participantId === String(currentAuthor ?? "");
              },
            ) ||
            (selectedChat?.type === "person"
              ? selectedChat?.raw || selectedChat
              : undefined);

          // Older/live message payloads can contain a generic authorName even
          // though the selected conversation already has the real User
          // Management profile. Prefer the profile before showing "Chat User".
          const authorName =
            [message.authorName, getBuddyName(message.sender), getBuddyName(senderProfile)]
              .map(usableAuthorName)
              .find(Boolean) || "Chat user";

          return (
            <div
              key={messageId || `${dayKey}-${index}`}
              data-message-id={messageId || undefined}
              data-unread-message={message.isUnread ? "true" : undefined}
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
                authorName={authorName}
                chatId={chatId}
                currentUser={currentUser}
                message={{
                  ...message,
                  authorAvatarUrl:
                    getImageUrl(senderProfile) ||
                    getImageUrl(message.sender),
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
                onViewUser={onViewUser}
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

    </div>
  );
}
