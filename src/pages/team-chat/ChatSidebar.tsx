import ConversationList from "./sidebar/ConversationList";
import SearchBox from "./sidebar/SearchBox";

type ChatRecord = Record<string, any>;

interface ChatSidebarProps {
  filteredItems?: ChatRecord[];
  loadError?: string;
  loading?: boolean;
  onRefresh?: () => void;
  onSelectBuddy: (item: ChatRecord) => void;
  onSelectChannel: (item: ChatRecord) => void;
  searchTerm?: string;
  searchLoading?: boolean;
  selectedChat?: ChatRecord | null;
  connectUrl?: string;
  setSearchTerm: (value: string) => void;
}

const EMPTY_LIST: ChatRecord[] = [];

export default function ChatSidebar({
  filteredItems = EMPTY_LIST,
  loadError,
  loading = false,
  onRefresh,
  onSelectBuddy,
  onSelectChannel,
  searchTerm = "",
  searchLoading = false,
  selectedChat,
  connectUrl,
  setSearchTerm,
}: ChatSidebarProps) {
  return (
    <aside
      className={`grid h-full min-h-0 min-w-0 grid-cols-1 bg-card/20 md:border-r md:border-border/70 ${selectedChat ? "hidden md:grid" : "grid"}`}
    >
      <div className="flex min-h-0 min-w-0 flex-col bg-background/95">
        <SearchBox
          searchLoading={searchLoading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <ConversationList
          connectUrl={connectUrl}
          filteredItems={filteredItems}
          loadError={loadError}
          loading={loading}
          onRefresh={onRefresh}
          onSelectBuddy={onSelectBuddy}
          onSelectChannel={onSelectChannel}
          searchLoading={searchLoading}
          selectedChat={selectedChat}
        />
      </div>
    </aside>
  );
}
