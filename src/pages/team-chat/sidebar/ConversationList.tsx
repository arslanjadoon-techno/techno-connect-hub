import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getBuddyName, getBuddySendId, getChannelId, getChannelName } from "../chatHealper";
import LoadingRows from "./LoadingRows";
import ConversationListItem from "./ConversationListItem";

type Conversation = Record<string, any>;
interface Props {
  connectUrl?: string;
  filteredItems?: Conversation[];
  loadError?: string | null;
  loading?: boolean;
  onRefresh?: () => void;
  onSelectBuddy: (item: Conversation) => void;
  onSelectChannel: (item: Conversation) => void;
  selectedChat?: Conversation | null;
}

export default function ConversationList({
  connectUrl,
  filteredItems = [],
  loadError,
  loading = false,
  onRefresh,
  onSelectBuddy,
  onSelectChannel,
  selectedChat,
}: Props) {
  const [conversationFilter, setConversationFilter] = useState<"direct" | "groups">("direct");
  const visibleItems = useMemo(
    () =>
      filteredItems.filter((item) =>
        conversationFilter === "direct"
          ? item.__conversationType === "person"
          : item.__conversationType === "channel",
      ),
    [conversationFilter, filteredItems],
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-background px-3 py-4">
      {loadError && (
        <div className="mb-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p>{loadError}</p>
          {connectUrl && (
            <Button size="sm" className="mt-2" onClick={onRefresh}>
              Retry
            </Button>
          )}
        </div>
      )}
      <div className="mb-1 grid grid-cols-2 rounded-lg border border-border/80 bg-muted/60 p-1">
        <button
          type="button"
          className={`rounded-md py-1.5 text-xs font-bold ${conversationFilter === "direct" ? "bg-background shadow" : "text-muted-foreground"}`}
          onClick={() => setConversationFilter("direct")}
        >
          Chats
        </button>
        <button
          type="button"
          className={`rounded-md py-1.5 text-xs font-bold ${conversationFilter === "groups" ? "bg-background shadow" : "text-muted-foreground"}`}
          onClick={() => setConversationFilter("groups")}
        >
          Groups
        </button>
      </div>
      {loading ? (
        <LoadingRows />
      ) : (
        visibleItems.map((item) => {
          const channel = item.__conversationType === "channel";
          return (
            <ConversationListItem
              key={
                channel
                  ? getChannelId(item) || getChannelName(item)
                  : getBuddySendId(item) || getBuddyName(item)
              }
              item={item}
              isChannel={channel}
              selectedChat={selectedChat}
              onSelectBuddy={onSelectBuddy}
              onSelectChannel={onSelectChannel}
            />
          );
        })
      )}
      {!loading && visibleItems.length === 0 && (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-4 text-center">
          <Avatar className="mb-3 bg-primary/10 text-primary">
            <AvatarFallback>
              <MessageCircle />
            </AvatarFallback>
          </Avatar>
          <p className="font-semibold text-foreground">No results</p>
          <p className="text-sm text-muted-foreground">No conversations match your search.</p>
        </div>
      )}
    </div>
  );
}
