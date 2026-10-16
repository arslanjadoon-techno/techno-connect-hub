import { memo, useEffect, useState } from "react";

interface AttachmentPreviewProps {
  file: File;
}

export const AttachmentPreview = memo(function AttachmentPreview({ file }: AttachmentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith("audio/") && !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!previewUrl) return null;

  if (file.type.startsWith("audio/")) {
    return (
      <audio
        controls
        preload="metadata"
        src={previewUrl}
        className="h-8 max-w-[220px]"
        onClick={(event) => event.stopPropagation()}
      />
    );
  }

  if (file.type.startsWith("image/")) {
    return <img src={previewUrl} alt={file.name} className="h-8 w-8 rounded object-cover" />;
  }

  return null;
});
