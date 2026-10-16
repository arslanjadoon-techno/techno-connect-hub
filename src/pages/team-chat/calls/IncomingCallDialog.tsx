import { Phone, PhoneOff, Video } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChatCall } from "./callTypes";

interface IncomingCallDialogProps {
  call: ChatCall | null;
  error?: string;
  responding?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallDialog({
  call,
  error,
  responding = false,
  onAccept,
  onDecline,
}: IncomingCallDialogProps) {
  const callerName = call?.startedBy?.name || "Chat user";

  return (
    <Dialog open={Boolean(call)} onOpenChange={() => undefined}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader className="items-center">
          <Avatar className="mb-2 h-[72px] w-[72px] bg-primary text-primary-foreground">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Video className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <DialogTitle>{callerName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Incoming chat call</p>
          <p className="text-xs text-muted-foreground">Accept to join a private in-app call.</p>
        </DialogHeader>
        {error && (
          <Alert variant="destructive" className="text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="justify-center gap-2 sm:justify-center">
          <Button variant="destructive" disabled={responding} onClick={onDecline}>
            <PhoneOff /> Decline
          </Button>
          <Button disabled={responding} onClick={onAccept}>
            <Phone /> Accept &amp; join
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
