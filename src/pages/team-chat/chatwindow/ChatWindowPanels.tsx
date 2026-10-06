import type { MouseEvent, PointerEvent, ReactNode } from "react";
import { Loader2, Pin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
} from "../chatHealper";

type ChatRecord = Record<string, any>;
interface ToolBtnProps {
  title: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
}
interface PinnedMessage {
  text?: string;
  [key: string]: unknown;
}
interface ForwardMessageDialogProps {
  availableChats?: ChatRecord[];
  forwardMessage?: unknown;
  onClose: () => void;
  onForwardToChat: (chat: ChatRecord) => void;
  selectedChat?: ChatRecord | null;
}

export function ToolBtn({ title, icon, disabled, onClick, onPointerDown }: ToolBtnProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
            disabled={disabled}
            onClick={onClick}
            onPointerDown={onPointerDown}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PinnedMessageBanner({
  latestPinnedMessage,
  pinnedCount,
}: {
  latestPinnedMessage?: PinnedMessage | null;
  pinnedCount: number;
}) {
  if (!latestPinnedMessage) return null;
  return (
    <div className="flex items-center gap-2 border-b border-orange-200 bg-orange-50 px-5 py-2 text-orange-900 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
      <Pin className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">Pinned message</p>
        <p className="truncate text-xs text-muted-foreground">
          {latestPinnedMessage.text || "Attachment"}
        </p>
      </div>
      {pinnedCount > 1 && <span className="shrink-0 text-xs font-bold">+{pinnedCount - 1}</span>}
    </div>
  );
}

export function ForwardMessageDialog({
  availableChats = [],
  forwardMessage,
  onClose,
  onForwardToChat,
  selectedChat,
}: ForwardMessageDialogProps) {
  const targets = availableChats.filter((chat) => {
    const id =
      chat.__conversationType === "channel"
        ? getChannelId(chat)
        : getBuddySendId(chat) || chat.directConversationId || chat.chat_id || chat.chatId;
    const selectedId = selectedChat?.id;
    return String(id || "") !== String(selectedId || "");
  });
  return (
    <Dialog open={Boolean(forwardMessage)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Forward to</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[360px] pr-2">
          <div className="space-y-1">
            {targets.map((chat) => {
              const channel = chat.__conversationType === "channel";
              const title = channel ? getChannelName(chat) : getBuddyName(chat);
              const key = channel
                ? getChannelId(chat)
                : getBuddySendId(chat) || chat.directConversationId || title;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => onForwardToChat(chat)}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getImageUrl(chat)} />
                    <AvatarFallback>
                      {channel ? <Users className="h-4 w-4" /> : String(title).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {channel ? "Group" : getBuddyEmail(chat)}
                    </span>
                  </span>
                </button>
              );
            })}
            {targets.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No chats available.</p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LoadingIcon({ size = 14 }: { size?: number }) {
  return <Loader2 className="animate-spin" style={{ width: size, height: size }} />;
}
