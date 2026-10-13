import {
  Ban,
  CheckSquare,
  Copy,
  Edit3,
  Forward,
  Info,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Reply,
  Trash2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { REACTION_OPTIONS } from "@/constants/team-chat-constants";

type MessageRecord = Record<string, any>;
interface MessageActionsProps {
  anchorEl: HTMLElement | null;
  canEdit?: boolean;
  blocked?: boolean;
  isMe?: boolean;
  message: MessageRecord;
  onBlock?: (message: MessageRecord) => void;
  onClose?: () => void;
  onCopy?: (message: MessageRecord) => void;
  onDelete?: (message: MessageRecord) => void;
  onEdit?: (message: MessageRecord) => void;
  onForward?: (message: MessageRecord) => void;
  onInfo?: (message: MessageRecord) => void;
  onOpenPicker?: (element: HTMLElement) => void;
  onPin?: (message: MessageRecord) => void;
  onReact?: (emoji: string) => void;
  onReply?: (message: MessageRecord) => void;
  onSelect?: (message: MessageRecord) => void;
}
const actions = [
  { key: "info", label: "Message info", icon: Info },
  { key: "copy", label: "Copy", icon: Copy },
  { key: "reply", label: "Reply", icon: Reply },
  { key: "edit", label: "Edit", icon: Edit3 },
  { key: "forward", label: "Forward", icon: Forward },
  { key: "pin", label: "Pin", icon: Pin },
];

export default function MessageActions({
  anchorEl,
  canEdit = false,
  blocked = false,
  isMe = false,
  message,
  onBlock,
  onClose,
  onCopy,
  onDelete,
  onEdit,
  onForward,
  onInfo,
  onOpenPicker,
  onPin,
  onReact,
  onReply,
  onSelect,
}: MessageActionsProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!anchorEl) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && target !== anchorEl) onClose?.();
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [anchorEl, onClose]);
  if (!anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();
  const estimatedMenuHeight = 360;
  const preferredTop = rect.bottom + 4;
  const top =
    preferredTop + estimatedMenuHeight > window.innerHeight
      ? Math.max(8, rect.top - estimatedMenuHeight - 4)
      : preferredTop;
  const close = () => onClose?.();
  const run = (callback?: (message: MessageRecord) => void) => {
    callback?.(message);
    close();
  };
  const callbacks: Record<string, ((message: MessageRecord) => void) | undefined> = {
    info: onInfo,
    copy: onCopy,
    reply: onReply,
    edit: onEdit,
    forward: onForward,
    pin: onPin,
  };
  return (
    <div
      ref={menuRef}
      className={`fixed z-50 min-w-[190px] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg ${isMe ? "-translate-x-full" : ""}`}
      style={{ left: isMe ? rect.right : rect.left, top }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {!isMe && (
        <div className="flex items-center justify-between border-b p-2">
          {REACTION_OPTIONS.slice(0, 5).map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-accent"
              onClick={() => {
                onReact?.(emoji);
                close();
              }}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            aria-label="More reactions"
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent"
            onClick={() => {
              onOpenPicker?.(anchorEl);
              close();
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="py-1">
        {actions
          .filter((action) => action.key !== "edit" || canEdit)
          .filter((action) => action.key !== "info" || isMe)
          .map(({ key, label, icon: Icon }) => (
            <button
              type="button"
              key={key}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => run(callbacks[key])}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>
                {key === "pin" && message.metadata?.pinned
                  ? "Unpin"
                  : key === "delete"
                    ? "Delete for everyone"
                    : label}
              </span>
            </button>
          ))}
        {isMe && (
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => run(onSelect)}
          >
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            Select
          </button>
        )}
        {isMe && (
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
            onClick={() => run(onDelete)}
          >
            <Trash2 className="h-4 w-4" />
            Delete for everyone
          </button>
        )}
        {!isMe && onBlock && (
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
            onClick={() => run(onBlock)}
          >
            <Ban className="h-4 w-4" />
            {blocked ? "Unblock user" : "Block user"}
          </button>
        )}
      </div>
    </div>
  );
}
