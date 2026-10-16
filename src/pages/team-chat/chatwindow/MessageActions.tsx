import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Ban,
  CheckSquare,
  Copy,
  Edit3,
  Forward,
  Info,
  MoreHorizontal,
  Pin,
  PinOff,
  Reply,
  Trash2,
  type LucideIcon,
} from "lucide-react";
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

interface MenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  run?: (message: MessageRecord) => void;
  show?: boolean;
  destructive?: boolean;
}

const EDGE_GAP = 8;
const MOBILE_QUERY = "(max-width: 639px)";

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
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const isMobile = typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;

  // Close on Escape, outside click, scroll, or resize.
  useEffect(() => {
    if (!anchorEl) return;
    const close = () => onClose?.();
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || anchorEl.contains(target)) return;
      close();
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [anchorEl, onClose]);

  // Measure the real menu size, then place it beside the anchor without leaving the screen.
  useLayoutEffect(() => {
    if (!anchorEl || isMobile) {
      setPosition(null);
      return;
    }
    const menu = menuRef.current;
    if (!menu) return;
    const rect = anchorEl.getBoundingClientRect();
    const { width, height } = menu.getBoundingClientRect();
    const idealLeft = isMe ? rect.right - width : rect.left;
    const left = Math.max(EDGE_GAP, Math.min(idealLeft, window.innerWidth - width - EDGE_GAP));
    const below = rect.bottom + 4;
    const top =
      below + height > window.innerHeight - EDGE_GAP
        ? Math.max(EDGE_GAP, rect.top - height - 4)
        : below;
    setPosition({ left, top });
  }, [anchorEl, isMe, isMobile]);

  // Move focus into the menu so it works with the keyboard.
  useEffect(() => {
    if (!anchorEl) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [anchorEl]);

  if (!anchorEl) return null;

  const close = () => onClose?.();
  const run = (callback?: (message: MessageRecord) => void) => {
    callback?.(message);
    close();
  };

  const pinned = Boolean(message.metadata?.pinned);
  const items: MenuItem[] = [
    { key: "reply", label: "Reply", icon: Reply, run: onReply },
    { key: "copy", label: "Copy", icon: Copy, run: onCopy },
    { key: "forward", label: "Forward", icon: Forward, run: onForward },
    { key: "pin", label: pinned ? "Unpin" : "Pin", icon: pinned ? PinOff : Pin, run: onPin },
    { key: "edit", label: "Edit", icon: Edit3, run: onEdit, show: canEdit },
    { key: "info", label: "Message info", icon: Info, run: onInfo, show: isMe },
    { key: "select", label: "Select", icon: CheckSquare, run: onSelect, show: isMe },
  ];
  const dangerItems: MenuItem[] = [
    {
      key: "delete",
      label: "Delete for everyone",
      icon: Trash2,
      run: onDelete,
      show: isMe,
      destructive: true,
    },
    {
      key: "block",
      label: blocked ? "Unblock user" : "Block user",
      icon: Ban,
      run: onBlock,
      show: !isMe,
      destructive: true,
    },
  ];
  const visible = (list: MenuItem[]) => list.filter((item) => item.show !== false && item.run);
  const mainItems = visible(items);
  const destructiveItems = visible(dangerItems);

  // Reactions are for other people's messages only.
  const canReact = !isMe && Boolean(onReact);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const focusable = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || [],
    );
    if (focusable.length === 0) return;
    const index = focusable.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (event.key === "ArrowDown") next = (index + 1) % focusable.length;
    else if (event.key === "ArrowUp") next = (index - 1 + focusable.length) % focusable.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = focusable.length - 1;
    if (next !== null) {
      event.preventDefault();
      focusable[next].focus();
    }
  };

  const rowClass = isMobile ? "px-5 py-3.5 text-base" : "px-3 py-2 text-sm";
  const renderItem = ({ key, label, icon: Icon, run: callback, destructive }: MenuItem) => (
    <button
      type="button"
      role="menuitem"
      key={key}
      onClick={() => run(callback)}
      className={`flex w-full items-center gap-3 text-left font-normal focus-visible:outline-none ${rowClass} ${
        destructive
          ? "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10"
          : "hover:bg-accent focus-visible:bg-accent"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${destructive ? "" : "text-muted-foreground"}`} />
      {label}
    </button>
  );

  const reactionBar = canReact && (
    <div
      role="group"
      aria-label="Quick reactions"
      className={`flex items-center justify-between border-b ${isMobile ? "px-4 py-3" : "px-2 py-1.5"}`}
    >
      {REACTION_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={`React with ${emoji}`}
          className={`flex items-center justify-center rounded-full transition-transform hover:scale-125 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isMobile ? "h-11 w-11 text-2xl" : "h-8 w-8 text-lg"}`}
          onClick={() => {
            onReact?.(emoji);
            close();
          }}
        >
          {emoji}
        </button>
      ))}
      {onOpenPicker && (
        <button
          type="button"
          aria-label="More reactions"
          className={`flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isMobile ? "h-11 w-11" : "h-8 w-8"}`}
          onClick={() => {
            onOpenPicker(anchorEl);
            close();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const body = (
    <>
      {reactionBar}
      <div className="py-1">{mainItems.map(renderItem)}</div>
      {destructiveItems.length > 0 && (
        <div className="border-t py-1">{destructiveItems.map(renderItem)}</div>
      )}
    </>
  );

  // Phones get a bottom sheet with large tap targets.
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={close} />
        <div
          ref={menuRef}
          role="menu"
          aria-label="Message actions"
          onKeyDown={handleKeyDown}
          className="fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-2xl border-t bg-popover pb-[env(safe-area-inset-bottom)] text-popover-foreground shadow-xl"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" aria-hidden="true" />
          {body}
        </div>
      </>
    );
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Message actions"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => event.stopPropagation()}
      className="fixed z-50 min-w-[220px] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {body}
    </div>
  );
}