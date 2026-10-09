import { useEffect, useMemo, useState } from "react";
import { Archive, Bell, CalendarClock, Edit3, FileText, Pin, Plus, StickyNote, Trash2 } from "lucide-react";
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
function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
  const sortedNotes = useMemo(
    () =>
      notes.filter((note) => Boolean(note.isArchived) === showArchived).sort(
        (a, b) =>
          Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) ||
          new Date(b.updatedAt || b.reminderAt || 0).getTime() -
          new Date(a.updatedAt || a.reminderAt || 0).getTime(),
      ),
    [notes, showArchived],
  );
  useEffect(() => {
    if (open) {
      setEditingId(null);
      setTitle("");
      setBody("");
      setReminderAt("");
      setEditorOpen(false);
    }
  }, [open]);
  const reset = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setReminderAt("");
  };
  const edit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title || "");
    setBody(note.body || "");
    setReminderAt(toDateTimeLocal(note.reminderAt));
    setEditorOpen(true);
  };
  const save = () => {
    if (!title.trim() && !body.trim()) return;
    onSave({ id: editingId, title, body, reminderAt });
    reset();
    setEditorOpen(false);
  };
  const editor = (
    <div className="space-y-5">
      {loading && <p className="text-sm text-muted-foreground">Loading notes…</p>}
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to remember?"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note-body">Note</Label>
        <Textarea
          id="note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add details…"
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note-reminder">Reminder</Label>
        <div className="relative">
          <Bell className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="note-reminder"
            type="datetime-local"
            value={reminderAt}
            onChange={(e) => setReminderAt(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
    </div>
  );
  const content = (
    <div className="space-y-5">
      {!page && editor}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
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
      <div className="flex gap-2 border-b pb-3">
        <Button size="sm" variant={!showArchived ? "default" : "outline"} onClick={() => setShowArchived(false)}>Active</Button>
        <Button size="sm" variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived(true)}>Archived</Button>
      </div>
      {sortedNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <StickyNote className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">No notes yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a note to keep useful information and reminders in one place.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sortedNotes.map((note) => (
            <Card
              key={note.id}
              className="border-border/80 shadow-xs transition-shadow hover:shadow-md"
            >
              <CardContent className="flex min-w-0 items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-foreground">
                    {note.title || "Untitled note"}
                  </p>
                  {note.body && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {note.body}
                    </p>
                  )}
                  {note.updatedAt && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Updated {new Date(note.updatedAt).toLocaleString()}
                    </p>
                  )}
                  {note.reminderAt && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {new Date(note.reminderAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Pin note" onClick={() => onToggleNote?.(note, "isPinned")}><Pin className={note.isPinned ? "h-4 w-4 fill-current text-primary" : "h-4 w-4"} /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={note.isArchived ? "Unarchive note" : "Archive note"} title={note.isArchived ? "Unarchive" : "Archive"} onClick={() => onToggleNote?.(note, "isArchived")}><Archive className={note.isArchived ? "h-4 w-4 text-primary" : "h-4 w-4"} /></Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label={`Edit ${note.title || "note"}`}
                    onClick={() => edit(note)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${note.title || "note"}`}
                    onClick={() => onDelete(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
  if (page)
    return (
      <main className="absolute inset-0 z-10 overflow-y-auto bg-background p-4 text-foreground sm:p-8">
        <div className="mx-auto max-w-4xl animate-fade-in">
          <header className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <StickyNote className="h-3.5 w-3.5" />
              Team Chat
            </div>
            <h1 className="font-display text-2xl font-semibold">My notes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Save important details and set reminders for yourself.
            </p>
          </header>
          {content}
        </div>
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit note" : "Add note"}</DialogTitle>
            </DialogHeader>
            {editor}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={!title.trim() && !body.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    );
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>My notes</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
          <Button onClick={save} disabled={!title.trim() && !body.trim()}>
            {editingId ? "Save changes" : "Add note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
