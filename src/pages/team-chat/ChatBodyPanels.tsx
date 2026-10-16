import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Link2,
  Phone,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMessageAttachments, type ChatAttachment } from "./chatHealper";
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
  media: "Media",
  notes: "Notes",
};

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
  const callMessages = libraryMessages.filter(
    (message) => message.metadata?.kind === "call_history" || message.callHistory,
  );
  const mediaItems: Array<ChatAttachment & { message: ChatRecord }> = libraryMessages.flatMap(
    (message: ChatRecord) =>
      getMessageAttachments(message).map((file: ChatAttachment) => ({
      ...file,
      message,
      })),
  );
  const visualItems = mediaItems.filter((file) => {
    const type = String(file.contentType || file.content_type || file.mimeType || "").toLowerCase();
    return type.startsWith("image/") || type.startsWith("video/");
  });
  const documentItems = mediaItems.filter((file) => !visualItems.includes(file));

  return (
    <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <header className="flex min-h-16 items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-display text-lg font-semibold text-foreground">{panelTitles[view]}</h2>
      </header>

      {view === "notes" && (
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
      )}

      {view !== "notes" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
          {libraryLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading {panelTitles[view].toLowerCase()}…
            </p>
          )}
          {!libraryLoading && libraryError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {libraryError}
            </p>
          )}
          {!libraryLoading && !libraryError && view === "calls" && (
            <div className="mx-auto max-w-4xl space-y-3">
              {callMessages.map((message) => (
                <Card
                  key={message.id}
                  className="border-border/80 shadow-xs transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    {(() => {
                      const history = message.callHistory || message.metadata?.callHistory || {};
                      const status = String(history.status || "").toLowerCase();
                      const error = status === "missed" || status === "declined";
                      const complete = status === "ended";
                      const color = error
                        ? "bg-red-500/15 text-red-500"
                        : complete
                          ? "bg-green-500/15 text-green-600 dark:text-green-400"
                          : "bg-muted text-muted-foreground";
                      return (
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}
                        >
                          {String(history.type || "").toLowerCase() === "video" ? (
                            <Video className="h-5 w-5" />
                          ) : (
                            <Phone className="h-5 w-5" />
                          )}
                        </div>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      {(() => {
                        const history = message.callHistory || message.metadata?.callHistory || {};
                        const status = String(history.status || "ended").toLowerCase();
                        const error = status === "missed" || status === "declined";
                        const complete = status === "ended";
                        return (
                          <p
                            className={`truncate text-sm font-semibold ${error ? "text-red-500" : complete ? "text-green-600 dark:text-green-400" : "text-foreground"}`}
                          >
                            {status === "missed"
                              ? `Missed call from ${history.startedBy?.name || message.authorName || "Unknown user"}`
                              : `${history.type || "audio"} call ${status}`}
                          </p>
                        );
                      })()}
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={
                              (message.callHistory || message.metadata?.callHistory)?.startedBy
                                ?.avatarUrl
                            }
                          />
                          <AvatarFallback>
                            {String(
                              (message.callHistory || message.metadata?.callHistory)?.startedBy
                                ?.name ||
                                message.authorName ||
                                "C",
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {(message.callHistory || message.metadata?.callHistory)?.startedBy
                            ?.name ||
                            message.authorName ||
                            "Chat"}{" "}
                          · {new Date(message.sentAt || Date.now()).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={callStarting}
                      aria-label="Start audio call"
                      onClick={() =>
                        onStartCallFromHistory?.({
                          chatId:
                            message.chatId ||
                            message.chat_id ||
                            message.conversationId ||
                            message.conversation_id,
                          type: "audio",
                        })
                      }
                    >
                      <Phone />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={callStarting}
                      aria-label="Start video call"
                      onClick={() =>
                        onStartCallFromHistory?.({
                          chatId:
                            message.chatId ||
                            message.chat_id ||
                            message.conversationId ||
                            message.conversation_id,
                          type: "video",
                        })
                      }
                    >
                      <Video />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {callMessages.length === 0 && (
                <Card className="border-dashed shadow-xs">
                  <CardContent className="flex flex-col items-center px-5 py-10 text-center">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Phone className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No call history yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Calls from your conversations will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          {!libraryLoading && !libraryError && view === "media" && (
            <div className="w-full">
              {visualItems.length > 0 && (
                <section className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold">Media</h3>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,160px))] justify-start gap-2">
                    {visualItems.map((file, index) => {
                      const type = String(
                        file.contentType || file.content_type || file.mimeType || "",
                      ).toLowerCase();
                      const isVideo = type.startsWith("video/");
                      return (
                        <div
                          key={`${file.message?.id || "message"}-${file.id || index}`}
                          className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
                        >
                          <a href={file.url} target="_blank" rel="noreferrer">
                            {isVideo ? (
                              <video src={file.url} muted className="h-full w-full object-cover" />
                            ) : (
                              <img
                                src={file.url}
                                alt={file.name || "Shared media"}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            )}
                          </a>
                          {file.url && (
                            <a
                              href={file.url}
                              download={file.name || "shared-media"}
                              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white hover:bg-black/80"
                            >
                              Download
                            </a>
                          )}
                          <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-xs text-white">
                            {file.name || (isVideo ? "Video" : "Photo")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              {documentItems.map((file, index) => (
                <Card
                  key={`${file.message?.id || "message"}-${file.id || index}`}
                  className="mb-3 border-border/80 shadow-xs transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex min-w-0 items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {file.url && /https?:\/\//i.test(file.url) ? (
                        <Link2 className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {file.name || "Attachment"}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        Shared by {file.message?.authorName || "Chat"}
                      </p>
                    </div>
                    {file.url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={file.url} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {mediaItems.length === 0 && (
                <Card className="border-dashed shadow-xs">
                  <CardContent className="flex flex-col items-center px-5 py-10 text-center">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No shared files yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Files shared in your conversations will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
