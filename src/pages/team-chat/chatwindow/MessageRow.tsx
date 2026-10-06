import { useState } from "react";
import { Check, CheckCheck, Download, FileText, Info, Pin, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getChatMessageInfoService } from "@/services/Team-chat/chat.service";
import { downloadAttachment, getBuddyName, getImageUrl } from "../chatHealper";
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
  onOpenReactionPicker?: (message: RecordValue, element: HTMLElement) => void;
  onSelect?: (message: RecordValue) => void;
}
const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const textParts = (text: string) => text.split(URL_PATTERN);

function MessageText({ text }: { text: string }) {
  return (
    <>
      {textParts(text).map((part, index) =>
        index % 2 ? (
          <a
            key={index}
            href={part.startsWith("www.") ? `https://${part}` : part}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

export default function MessageRow({
  authorName = "Chat user",
  chatId,
  currentUser,
  message,
  messageInfoVersion = 0,
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
  onOpenReactionPicker,
  onSelect,
}: MessageRowProps) {
  const [actionsAnchor, setActionsAnchor] = useState<HTMLElement | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoData, setInfoData] = useState<RecordValue | null>(null);
  const [loading, setLoading] = useState(false);
  const isMe = message.direction === "outbound";
  const name = isMe ? getBuddyName(currentUser) : authorName;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const loadInfo = async () => {
    setInfoOpen(true);
    if (infoData || loading || !chatId || !message.id) return;
    setLoading(true);
    try {
      const response: any = await getChatMessageInfoService(chatId, message.id);
      setInfoData(response.data?.data || response.data || {});
    } catch {
      setInfoData({ error: "Message details are unavailable." });
    } finally {
      setLoading(false);
    }
  };
  if (message.metadata?.kind === "group_member_removed")
    return <p className="my-2 text-center text-xs text-muted-foreground">{message.text}</p>;
  return (
    <>
      <div
        className={`group flex gap-2 px-2 py-1.5 ${isMe ? "justify-end" : "justify-start"} ${selected ? "bg-primary/10" : ""}`}
      >
        {!isMe && showAvatar ? (
          <Avatar className="mt-1 h-8 w-8 shrink-0">
            <AvatarImage src={message.authorAvatarUrl || getImageUrl(message.sender)} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 shrink-0" />
        )}
        <div className={`max-w-[min(78%,620px)] ${isMe ? "items-end" : "items-start"}`}>
          <div
            className={`relative rounded-2xl px-3 py-2 text-sm shadow-sm ${isMe ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted"}`}
          >
            <button
              type="button"
              aria-label="Message actions"
              className="absolute -top-3 right-1 rounded-full border bg-background p-1 text-muted-foreground shadow transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
              onClick={(event) => setActionsAnchor(event.currentTarget)}
            >
              <Info className="h-3 w-3" />
            </button>
            {!isMe && <p className="mb-1 text-xs font-semibold text-primary">{name}</p>}
            <p className="whitespace-pre-wrap break-words">
              <MessageText text={String(message.text || "")} />
            </p>
            {attachments.map((file: RecordValue, index: number) => (
              <div
                key={file.id || index}
                className="mt-2 flex items-center gap-2 rounded-md border bg-background/70 p-2 text-foreground"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-xs">{file.name || "Attachment"}</span>
                {file.url && (
                  <a
                    href={file.url}
                    onClick={(event) => downloadAttachment(event.nativeEvent, file)}
                    className="text-primary"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
              {message.timestamp || ""}
              {isMe &&
                (message.deliveryStatus === "read" ? (
                  <CheckCheck className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                ))}
            </div>
          </div>
          {Array.isArray(message.reactions) && message.reactions.length > 0 && (
            <div className="mt-1 flex gap-1">
              {message.reactions.map((reaction: RecordValue) => (
                <button
                  type="button"
                  key={reaction.emoji}
                  onClick={() => onReact?.(message, reaction.emoji)}
                  className="rounded-full border bg-background px-1.5 py-0.5 text-xs"
                >
                  {reaction.emoji} {reaction.count || ""}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <MessageActions
        anchorEl={actionsAnchor}
        isMe={isMe}
        canEdit={isMe}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message info</DialogTitle>
          </DialogHeader>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading delivery details…</p>
          ) : infoData?.error ? (
            <p className="text-sm text-destructive">{infoData.error}</p>
          ) : (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(infoData || {}, null, 2)}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
