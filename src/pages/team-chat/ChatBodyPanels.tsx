import { Download, FileText, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMessageAttachments } from "./chatHealper";
import NotesDialog from "./sidebar/NotesDialog";

export type ChatBodyView = "conversations" | "calls" | "media" | "notes";

export type ChatNote = {
  id: string | number;
  title?: string;
  body?: string;
  reminderAt?: string;
  notifiedAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

type ChatRecord = Record<string, any>;

interface ChatBodyPanelsProps {
  view: Exclude<ChatBodyView, "conversations">;
  notes: ChatNote[];
  libraryMessages: ChatRecord[];
  libraryLoading: boolean;
  libraryError: string;
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
  callStarting = false,
  onBack,
  onCloseNotes,
  onSaveNote,
  onDeleteNote,
  onStartCallFromHistory,
}: ChatBodyPanelsProps) {
  const callMessages = libraryMessages.filter(
    (message) => message.metadata?.kind === "call_history" || message.callHistory,
  );
  const mediaItems = libraryMessages.flatMap((message) =>
    getMessageAttachments(message).map((file: ChatRecord) => ({
      ...file,
      message,
    })),
  );

  return (
    <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <header className="flex min-h-16 items-center gap-3 border-b border-border bg-background px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back to conversations
        </Button>
        <h2 className="font-display text-lg font-semibold text-foreground">{panelTitles[view]}</h2>
      </header>

      {view === "notes" && (
        <NotesDialog
          notes={notes}
          open
          page
          onClose={onCloseNotes}
          onSave={onSaveNote}
          onDelete={onDeleteNote}
        />
      )}

      {view !== "notes" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {message.metadata?.callHistory?.type === "video" ? (
                        <Video className="h-5 w-5" />
                      ) : (
                        <Phone className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {message.text || "Call"}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {message.authorName || "Chat"} ·{" "}
                        {new Date(message.sentAt || Date.now()).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={callStarting}
                      aria-label="Start audio call"
                      onClick={() =>
                        onStartCallFromHistory?.({
                          chatId: message.chatId || message.chat_id,
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
                          chatId: message.chatId || message.chat_id,
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
            <div className="mx-auto max-w-4xl">
              {mediaItems.map((file, index) => (
                <Card
                  key={`${file.message?.id || "message"}-${file.id || index}`}
                  className="mb-3 border-border/80 shadow-xs transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex min-w-0 items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
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
                          Open
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
