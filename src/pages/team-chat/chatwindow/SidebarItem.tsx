import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvailability } from "../chatHealper";

interface SidebarChat {
  title: string;
  type?: string;
  imageUrl?: string;
  unreadCount?: number;
  raw?: Record<string, unknown>;
}
interface SidebarItemProps {
  chat: SidebarChat;
  active?: boolean;
  onClick?: () => void;
}

export default function SidebarItem({ chat, active = false, onClick }: SidebarItemProps) {
  const availability = getAvailability(chat.raw);
  const isChannel = chat.type === "channel";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${active ? "bg-primary/10" : "hover:bg-accent"}`}
    >
      {isChannel ? (
        <span className="w-5 shrink-0 text-center text-[13px] leading-none text-muted-foreground">
          #
        </span>
      ) : (
        <span className="relative shrink-0">
          <Avatar className="h-5 w-5 bg-primary/10 text-[9px] font-semibold text-primary">
            <AvatarImage src={chat.imageUrl} />
            <AvatarFallback>{chat.title.charAt(0)}</AvatarFallback>
          </Avatar>
          {availability?.color === "#22c55e" && (
            <span className="absolute -bottom-px -right-px h-1.5 w-1.5 rounded-full border-[1.5px] border-background bg-green-500" />
          )}
        </span>
      )}
      <span
        className={`min-w-0 flex-1 truncate text-[13px] ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
      >
        {chat.title}
      </span>
      {!!chat.unreadCount && chat.unreadCount > 0 && (
        <span className="min-w-[18px] shrink-0 rounded-full bg-primary px-1.5 text-center text-[10px] font-semibold text-primary-foreground">
          {chat.unreadCount}
        </span>
      )}
    </button>
  );
}
