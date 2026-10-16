import { memo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  CornerUpLeft,
  Eye,
  Forward,
  Phone,
  Pin,
  SmilePlus,
  Video,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getChatMessageInfoService } from "@/services/Team-chat/chat.service";
import { getBuddyName, getImageUrl } from "../chatHealper";
import MessageAttachments from "./MessageAttachments";
import MessageText from "./MessageText";
import MessageActions from "./MessageActions";

type RecordValue = Record<string, any>;

interface MessageRowProps {
  authorName?: string;
  chatId?: string | number;
  currentUser?: RecordValue;
  message: RecordValue;
  mentionableUsers?: RecordValue[];
  messageInfoVersion?: number;
  blocked?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  /** True for the first message in a run from one sender: shows avatar, name and bubble tail. */
  showAvatar?: boolean;
  onCopy?: (message: RecordValue) => void;
  onBlock?: (message: RecordValue) => void;
  onDelete?: (message: RecordValue) => void;
  onEdit?: (message: RecordValue) => void;
  onForward?: (message: RecordValue) => void;
  onPin?: (message: RecordValue) => void;
  onReact?: (message: RecordValue, emoji: string) => void;
  onReply?: (message: RecordValue) => void;
  onJumpToMessage?: (messageId: string) => void;
  onOpenReactionPicker?: (message: RecordValue, element: HTMLElement) => void;
  onSelect?: (message: RecordValue) => void;
}

const EDIT_WINDOW_MS = 10 * 60 * 1000;
const SWIPE_TRIGGER = 64; // px of rightward swipe that triggers a reply
const SWIPE_MAX = 88;
const LONG_PRESS_MS = 450;
const COLLAPSE_AT = 700; // characters before "Read more" appears
const MEMBER_EVENTS = ["group_member_removed", "group_member_added", "group_member_joined"];

// Colors come from the app theme tokens, so bubbles follow light/dark mode and your brand color.
const BUBBLE_OUT = "bg-primary/10";
const BUBBLE_IN = "bg-muted";
const TEXT_MAIN = "text-foreground";
const TEXT_META = "text-muted-foreground";
const TICK_READ = "text-primary";
const formatDate = (value?: string | number | Date) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

function Status({ status }: { status?: string }) {
  switch (String(status || "").toLowerCase()) {
    case "read":
    case "seen":
      return <CheckCheck aria-label="Read" className={`h-4 w-4 ${TICK_READ}`} />;

    case "delivered":
      return <CheckCheck aria-label="Delivered" className="h-4 w-4" />;

    case "sending":
    case "pending":
      return <Clock aria-label="Sending" className="h-3 w-3" />;

    case "failed":
      return <AlertCircle aria-label="Failed to send" className="h-4 w-4 text-red-500" />;

    default:
      return <Check aria-label="Sent" className="h-4 w-4" />;
  }
}

function Tag({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className={`mb-1 flex items-center gap-1 text-xs ${TEXT_META}`}>
      {icon}
      {children}
    </p>
  );
}

function QuickButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (element: HTMLElement) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event.currentTarget);
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${TEXT_META}`}
    >
      {children}
    </button>
  );
}

function MessageRow({
  authorName = "Chat user",
  chatId,
  currentUser,
  message,
  mentionableUsers = [],
  blocked = false,
  selected = false,
  selectionMode = false,
  showAvatar = true,
  onCopy,
  onBlock,
  onDelete,
  onEdit,
  onForward,
  onPin,
  onReact,
  onReply,
  onJumpToMessage,
  onOpenReactionPicker,
  onSelect,
}: MessageRowProps) {
  const [actionsAnchor, setActionsAnchor] = useState<HTMLElement | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoData, setInfoData] = useState<RecordValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragX, setDragX] = useState(0);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const isMe = message.direction === "outbound";
  const name = isMe ? getBuddyName(currentUser) : authorName;
  const currentUserIdentity = String(
    currentUser?.appUserId ||
      currentUser?.app_user_id ||
      currentUser?.userId ||
      currentUser?.id ||
      "",
  );
  const avatarUrl =
    message.authorAvatarUrl ||
    getImageUrl(message.sender) ||
    (String(message.authorId || "") === currentUserIdentity ? getImageUrl(currentUser) : "");

  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const reply = message.repliedMessage || message.replyToMessage;
  const deleted = Boolean(message.deletedAt);
  const isForwarded =
    !deleted &&
    Boolean(
      message.metadata?.forwardedFrom ||
      message.metadata?.forwarded ||
      message.forwardedFrom ||
      message.forwarded,
    );
  const callHistory = message.callHistory || message.metadata?.callHistory;
  const callStatus = String(callHistory?.status || "").toLowerCase();
  const callIsError = callStatus === "missed" || callStatus === "declined";
  const callIsComplete = callStatus === "ended";
  const text = String(message.text || "");
  const hasText = Boolean(message.text) && message.text !== "[Attachment]";
  const isLong = text.length > COLLAPSE_AT;
  const reactions: RecordValue[] = Array.isArray(message.reactions) ? message.reactions : [];
  const fullDate = formatDate(message.sentAt);

  const messageAge = Date.now() - new Date(message.sentAt || message.timestamp).getTime();
  const canEdit =
    isMe && Number.isFinite(messageAge) && messageAge >= 0 && messageAge <= EDIT_WINDOW_MS;

  const loadInfo = async () => {
    setActionsAnchor(null);
    setInfoOpen(true);
    if (infoData || loading || !chatId || !message.id) return;
    setLoading(true);
    try {
      const response: any = await getChatMessageInfoService(chatId, message.id);
      setInfoData(response?.data?.data || response?.data || response || {});
    } catch {
      setInfoData({ error: "Message details are unavailable." });
    } finally {
      setLoading(false);
    }
  };

  // Touch gestures: swipe right to reply, long press for the actions menu.
  // Mouse input is ignored here so selecting text with the mouse never triggers a reply.
  const clearPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse" || selectionMode) return;
    touchStart.current = { x: event.clientX, y: event.clientY };
    longPressed.current = false;
    clearPress();
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      touchStart.current = null;
      setDragX(0);
      navigator.vibrate?.(10);
      if (bubbleRef.current) setActionsAnchor(bubbleRef.current);
    }, LONG_PRESS_MS);
  };
  const handlePointerMove = (event: React.PointerEvent) => {
    const start = touchStart.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = Math.abs(event.clientY - start.y);
    if (dy > 24 || Math.abs(dx) > 10) clearPress();
    if (dy > 24) {
      touchStart.current = null;
      setDragX(0);
      return;
    }
    if (dx > 10) setDragX(Math.min(dx, SWIPE_MAX));
  };
  const endTouch = (trigger: boolean) => {
    clearPress();
    if (trigger && touchStart.current && dragX >= SWIPE_TRIGGER) onReply?.(message);
    touchStart.current = null;
    setDragX(0);
  };

  // Group membership events render as a centered system pill.
  const systemKind = String(message.metadata?.kind || message.systemEventType || "");
  if (MEMBER_EVENTS.includes(systemKind)) {
    const actor = message.metadata?.actorName;
    const member = message.metadata?.memberName;
    const removed = systemKind === "group_member_removed";
    const systemText =
      actor || member
        ? `${actor || "A member"} ${removed ? "removed" : "added"} ${member || "a member"} ${removed ? "from" : "to"} the group.`
        : message.text || "Group membership updated.";
    return (
      <div className="my-2 flex justify-center px-4" role="status">
        <p className={`rounded-full bg-muted px-3 py-1 text-center text-xs ${TEXT_META}`}>
          {systemText}
        </p>
      </div>
    );
  }

  const recipients: RecordValue[] = Array.isArray(infoData?.recipients) ? infoData.recipients : [];
  const readRecipients = recipients.filter((r) => String(r.status).toLowerCase() === "read");
  const deliveredRecipients = recipients.filter((r) => String(r.status).toLowerCase() !== "read");

  const renderRecipient = (recipient: RecordValue) => {
    const read = String(recipient.status || "").toLowerCase() === "read";
    const recipientName = recipient.user?.name || recipient.user?.email || "Recipient";
    const when = formatDate(read ? recipient.readAt : recipient.deliveredAt);
    return (
      <div key={recipient.user?.id || recipientName} className="flex items-center gap-3 py-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {recipientName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate">{recipientName}</p>
          {when && <p className="text-xs text-muted-foreground">{when}</p>}
        </div>
        <CheckCheck className={`h-4 w-4 ${read ? TICK_READ : "text-muted-foreground"}`} />
      </div>
    );
  };

  const tail = (
    <span
      aria-hidden="true"
      className={`absolute top-0 h-3 w-2 bg-inherit ${isMe ? "-right-[7px]" : "-left-[7px]"}`}
      style={{
        clipPath: isMe ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(0 0, 100% 0, 100% 100%)",
      }}
    />
  );

  // Hover shortcuts beside the bubble: react and reply. Hidden on touch screens.
  const quickActions = !selectionMode && !deleted && (
    <div className="flex items-center gap-1 self-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden">
      {!isMe && (
        <QuickButton label="React" onClick={(el) => onOpenReactionPicker?.(message, el)}>
          <SmilePlus className="h-4 w-4" />
        </QuickButton>
      )}
      <QuickButton label="Reply" onClick={() => onReply?.(message)}>
        <CornerUpLeft className="h-4 w-4" />
      </QuickButton>
    </div>
  );

  const progress = Math.min(dragX / SWIPE_TRIGGER, 1);

  return (
    <>
      <div
        className={`group relative flex w-full min-w-0 max-w-full touch-pan-y items-start gap-2 px-3 sm:px-6 ${showAvatar ? "mt-2" : "mt-px"} ${isMe ? "justify-end" : "justify-start"} ${selected ? "bg-primary/10" : ""}`}
        onClick={() => selectionMode && onSelect?.(message)}
        onContextMenu={(event) => longPressed.current && event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => endTouch(true)}
        onPointerCancel={() => endTouch(false)}
      >
        {dragX > 8 && (
          <span
            aria-hidden="true"
            className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground"
            style={{
              opacity: progress,
              transform: `translateY(-50%) scale(${0.6 + progress * 0.4})`,
            }}
          >
            <CornerUpLeft className="h-4 w-4" />
          </span>
        )}

        {selectionMode && (
          <input
            type="checkbox"
            aria-label="Select message"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={() => onSelect?.(message)}
            className="mt-2 h-4 w-4 shrink-0 accent-primary"
          />
        )}

        {!isMe &&
          (showAvatar ? (
            <Avatar className="mt-0.5 h-8 w-8 shrink-0 bg-primary/10 text-xs text-primary">
              <AvatarImage key={avatarUrl} src={avatarUrl} />
              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8 shrink-0" />
          ))}

        {isMe && quickActions}

        <div
          className={`flex min-w-0 max-w-[85%] flex-col sm:max-w-[65%] ${isMe ? "items-end" : "items-start"}`}
          style={{
            transform: dragX ? `translateX(${dragX}px)` : undefined,
            transition: dragX ? "none" : "transform 180ms ease-out",
          }}
        >
          <div
            ref={bubbleRef}
            className={`relative min-w-[84px] max-w-full rounded-lg px-2 pb-1 pt-1.5 text-[14.2px] leading-[1.4] font-normal shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] [overflow-wrap:anywhere] ${TEXT_MAIN} ${isMe ? BUBBLE_OUT : BUBBLE_IN} ${showAvatar ? (isMe ? "rounded-tr-none" : "rounded-tl-none") : ""}`}
          >
            {showAvatar && tail}

            {!deleted && (
              <button
                type="button"
                aria-label="Message actions"
                className={`absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-inherit ${TEXT_META} transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:none)]:hidden`}
                onClick={(event) => {
                  event.stopPropagation();
                  setActionsAnchor(event.currentTarget);
                }}
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            )}

            {!isMe && showAvatar && <p className="mb-0.5 pr-6 text-[13px] text-primary">{name}</p>}

            {isForwarded && <Tag icon={<Forward className="h-3.5 w-3.5" />}>Forwarded</Tag>}
            {message.metadata?.pinned && <Tag icon={<Pin className="h-3 w-3" />}>Pinned</Tag>}

            {reply && !deleted && (
              <button
                type="button"
                className="mb-1 block w-full overflow-hidden rounded-md border-l-4 border-primary bg-background/60 px-2 py-1 text-left transition-colors hover:bg-background"
                onClick={(event) => {
                  event.stopPropagation();
                  if (reply?.id) onJumpToMessage?.(String(reply.id));
                }}
              >
                <p className="text-[12.5px] text-primary">{reply.authorName || "Message"}</p>
                <p className={`line-clamp-2 text-[13px] ${TEXT_META}`}>
                  {reply.text || "Attachment"}
                </p>
              </button>
            )}

            {callHistory && !deleted && (
              <div className="flex items-center gap-3 py-1 pr-10">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${callIsError ? "bg-red-500/15 text-red-500" : "bg-primary/10 text-primary"}`}
                >
                  {String(callHistory.type).toLowerCase() === "video" ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <Phone className="h-5 w-5" />
                  )}
                </span>
                <span className={callIsError ? "text-red-500" : callIsComplete ? "" : TEXT_META}>
                  {callStatus === "missed"
                    ? `Missed call from ${callHistory.startedBy?.name || message.authorName || "Unknown user"}`
                    : `${callHistory.type || "Audio"} call ${callStatus || "ended"}`}
                </span>
              </div>
            )}

            {!deleted && <MessageAttachments attachments={attachments} message={message} />}

            <div className="flow-root">
              {deleted ? (
                <p className={`flex items-center gap-1.5 pr-10 ${TEXT_META}`}>
                  <Ban className="h-3.5 w-3.5" />
                  This message was deleted
                </p>
              ) : (
                !callHistory &&
                (attachments.length === 0 || hasText) && (
                  <>
                    <p
                      className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${attachments.length > 0 ? "mt-1.5" : ""} ${isLong && !expanded ? "line-clamp-[14]" : ""}`}
                    >
                      <MessageText text={text} mentionableUsers={mentionableUsers} />
                    </p>
                    {isLong && (
                      <button
                        type="button"
                        className="mt-0.5 text-[13px] text-primary hover:underline focus-visible:outline-none focus-visible:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpanded((value) => !value);
                        }}
                      >
                        {expanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </>
                )
              )}
              <span
                title={fullDate}
                className={`float-right -mb-0.5 ml-3 mt-1 inline-flex translate-y-0.5 items-center gap-1 text-[11px] leading-none ${TEXT_META}`}
              >
                {message.edited && !deleted && <span>Edited</span>}
                {message.timestamp || ""}
                {isMe && <Status status={message.deliveryStatus} />}
              </span>
            </div>
          </div>

          {reactions.length > 0 && !deleted && (
            <div
              className={`relative z-10 -mt-2 flex flex-wrap gap-1 ${isMe ? "mr-2 justify-end" : "ml-2"}`}
            >
              {reactions.map((reaction) => (
                <button
                  type="button"
                  key={reaction.emoji}
                  aria-label={`React with ${reaction.emoji}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReact?.(message, reaction.emoji);
                  }}
                  className={`flex items-center gap-1 rounded-full border bg-background px-1.5 py-0.5 text-[13px] shadow-sm transition-transform hover:scale-105 ${TEXT_MAIN}`}
                >
                  <span>{reaction.emoji}</span>
                  {Number(reaction.count) > 1 && (
                    <span className={`text-[11px] ${TEXT_META}`}>{reaction.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isMe && quickActions}
      </div>

      <MessageActions
        anchorEl={actionsAnchor}
        isMe={isMe}
        canEdit={canEdit}
        message={message}
        onBlock={onBlock}
        onClose={() => setActionsAnchor(null)}
        onCopy={onCopy}
        onDelete={onDelete}
        onEdit={onEdit}
        onForward={onForward}
        onPin={onPin}
        onReply={onReply}
        onSelect={onSelect}
        onInfo={loadInfo}
        onOpenPicker={isMe ? undefined : (element) => onOpenReactionPicker?.(message, element)}
        onReact={isMe ? undefined : (emoji) => onReact?.(message, emoji)}
        blocked={blocked}
      />

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-h-[85vh] max-w-[min(92vw,480px)] overflow-hidden">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <DialogTitle className="font-normal">Message info</DialogTitle>
            </div>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading delivery details…</p>
          ) : infoData?.error ? (
            <p className="text-sm text-destructive">{infoData.error}</p>
          ) : (
            <div className="max-h-[60vh] space-y-4 overflow-y-auto text-sm">
              <div className="flex justify-end rounded-lg bg-muted/50 p-4">
                <div
                  className={`max-w-[85%] rounded-lg rounded-tr-none px-3 py-2 ${BUBBLE_OUT} ${TEXT_MAIN}`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {infoData?.message?.text || message.text || "Attachment"}
                  </p>
                  <p className={`mt-1 text-right text-[11px] ${TEXT_META}`}>
                    {formatDate(infoData?.message?.createdAt || message.sentAt)}
                  </p>
                </div>
              </div>

              {Array.isArray(infoData?.message?.attachments) &&
                infoData.message.attachments.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Attachments</p>
                    {infoData.message.attachments.map((attachment: RecordValue) => (
                      <p key={attachment.id || attachment.name} className="truncate text-xs">
                        {attachment.name || "Attachment"}
                      </p>
                    ))}
                  </div>
                )}

              {readRecipients.length > 0 && (
                <section>
                  <p className="flex items-center gap-2 border-b pb-1 text-muted-foreground">
                    <CheckCheck className={`h-4 w-4 ${TICK_READ}`} />
                    Read by {readRecipients.length}
                  </p>
                  <div className="divide-y">{readRecipients.map(renderRecipient)}</div>
                </section>
              )}

              {deliveredRecipients.length > 0 && (
                <section>
                  <p className="flex items-center gap-2 border-b pb-1 text-muted-foreground">
                    <CheckCheck className="h-4 w-4" />
                    Delivered to {deliveredRecipients.length}
                  </p>
                  <div className="divide-y">{deliveredRecipients.map(renderRecipient)}</div>
                </section>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setInfoOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(MessageRow);
