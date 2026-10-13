import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";
import PinglyMark from "./PinglyMark";
import { getStoredUser } from "@/lib/api/client";
import {
  getArrayPayload,
  getAvailability,
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
  getUnreadCount,
} from "./chatHealper";
import {
  getChatConversationsService,
  getChatUsersService,
  // openDirectChatService,
} from "@/services/Team-chat/chat.service";

type ChatRecord = Record<string, any>;

const isCurrentUserRecord = (item: ChatRecord, currentUser?: ChatRecord | null) => {
  const currentUserId = String(
    currentUser?.id || currentUser?.userId || currentUser?.user_id || "",
  );
  const currentUserEmail = String(
    currentUser?.email || currentUser?.email_id || currentUser?.mailid || "",
  ).toLowerCase();
  return (
    (currentUserId && String(getBuddySendId(item) || "") === currentUserId) ||
    (currentUserEmail && String(getBuddyEmail(item) || "").toLowerCase() === currentUserEmail)
  );
};

const openChatInNewTab = (chatId?: string | number) => {
  const path = chatId
    ? `${CHAT_APP_BASE_PATH}/${encodeURIComponent(String(chatId))}`
    : CHAT_APP_BASE_PATH;
  window.open(path, "_blank", "noopener,noreferrer");
};

export default function ChatLauncher() {
  const [buddies, setBuddies] = useState<ChatRecord[]>([]);
  const [channels, setChannels] = useState<ChatRecord[]>([]);
  const [open, setOpen] = useState(false);
  const currentUser = getStoredUser() as ChatRecord | null;

  const fetchChatData = useCallback(async () => {
    try {
      const [buddyResponse, channelResponse] = await Promise.all([
        getChatUsersService({ excludeSelf: true }),
        getChatConversationsService(),
      ]);
      const buddyData = getArrayPayload((buddyResponse as any)?.data?.data);
      const channelData = getArrayPayload((channelResponse as any)?.data?.data);
      setBuddies(buddyData.filter((buddy) => !isCurrentUserRecord(buddy, currentUser)).slice(0, 8));
      setChannels(channelData.slice(0, 5));
    } catch {
      setBuddies([]);
      setChannels([]);
    }
  }, [currentUser]);

  useEffect(() => {
    void fetchChatData();
  }, [fetchChatData]);

  const totalUnreadCount = useMemo(
    () => channels.reduce((total, channel) => total + getUnreadCount(channel), 0),
    [channels],
  );

  // const openCall = (buddy: ChatRecord) => openChatInNewTab(getBuddySendId(buddy));

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center -space-x-2 sm:flex">
        {buddies.slice(0, 4).map((buddy) => {
          const name = getBuddyName(buddy);
          const sendId = getBuddySendId(buddy);
          const availability = getAvailability(buddy);
          return (
            <button
              key={sendId || getBuddyEmail(buddy) || name}
              type="button"
              title={`${name} · ${availability.label}`}
              onClick={() => openChatInNewTab(sendId)}
            >
              <Avatar
                className="h-8 w-8 border-2 border-background"
                style={{ outline: `2px solid ${availability.color}` }}
              >
                <AvatarImage src={getImageUrl(buddy)} />
                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
              </Avatar>
            </button>
          );
        })}
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="relative text-primary hover:bg-primary/10"
        onClick={() => setOpen(true)}
        title="Open chat"
      >
        <MessageCircle />
        {totalUnreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 text-destructive-foreground">
            {totalUnreadCount}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <PinglyMark size={28} />
            <DialogTitle className="sr-only">People and groups</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              People
            </h3>
            <div className="space-y-1">
              {buddies.map((buddy) => {
                const name = getBuddyName(buddy);
                const sendId = getBuddySendId(buddy);
                const availability = getAvailability(buddy);
                return (
                  <div
                    key={sendId || getBuddyEmail(buddy) || name}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-accent"
                  >
                    <Avatar>
                      <AvatarImage src={getImageUrl(buddy)} />
                      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => openChatInNewTab(sendId)}
                    >
                      <span className="block truncate text-sm font-semibold">{name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: availability.color }}
                        />
                        {availability.label}
                      </span>
                    </button>
                    {/* Call controls temporarily disabled.
                    <Button size="icon" variant="ghost" onClick={() => openCall(buddy)}>
                      <Phone />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openCall(buddy)}>
                      <Video />
                    </Button>
                    */}
                  </div>
                );
              })}
              {buddies.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No people available.</p>
              )}
            </div>
            <h3 className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              Groups / channels
            </h3>
            <div className="space-y-1">
              {channels.map((channel) => {
                const id = getChannelId(channel);
                const name = String(getChannelName(channel));
                return (
                  <button
                    key={id || name}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
                    onClick={() => openChatInNewTab(id)}
                  >
                    <Avatar>
                      <AvatarImage src={getImageUrl(channel)} />
                      <AvatarFallback>
                        <UsersRound />
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{name}</span>
                      <span className="text-xs text-muted-foreground">Group</span>
                    </span>
                  </button>
                );
              })}
              {channels.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No conversations available.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
