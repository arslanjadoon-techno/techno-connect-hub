import { getBuddyEmail, getBuddyName, getBuddySendId, getImageUrl } from "../chatHealper";
import { getInitial } from "../sidebar/chatSidebarUtils";

interface AvatarImgProps {
  src: string;
  fallback: string;
  size?: "sm" | "md";
  ring?: boolean;
}

export function AvatarImg({ src, fallback, size = "md", ring = false }: AvatarImgProps) {
  const dims = size === "sm" ? "h-6 w-6 text-xs" : "h-[42px] w-[42px] text-sm";
  const ringCls = ring ? "ring-2 ring-primary" : "";

  return src ? (
    <img
      src={src}
      alt={fallback}
      className={`${dims} ${ringCls} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <span
      className={`${dims} ${ringCls} inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground`}
    >
      {fallback}
    </span>
  );
}

//Buddy row (shared between both dialogs) 

interface BuddyRowProps {
  buddy: any;
  checked: boolean;
  onToggle: (userId: string) => void;
}

export function BuddyRow({ buddy, checked, onToggle }: BuddyRowProps) {
  const userId = String(getBuddySendId(buddy));
  return (
    <button
      type="button"
      onClick={() => onToggle(userId)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 mb-1 border transition-all duration-150 ${
        checked ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"
      }`}
    >
      <AvatarImg
        src={getImageUrl(buddy)}
        fallback={getInitial(getBuddyName(buddy))}
        ring={checked}
      />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-foreground">{getBuddyName(buddy)}</p>
        <p className="truncate text-xs text-muted-foreground">{getBuddyEmail(buddy)}</p>
      </div>
      {checked && (
        <svg className="h-5 w-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      )}
    </button>
  );
}


