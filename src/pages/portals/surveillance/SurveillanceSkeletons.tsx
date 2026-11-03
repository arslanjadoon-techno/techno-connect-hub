import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Reusable Skeleton Loader for Surveillance Portal list pages
 * (Request Reports, Validate and Assign, Surveillance Agents, Submit Report).
 */
export function SurveillanceListPageSkeleton({
  kpiCount = 3,
  kpiGridClassName = "grid-cols-1 sm:grid-cols-3",
  filterCount = 3,
  showHeaderAction = false,
  showBackButton = false,
}: {
  kpiCount?: number;
  kpiGridClassName?: string;
  filterCount?: number;
  showHeaderAction?: boolean;
  showBackButton?: boolean;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3.5">
          {showBackButton && <Skeleton className="h-9 w-44 rounded-xl" />}
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </div>
        {showHeaderAction && <Skeleton className="h-9 w-40 rounded-md" />}
      </div>

      {/* KPI Summary Cards Skeleton */}
      <div className={`grid gap-3 ${kpiGridClassName}`}>
        {Array.from({ length: kpiCount }).map((_, idx) => (
          <Card key={idx} className="p-4 space-y-2.5 border-border/70">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-8 w-14" />
          </Card>
        ))}
      </div>

      {/* Filter Toolbar Skeleton */}
      {filterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: filterCount }).map((_, idx) => (
            <Skeleton key={idx} className="h-9 w-[170px] rounded-md" />
          ))}
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      )}

      {/* DataTable Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-72 max-w-full rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Card className="overflow-hidden border-border/70">
          <div className="border-b bg-muted/30 px-4 py-3 grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: 6 }).map((_, rowIdx) => (
              <div key={rowIdx} className="px-4 py-3.5 grid grid-cols-5 gap-4 items-center">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Reusable Skeleton Loader for Surveillance Portal Request / Report Detail views.
 */
export function SurveillanceDetailPageSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-9 w-44 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-56" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* Store & 6 Summary Metadata Cards */}
      <Card className="p-6 rounded-2xl border-border/70 space-y-5">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="h-6 w-52" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex items-start gap-3.5 rounded-xl border border-border/60 p-4">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Investigation Scope Card */}
      <Card className="p-6 rounded-2xl border-border/70 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <div className="space-y-2 pt-1">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </Card>

      {/* Bottom 2-Column Requester / Agent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, colIdx) => (
          <Card key={colIdx} className="p-6 rounded-2xl border-border/70 space-y-5">
            <Skeleton className="h-3.5 w-28" />
            <div className="flex items-center gap-3.5 border-b pb-4">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-28 rounded-md" />
              </div>
            </div>
            <div className="space-y-3.5">
              {Array.from({ length: 4 }).map((__, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Reusable Skeleton Loader for Full-Width Surveillance Audit Report Table pages
 * (Requested Surveillance Audit Report, Submitted Surveillance Audit Report, Review Report).
 */
export function SurveillanceReportTableSkeleton() {
  return (
    <div className="space-y-5 pb-12 animate-fade-in">
      {/* Top Bar */}
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-36 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-72 max-w-full" />
            <Skeleton className="h-3.5 w-52" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      {/* Wide Audit Log Table Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-72 max-w-full rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Card className="overflow-hidden border-border/70">
          <div className="border-b bg-muted/30 px-4 py-3 grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-4 w-24" />
            ))}
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: 7 }).map((_, rowIdx) => (
              <div key={rowIdx} className="px-4 py-3.5 grid grid-cols-6 gap-4 items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Timing / Camera / Notes Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3 border-border/70">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
        <Card className="p-4 space-y-3 border-border/70">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    </div>
  );
}

/**
 * Reusable Skeleton Loader for the Surveillance Summary Page.
 */
export function SurveillanceSummaryPageSkeleton() {
  return (
    <div className="space-y-5 pb-12 animate-fade-in">
      {/* Top Bar */}
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-3.5 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* Metadata Banner */}
      <Card className="p-5 rounded-2xl border-border/70 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-44" />
          </div>
        ))}
      </Card>

      {/* Summary Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx} className="p-5 rounded-2xl border-border/70 space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-16" />
            <div className="space-y-2 pt-2 border-t">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="p-5 rounded-2xl border-border/70 space-y-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Reusable Skeleton Loader for the Editable "Submit Surveillance Audit Report" Form.
 */
export function SurveillanceAuditFormSkeleton() {
  return (
    <div className="space-y-5 pb-12 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center gap-3 border-b pb-4">
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="h-6 w-64" />
      </div>

      {/* Top Metadata Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <Skeleton className="h-9 w-64 rounded-full" />
        <Skeleton className="h-9 w-44 rounded-full" />
        <Skeleton className="h-9 w-52 rounded-full" />
      </div>

      {/* Store Open Time */}
      <div className="flex items-center gap-3 py-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      {/* Audit Rows Header & Card */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 border p-3 rounded-xl">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>

        <Card className="p-5 rounded-2xl border-border/70 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
        </Card>
      </div>

      {/* Timing & Camera Cards */}
      <Card className="p-4 border-border/70">
        <Skeleton className="h-5 w-56" />
      </Card>
      <Card className="p-4 border-border/70">
        <Skeleton className="h-5 w-48" />
      </Card>
      <Card className="p-4 border-border/70 space-y-3">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </Card>
    </div>
  );
}
