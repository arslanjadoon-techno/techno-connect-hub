import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Phone,
  Play,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { downloadAttachment, getMessageAttachments, type ChatAttachment } from "./chatHealper";
import NotesDialog from "./sidebar/NotesDialog";

export type ChatBodyView = "conversations" | "calls" | "media" | "notes";

export type ChatNote = {
  id: string | number;
  title?: string;
  body?: string;
  reminderAt?: string | null;
  notifiedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  isPinned?: boolean;
  isArchived?: boolean;
};

type ChatRecord = Record<string, any>;

interface ChatBodyPanelsProps {
  view: Exclude<ChatBodyView, "conversations">;
  notes: ChatNote[];
  libraryMessages: ChatRecord[];
  libraryLoading: boolean;
  libraryError: string;
  notesLoading?: boolean;
  notesError?: string;
  callStarting?: boolean;
  onBack: () => void;
  onCloseNotes: () => void;
  onSaveNote: (draft: {
    id: string | number | null;
    title: string;
    body: string;
    reminderAt: string;
  }) => void;
  onDeleteNote: (id: ChatNote["id"]) => void;
  onToggleNote?: (note: ChatNote, field: "isPinned" | "isArchived") => void;
  onStartCallFromHistory?: (value: { chatId: string | number; type: string }) => void;
}

const panelTitles: Record<Exclude<ChatBodyView, "conversations">, string> = {
  calls: "Calls",
  media: "Media and files",
  notes: "Notes",
};

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

type MediaTab = "visual" | "files" | "links";

const toHref = (url: string) => (url.toLowerCase().startsWith("www.") ? `https://${url}` : url);

