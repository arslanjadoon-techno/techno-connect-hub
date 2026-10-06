import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getBuddyEmail, getBuddyName, getBuddySendId, getImageUrl } from "../chatHealper";
import { getInitial } from "../sidebar/chatSidebarUtils";

/* ------------------------------------------------------------------ */
/*  Shared tiny components                                            */
/* ------------------------------------------------------------------ */

interface AvatarImgProps {
  src: string;
  fallback: string;
  size?: "sm" | "md";
  ring?: boolean;
}

function AvatarImg({ src, fallback, size = "md", ring = false }: AvatarImgProps) {
  const dims = size === "sm" ? "h-6 w-6 text-xs" : "h-[42px] w-[42px] text-sm";
  const ringCls = ring ? "ring-2 ring-primary" : "";

  return src ? (
    <img
      src={src}
      alt={fallback}
      className={`${dims} ${ringCls} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <span
      className={`${dims} ${ringCls} inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground`}
    >
      {fallback}
    </span>
  );
}

// ── Buddy row (shared between both dialogs) ──

interface BuddyRowProps {
  buddy: any;
  checked: boolean;
  onToggle: (userId: string) => void;
}

function BuddyRow({ buddy, checked, onToggle }: BuddyRowProps) {
  const userId = String(getBuddySendId(buddy));
  return (
    <button
      type="button"
      onClick={() => onToggle(userId)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 mb-1 border transition-all duration-150 ${
        checked ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"
      }`}
    >
      <AvatarImg
        src={getImageUrl(buddy)}
        fallback={getInitial(getBuddyName(buddy))}
        ring={checked}
      />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-foreground">{getBuddyName(buddy)}</p>
        <p className="truncate text-xs text-muted-foreground">{getBuddyEmail(buddy)}</p>
      </div>
      {checked && (
        <svg className="h-5 w-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  GroupCreationDialog                                                */
/* ------------------------------------------------------------------ */

interface GroupCreationDialogProps {
  error: string | null;

  members: any[];
  onClose: () => void;
  onCreate: () => void;
  onSearchChange: (value: string) => void;
  onSelectMember: (userId: string) => void;
  open: boolean;
  search: string;

  selectedMembers: any[];
  title: string;
  onTitleChange: (value: string) => void;
  creating: boolean;
  page?: boolean;
}

export function GroupCreationDialog({
  error,
  members,
  onClose,
  onCreate,
  onSearchChange,
  onSelectMember,
  open,
  search,
  selectedMembers,
  title,
  onTitleChange,
  creating,
  page = false,
}: GroupCreationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      {/* ── Header ── */}
      <DialogContent className="max-w-2xl !px-4 !py-4 sm:!px-6">
        <DialogTitle className="!pb-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              {/* Group icon */}
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                New group
              </h2>
              <p className="text-sm text-muted-foreground">
                Create a space for your team and friends
              </p>
            </div>
          </div>
        </DialogTitle>

        {/* ── Body ── */}
        <div>
          {/* Group name */}
          <input
            autoFocus
            type="text"
            maxLength={80}
            placeholder="Enter a group name"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {/* Selected members label */}
          <span className="mb-1.5 mt-5 block text-xs font-semibold text-muted-foreground">
            Selected members {selectedMembers.length > 0 && `(${selectedMembers.length})`}
          </span>

          {/* Chips or placeholder */}
          {selectedMembers.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {selectedMembers.map((buddy) => {
                const userId = String(getBuddySendId(buddy));
                return (
                  <span
                    key={userId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1"
                  >
                    <AvatarImg
                      src={getImageUrl(buddy)}
                      fallback={getInitial(getBuddyName(buddy))}
                      size="sm"
                    />
                    <span className="max-w-[120px] truncate text-sm text-foreground">
                      {getBuddyName(buddy)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectMember(userId)}
                      className="ml-0.5 text-base leading-none text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">
              Select at least one person to start the group.
            </p>
          )}

          {/* Search people */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Search people"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Member list */}
          <div className="mt-3 max-h-[360px] overflow-y-auto p-0.5">
            {members.map((buddy) => {
              const userId = String(getBuddySendId(buddy));
              const checked = selectedMembers.some(
                (member) => String(getBuddySendId(member)) === userId,
              );
              return (
                <BuddyRow key={userId} buddy={buddy} checked={checked} onToggle={onSelectMember} />
              );
            })}
            {members.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No people found.</p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="!px-4 sm:!px-6 !py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={creating || !title.trim() || selectedMembers.length === 0}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create group"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The same group form rendered in the ChatSystem body instead of a modal. */
export function GroupCreationPage({
  error,
  members,
  onClose,
  onCreate,
  onSearchChange,
  onSelectMember,
  search,
  selectedMembers,
  title,
  onTitleChange,
  creating,
}: Omit<GroupCreationDialogProps, "open" | "page">) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background text-foreground">
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-8">
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <UsersRound className="h-3.5 w-3.5" />
            Team Chat
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 3-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold">Create a group</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a conversation with a team or group of people.
              </p>
            </div>
          </div>
        </header>
        <Card className="border-border/80 shadow-xs">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="space-y-2">
              <label htmlFor="new-group-title" className="text-sm font-medium">
                Group name
              </label>
              <input
                id="new-group-title"
                autoFocus
                type="text"
                maxLength={80}
                placeholder="Enter a group name"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Members</h2>
                <span className="text-xs text-muted-foreground">
                  {selectedMembers.length} selected
                </span>
              </div>
              {selectedMembers.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedMembers.map((buddy) => {
                    const userId = String(getBuddySendId(buddy));
                    return (
                      <span
                        key={userId}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1"
                      >
                        <AvatarImg
                          src={getImageUrl(buddy)}
                          fallback={getInitial(getBuddyName(buddy))}
                          size="sm"
                        />
                        <span className="max-w-[120px] truncate text-sm">
                          {getBuddyName(buddy)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${getBuddyName(buddy)}`}
                          onClick={() => onSelectMember(userId)}
                          className="ml-0.5 text-base leading-none text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="mb-3 text-sm text-muted-foreground">
                  Select people to start a group conversation.
                </p>
              )}

              <input
                type="text"
                aria-label="Search people"
                placeholder="Search people"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {error && (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="mt-3 max-h-[420px] overflow-y-auto rounded-lg border border-border/80 p-2">
                {members.map((buddy) => {
                  const userId = String(getBuddySendId(buddy));
                  const checked = selectedMembers.some(
                    (member) => String(getBuddySendId(member)) === userId,
                  );
                  return (
                    <BuddyRow
                      key={userId}
                      buddy={buddy}
                      checked={checked}
                      onToggle={onSelectMember}
                    />
                  );
                })}
                {members.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No people found.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={creating || !title.trim() || selectedMembers.length === 0}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create group"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  AddMembersDialog                                                  */
/* ------------------------------------------------------------------ */

interface AddMembersDialogProps {
  error: string | null;

  members: any[];
  onAdd: () => void;
  onClose: () => void;
  onSelect: (userId: string) => void;
  open: boolean;
  selectedIds: string[];
  adding: boolean;
}

export function AddMembersDialog({
  error,
  members,
  onAdd,
  onClose,
  onSelect,
  open,
  selectedIds,
  adding,
}: AddMembersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogTitle className="!text-lg !font-bold">Add people to group</DialogTitle>
        <div>
          {error && (
            <div className="mb-3 rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="max-h-[360px] overflow-y-auto p-0.5">
            {members.map((buddy) => {
              const userId = String(getBuddySendId(buddy));
              const checked = selectedIds.includes(userId);
              return <BuddyRow key={userId} buddy={buddy} checked={checked} onToggle={onSelect} />;
            })}
          </div>

          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Everyone available is already in this group.
            </p>
          )}
        </div>

        <DialogFooter className="!px-4 !py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAdd}
            disabled={adding || members.length === 0}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
