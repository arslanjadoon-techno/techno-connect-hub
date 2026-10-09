import { Link } from "react-router-dom";
import PrivacyPolicyContent from "@/components/public/PrivacyPolicyContent";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function MisPrivacyPage() {
  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">MIS Privacy Policy</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Internal & Public Data Protection Policy &middot; Active8 Wireless MIS
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5 self-start sm:self-auto">
          <Link to="/privacy" target="_blank" rel="noreferrer">
            <span>Public Policy URL</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <PrivacyPolicyContent />
    </div>
  );
}
