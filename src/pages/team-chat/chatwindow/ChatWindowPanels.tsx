import type { MouseEvent, PointerEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Check, Loader2, Pin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onForwardToChats: (chats: ChatRecord[]) => void | Promise<void>;
  selectedChat?: ChatRecord | null;
}

function getForwardTargetKey(chat: ChatRecord) {
  const channel = chat.__conversationType === "channel" || chat.type === "channel";
  const id = channel
    ? getChannelId(chat)
    : getBuddySendId(chat) || chat.directConversationId || chat.chat_id || chat.chatId;
  const fallback = channel ? getChannelName(chat) : getBuddyName(chat);
  return `${channel ? "channel" : "direct"}:${String(id || fallback || "")}`;
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
  onClick,
}: {
  latestPinnedMessage?: PinnedMessage | null;
  pinnedCount: number;
  onClick?: () => void;
}) {
  if (!latestPinnedMessage) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="sticky top-0 z-20 flex w-full items-center gap-2 border-b border-orange-200 bg-orange-50 px-5 py-2 text-left text-orange-900 shadow-sm hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200 dark:hover:bg-orange-950/50"
    >
      <Pin className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">Pinned message</p>
        <p className="truncate text-xs text-muted-foreground">
          {latestPinnedMessage.text || "Attachment"}
        </p>
      </div>
      {pinnedCount > 1 && <span className="shrink-0 text-xs font-bold">+{pinnedCount - 1}</span>}
    </button>
  );
}

export function ForwardMessageDialog({
  availableChats = [],
  forwardMessage,
  onClose,
  onForwardToChats,
  selectedChat,
}: ForwardMessageDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedTargetKeys, setSelectedTargetKeys] = useState<string[]>([]);
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    setSearch("");
    setSelectedTargetKeys([]);
    setForwarding(false);
  }, [forwardMessage]);

  const targets = availableChats.filter((chat) => {
    const id =
      chat.__conversationType === "channel"
        ? getChannelId(chat)
        : getBuddySendId(chat) || chat.directConversationId || chat.chat_id || chat.chatId;
    const selectedId = selectedChat?.id;
    if (String(id || "") === String(selectedId || "")) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${getBuddyName(chat)} ${getChannelName(chat)} ${getBuddyEmail(chat)}`
      .toLowerCase()
      .includes(query);
  });
  const selectedTargets = availableChats.filter((chat) =>
    selectedTargetKeys.includes(getForwardTargetKey(chat)),
  );

  const toggleTarget = (chat: ChatRecord) => {
    const key = getForwardTargetKey(chat);
    setSelectedTargetKeys((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key],
    );
  };

  const handleForward = async () => {
    if (selectedTargets.length === 0 || forwarding) return;

    setForwarding(true);
    try {
      await onForwardToChats(selectedTargets);
    } finally {
      setForwarding(false);
    }
  };

  return (
    <Dialog open={Boolean(forwardMessage)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Forward to conversations</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search people or conversations"
        />
        <p className="text-xs text-muted-foreground">Select one or more conversations.</p>
        <ScrollArea className="max-h-[360px] pr-2">
          <div className="space-y-1">
            {targets.map((chat) => {
              const channel = chat.__conversationType === "channel" || chat.type === "channel";
              const title = channel ? getChannelName(chat) : getBuddyName(chat);
              const key = getForwardTargetKey(chat);
              const selected = selectedTargetKeys.includes(key);
              return (
                <button
                  type="button"
                  key={key}
                  aria-pressed={selected}
                  onClick={() => toggleTarget(chat)}
                  className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent ${selected ? "bg-accent ring-1 ring-primary/30" : ""}`}
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
                  <span
                    aria-hidden="true"
                    className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}
                  >
                    <Check className="h-3.5 w-3.5" />
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
          <Button disabled={selectedTargets.length === 0 || forwarding} onClick={handleForward}>
            {forwarding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Forward{selectedTargets.length > 0 ? ` (${selectedTargets.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LoadingIcon({ size = 14 }: { size?: number }) {
  return <Loader2 className="animate-spin" style={{ width: size, height: size }} />;
}
