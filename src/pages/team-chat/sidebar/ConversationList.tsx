import { useMemo, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getUnreadCount } from "../chatHealper";
import ConversationListItem from "./ConversationListItem";
import { getConversationKey } from "../chatConversationKeys";

type Conversation = Record<string, any>;
type Filter = "direct" | "groups";

interface Props {
  connectUrl?: string;
  filteredItems?: Conversation[];
  loadError?: string | null;
  loading?: boolean;
  onRefresh?: () => void;
  onSelectBuddy: (item: Conversation) => void;
  onSelectChannel: (item: Conversation) => void;
  searchLoading?: boolean;
  selectedChat?: Conversation | null;
}

const EMPTY: Conversation[] = [];
const TABS: { value: Filter; label: string; type: string }[] = [
  { value: "direct", label: "Chats", type: "person" },
  { value: "groups", label: "Groups", type: "channel" },
];

export default function ConversationList({
  filteredItems = EMPTY,
  loadError,
  loading = false,
  onRefresh,
  onSelectBuddy,
  onSelectChannel,
  searchLoading = false,
  selectedChat,
}: Props) {
  const [conversationFilter, setConversationFilter] = useState<Filter>("direct");
  const activeType = TABS.find((tab) => tab.value === conversationFilter)?.type;

  // Items and unread totals for both tabs, computed in one pass.
  const { visibleItems, otherCount, unreadByTab } = useMemo(() => {
    const visible: Conversation[] = [];
    const unread: Record<string, number> = { person: 0, channel: 0 };
    let other = 0;
    for (const item of filteredItems) {
      const type = item.__conversationType;
      unread[type] = (unread[type] || 0) + (Number(getUnreadCount(item)) || 0);
      if (type === activeType) visible.push(item);
      else other += 1;
    }
    return { visibleItems: visible, otherCount: other, unreadByTab: unread };
  }, [filteredItems, activeType]);

  const otherTab = TABS.find((tab) => tab.value !== conversationFilter)!;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 px-2.5 pb-2 pt-2 backdrop-blur sm:px-3">
        <div
          role="tablist"
          aria-label="Conversation type"
          className="grid grid-cols-2 rounded-lg bg-muted p-1"
        >
          {TABS.map((tab) => {
            const active = tab.value === conversationFilter;
            const unread = unreadByTab[tab.type] || 0;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setConversationFilter(tab.value)}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm ${
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {unread > 0 && (
                  <span
                    aria-label={`${unread} unread`}
                    className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none text-primary-foreground"
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {searchLoading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Searching chats…
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="mx-3 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <p>{loadError}</p>
          {onRefresh && (
            <Button size="sm" className="mt-2" onClick={onRefresh}>
              Try again
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 px-2 py-2 pb-4">
        {loading ? (
          <div role="status" className="flex items-center justify-center py-10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading conversations" />
          </div>
        ) : (
          visibleItems.map((item) => {
            const channel = item.__conversationType === "channel";
            const key = getConversationKey(item);
            return (
              <ConversationListItem
                key={`${item.__conversationType}-${key}`}
                item={item}
                isChannel={channel}
                selectedChat={selectedChat}
                onSelectBuddy={onSelectBuddy}
                onSelectChannel={onSelectChannel}
              />
            );
          })
        )}
      </div>

      {!loading && !searchLoading && visibleItems.length === 0 && (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
          <Avatar className="mb-3 h-12 w-12 bg-primary/10 text-primary">
            <AvatarFallback>
              <MessageCircle />
            </AvatarFallback>
          </Avatar>
          <p className="text-foreground">
            {otherCount > 0
              ? `No ${conversationFilter === "direct" ? "chats" : "groups"} to show`
              : "No conversations found"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {otherCount > 0
              ? `${otherCount} in ${otherTab.label}. Try a different search or switch tabs.`
              : "Try a different search, or start a new conversation."}
          </p>
          {otherCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setConversationFilter(otherTab.value)}
            >
              View {otherTab.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
