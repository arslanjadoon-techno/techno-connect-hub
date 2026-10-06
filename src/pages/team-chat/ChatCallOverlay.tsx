import { Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import InternalCallPanel from "./calls/InternalCallPanel";

interface CallOverlayProps {
  activeCall: Record<string, any> | null;
  accepted: boolean;
  minimized: boolean;
  onMinimize: () => void;
  onRestore: () => void;
  onEnd: () => void;
}

export default function ChatCallOverlay({
  activeCall,
  accepted,
  minimized,
  onMinimize,
  onRestore,
  onEnd,
}: CallOverlayProps) {
  if (!accepted || !activeCall) return null;
  return (
    <>
      {!minimized && (
        <Dialog open onOpenChange={() => undefined}>
          <DialogContent className="max-w-6xl overflow-hidden border-0 bg-slate-950 p-0">
            <InternalCallPanel
              activeCall={activeCall}
              modal
              onMinimize={onMinimize}
              onEnd={onEnd}
            />
          </DialogContent>
        </Dialog>
      )}
      {minimized && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-slate-950 px-4 py-3 text-white shadow-xl">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
              {activeCall.type === "video" ? (
                <Video className="h-4 w-4" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
            </span>
            <span>
              {activeCall.type === "video" ? "Video call" : "Voice call"}
              <span className="block text-xs text-slate-400">Call in progress</span>
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={onRestore}>
            Restore
          </Button>
          <Button size="sm" variant="destructive" onClick={onEnd}>
            End
          </Button>
        </div>
      )}
    </>
  );
}
