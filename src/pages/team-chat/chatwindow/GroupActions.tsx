import { useState } from "react";
import {
  Archive,
  ArrowRightLeft,
  FileText,
  Info,
  LogOut,
  MessageSquareOff,
  UserMinus,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getBuddyEmail, getBuddyName, getBuddySendId, getImageUrl } from "../chatHealper";

type Person = Record<string, any>;
interface GroupActionsProps {
  anchorEl?: HTMLElement | null;
  currentUser?: Person;
  groupInfoOpen: boolean;
  groupMembers?: Person[];
  isGroupMuted?: boolean;
  isSamePerson: (a: Person, b?: Person) => boolean;
  leaveConfirmOpen: boolean;
  onCloseInfo?: () => void;
  onCloseLeaveConfirm: () => void;
  onCloseMenu?: () => void;
  onLeaveGroup?: (id: string | number) => void;
  onTransferOwnership?: (chatId: string | number, memberId: string | number) => Promise<void>;
  onRemoveMember?: (chatId: string | number, memberId: string | number) => Promise<void>;
  onOpenInfo?: () => void;
  onOpenMedia?: () => void;
  onClearChat?: () => void;
  onOpenLeaveConfirm?: () => void;
  isGroupAdmin?: boolean;
  onToggleMute?: () => void;
  open: boolean;
  selectedChat?: Person | null;
}

const Action = ({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof Info;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium hover:bg-accent ${danger ? "text-destructive" : "text-foreground"}`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);
const PersonRow = ({
  member,
  current,
  removable,
  onRemove,
}: {
  member: Person;
  current: boolean;
  removable?: boolean;
  onRemove?: () => void;
}) => (
  <div className="flex items-center gap-3 rounded-md px-2 py-2">
    <Avatar className="h-8 w-8">
      <AvatarImage src={getImageUrl(member)} />
      <AvatarFallback>{getBuddyName(member).charAt(0)}</AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold">{current ? "You" : getBuddyName(member)}</p>
      <p className="truncate text-xs text-muted-foreground">{getBuddyEmail(member)}</p>
    </div>
    {removable && (
      <Button size="icon" variant="ghost" className="text-destructive" onClick={onRemove}>
        <UserMinus />
      </Button>
    )}
  </div>
);

export default function GroupActions({
  currentUser,
  groupInfoOpen,
  groupMembers = [],
  isGroupMuted = false,
  isSamePerson,
  leaveConfirmOpen,
  onCloseInfo,
  onCloseLeaveConfirm,
  onCloseMenu,
  onLeaveGroup,
  onTransferOwnership,
  onRemoveMember,
  onOpenInfo,
  onOpenMedia,
  onClearChat,
  onOpenLeaveConfirm,
  isGroupAdmin = false,
  onToggleMute,
  open,
  selectedChat,
}: GroupActionsProps) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [removeMember, setRemoveMember] = useState<Person | null>(null);
  if (selectedChat?.type !== "channel") return null;
  const closeMenu = () => onCloseMenu?.();
  const memberId = (member: Person) => getBuddySendId(member) || getBuddyEmail(member);
  return (
    <>
      <div
        className={`absolute right-2 top-12 z-40 w-60 overflow-hidden rounded-lg border bg-popover shadow-lg ${open ? "block" : "hidden"}`}
      >
        <Action
          icon={Info}
          label="Group info"
          onClick={() => {
            closeMenu();
            onOpenInfo?.();
          }}
        />
        <Action
          icon={isGroupMuted ? Volume2 : VolumeX}
          label={isGroupMuted ? "Unmute notifications" : "Mute notifications"}
          onClick={onToggleMute}
        />
        <Action icon={FileText} label="Media, links & files" onClick={onOpenMedia} />
        <Action icon={Archive} label="Clear chat" onClick={onClearChat} />
        <>
          {isGroupAdmin && (
            <Action
              icon={ArrowRightLeft}
              label="Transfer ownership"
              onClick={() => {
                closeMenu();
                setTransferOpen(true);
              }}
            />
          )}
        </>
        <Separator />
        <Action
          icon={LogOut}
          label="Exit group"
          danger
          onClick={() => {
            closeMenu();
            onOpenLeaveConfirm?.();
          }}
        />
      </div>
      <Dialog open={groupInfoOpen} onOpenChange={(value) => !value && onCloseInfo?.()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12 bg-primary/10 text-primary">
                <AvatarImage src={selectedChat.imageUrl} />
                <AvatarFallback>
                  <Users />
                </AvatarFallback>
              </Avatar>
              <span>{selectedChat.title}</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {groupMembers.length} members{isGroupMuted ? " · Notifications muted" : ""}
          </p>
          <div>
            <h3 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">MEMBERS</h3>
            {groupMembers.map((member) => (
              <PersonRow
                key={memberId(member) || getBuddyName(member)}
                member={member}
                current={isSamePerson(member, currentUser)}
                removable={isGroupAdmin && !isSamePerson(member, currentUser)}
                onRemove={() => setRemoveMember(member)}
              />
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={onCloseInfo}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(removeMember)}
        onOpenChange={(value) => !value && setRemoveMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove group member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove {removeMember ? getBuddyName(removeMember) : "this member"} from{" "}
            {selectedChat.title}?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveMember(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!removeMember) return;
                await onRemoveMember?.(selectedChat.id, memberId(removeMember));
                setRemoveMember(null);
                onCloseInfo?.();
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isGroupAdmin && transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choose a group member to become the new owner.
          </p>
          {groupMembers
            .filter((m) => !isSamePerson(m, currentUser))
            .map((member) => (
              <button
                type="button"
                key={memberId(member)}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
                onClick={async () => {
                  await onTransferOwnership?.(selectedChat.id, memberId(member));
                  setTransferOpen(false);
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getImageUrl(member)} />
                  <AvatarFallback>{getBuddyName(member).charAt(0)}</AvatarFallback>
                </Avatar>
                <span>
                  <span className="block text-sm font-semibold">{getBuddyName(member)}</span>
                  <span className="text-xs text-muted-foreground">{getBuddyEmail(member)}</span>
                </span>
              </button>
            ))}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={leaveConfirmOpen} onOpenChange={(value) => !value && onCloseLeaveConfirm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit group?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You will stop receiving messages from {selectedChat.title}.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={onCloseLeaveConfirm}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onCloseLeaveConfirm();
                onLeaveGroup?.(selectedChat.id);
              }}
            >
              Exit group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
