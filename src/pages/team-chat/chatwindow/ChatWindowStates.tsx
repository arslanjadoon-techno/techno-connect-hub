import { MessageCircle, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvailability } from "../chatHealper";

interface ChatItem {
  id: string | number;
  type?: string;
  title: string;
  imageUrl?: string;
  unreadCount?: number;
  raw?: Record<string, unknown>;
}
interface SidebarItemProps {
  chat: ChatItem;
  active: boolean;
  onClick: () => void;
}

function SidebarItem({ chat, active, onClick }: SidebarItemProps) {
  const availability = getAvailability(chat.raw);
  const isChannel = chat.type === "channel";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mx-1 flex w-[calc(100%-0.5rem)] cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
    >
      {isChannel ? (
        <span className="w-5 text-center text-sm text-muted-foreground">#</span>
      ) : (
        <span className="relative shrink-0">
          <Avatar className="h-5 w-5 bg-primary/10 text-[9px] text-primary">
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
        <span className="min-w-[18px] rounded-full bg-primary px-1.5 text-center text-[10px] font-semibold text-primary-foreground">
          {chat.unreadCount}
        </span>
      )}
    </button>
  );
}

export function ChatWindowSidebar({
  selectedChat,
  setSelectedChat,
  chats = [],
}: {
  selectedChat?: ChatItem | null;
  setSelectedChat: (chat: ChatItem) => void;
  chats?: ChatItem[];
}) {
  const channels = chats.filter((chat) => chat.type === "channel");
  return (
    <aside className="hidden shrink-0 flex-col overflow-hidden border-r bg-muted/20 md:flex">
      {channels.length > 0 && (
        <>
          <h2 className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Channels
          </h2>
          {channels.map((chat) => (
            <SidebarItem
              key={chat.id}
              chat={chat}
              active={selectedChat?.id === chat.id}
              onClick={() => setSelectedChat(chat)}
            />
          ))}
        </>
      )}
    </aside>
  );
}

export function EmptyChatState() {
  return (
    <div className="flex h-full items-center justify-center bg-background px-6 py-8">
      <div className="w-full max-w-md rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center shadow-xs">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageCircle className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-semibold text-foreground">Your conversations</h2>
        <p className="mx-auto mt-1 max-w-[340px] text-sm leading-relaxed text-muted-foreground">
          Choose a person or group from the list to open a conversation.
        </p>
      </div>
    </div>
  );
}

export function ReadyToSendState({ selectedChat }: { selectedChat: ChatItem }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center shadow-xs">
        <Avatar className="mx-auto mb-3 h-14 w-14 rounded-xl bg-primary/10 text-xl font-semibold text-primary">
          <AvatarImage src={selectedChat.imageUrl} />
          <AvatarFallback>
            {selectedChat.type === "channel" ? <Users /> : selectedChat.title.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <h2 className="mb-1 text-base font-semibold text-foreground">{selectedChat.title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {selectedChat.type === "channel"
            ? "This is the beginning of this group. Send a message to everyone."
            : `This is the very beginning of your direct message history with ${selectedChat.title}. Say hello!`}
        </p>
      </div>
    </div>
  );
}
