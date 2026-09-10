import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
}

export function RankerUserAccessModal({ isOpen }: Props) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden select-none border-red-200/50 dark:border-red-900/40"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400 ring-8 ring-red-50 dark:ring-red-950/30">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Ranker Portal Access Restricted
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-600 dark:text-zinc-300 max-w-sm text-center leading-relaxed font-normal">
            As a standard user, you do not have permission to view or access the Ranker portal.
            Please contact your system administrator to request access.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 text-center my-1.5">
          For permissions inquiries, contact:{" "}
          <span className="font-semibold underline">admin@techno.com</span>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              toast.info("Please email admin@techno.com to request access to the Ranker portal.");
            }}
            className="w-full sm:w-auto text-xs"
          >
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            Contact Admin
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={() => navigate("/ai-chat")}
            className="w-full sm:w-auto text-xs font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Return to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
