import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  Archive,
  Bell,
  CalendarClock,
  Edit3,
  FileText,
  Loader2,
  Pin,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Note {
  id: string | number;
  title?: string;
  body?: string;
  reminderAt?: string | null;
  updatedAt?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}
interface NoteDraft {
  id: string | number | null;
  title: string;
  body: string;
  reminderAt: string;
}
interface Props {
  notes: Note[];
  onClose: () => void;
  onDelete: (id: Note["id"]) => void;
  onSave: (draft: NoteDraft) => void;
  onToggleNote?: (note: Note, field: "isPinned" | "isArchived") => void;
  loading?: boolean;
  error?: string;
  open: boolean;
  page?: boolean;
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function timeOf(value?: string | null) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(value?: string | null) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "" : dateTimeFormat.format(date);
}

export default function NotesDialog({
  notes,
  onClose,
  onDelete,
  onSave,
  open,
  page = false,
  onToggleNote,
  loading = false,
  error = "",
}: Props) {
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<Note["id"] | null>(null);

  const canSave = Boolean(title.trim() || body.trim());

  const { sortedNotes, activeCount, archivedCount } = useMemo(() => {
    const archived = notes.filter((note) => note.isArchived).length;
    const sorted = notes
      .filter((note) => Boolean(note.isArchived) === showArchived)
      .sort(
        (a, b) =>
          Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) ||
          timeOf(b.updatedAt || b.reminderAt) - timeOf(a.updatedAt || a.reminderAt),
      );
    return { sortedNotes: sorted, activeCount: notes.length - archived, archivedCount: archived };
  }, [notes, showArchived]);

  const reset = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setReminderAt("");
  };

  useEffect(() => {
    if (open) {
      reset();
      setEditorOpen(false);
      setConfirmDeleteId(null);
    }
  }, [open]);

  const edit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title || "");
    setBody(note.body || "");
    setReminderAt(toDateTimeLocal(note.reminderAt));
    setEditorOpen(true);
  };

  const save = () => {
    if (!canSave) return;
    onSave({ id: editingId, title, body, reminderAt });
    reset();
    setEditorOpen(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save();
  };

  // Ctrl+Enter or Cmd+Enter saves from the note field.
  const handleBodyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      save();
    }
  };

  const editor = (
    <form id="note-form" onSubmit={handleSubmit} className="space-y-4">
      {editingId !== null && !page && (
        <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Editing a note</span>
          <button
            type="button"
            onClick={reset}
            className="text-primary hover:underline focus-visible:outline-none focus-visible:underline"
          >
            Cancel editing
          </button>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="note-title" className="font-normal">
          Title
        </Label>
        <Input
          id="note-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to remember?"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note-body" className="font-normal">
          Note
        </Label>
        <Textarea
          id="note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleBodyKeyDown}
          placeholder="Add details…"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">Press Ctrl+Enter to save.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note-reminder" className="font-normal">
          Reminder
        </Label>
        <div className="relative">
          <Bell className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="note-reminder"
            type="datetime-local"
            value={reminderAt}
            onChange={(e) => setReminderAt(e.target.value)}
            className="pl-9 pr-9"
          />
          {reminderAt && (
            <button
              type="button"
              aria-label="Clear reminder"
              onClick={() => setReminderAt("")}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );

  const now = Date.now();

  const content = (
    <div className="space-y-5">
      {!page && editor}

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="h-4 w-4 text-primary" /> Saved notes
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Keep important details and reminders close at hand.
          </p>
        </div>
        {page && (
          <Button
            size="sm"
            onClick={() => {
              reset();
              setEditorOpen(true);
            }}
          >
            <Plus /> Add note
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b pb-3" role="tablist" aria-label="Note filter">
        <Button
          size="sm"
          role="tab"
          aria-selected={!showArchived}
          variant={!showArchived ? "default" : "outline"}
          onClick={() => setShowArchived(false)}
        >
          Active ({activeCount})
        </Button>
        <Button
          size="sm"
          role="tab"
          aria-selected={showArchived}
          variant={showArchived ? "default" : "outline"}
          onClick={() => setShowArchived(true)}
        >
          Archived ({archivedCount})
        </Button>
      </div>

      {loading ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading notes…
        </div>
      ) : sortedNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {showArchived ? <Archive className="h-5 w-5" /> : <StickyNote className="h-5 w-5" />}
          </div>
          <p className="text-sm text-foreground">
            {showArchived ? "No archived notes" : "No notes yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {showArchived
              ? "Notes you archive will show up here."
              : "Add a note to keep useful information and reminders in one place."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sortedNotes.map((note) => {
            const overdue = note.reminderAt ? timeOf(note.reminderAt) < now : false;
            const confirming = confirmDeleteId === note.id;
            return (
              <li key={note.id}>
                <Card
                  className={`h-full shadow-xs transition-shadow hover:shadow-md ${note.isPinned ? "border-primary/40" : "border-border/80"}`}
                >
                  <CardContent className="p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm text-foreground">
                          {note.title || "Untitled note"}
                        </p>
                        {note.body && (
                          <p className="mt-2 line-clamp-6 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                            {note.body}
                          </p>
                        )}
                        {note.reminderAt && formatDate(note.reminderAt) && (
                          <p
                            className={`mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${overdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            {overdue ? "Overdue, " : ""}
                            {formatDate(note.reminderAt)}
                          </p>
                        )}
                        {note.updatedAt && formatDate(note.updatedAt) && (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Updated {formatDate(note.updatedAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                          aria-pressed={Boolean(note.isPinned)}
                          title={note.isPinned ? "Unpin" : "Pin"}
                          onClick={() => onToggleNote?.(note, "isPinned")}
                        >
                          <Pin
                            className={
                              note.isPinned ? "h-4 w-4 fill-current text-primary" : "h-4 w-4"
                            }
                          />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={note.isArchived ? "Unarchive note" : "Archive note"}
                          title={note.isArchived ? "Unarchive" : "Archive"}
                          onClick={() => onToggleNote?.(note, "isArchived")}
                        >
                          <Archive
                            className={note.isArchived ? "h-4 w-4 text-primary" : "h-4 w-4"}
                          />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          aria-label={`Edit ${note.title || "note"}`}
                          title="Edit"
                          onClick={() => edit(note)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${note.title || "note"}`}
                          title="Delete"
                          onClick={() => setConfirmDeleteId(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {confirming && (
                      <div
                        role="alertdialog"
                        aria-label="Confirm delete"
                        className="mt-3 flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm"
                      >
                        <span className="text-destructive">Delete this note?</span>
                        <span className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Keep
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              onDelete(note.id);
                              setConfirmDeleteId(null);
                            }}
                          >
                            Delete
                          </Button>
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (page)
    return (
      <main className="absolute inset-0 z-10 overflow-y-auto bg-background p-4 text-foreground sm:p-8">
        <div className="mx-auto max-w-4xl animate-fade-in">
          <header className="mb-6">
            <h1 className="font-display text-2xl font-normal">My notes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Save important details and set reminders for yourself.
            </p>
          </header>
          {content}
        </div>
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-normal">
                {editingId !== null ? "Edit note" : "Add note"}
              </DialogTitle>
            </DialogHeader>
            {editor}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="note-form" disabled={!canSave}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    );

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-normal">My notes</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
          <Button type="submit" form="note-form" disabled={!canSave}>
            {editingId !== null ? "Save changes" : "Add note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