const hostOf = (url: string) => {
  try {
    return new URL(toHref(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

// Shows nothing for a missing or invalid date, instead of falling back to "now".
function formatWhen(value?: string | number | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateTimeFormat.format(date);
}

const timeOf = (value?: string | number | null) => {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getContentType = (file: ChatRecord) =>
  String(file.contentType || file.content_type || file.mimeType || "").toLowerCase();

// Attachments come in several API shapes, so every known URL field is checked.
const getFileUrl = (file: ChatRecord): string =>
  file.url ||
  file.downloadUrl ||
  file.download_url ||
  file.fileUrl ||
  file.file_url ||
  file.publicUrl ||
  file.public_url ||
  "";

/* ------------------------------ call history ------------------------------ */

function CallRow({
  message,
  callStarting,
  onStart,
}: {
  message: ChatRecord;
  callStarting: boolean;
  onStart?: (value: { chatId: string | number; type: string }) => void;
}) {
  const history = message.callHistory || message.metadata?.callHistory || {};
  const status = String(history.status || "ended").toLowerCase();
  const isError = status === "missed" || status === "declined";
  const isComplete = status === "ended";
  const isVideo = String(history.type || "").toLowerCase() === "video";
  const starterName = history.startedBy?.name || message.authorName || "";
  const chatId =
    message.chatId || message.chat_id || message.conversationId || message.conversation_id;
  const when = formatWhen(message.sentAt);

  const iconClass = isError
    ? "bg-destructive/10 text-destructive"
    : isComplete
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";

  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        {isVideo ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${isError ? "text-destructive" : "text-foreground"}`}>
          {status === "missed"
            ? `Missed call from ${starterName || "Unknown user"}`
            : `${isVideo ? "Video" : "Audio"} call ${status}`}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-5 w-5">
            <AvatarImage src={history.startedBy?.avatarUrl} />
            <AvatarFallback>{(starterName || "C").charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="truncate">
            {starterName || "Chat"}
            {when ? `, ${when}` : ""}
          </span>
        </div>
      </div>

      {(["audio", "video"] as const).map((type) => (
        <Button
          key={type}
          size="icon"
          variant="outline"
          disabled={callStarting || !chatId}
          aria-label={`Start ${type} call`}
          title={`Start ${type} call`}
          onClick={() => onStart?.({ chatId, type })}
        >
          {type === "audio" ? <Phone /> : <Video />}
        </Button>
      ))}
    </li>
  );
}

/* --------------------------------- media ---------------------------------- */

function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-5 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="text-sm text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function ChatBodyPanels({
  view,
  notes,
  libraryMessages,
  libraryLoading,
  libraryError,
  notesLoading = false,
  notesError = "",
  callStarting = false,
  onBack,
  onCloseNotes,
  onSaveNote,
  onDeleteNote,
  onToggleNote,
  onStartCallFromHistory,
}: ChatBodyPanelsProps) {
  // Newest first.
  const callMessages = useMemo(
    () =>
      libraryMessages
        .filter((message) => message.metadata?.kind === "call_history" || message.callHistory)
        .sort((a, b) => timeOf(b.sentAt) - timeOf(a.sentAt)),
    [libraryMessages],
  );

  const { visualItems, documentItems } = useMemo(() => {
    const visual: Array<ChatAttachment & { message: ChatRecord; url: string }> = [];
    const documents: Array<ChatAttachment & { message: ChatRecord; url: string }> = [];
    for (const message of libraryMessages) {
      for (const file of getMessageAttachments(message) as ChatAttachment[]) {
        const item = { ...file, message, url: getFileUrl(file as ChatRecord) };
        const type = getContentType(file as ChatRecord);
        if (item.url && (type.startsWith("image/") || type.startsWith("video/"))) visual.push(item);
        else documents.push(item);
      }
    }
    return { visualItems: visual, documentItems: documents };
  }, [libraryMessages]);

  // Every link shared in the loaded messages, newest first, without repeats.
  const linkItems = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ url: string; href: string; host: string; message: ChatRecord }> = [];
    const newestFirst = [...libraryMessages].sort((a, b) => timeOf(b.sentAt) - timeOf(a.sentAt));
    for (const message of newestFirst) {
      for (const value of String(message.text || "").match(URL_PATTERN) || []) {
        const url = value.replace(/[),.!?:;]+$/, "");
        if (seen.has(url)) continue;
        seen.add(url);
        items.push({ url, href: toHref(url), host: hostOf(url), message });
      }
    }
    return items;
  }, [libraryMessages]);

  const [mediaTab, setMediaTab] = useState<MediaTab>("visual");

  // Once the library loads, open on the first tab that has something in it.
  useEffect(() => {
    if (view !== "media" || libraryLoading) return;
    setMediaTab(
      visualItems.length ? "visual" : documentItems.length ? "files" : linkItems.length ? "links" : "visual",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, libraryLoading]);

  const mediaTabs: { value: MediaTab; label: string; count: number }[] = [
    { value: "visual", label: "Photos and videos", count: visualItems.length },
    { value: "files", label: "Files", count: documentItems.length },
    { value: "links", label: "Links", count: linkItems.length },
  ];

  const showStatus = !libraryLoading && !libraryError;

  return (
    <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <header className="flex min-h-16 items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-display text-lg font-normal text-foreground">{panelTitles[view]}</h2>
      </header>

      {/* The notes page fills this area only, so it never covers the header and back button. */}
      {view === "notes" && (
        <div className="relative min-h-0 flex-1">
          <NotesDialog
            notes={notes}
            loading={notesLoading}
            error={notesError}
            open
            page
            onClose={onCloseNotes}
            onSave={onSaveNote}
            onDelete={onDeleteNote}
            onToggleNote={onToggleNote}
          />
        </div>
      )}

      {view !== "notes" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {libraryLoading && (
            <p role="status" className="py-10 text-center text-sm text-muted-foreground">
              Loading {panelTitles[view].toLowerCase()}…
            </p>
          )}
          {!libraryLoading && libraryError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {libraryError}
            </p>
          )}

          {showStatus && view === "calls" && (
            <div className="mx-auto max-w-4xl">
              {callMessages.length > 0 ? (
                <ul className="space-y-2">
                  {callMessages.map((message, index) => (
                    <CallRow
                      key={message.id ?? index}
                      message={message}
                      callStarting={callStarting}
                      onStart={onStartCallFromHistory}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<Phone className="h-5 w-5" />}
                  title="No call history yet"
                  hint="Calls from your conversations will appear here."
                />
              )}
            </div>
          )}

          {showStatus && view === "media" && (
            <div className="mx-auto w-full max-w-4xl">
              <div
                role="tablist"
                aria-label="Shared content"
                className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
              >
                {mediaTabs.map(({ value, label, count }) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    id={`media-tab-${value}`}
                    aria-selected={mediaTab === value}
                    aria-controls={`media-panel-${value}`}
                    onClick={() => setMediaTab(value)}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      mediaTab === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
                  </button>
                ))}
              </div>

              {mediaTab === "visual" && (
                <div role="tabpanel" id="media-panel-visual" aria-labelledby="media-tab-visual">
                  {visualItems.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
                      {visualItems.map((file, index) => {
                        const isVideo = getContentType(file as ChatRecord).startsWith("video/");
                        const name = file.name || (isVideo ? "Video" : "Photo");
                        return (
                          <div
                            key={`${file.message?.id ?? "message"}-${file.id ?? index}`}
                            className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
                          >
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${name}`}
                              className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                            >
                              {isVideo ? (
                                <>
                                  <video
                                    src={file.url}
                                    preload="metadata"
                                    muted
                                    className="h-full w-full object-cover"
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white">
                                      <Play className="h-4 w-4" />
                                    </span>
                                  </span>
                                </>
                              ) : (
                                <img
                                  src={file.url}
                                  alt={name}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                              )}
                            </a>
                            <a
                              href={file.url}
                              download={name}
                              aria-label={`Download ${name}`}
                              title="Download"
                              onClick={(event) => downloadAttachment(event.nativeEvent, file)}
                              className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<ImageIcon className="h-5 w-5" />}
                      title="No photos or videos yet"
                      hint="Photos and videos shared in your conversations will appear here."
                    />
                  )}
                </div>
              )}

              {mediaTab === "files" && (
                <div role="tabpanel" id="media-panel-files" aria-labelledby="media-tab-files">
                  {documentItems.length > 0 ? (
                    <ul className="space-y-2">
                      {documentItems.map((file, index) => {
                        const when = formatWhen(file.message?.sentAt);
                        return (
                          <li
                            key={`${file.message?.id ?? "message"}-${file.id ?? index}`}
                            className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FileText className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-foreground" title={file.name}>
                                {file.name || "Attachment"}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                Shared by {file.message?.authorName || "Chat"}
                                {when ? `, ${when}` : ""}
                              </p>
                            </div>
                            {file.url ? (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={file.url}
                                  download={file.name || undefined}
                                  onClick={(event) => downloadAttachment(event.nativeEvent, file)}
                                >
                                  <Download className="h-4 w-4" />
                                  Download
                                </a>
                              </Button>
                            ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                Unavailable
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <EmptyState
                      icon={<FileText className="h-5 w-5" />}
                      title="No files yet"
                      hint="Documents and other files shared in your conversations will appear here."
                    />
                  )}
                </div>
              )}

              {mediaTab === "links" && (
                <div role="tabpanel" id="media-panel-links" aria-labelledby="media-tab-links">
                  {linkItems.length > 0 ? (
                    <ul className="space-y-2">
                      {linkItems.map((item) => {
                        const when = formatWhen(item.message?.sentAt);
                        return (
                          <li key={item.url}>
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Link2 className="h-5 w-5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-foreground">
                                  {item.host}
                                </span>
                                <span
                                  className="block truncate text-xs text-muted-foreground"
                                  title={item.url}
                                >
                                  {item.url}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                  Shared by {item.message?.authorName || "Chat"}
                                  {when ? `, ${when}` : ""}
                                </span>
                              </span>
                              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <EmptyState
                      icon={<Link2 className="h-5 w-5" />}
                      title="No links yet"
                      hint="Links shared in your conversations will appear here."
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
} 