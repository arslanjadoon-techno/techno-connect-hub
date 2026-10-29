import { Navigate } from "react-router-dom";
import { ShieldAlert, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import {
  getSurveillanceDefaultRoute,
  getSurveillanceRole,
} from "@/services/portals/surveillance/types";

export default function SurveillanceNoAccessPage() {
  const { user } = useAuth();
  const role = getSurveillanceRole(user);

  if (role !== "other") {
    return <Navigate to={getSurveillanceDefaultRoute(user)} replace />;
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 animate-fade-in">
      <Card className="w-full max-w-lg rounded-2xl border-border/80 bg-card p-8 text-center shadow-xs space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200/80 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Access Restricted
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You do not have permission to access the Surveillance portal with your current role.
            Please contact your system administrator if you require access.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Reach out to your portal administrator for role and access updates.</span>
        </div>
      </Card>
    </div>
  );
}
