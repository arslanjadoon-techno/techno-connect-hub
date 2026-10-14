import { Download, FileText, Music2 } from "lucide-react";
import { downloadAttachment, parseChatDate } from "../chatHealper";

type RecordValue = Record<string, any>;
const formatFileSize = (bytes: number) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function MessageAttachments({
  attachments,
  message,
}: {
  attachments: RecordValue[];
  message: RecordValue;
}) {
  return (
    <>
      {attachments.map((file, index) => {
        const type = String(file.contentType || "").toLowerCase();
        const fileName = String(file.name || "Attachment");
        const fileKind =
          type.split("/").pop()?.toUpperCase() ||
          fileName.split(".").pop()?.toUpperCase() ||
          "FILE";
        const fileSize = formatFileSize(file.size);
        const sharedAt = message.sentAt || message.timestamp;
        const sharedLabel = sharedAt
          ? parseChatDate(sharedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          : "";
        const fileUrl =
          file.url ||
          file.downloadUrl ||
          file.download_url ||
          file.fileUrl ||
          file.file_url ||
          file.publicUrl ||
          file.public_url ||
          "";
        const image =
          type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || "");
        const audio =
          type.startsWith("audio/") || /\.(webm|mp3|wav|ogg|m4a)$/i.test(file.name || "");
        if (image && fileUrl)
          return (
            <div
              key={file.id || index}
              className="mt-2 max-w-[280px] overflow-hidden rounded-2xl border border-border/70 bg-background"
            >
              <img
                src={fileUrl}
                alt={file.name || "Shared image"}
                className="max-h-[240px] w-full object-cover transition-transform hover:scale-[1.02]"
              />
              <div className="flex items-center gap-2 border-t bg-muted/30 px-3 py-2">
                <span
                  className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
                  title={fileName}
                >
                  {fileName}
                  <span className="ml-2 text-[10px]">
                    {fileKind}
                    {fileSize ? ` · ${fileSize}` : ""}
                    {sharedLabel ? ` · ${sharedLabel}` : ""}
                  </span>
                </span>
                <a
                  href={fileUrl}
                  onClick={(event) => downloadAttachment(event.nativeEvent, file)}
                  className="rounded-md p-1 text-primary transition-colors hover:bg-primary/10"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          );
        if (audio && fileUrl)
          return (
            <div key={file.id || index} className="mt-1 w-full max-w-[360px] p-0">
              <div className="flex items-center gap-1.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Music2 className="h-3.5 w-3.5" />
                </span>
                <audio controls preload="metadata" src={fileUrl} className="h-8 min-w-0 flex-1" />
              </div>
              <div className="mt-0.5 flex items-center justify-between pl-9 text-[9px] text-muted-foreground">
                <span className="max-w-[170px] truncate" title={fileName}>
                  {fileName}
                </span>
                <span>
                  {fileSize || fileKind}
                  {sharedLabel ? ` · ${sharedLabel}` : ""}
                </span>
              </div>
            </div>
          );
        return (
          <div
            key={file.id || index}
            className="mt-2 flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-background/70 p-3 text-foreground transition-colors hover:bg-background"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold" title={fileName}>
                {fileName}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                <span>{fileKind}</span>
                {fileSize && <span>{fileSize}</span>}
                {sharedLabel && <span>Shared {sharedLabel}</span>}
              </span>
            </span>
            {fileUrl && (
              <a
                href={fileUrl}
                onClick={(event) => downloadAttachment(event.nativeEvent, file)}
                className="rounded-md p-1.5 text-primary transition-colors hover:bg-primary/10"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
          </div>
        );
      })}
    </>
  );
}
