import { useCallback, useEffect } from "react";
import {
  createNote,
  deleteNote as deleteNoteService,
  getNotes,
  updateNote,
} from "@/services/Team-chat/chat.service";

type Note = {
  id: string | number;
  title: string;
  body: string;
  reminderAt?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export function useChatNotes({
  bodyView,
  currentUserId,
  notes,
  setNotes,
  setNotesLoading,
  setNotesError,
}: any) {
  useEffect(() => {
    // On a hard reload the chat identity is restored just after the page
    // mounts. Do not issue the notes request with an empty identity.
    if (bodyView !== "notes" || !currentUserId) return undefined;
    let cancelled = false;
    setNotesLoading(true);
    setNotesError("");

    getNotes(true)
      .then((response: any) => {
        if (cancelled) return;
        const findItems = (value: any, depth = 0): any[] => {
          if (depth > 4 || value == null) return [];
          if (Array.isArray(value)) return value;
          if (typeof value !== "object") return [];
          if (Array.isArray(value.notes)) return value.notes;
          if (Array.isArray(value.items)) return value.items;
          return findItems(value.data, depth + 1);
        };
        const items = findItems(response);
        setNotes(
          items.map((note: any) => ({
            id: note.id,
            title: note.title || "",
            body: note.content || note.body || "",
            reminderAt: note.reminderAt || "",
            isPinned: Boolean(note.isPinned),
            isArchived: Boolean(note.isArchived),
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          })),
        );
      })
      .catch((error) => {
        if (!cancelled)
          setNotesError(error instanceof Error ? error.message : "Unable to load notes.");
      })
      .finally(() => {
        if (!cancelled) setNotesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bodyView, currentUserId, setNotes, setNotesError, setNotesLoading]);

  const saveNote = useCallback(
    ({ id, title, body, reminderAt }: any) => {
      const existingNote = id ? notes.find((item: Note) => item.id === id) : null;
      const payload = {
        title: title.trim(),
        content: body.trim(),
        isPinned: Boolean(existingNote?.isPinned),
        isArchived: Boolean(existingNote?.isArchived),
      };
      setNotesError("");
      const request = id ? updateNote(id, payload) : createNote(payload);
      request
        .then((response: any) => {
          const note = response?.data?.data || response?.data || response;
          const mapped = {
            id: note.id || id,
            title: note.title || payload.title,
            body: note.content || payload.content,
            reminderAt: note.reminderAt || reminderAt || "",
            isPinned: Boolean(note.isPinned),
            isArchived: Boolean(note.isArchived),
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          };
          setNotes((previous: Note[]) =>
            id
              ? previous.map((item) => (item.id === id ? { ...item, ...mapped } : item))
              : [mapped, ...previous],
          );
        })
        .catch((error) =>
          setNotesError(error instanceof Error ? error.message : "Unable to save note."),
        );
    },
    [notes, setNotes, setNotesError],
  );

  const deleteNote = useCallback(
    (id: Note["id"]) => {
      setNotesError("");
      setNotes((previous: Note[]) => previous.filter((note) => String(note.id) !== String(id)));
      deleteNoteService(id).catch((error) =>
        setNotesError(error instanceof Error ? error.message : "Unable to delete note."),
      );
    },
    [setNotes, setNotesError],
  );

  return { saveNote, deleteNote };
}
