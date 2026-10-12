import { AlertCircle } from "lucide-react";
// import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmationDialogState {
  title?: string;
  message?: string;
  confirmLabel?: string;
}

export function ChatConfirmationDialog({
  dialog,
  onClose,
  onConfirm,
}: {
  dialog: ConfirmationDialogState | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{dialog?.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{dialog?.message}</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {dialog?.confirmLabel || "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChatNotice({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm text-white shadow-xl">
      <AlertCircle className="h-4 w-4 text-amber-300" />
      {message}
      <button
        type="button"
        onClick={onClose}
        className="ml-2 text-xs text-slate-300 hover:text-white"
      >
        Dismiss
      </button>
    </div>
  );
}
