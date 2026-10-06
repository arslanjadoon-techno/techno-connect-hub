import { useMemo } from "react";
import { ExternalLink, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getMessageAttachments } from "../chatHealper";

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
interface ChatMessage {
  id?: string | number;
  text?: string;
  timestamp?: string;
  [key: string]: unknown;
}
interface Attachment {
  id?: string | number;
  name?: string;
  url?: string;
  contentType?: string;
  [key: string]: unknown;
}
interface Props {
  messages?: ChatMessage[];
  onClose: () => void;
  open: boolean;
}

export default function ConversationMediaDialog({ messages = [], onClose, open }: Props) {
  const { files, links } = useMemo(() => {
    const fileItems: Array<Attachment & { message: ChatMessage }> = [];
    const linkItems: Array<{ url: string; message: ChatMessage }> = [];
    messages.forEach((message) => {
      (getMessageAttachments(message) as Attachment[]).forEach((file) =>
        fileItems.push({ ...file, message }),
      );
      String(message.text || "")
        .match(URL_PATTERN)
        ?.forEach((value) => {
          const cleanUrl = value.replace(/[),.!?:;]+$/, "");
          if (!linkItems.some((item) => item.url === cleanUrl))
            linkItems.push({ url: cleanUrl, message });
        });
    });
    return { files: fileItems, links: linkItems };
  }, [messages]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Media, links &amp; files</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <section>
            <h3 className="px-2 pb-2 text-xs font-bold tracking-wide text-muted-foreground">
              LINKS
            </h3>
            {links.length ? (
              <div className="space-y-1">
                {links.map(({ url, message }) => (
                  <Button
                    key={url}
                    asChild
                    variant="ghost"
                    className="h-auto w-full justify-start gap-3 px-2 py-2"
                  >
                    <a
                      href={url.startsWith("www.") ? `https://${url}` : url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 text-left">
                        <span className="block truncate text-sm">{url}</span>
                        <span className="block text-xs text-muted-foreground">
                          {message.timestamp || ""}
                        </span>
                      </span>
                    </a>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="px-2 py-2 text-sm text-muted-foreground">
                No links shared in this conversation.
              </p>
            )}
          </section>
          <Separator className="my-3" />
          <section>
            <h3 className="px-2 pb-2 text-xs font-bold tracking-wide text-muted-foreground">
              FILES
            </h3>
            {files.length ? (
              <div className="space-y-1">
                {files.map((file) => (
                  <Button
                    key={`${file.message.id}-${file.id}`}
                    asChild={Boolean(file.url)}
                    variant="ghost"
                    className="h-auto w-full justify-start gap-3 px-2 py-2"
                  >
                    <a
                      href={file.url || undefined}
                      target={file.url ? "_blank" : undefined}
                      rel={file.url ? "noopener noreferrer" : undefined}
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 text-left">
                        <span className="block truncate text-sm">{file.name || "Attachment"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {file.contentType || "File"}
                        </span>
                      </span>
                    </a>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="px-2 py-2 text-sm text-muted-foreground">
                No files shared in this conversation.
              </p>
            )}
          </section>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
