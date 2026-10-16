import { memo, useRef, useState } from "react";
import { Check, CheckCheck, Eye, Info, Pin, Phone, Video } from "lucide-react";
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
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const isMe = message.direction === "outbound";
  const name = isMe ? getBuddyName(currentUser) : authorName;
  const currentUserIdentity = String(
    currentUser?.appUserId ||
      currentUser?.app_user_id ||
      currentUser?.userId ||
      currentUser?.id ||
      "",
  );
  const messageAvatarUrl =
    message.authorAvatarUrl ||
    getImageUrl(message.sender) ||
    (String(message.authorId || "") === currentUserIdentity ? getImageUrl(currentUser) : "");
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const callHistory = message.callHistory || message.metadata?.callHistory;
  const callStatus = String(callHistory?.status || "").toLowerCase();
  const callIsError = callStatus === "missed" || callStatus === "declined";
  const callIsComplete = callStatus === "ended";
  const messageAge = Date.now() - new Date(message.sentAt || message.timestamp).getTime();
  const canEdit =
    isMe && Number.isFinite(messageAge) && messageAge >= 0 && messageAge <= 10 * 60 * 1000;
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
  const systemKind = String(message.metadata?.kind || message.systemEventType || "");
  if (
    systemKind === "group_member_removed" ||
    systemKind === "group_member_added" ||
    systemKind === "group_member_joined"
  ) {
    const hasMemberDetails = message.metadata?.actorName || message.metadata?.memberName;
    const systemText = String(
      hasMemberDetails
        ? systemKind === "group_member_removed"
          ? `${message.metadata?.actorName || "A member"} removed ${message.metadata?.memberName || "a member"} from the group.`
          : `${message.metadata?.actorName || "A member"} added ${message.metadata?.memberName || "a member"} to the group.`
        : message.text || "Group membership updated.",
    );
    return (
      <div className="my-2 flex justify-center px-4" role="status">
        <p className="rounded-full bg-muted/60 px-3 py-1 text-center text-[11px] text-muted-foreground shadow-sm">
          {systemText}
        </p>
      </div>
    );
  }
  return (
    <>
      <div
        className={`group flex w-full min-w-0 max-w-full gap-1.5 overflow-hidden rounded px-1 py-0.5 sm:px-2 sm:py-0.5 ${isMe ? "justify-end" : "justify-start"} ${selected ? "bg-primary/10" : ""}`}
        onPointerDown={(event) => {
          dragStart.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          if (!dragStart.current) return;
          const dx = event.clientX - dragStart.current.x;
          const dy = Math.abs(event.clientY - dragStart.current.y);
          dragStart.current = null;
          if (Math.abs(dx) > 72 && dy < 32) onReply?.(message);
        }}
      >
        {!isMe && showAvatar ? (
          <Avatar className="mt-1 h-7 w-7 shrink-0 rounded-full bg-primary/10 text-[11px] text-primary">
            <AvatarImage key={messageAvatarUrl} src={messageAvatarUrl} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 shrink-0" />
        )}
        {isMe && (
          <button
            type="button"
            aria-label="Message actions"
            className="self-center flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/95 p-1 text-muted-foreground shadow-sm shadow-black/10 transition-[opacity,box-shadow,transform] hover:scale-105 hover:shadow-md hover:shadow-black/15 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
            onClick={(event) => setActionsAnchor(event.currentTarget)}
          >
            <Info className="h-3 w-3" />
          </button>
        )}
        <div
          className={`flex min-w-0 max-w-[min(82%,520px)] flex-col sm:max-w-[72%] md:max-w-[62%] ${isMe ? "items-end" : "items-start"}`}
        >
          <div
            className={`relative max-w-full rounded-[8px] px-2 py-1 text-[13px] leading-[1.25] shadow-sm [overflow-wrap:anywhere] ${isMe ? "rounded-br-[3px] bg-muted/50 text-foreground" : "rounded-bl-[3px] bg-background text-foreground"}`}
          >
            {!isMe && showAvatar && (
              <p className="mb-0.5 text-[11.5px] font-bold text-primary">{name}</p>
            )}
            {(message.repliedMessage || message.replyToMessage) && (
              <button
                type="button"
                className="mb-2 block w-full rounded-r-md border-l-[3px] border-primary bg-muted/60 px-2 py-1 text-left hover:bg-muted"
                onClick={() => {
                  const target = message.repliedMessage || message.replyToMessage;
                  if (target?.id) onJumpToMessage?.(String(target.id));
                }}
              >
                <p className="text-[10.5px] font-bold text-primary">
                  Replying to{" "}
                  {(message.repliedMessage || message.replyToMessage).authorName || "message"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {(message.repliedMessage || message.replyToMessage).text || "Attachment"}
                </p>
              </button>
            )}
            {!message.deletedAt &&
              (message.metadata?.forwardedFrom ||
                message.metadata?.forwarded ||
                message.forwardedFrom ||
                message.forwarded) && (
                <p className="mb-1.5 text-[10.5px] font-bold italic text-primary">Forwarded</p>
              )}
            {message.metadata?.pinned && (
              <p className="mb-1 flex items-center gap-1 text-[11px] font-bold">
                <Pin className="h-3 w-3" />
                Pinned
              </p>
            )}
            {callHistory ? (
              <div className="flex items-center gap-2 py-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${callIsError ? "bg-red-500/15 text-red-500" : callIsComplete ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"}`}
                >
                  {String(callHistory.type).toLowerCase() === "video" ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`font-medium ${callIsError ? "text-red-500" : callIsComplete ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
                >
                  {callStatus === "missed"
                    ? `Missed call from ${callHistory.startedBy?.name || message.authorName || "Unknown user"}`
                    : `${callHistory.type || "audio"} call ${callStatus || "ended"}`}
                </span>
              </div>
            ) : (
              <></>
            )}
            <MessageAttachments attachments={attachments} message={message} />
            {!callHistory &&
              message.text &&
              message.text !== "[Attachment]" &&
              attachments.length > 0 && (
                <p className="mt-1.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  <MessageText text={String(message.text)} mentionableUsers={mentionableUsers} />
                </p>
              )}
            {!callHistory && attachments.length === 0 && (
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                <MessageText
                  text={String(message.text || "")}
                  mentionableUsers={mentionableUsers}
                />
              </p>
            )}
            {message.edited && (
              <p className="text-right text-[10px] text-muted-foreground">edited</p>
            )}
            <div className="float-right ml-2 mt-1 inline-flex items-center gap-1 text-[9px] leading-none text-muted-foreground">
              {message.timestamp || ""}
              {isMe &&
                (message.deliveryStatus === "seen" || message.deliveryStatus === "read" ? (
                  <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                ) : message.deliveryStatus === "delivered" ? (
                  <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                ))}
            </div>
          </div>
          {Array.isArray(message.reactions) && message.reactions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {message.reactions.map((reaction: RecordValue) => (
                <button
                  type="button"
                  key={reaction.emoji}
                  onClick={() => onReact?.(message, reaction.emoji)}
                  className="rounded-full border bg-background px-2 py-0.5 text-xs"
                >
                  {reaction.emoji} {reaction.count || ""}
                </button>
              ))}
            </div>
          )}
        </div>
        {!isMe && (
          <button
            type="button"
            aria-label="Message actions"
            className="self-center flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/95 p-1 text-muted-foreground shadow-sm shadow-black/10 transition-[opacity,box-shadow,transform] hover:scale-105 hover:shadow-md hover:shadow-black/15 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
            onClick={(event) => setActionsAnchor(event.currentTarget)}
          >
            <Info className="h-3 w-3" />
          </button>
        )}
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
        onOpenPicker={(element) => onOpenReactionPicker?.(message, element)}
        onReact={(emoji) => onReact?.(message, emoji)}
        blocked={blocked}
      />
      {selectionMode && (
        <input
          aria-label="Select message"
          type="checkbox"
          checked={selected}
          onChange={() => onSelect?.(message)}
          className="sr-only"
        />
      )}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-h-[85vh] max-w-[min(92vw,640px)] overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Eye className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle>Message info</DialogTitle>
                <p className="text-sm text-muted-foreground">Delivery and read status</p>
              </div>
            </div>
          </DialogHeader>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading delivery detailsâ€¦</p>
          ) : infoData?.error ? (
            <p className="text-sm text-destructive">{infoData.error}</p>
          ) : (
            <div className="max-h-[55vh] space-y-4 overflow-y-auto text-sm">
              <div className="rounded-2xl bg-emerald-950/60 px-4 py-3 text-foreground">
                <p className="whitespace-pre-wrap break-words">
                  {infoData?.message?.text || message.text || "Attachment"}
                </p>
                <p className="mt-3 text-right text-xs text-muted-foreground">
                  {new Date(infoData?.message?.createdAt || message.sentAt).toLocaleString()}
                </p>
              </div>
              {Array.isArray(infoData?.message?.attachments) &&
                infoData.message.attachments.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Attachments</p>
                    {infoData.message.attachments.map((attachment: RecordValue) => (
                      <p key={attachment.id || attachment.name} className="truncate text-xs">
                        {attachment.name || "Attachment"}
                      </p>
                    ))}
                  </div>
                )}
              {Array.isArray(infoData?.recipients) && infoData.recipients.length > 0 && (
                <div className="border-t pt-4">
                  {(() => {
                    const readRecipients = infoData.recipients.filter(
                      (item: RecordValue) => String(item.status).toLowerCase() === "read",
                    );
                    const deliveredRecipients = infoData.recipients.filter(
                      (item: RecordValue) => String(item.status).toLowerCase() !== "read",
                    );
                    const renderRecipient = (recipient: RecordValue) => {
                      const read = String(recipient.status || "").toLowerCase() === "read";
                      const recipientName =
                        recipient.user?.name || recipient.user?.email || "Recipient";
                      return (
                        <div
                          key={recipient.user?.id || recipientName}
                          className="flex items-center gap-3 rounded-xl border px-3 py-2"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lg text-primary">
                            {recipientName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{recipientName}</p>
                            <p className="text-sm text-muted-foreground">
                              {read ? "Read" : "Delivered"} Â·{" "}
                              {new Date(
                                read ? recipient.readAt : recipient.deliveredAt,
                              ).toLocaleString()}
                            </p>
                          </div>
                          <CheckCheck
                            className={`h-5 w-5 ${read ? "text-blue-500" : "text-muted-foreground"}`}
                          />
                        </div>
                      );
                    };
                    return (
                      <div className="space-y-4">
                        {deliveredRecipients.length > 0 && (
                          <section>
                            <p className="mb-2 font-bold">
                              Delivered to{" "}
                              <span className="font-normal text-muted-foreground">
                                {deliveredRecipients.length}
                              </span>
                            </p>
                            <div className="space-y-2">
                              {deliveredRecipients.map(renderRecipient)}
                            </div>
                          </section>
                        )}
                        {readRecipients.length > 0 && (
                          <section>
                            <p className="mb-2 font-bold text-blue-500">
                              Read by{" "}
                              <span className="font-normal text-muted-foreground">
                                {readRecipients.length}
                              </span>
                            </p>
                            <div className="space-y-2">{readRecipients.map(renderRecipient)}</div>
                          </section>
                        )}
                      </div>
                    );
                  })()}
                </div>
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
