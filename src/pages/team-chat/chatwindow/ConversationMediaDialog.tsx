import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Link2, Paperclip, Video } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { downloadAttachment, getMessageAttachments } from "../chatHealper";

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi)$/i;

type FileRecord = Record<string, any>;
interface ChatMessage {
  id?: string | number;
  text?: string;
  timestamp?: string;
  sentAt?: string;
  [key: string]: unknown;
}
interface Props {
  messages?: ChatMessage[];
  onClose: () => void;
  open: boolean;
}

type Tab = "media" | "files" | "links";
interface MediaItem {
  file: FileRecord;
  url: string;
  name: string;
  kind: "image" | "video";
}
interface FileItem {
  file: FileRecord;
  url: string;
  name: string;
  detail: string;
  date: string;
}
interface LinkItem {
  url: string;
  href: string;
  host: string;
  date: string;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

// Attachments come in several API shapes, so every known URL field is checked.
const getFileUrl = (file: FileRecord): string =>
  file.url ||
  file.downloadUrl ||
  file.download_url ||
  file.fileUrl ||
  file.file_url ||
  file.publicUrl ||
  file.public_url ||
  "";

const formatSize = (bytes: unknown) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatMessageDate = (message: ChatMessage) => {
  const date = new Date(String(message.sentAt || ""));
  if (!Number.isNaN(date.getTime())) return dateFormat.format(date);
  return String(message.timestamp || "");
};

const fileKind = (name: string, contentType: string) => {
  const ext = name.includes(".") ? name.split(".").pop() || "" : "";
  const kind = ext || contentType.split("/").pop() || "file";
  return kind.length > 6 ? "FILE" : kind.toUpperCase();
};

const toHref = (url: string) => (url.toLowerCase().startsWith("www.") ? `https://${url}` : url);

const hostOf = (url: string) => {
  try {
    return new URL(toHref(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export default function ConversationMediaDialog({ messages = [], onClose, open }: Props) {
  const [tab, setTab] = useState<Tab>("media");

  const { media, files, links } = useMemo(() => {
    const mediaItems: MediaItem[] = [];
    const fileItems: FileItem[] = [];
    const linkItems: LinkItem[] = [];
    const seenLinks = new Set<string>();

    // Newest first, like most chat apps.
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      const date = formatMessageDate(message);

      for (const file of getMessageAttachments(message) as FileRecord[]) {
        const url = getFileUrl(file);
        const name = String(file.name || "Attachment");
        const contentType = String(file.contentType || "").toLowerCase();
        if (url && (contentType.startsWith("image/") || IMAGE_EXT.test(name))) {
          mediaItems.push({ file, url, name, kind: "image" });
        } else if (url && (contentType.startsWith("video/") || VIDEO_EXT.test(name))) {
          mediaItems.push({ file, url, name, kind: "video" });
        } else {
          const size = formatSize(file.size);
          fileItems.push({
            file,
            url,
            name,
            detail: `${fileKind(name, contentType)}${size ? `, ${size}` : ""}`,
            date,
          });
        }
      }

      for (const value of String(message.text || "").match(URL_PATTERN) || []) {
        const cleanUrl = value.replace(/[),.!?:;]+$/, "");
        if (seenLinks.has(cleanUrl)) continue;
        seenLinks.add(cleanUrl);
        linkItems.push({ url: cleanUrl, href: toHref(cleanUrl), host: hostOf(cleanUrl), date });
      }
    }
    return { media: mediaItems, files: fileItems, links: linkItems };
  }, [messages]);

  // Open on the first tab that has something in it.
  useEffect(() => {
    if (!open) return;
    setTab(media.length ? "media" : files.length ? "files" : links.length ? "links" : "media");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: "media", label: "Media", count: media.length },
    { value: "files", label: "Files", count: files.length },
    { value: "links", label: "Links", count: links.length },
  ];

  const empty = (text: string) => (
    <p className="px-2 py-10 text-center text-sm text-muted-foreground">{text}</p>
  );

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg gap-3">
        <DialogHeader>
          <DialogTitle className="font-normal">Media, links &amp; files</DialogTitle>
        </DialogHeader>

        <div role="tablist" aria-label="Shared content" className="grid grid-cols-3 rounded-lg bg-muted p-1">
          {tabs.map(({ value, label, count }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`rounded-md py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                tab === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span className="ml-1 text-xs text-muted-foreground">{count}</span>
            </button>
          ))}
        </div>

        <ScrollArea className="max-h-[60vh]">
          {tab === "media" &&
            (media.length ? (
              <div className="grid grid-cols-3 gap-1.5 p-0.5">
                {media.map((item, index) => (
                  <a
                    key={`${item.url}-${index}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.name}
                    aria-label={`Open ${item.name}`}
                    className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.kind === "image" ? (
                      <img
                        src={item.url}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    ) : (
                      <Video className="h-8 w-8 text-muted-foreground" />
                    )}
                  </a>
                ))}
              </div>
            ) : (
              empty("No photos or videos shared in this conversation.")
            ))}

          {tab === "files" &&
            (files.length ? (
              <ul className="space-y-1">
                {files.map((item, index) => (
                  <li
                    key={`${item.url || item.name}-${index}`}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {item.file.contentType?.startsWith?.("audio/") ? (
                        <Paperclip className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm" title={item.name}>
                        {item.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.detail}
                        {item.date ? `, ${item.date}` : ""}
                      </span>
                    </span>
                    {item.url ? (
                      <a
                        href={item.url}
                        download={item.name}
                        aria-label={`Download ${item.name}`}
                        title="Download"
                        onClick={(event) => downloadAttachment(event.nativeEvent, item.file)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">Unavailable</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              empty("No files shared in this conversation.")
            ))}

          {tab === "links" &&
            (links.length ? (
              <ul className="space-y-1">
                {links.map((item) => (
                  <li key={item.url}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Link2 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{item.host}</span>
                        <span className="block truncate text-xs text-muted-foreground" title={item.url}>
                          {item.url}
                        </span>
                        {item.date && (
                          <span className="block text-xs text-muted-foreground">{item.date}</span>
                        )}
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              empty("No links shared in this conversation.")
            ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}