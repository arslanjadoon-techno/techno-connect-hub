import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
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
  const loadingOlderRef = useRef(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousMessageSnapshotRef = useRef({ count: 0, lastId: "" });
  const [showNewMessages, setShowNewMessages] = useState(false);
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

  // Keep the WhatsApp-style new-message affordance visible only when the
  // reader is away from the latest message.
  useEffect(() => {
    const container = chatBoxRef?.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom <= 120) setShowNewMessages(false);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [chatBoxRef]);

  useEffect(() => {
    const lastMessage = currentMessages[currentMessages.length - 1] as ChatMessage | undefined;
    const lastId = String(
      lastMessage?.id ||
        lastMessage?.messageId ||
        lastMessage?.message_id ||
        lastMessage?.sentAt ||
        "",
    );
    const previous = previousMessageSnapshotRef.current;
    const container = chatBoxRef?.current;
    const distanceFromBottom = container
      ? container.scrollHeight - container.scrollTop - container.clientHeight
      : 0;

    if (
      previous.count > 0 &&
      currentMessages.length > previous.count &&
      lastId !== previous.lastId &&
      distanceFromBottom > 120 &&
      lastMessage?.direction !== "outbound" &&
      lastMessage?.deliveryStatus !== "read" &&
      lastMessage?.deliveryStatus !== "seen"
    ) {
      setShowNewMessages(true);
    } else if (distanceFromBottom <= 120) {
      setShowNewMessages(false);
    }

    previousMessageSnapshotRef.current = { count: currentMessages.length, lastId };
  }, [chatBoxRef, currentMessages]);

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

          const previousDirection = String(previous?.direction || "inbound").toLowerCase();
          const currentDirection = String(message.direction || "inbound").toLowerCase();

          const isGroupChat = selectedChat?.type === "channel" || selectedChat?.type === "group";
          const showGroupAvatar =
            (!isGroupChat ||
              index === 0 ||
              previousDayKey !== dayKey ||
              String(previousAuthor ?? "") !== String(currentAuthor ?? "") ||
              previousDirection !== currentDirection);

          const senderProfile = (selectedChat?.participants || selectedChat?.raw?.participants || [])
            .find((participant: ChatMessage) => {
              const participantId = String(getBuddySendId(participant) || "");
              return participantId && participantId === String(currentAuthor ?? "");
            });

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
                authorName={message.authorName || getBuddyName(message.sender) || getBuddyName(senderProfile)}
                chatId={chatId}
                currentUser={currentUser}
                message={{
                  ...message,
                  authorAvatarUrl:
                    message.authorAvatarUrl ||
                    getImageUrl(message.sender) ||
                    getImageUrl(senderProfile) ||
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

      {showNewMessages && (
        <div className="sticky bottom-3 z-20 flex justify-end px-3 pointer-events-none">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto rounded-full border border-primary/30 bg-primary px-3 text-primary-foreground shadow-md hover:bg-primary/90"
            onClick={() => {
              if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
              setShowNewMessages(false);
            }}
          >
            New messages
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
