import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  EMOJI_CATEGORIES,
  EMOJI_OPTIONS,
  type EmojiOption,
} from "@/constants/team-chat-constants";

interface EmojiPickerProps {
  anchorEl: HTMLElement | null;
  onClose?: () => void;
  onSelect?: (emoji: string) => void;
}

const LABELS = new Map<string, string>(EMOJI_OPTIONS.map(([emoji, label]) => [emoji, label]));
const RECENT_KEY = "team-chat:recent-emojis";
const MAX_RECENT = 14;
const PICKER_WIDTH = 340;
const PICKER_HEIGHT = 400;
const EDGE_GAP = 12;

function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((item) => LABELS.has(item)).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(emoji: string): string[] {
  const next = [emoji, ...readRecent().filter((item) => item !== emoji)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); recents just won't persist.
  }
  return next;
}

export default function EmojiPicker({ anchorEl, onClose, onSelect }: EmojiPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const open = Boolean(anchorEl);

  const closePicker = useCallback(() => {
    setSearchTerm("");
    setHovered(null);
    setActiveCategory(EMOJI_CATEGORIES[0].id);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || anchorEl?.contains(target)) return;
      closePicker();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", closePicker);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", closePicker);
    };
  }, [open, anchorEl, closePicker]);

  const query = searchTerm.trim().toLowerCase();
  const results = useMemo<EmojiOption[]>(
    () =>
      query
        ? EMOJI_OPTIONS.filter(([, label, keywords]) =>
            `${label} ${keywords || ""}`.toLowerCase().includes(query),
          )
        : [],
    [query],
  );

  if (!open || !anchorEl) return null;

  // Open above the anchor when there is room, otherwise below it. Stay inside the viewport.
  const rect = anchorEl.getBoundingClientRect();
  const width = Math.min(PICKER_WIDTH, window.innerWidth - EDGE_GAP * 2);
  const left = Math.max(EDGE_GAP, Math.min(rect.left, window.innerWidth - width - EDGE_GAP));
  const roomAbove = rect.top - EDGE_GAP;
  const placeAbove = roomAbove >= PICKER_HEIGHT || roomAbove > window.innerHeight - rect.bottom;
  const style = placeAbove
    ? { left, width, bottom: window.innerHeight - rect.top + 8, height: Math.min(PICKER_HEIGHT, roomAbove - 8) }
    : {
        left,
        width,
        top: rect.bottom + 8,
        height: Math.min(PICKER_HEIGHT, window.innerHeight - rect.bottom - EDGE_GAP - 8),
      };

  const pick = (emoji: string) => {
    setRecent(saveRecent(emoji));
    onSelect?.(emoji);
    closePicker();
  };

  const jumpTo = (id: string) => {
    setActiveCategory(id);
    const container = scrollRef.current;
    const section = sectionRefs.current[id];
    if (container && section) container.scrollTo({ top: section.offsetTop - 4, behavior: "smooth" });
  };

  // Highlight the tab of the section currently at the top of the scroll area.
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    let current = EMOJI_CATEGORIES[0].id;
    for (const category of EMOJI_CATEGORIES) {
      const section = sectionRefs.current[category.id];
      if (section && section.offsetTop - 8 <= container.scrollTop) current = category.id;
    }
    setActiveCategory(current);
  };

  const renderEmoji = (emoji: string) => (
    <button
      key={emoji}
      type="button"
      title={LABELS.get(emoji)}
      aria-label={LABELS.get(emoji) || emoji}
      className="flex h-9 w-9 items-center justify-center rounded-md text-xl transition-transform hover:scale-110 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onMouseEnter={() => setHovered(emoji)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(emoji)}
      onBlur={() => setHovered(null)}
      onClick={() => pick(emoji)}
    >
      {emoji}
    </button>
  );

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Emoji picker"
      className="fixed z-50 flex flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl"
      style={style}
    >
      <div className="relative border-b p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={searchTerm}
          placeholder="Search emoji"
          aria-label="Search emoji"
          onChange={(event) => setSearchTerm(event.target.value)}
          className="h-9 border-0 bg-muted/50 pl-8 pr-8 font-normal shadow-none focus-visible:ring-1"
        />
        <button
          type="button"
          aria-label="Close emoji picker"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={closePicker}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!query && (
        <div role="tablist" aria-label="Emoji categories" className="flex border-b px-1">
          {EMOJI_CATEGORIES.map((category) => {
            const active = category.id === activeCategory;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={category.label}
                title={category.label}
                onClick={() => jumpTo(category.id)}
                className={`flex h-9 flex-1 items-center justify-center border-b-2 text-base transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  active ? "border-primary opacity-100" : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                {category.icon}
              </button>
            );
          })}
        </div>
      )}

      <div ref={scrollRef} onScroll={query ? undefined : handleScroll} className="relative min-h-0 flex-1 overflow-y-auto p-2">
        {query ? (
          results.length > 0 ? (
            <div className="grid grid-cols-8 gap-0.5">{results.map(([emoji]) => renderEmoji(emoji))}</div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No emoji match "{searchTerm.trim()}". Try a different word.
            </p>
          )
        ) : (
          <>
            {recent.length > 0 && (
              <section className="mb-3">
                <h3 className="mb-1 px-1 text-xs font-normal text-muted-foreground">Recently used</h3>
                <div className="grid grid-cols-8 gap-0.5">{recent.map(renderEmoji)}</div>
              </section>
            )}
            {EMOJI_CATEGORIES.map((category) => (
              <section
                key={category.id}
                ref={(node) => {
                  sectionRefs.current[category.id] = node;
                }}
                className="mb-3"
              >
                <h3 className="mb-1 px-1 text-xs font-normal text-muted-foreground">{category.label}</h3>
                <div className="grid grid-cols-8 gap-0.5">
                  {category.emojis.map(([emoji]) => renderEmoji(emoji))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      <div className="flex h-9 shrink-0 items-center gap-2 border-t bg-muted/30 px-3 text-xs text-muted-foreground">
        {hovered ? (
          <>
            <span className="text-lg leading-none">{hovered}</span>
            <span className="truncate capitalize">{LABELS.get(hovered)}</span>
          </>
        ) : (
          <span>{query ? `${results.length} found` : "Pick an emoji"}</span>
        )}
      </div>
    </div>
  );
}