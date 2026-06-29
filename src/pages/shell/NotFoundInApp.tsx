import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, ArrowLeft } from "lucide-react";

/**
 * In-app 404 — sidebar and header stay visible, only the main pane shows the message.
 */
export default function NotFoundInApp() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center animate-fade-in">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-lg"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <Compass className="h-9 w-9" />
      </div>
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you are trying to open doesn't exist yet, or its route hasn't been wired up.
          Pick another option from the sidebar to continue.
        </p>
      </div>
      <Button asChild variant="outline" className="gap-2">
        <Link to="/ai-chat"><ArrowLeft className="h-4 w-4" /> Back to AI Chat</Link>
      </Button>
    </div>
  );
}
