import { useState } from "react";
import { Download, FileText, Music2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadAttachment } from "../chatHealper";

type RecordValue = Record<string, any>;

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const AUDIO_EXT = /\.(webm|mp3|wav|ogg|m4a)$/i;

const formatFileSize = (bytes: number) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileUrl = (file: RecordValue): string =>
  file.url ||
  file.downloadUrl ||
  file.download_url ||
  file.fileUrl ||
  file.file_url ||
  file.publicUrl ||
  file.public_url ||
  "";

// Prefer the file extension (PDF, DOCX). Content types like "vnd.openxml..." are too long to show.
const getFileKind = (fileName: string, contentType: string) => {
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
  const kind = ext || contentType.split("/").pop() || "file";
  return kind.length > 6 ? "FILE" : kind.toUpperCase();
};

function DownloadLink({
  file,
  url,
  fileName,
  className,
}: {
  file: RecordValue;
  url: string;
  fileName: string;
  className?: string;
}) {
  return (
    <a
      href={url}
      download={fileName}
      aria-label={`Download ${fileName}`}
      title="Download"
      onClick={(event) => {
        event.stopPropagation();
        downloadAttachment(event.nativeEvent, file);
      }}
      className={`flex shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className || "h-8 w-8"}`}
    >
      <Download className="h-4 w-4" />
    </a>
  );
}

function FileCard({
  file,
  fileName,
  fileKind,
  fileSize,
  url,
}: {
  file: RecordValue;
  fileName: string;
  fileKind: string;
  fileSize: string;
  url: string;
}) {
  return (
    <div className="mt-1 flex min-w-[220px] max-w-[320px] items-center gap-3 rounded-lg bg-background/60 p-2.5 text-foreground">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm" title={fileName}>
          {fileName}
        </span>
        <span className="block text-xs text-muted-foreground">
          {fileKind}
          {fileSize ? `, ${fileSize}` : ""}
        </span>
      </span>
      {url && <DownloadLink file={file} url={url} fileName={fileName} />}
    </div>
  );
}

function ImageAttachment({
  file,
  fileName,
  fileKind,
  fileSize,
  url,
}: {
  file: RecordValue;
  fileName: string;
  fileKind: string;
  fileSize: string;
  url: string;
}) {
  const [failed, setFailed] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  // If the image can't load, fall back to a normal file card with a download button.
  if (failed) {
    return (
      <FileCard file={file} fileName={fileName} fileKind={fileKind} fileSize={fileSize} url={url} />
    );
  }

  return (
    <>
      <div className="group/image relative mt-1 w-fit max-w-[280px] overflow-hidden rounded-md">
        <button
          type="button"
          aria-label={`Open image ${fileName}`}
          onClick={(event) => {
            event.stopPropagation();
            setViewerOpen(true);
          }}
          className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src={url}
            alt={fileName}
            loading="lazy"
            onError={() => setFailed(true)}
            className="max-h-[300px] min-h-[80px] w-full min-w-[120px] bg-muted object-cover"
          />
        </button>
        <DownloadLink
          file={file}
          url={url}
          fileName={fileName}
          className="absolute right-1.5 top-1.5 h-8 w-8 bg-background/90 opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover/image:opacity-100 [@media(hover:none)]:hidden"
        />
      </div>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-[min(94vw,960px)] gap-3">
          <DialogHeader>
            <DialogTitle className="truncate pr-8 text-sm font-normal" title={fileName}>
              {fileName}
              <span className="ml-2 text-xs text-muted-foreground">
                {fileKind}
                {fileSize ? `, ${fileSize}` : ""}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[75vh] justify-center overflow-auto rounded-md bg-muted/40">
            <img
              src={url}
              alt={fileName}
              className="max-h-[75vh] w-auto max-w-full object-contain"
            />
          </div>
          <div className="flex justify-end">
            <a
              href={url}
              download={fileName}
              onClick={(event) => downloadAttachment(event.nativeEvent, file)}
              className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function MessageAttachments({
  attachments,
}: {
  attachments: RecordValue[];
  message?: RecordValue;
}) {
  return (
    <>
      {attachments.map((file, index) => {
        const contentType = String(file.contentType || "").toLowerCase();
        const fileName = String(file.name || "Attachment");
        const fileKind = getFileKind(fileName, contentType);
        const fileSize = formatFileSize(file.size);
        const url = getFileUrl(file);
        const key = file.id || index;
        const isImage = contentType.startsWith("image/") || IMAGE_EXT.test(fileName);
        const isAudio = contentType.startsWith("audio/") || AUDIO_EXT.test(fileName);

        if (isImage && url) {
          return (
            <ImageAttachment
              key={key}
              file={file}
              fileName={fileName}
              fileKind={fileKind}
              fileSize={fileSize}
              url={url}
            />
          );
        }

        if (isAudio && url) {
          return (
            <div key={key} className="mt-1 w-full min-w-[240px] max-w-[320px]">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Music2 className="h-4 w-4" />
                </span>
                <audio controls preload="metadata" src={url} className="h-9 min-w-0 flex-1" />
              </div>
              <p className="mt-0.5 truncate pl-11 text-xs text-muted-foreground" title={fileName}>
                {fileName}
                {fileSize ? `, ${fileSize}` : ""}
              </p>
            </div>
          );
        }

        return (
          <FileCard
            key={key}
            file={file}
            fileName={fileName}
            fileKind={fileKind}
            fileSize={fileSize}
            url={url}
          />
        );
      })}
    </>
  );
}
