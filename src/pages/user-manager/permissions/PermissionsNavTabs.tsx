import { Link, useLocation } from "react-router-dom";
import { ShieldCheck, PlusCircle, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PermissionsNavTabsProps {
  totalPermissions?: number;
}

export function PermissionsNavTabs({ totalPermissions }: PermissionsNavTabsProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const isCreate = pathname.includes("/create") || pathname === "/admin/permissions";
  const isAssign = pathname.includes("/assign");

  return (
    <div className="border-b border-border/80 bg-background/95 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Permissions Management</h1>
              {typeof totalPermissions === "number" && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {totalPermissions} Available
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Define granular portal capabilities and assign access rights across system employees.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
          <Link
            to="/admin/permissions/create"
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
              isCreate
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Create Permission</span>
          </Link>
          <Link
            to="/admin/permissions/assign"
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
              isAssign
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Assign Permissions</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
