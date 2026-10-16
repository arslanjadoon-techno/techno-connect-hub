import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Search, UsersRound, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getBuddyEmail, getBuddyName, getBuddySendId, getImageUrl } from "../chatHealper";
import { getInitial } from "../sidebar/chatSidebarUtils";
import { AvatarImg, BuddyRow } from "./GroupDialogParts";

const idOf = (buddy: any) => String(getBuddySendId(buddy));
const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/* ------------------------------------------------------------------ */
/*  Shared pieces                                                      */
/* ------------------------------------------------------------------ */

function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
    >
      {error}
    </div>
  );
}

function SearchField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        aria-label="Search people"
        placeholder="Search people"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pl-9`}
      />
    </div>
  );
}

function SelectedChips({
  selectedMembers,
  onRemove,
}: {
  selectedMembers: any[];
  onRemove: (userId: string) => void;
}) {
  if (selectedMembers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Select at least one person to start the group.
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {selectedMembers.map((buddy) => {
        const userId = idOf(buddy);
        const name = getBuddyName(buddy);
        return (
          <li
            key={userId}
            className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-1.5 pr-1"
          >
            <AvatarImg src={getImageUrl(buddy)} fallback={getInitial(name)} size="sm" />
            <span className="max-w-[120px] truncate text-sm text-foreground">{name}</span>
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={() => onRemove(userId)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BuddyList({
  members,
  isChecked,
  onToggle,
  loading = false,
  emptyText = "No people found.",
  className = "max-h-[360px]",
}: {
  members: any[];
  isChecked: (userId: string) => boolean;
  onToggle: (userId: string) => void;
  loading?: boolean;
  emptyText?: string;
  className?: string;
}) {
  return (
    <div className={`overflow-y-auto rounded-lg border p-1 ${className}`}>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Loading people" />
        </div>
      ) : members.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        members.map((buddy) => {
          const userId = idOf(buddy);
          return (
            <BuddyRow key={userId} buddy={buddy} checked={isChecked(userId)} onToggle={onToggle} />
          );
        })
      )}
    </div>
  );
}

function SubmitLabel({ busy, idle, working }: { busy: boolean; idle: string; working: string }) {
  return busy ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {working}
    </>
  ) : (
    <>{idle}</>
  );
}

/* ------------------------------------------------------------------ */
/*  Group creation (shared form used by the dialog and the page)       */
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
  loading?: boolean;
  page?: boolean;
}

type GroupFormProps = Omit<GroupCreationDialogProps, "open" | "page"> & {
  listClassName?: string;
};

function GroupCreationForm({
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
  loading = false,
  listClassName,
  header,
  footerClassName = "",
}: GroupFormProps & { header: ReactNode; footerClassName?: string }) {
  const canCreate = !creating && title.trim().length > 0 && selectedMembers.length > 0;
  const hint = !title.trim()
    ? "Enter a group name to continue."
    : selectedMembers.length === 0
      ? "Select at least one person."
      : "";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canCreate) onCreate();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {header}

      <div className="space-y-2">
        <label htmlFor="new-group-title" className="text-sm text-foreground">
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
          className={inputClass}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm text-foreground">Members</h2>
          <span className="text-xs text-muted-foreground">{selectedMembers.length} selected</span>
        </div>
        <SelectedChips selectedMembers={selectedMembers} onRemove={onSelectMember} />
        <SearchField id="new-group-search" value={search} onChange={onSearchChange} />
        <ErrorMessage error={error} />
        <BuddyList
          members={members}
          loading={loading}
          className={listClassName}
          isChecked={(userId) => selectedMembers.some((member) => idOf(member) === userId)}
          onToggle={onSelectMember}
        />
      </div>

      <div className={`flex items-center justify-end gap-2 ${footerClassName}`}>
        <span className="mr-auto text-xs text-muted-foreground" role="status">
          {hint}
        </span>
        <Button type="button" variant="ghost" onClick={onClose} disabled={creating}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canCreate}>
          <SubmitLabel busy={creating} idle="Create group" working="Creating…" />
        </Button>
      </div>
    </form>
  );
}

export function GroupCreationDialog({ open, onClose, ...form }: GroupCreationDialogProps) {
  const { page: _page, ...rest } = form;
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl">
        <GroupCreationForm
          {...rest}
          onClose={onClose}
          header={
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UsersRound className="h-5 w-5" />
              </span>
              <DialogHeader className="space-y-0.5 text-left">
                <DialogTitle className="text-xl font-normal">New group</DialogTitle>
                <DialogDescription>Create a space for your team and friends.</DialogDescription>
              </DialogHeader>
            </div>
          }
        />
      </DialogContent>
    </Dialog>
  );
}

/** The same group form rendered in the ChatSystem body instead of a modal. */
export function GroupCreationPage(props: Omit<GroupCreationDialogProps, "open" | "page">) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background text-foreground">
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-8">
        <GroupCreationForm
          {...props}
          listClassName="max-h-[420px]"
          footerClassName="border-t pt-4"
          header={
            <header className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UsersRound className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-normal">Create a group</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Start a conversation with a team or group of people.
                </p>
              </div>
            </header>
          }
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  AddMembersDialog                                                   */
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
  onSearchChange?: (value: string) => void;
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
  onSearchChange,
}: AddMembersDialogProps) {
  const [search, setSearch] = useState("");

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((buddy) =>
      [getBuddyName(buddy), getBuddyEmail(buddy), getBuddySendId(buddy)].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [members, search]);

  // Cancel, the X button and clicking outside all clear the search the same way.
  const handleClose = () => {
    setSearch("");
    onSearchChange?.("");
    onClose();
  };

  const emptyText =
    members.length === 0 ? "Everyone available is already in this group." : "No people found.";

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-normal">Add people to group</DialogTitle>
          <DialogDescription>Choose who should join this conversation.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <ErrorMessage error={error} />
          <SearchField
            id="add-members-search"
            value={search}
            onChange={(value) => {
              setSearch(value);
              onSearchChange?.(value);
            }}
          />
          <BuddyList
            members={filteredMembers}
            emptyText={emptyText}
            isChecked={(userId) => selectedIds.includes(userId)}
            onToggle={onSelect}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={adding}>
            Cancel
          </Button>
          <Button type="button" onClick={onAdd} disabled={adding || selectedIds.length === 0}>
            <SubmitLabel
              busy={adding}
              idle={selectedIds.length > 0 ? `Add ${selectedIds.length}` : "Add"}
              working="Adding…"
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
