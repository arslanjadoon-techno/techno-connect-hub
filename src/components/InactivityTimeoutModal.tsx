import { useInactivityTimer } from "@/lib/use-inactivity-timer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, LogOut, ShieldAlert, CheckCircle2 } from "lucide-react";

export function InactivityTimeoutModal() {
  const { isWarningOpen, secondsLeft, totalCountdown, stayLoggedIn, logoutNow } =
    useInactivityTimer();

  if (!isWarningOpen) return null;

  // Format seconds into digital clock mm:ss format
  const minutes = Math.floor(secondsLeft / 60);
  const remainingSecs = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;

  // Progress percentage (depleting from 100 down to 0)
  const progressPercent = (secondsLeft / totalCountdown) * 100;
  const isUrgent = secondsLeft <= 10;

  return (
    <Dialog open={isWarningOpen} onOpenChange={(open) => !open && stayLoggedIn()}>
      <DialogContent
        id="inactivity-modal-content"
        className="sm:max-w-md border border-border shadow-2xl p-6 overflow-hidden"
      >
        <DialogHeader className="flex flex-col items-center text-center space-y-2">
          <div
            id="inactivity-warning-icon"
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
              isUrgent
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            }`}
          >
            <ShieldAlert className="w-7 h-7" />
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight">Inactivity Warning</DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground max-w-xs">
            No activity has been detected for 30 minutes. To protect your account, you will be
            logged out automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Digital Clock Box */}
        <div
          id="digital-countdown-box"
          className={`relative my-4 rounded-xl p-5 border text-center transition-all duration-300 ${
            isUrgent
              ? "bg-rose-950/10 border-rose-500/30 dark:bg-rose-950/30"
              : "bg-muted/50 border-border/80"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className={`w-3.5 h-3.5 ${isUrgent ? "text-rose-500 animate-spin" : ""}`} />
            <span>Time Remaining</span>
          </div>

          {/* Digital Display */}
          <div
            id="digital-clock-display"
            className={`font-mono text-5xl font-black tracking-widest tabular-nums select-none ${
              isUrgent
                ? "text-rose-600 dark:text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                : "text-foreground drop-shadow-sm"
            }`}
          >
            {formattedTime}
          </div>

          {/* Seconds progress bar */}
          <div className="mt-4 space-y-1">
            <Progress
              value={progressPercent}
              className={`h-2 transition-all ${
                isUrgent ? "[&>div]:bg-rose-500" : "[&>div]:bg-primary"
              }`}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono px-0.5">
              <span>00:00</span>
              <span className="font-semibold text-foreground">{secondsLeft}s left</span>
              <span>00:30</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <Button
            id="btn-logout-now"
            type="button"
            variant="outline"
            onClick={logoutNow}
            className="w-full sm:w-auto text-muted-foreground hover:text-destructive hover:border-destructive/40"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out Now
          </Button>

          <Button
            id="btn-stay-logged-in"
            type="button"
            onClick={stayLoggedIn}
            className={`w-full sm:w-auto font-medium ${
              isUrgent
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
