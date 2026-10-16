import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Paperclip,
  Settings,
  Shield,
  MessageCircle,
  UsersRound,
  StickyNote,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "../chatHealper";
import { appRailItems, getInitial } from "./chatSidebarUtils";
import { CHAT_APP_BASE_PATH } from "../chatRoutes";
import { getUnreadCount } from "../chatHealper";
import { getChatConversationsService } from "@/services/Team-chat/chat.service";

interface Props {
  avatarUploading?: boolean;
  currentUser?: Record<string, any>;
  currentUserName: string;
  onOpenCalls: () => void;
  onOpenMedia: () => void;
  onOpenNotes: () => void;
  onCreateGroup: () => void;
  onSettingsOpen: () => void;
  onTabSelect: (key: string) => void;
  totalUnreadCount?: number;
  embedded?: boolean;
}
const railButton =
  "relative h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground";

export default function SidebarRail({
  avatarUploading = false,
  currentUser,
  currentUserName,
  onOpenCalls,
  onOpenMedia,
  onOpenNotes,
  onCreateGroup,
  onSettingsOpen,
  onTabSelect,
  totalUnreadCount = 0,
  embedded = false,
}: Props) {
  const navigate = useNavigate();
  const [liveUnreadCount, setLiveUnreadCount] = useState(totalUnreadCount);
  useEffect(() => {
    const update = (event: Event) => {
      const value = Number((event as CustomEvent).detail);
      if (Number.isFinite(value)) setLiveUnreadCount(value);
    };
    window.addEventListener("chat:unread-count", update);
    getChatConversationsService()
      .then((response: any) => {
        const payload = response?.data?.data ?? response?.data ?? [];
        const rows = Array.isArray(payload) ? payload : payload?.conversations || [];
        setLiveUnreadCount(rows.reduce((sum: number, row: any) => sum + getUnreadCount(row), 0));
      })
      .catch(() => {});
    return () => window.removeEventListener("chat:unread-count", update);
  }, []);
  const isAdmin = [...(currentUser?.roles || []), currentUser?.role].some(
    (role) => String(role).toLowerCase() === "chatadmin",
  );
  const buttonClass = embedded
    ? "relative h-auto min-h-12 w-full flex-col gap-0.5 rounded-lg px-1 py-1 text-[10px] leading-tight text-muted-foreground hover:bg-accent hover:text-foreground"
    : railButton;
  const labelClass = "max-w-full truncate";
  return (
    <aside
      className={
        embedded
          ? "flex w-full flex-col items-center gap-1 py-1"
          : "flex h-full min-h-0 flex-col items-center gap-3 border-r border-border bg-background py-2"
      }
    >
      {!embedded && (
        <>
          <Avatar
            title={currentUserName}
            className="h-10 w-10 bg-primary font-black text-primary-foreground"
          >
            <AvatarImage src={getImageUrl(currentUser)} />
            <AvatarFallback>
              {avatarUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                getInitial(currentUserName)
              )}
            </AvatarFallback>
          </Avatar>
          <div className="h-px w-8 bg-border" />
        </>
      )}
      {appRailItems.map((item) => (
        <Button
          key={item.key}
          title={item.label}
          variant="ghost"
          size="icon"
          className={buttonClass}
          onClick={() => onTabSelect(item.key)}
        >
          <MessageCircle />
          {embedded && <span className={labelClass}>Conversations</span>}
          {liveUnreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 text-destructive-foreground">
              {liveUnreadCount > 99 ? "99+" : liveUnreadCount}
            </span>
          )}
        </Button>
      ))}
      <Button
        title="Create group"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={onCreateGroup}
      >
        <UsersRound />
        {embedded && <span className={labelClass}>Groups</span>}
      </Button>
      {/* Call navigation temporarily disabled.
      <Button title="Calls" variant="ghost" size="icon" className={buttonClass} onClick={onOpenCalls}>
        <Phone />
        {embedded && <span className={labelClass}>Calls</span>}
      </Button>
      */}
      <Button
        title="Media"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={onOpenMedia}
      >
        <Paperclip />
        {embedded && <span className={labelClass}>Media</span>}
      </Button>
      <Button
        title="Notes"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={onOpenNotes}
      >
        <StickyNote />
        {embedded && <span className={labelClass}>Notes</span>}
      </Button>
      <div className="flex-1" />
      {isAdmin && (
        <Button
          title="Admin console"
          variant="ghost"
          size="icon"
          className={buttonClass}
          onClick={() => navigate(`${CHAT_APP_BASE_PATH}/admin`)}
        >
          <Shield />
          {embedded && <span className={labelClass}>Admin</span>}
        </Button>
      )}
      <Button
        title="Settings"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={onSettingsOpen}
      >
        <Settings />
        {embedded && <span className={labelClass}>Settings</span>}
      </Button>
    </aside>
  );
}
