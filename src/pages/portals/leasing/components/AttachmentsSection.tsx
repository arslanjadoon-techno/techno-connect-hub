import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Trash2,
  Pencil,
  Check,
  X,
  ExternalLink,
  GripVertical,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { leasingService, type LeaseDoc } from "@/services/portals/leasing";

function fileIcon(type?: string | null) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("pdf")) return <FileText className="h-5 w-5 text-destructive" />;
  if (["png", "jpg", "jpeg", "webp", "gif"].some((ext) => t.includes(ext)))
    return <ImageIcon className="h-5 w-5 text-primary" />;
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

export default function AttachmentsSection({
  techId,
  isEditing,
}: {
  techId: string;
  isEditing: boolean;
}) {
  const [docs, setDocs] = useState<LeaseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const data = await leasingService.getLeasingDocs(techId);
      setDocs(data);
    } catch (error) {
      console.error("Error loading attachments:", error);
    } finally {
      setLoading(false);
    }
  }, [techId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const resetUpload = () => {
    setFile(null);
    setDocumentTitle("");
    setDocumentType("");
    setUploadPhase("idle");
    setUploadProgress(0);
  };

  const closeUpload = () => {
    setUploadOpen(false);
    resetUpload();
  };

  const submitUpload = async () => {
    if (!file) return;
    setUploadPhase("uploading");
    setUploadProgress(0);
    let documentUrl = "";
    try {
      documentUrl = await leasingService.uploadLeaseDocumentFile(file, techId, setUploadProgress);
    } catch (error) {
      setUploadPhase("idle");
      toast.error(`Upload failed: ${(error as Error).message}`);
      return;
    }

    setUploadPhase("saving");
    try {
      const fileType = file.name.split(".").pop()?.toLowerCase() ?? "";
      await leasingService.postLeasingDocs({
        techId,
        documentUrl,
        fileType,
        documentTitle: documentTitle || file.name,
        documentType,
      });
      toast.success("Document saved successfully!");
      closeUpload();
      fetchDocs();
    } catch (error) {
      setUploadPhase("idle");
      toast.error(`File uploaded but failed to save record: ${(error as Error).message}`);
    }
  };

  const deleteDoc = async (doc: LeaseDoc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.documentTitle}" permanently?`))
      return;
    setDeletingId(doc.id);
    try {
      await leasingService.deleteLeaseDocs(doc.id);
      fetchDocs();
    } catch (error) {
      toast.error(`Delete failed: ${(error as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const startRename = (doc: LeaseDoc) => {
    setRenameId(doc.id);
    setRenameValue(doc.documentTitle ?? "");
  };

  const saveRename = async (id: number) => {
    try {
      await leasingService.renameLeaseDocs(id, renameValue);
      setRenameId(null);
      fetchDocs();
    } catch (error) {
      toast.error(`Rename failed: ${(error as Error).message}`);
    }
  };

  const handleDrop = async (dropIndex: number) => {
    const fromIndex = dragIndexRef.current;
    setDragOverIndex(null);
    if (fromIndex === null || fromIndex === dropIndex) return;

    const reordered = [...docs];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setDocs(reordered);
    dragIndexRef.current = null;

    try {
      await leasingService.reorderLeaseDocs(
        reordered.map((doc, idx) => ({ id: doc.id, sortOrder: idx })),
      );
    } catch {
      // order saved locally; will sync on next refresh
    }
  };

  const isBusy = uploadPhase !== "idle";

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Attachments &amp; Documents</h2>
        {isEditing && (
          <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" /> Upload Document
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No attachments found.
          <div className="mt-1 text-xs">Upload lease files, COIs, agreements, or images.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc, index) => {
            const renaming = renameId === doc.id;
            return (
              <div
                key={doc.id}
                draggable
                onDragStart={(e) => {
                  dragIndexRef.current = index;
                  // Firefox refuses to start a drag at all unless dataTransfer
                  // carries data - Chrome is lenient about this, Firefox isn't.
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(doc.id));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverIndex(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(index);
                }}
                onDragEnd={() => {
                  dragIndexRef.current = null;
                  setDragOverIndex(null);
                }}
                className={`flex cursor-grab flex-col gap-2.5 rounded-lg border p-3 ${
                  dragOverIndex === index ? "border-primary border-dashed" : "border-border"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <GripVertical className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {fileIcon(doc.fileType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {renaming ? (
                      <Input
                        autoFocus
                        className="h-8"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                      />
                    ) : (
                      <p className="truncate text-sm font-medium" title={doc.documentTitle ?? ""}>
                        {doc.documentTitle || "Untitled document"}
                      </p>
                    )}
                    {!renaming && doc.fileType && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {doc.fileType.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  {!renaming && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 shrink-0 text-destructive"
                      onClick={() => deleteDoc(doc)}
                      disabled={deletingId === doc.id}
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex gap-1.5">
                  {renaming ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-destructive"
                        onClick={() => setRenameId(null)}
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Cancel
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => saveRename(doc.id)}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <a href={doc.documentUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> View
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => startRename(doc)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Rename
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={(open) => (open ? setUploadOpen(true) : closeUpload())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload New Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center text-sm ${
                isBusy ? "cursor-default opacity-60" : "hover:border-primary"
              }`}
            >
              {file ? file.name : "Click to select file"}
              <input
                type="file"
                hidden
                disabled={isBusy}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {isBusy && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{uploadPhase === "uploading" ? "Uploading…" : "Saving record…"}</span>
                  {uploadPhase === "uploading" && <span>{uploadProgress}%</span>}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${uploadPhase === "uploading" ? uploadProgress : 100}%` }}
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="mb-1 block text-xs">Document Title</Label>
              <Input
                value={documentTitle}
                disabled={isBusy}
                onChange={(e) => setDocumentTitle(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Document Type</Label>
              <Input
                value={documentType}
                disabled={isBusy}
                onChange={(e) => setDocumentType(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeUpload} disabled={uploadPhase === "saving"}>
              Cancel
            </Button>
            <Button onClick={submitUpload} disabled={!file || isBusy}>
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
