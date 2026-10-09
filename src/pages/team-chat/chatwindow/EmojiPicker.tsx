import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EMOJI_OPTIONS } from "@/constants/team-chat-constants";

type EmojiOption = readonly [emoji: string, label: string];
interface EmojiPickerProps {
  anchorEl: HTMLElement | null;
  onClose?: () => void;
  onSelect?: (emoji: string) => void;
}

export default function EmojiPicker({ anchorEl, onClose, onSelect }: EmojiPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const open = Boolean(anchorEl);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!(target instanceof Node) || !document.querySelector('[role="dialog"][aria-label="Emoji picker"]')?.contains(target)) {
        onClose?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onClose]);
  const emojis = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return (EMOJI_OPTIONS as unknown as readonly EmojiOption[]).filter(([, name]) =>
      name.toLowerCase().includes(query),
    );
  }, [searchTerm]);
  if (!open || !anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();
  const closePicker = () => {
    setSearchTerm("");
    onClose?.();
  };
  return (
    <div
      role="dialog"
      aria-label="Emoji picker"
      className="fixed z-50 w-[min(300px,calc(100vw-24px))] rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
      style={{
        left: Math.min(rect.left, window.innerWidth - 312),
        top: Math.max(12, rect.top - 330),
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="relative mb-3 flex items-center gap-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          value={searchTerm}
          placeholder="Search emoji"
          onChange={(event) => setSearchTerm(event.target.value)}
          className="h-9 pl-8 pr-8"
        />
        <button
          type="button"
          aria-label="Close emoji picker"
          className="absolute right-1 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={closePicker}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid max-h-[250px] grid-cols-7 gap-1 overflow-y-auto">
        {emojis.map(([emoji, name]) => (
          <button
            key={emoji}
            type="button"
            title={name}
            aria-label={name}
            className="flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-accent"
            onClick={() => {
              onSelect?.(emoji);
              closePicker();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
      {emojis.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No emoji found</p>
      )}
    </div>
  );
}
