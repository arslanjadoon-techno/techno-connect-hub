import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Star,
  Store as StoreIcon,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { surveillanceService } from "@/services/portals/surveillance/surveillance.service";
import {
  canAccessSurveillanceDashboard,
  getSurveillanceDefaultRoute,
  getSurveillanceRole,
  type SurveillanceAgentMistakeItem,
  type SurveillanceAgentPerformanceItem,
  type SurveillanceDashboardData,
  type SurveillanceDashboardDurationPreset,
} from "@/services/portals/surveillance/types";

const MONTH_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const DURATION_OPTIONS: Array<{ value: SurveillanceDashboardDurationPreset; label: string }> = [
  { value: "month", label: "Selected Month" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_14_days", label: "Last 14 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "quarter", label: "Last 90 Days" },
  { value: "year_to_date", label: "Year to Date" },
  { value: "all_time", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

const MARKET_COLORS = ["#2563eb", "#0d9488", "#d97706", "#7c3aed", "#db2777"];

function formatHoursDuration(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return "—";
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  if (hours < 24) {
    const whole = Math.floor(hours);
    const mins = Math.round((hours - whole) * 60);
    return mins > 0 ? `${whole}h ${mins}m` : `${whole}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = Math.round(hours % 24);
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function toIsoDateInput(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateButtonLabel(dt?: Date): string {
  if (!dt) return "";
  return dt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function SurveillanceDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-9 w-32 rounded-md" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Card key={idx} className="p-4 space-y-2.5 border-border/70">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-36" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-5 p-5 space-y-4 border-border/70">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="lg:col-span-7 p-5 space-y-4 border-border/70">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>

      <Card className="p-5 space-y-4 border-border/70">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-72 w-full" />
      </Card>
    </div>
  );
}

export default function SurveillanceDashboardPage() {
  const { user } = useAuth();
  const role = useMemo(() => getSurveillanceRole(user), [user]);
  const isAdmin = canAccessSurveillanceDashboard(role);

  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(() => String(now.getFullYear()));
  const [duration, setDuration] = useState<SurveillanceDashboardDurationPreset>("month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  // Interactive section controls
  const [tatChartMode, setTatChartMode] = useState<"trend" | "distribution">("trend");
  const [monthlyMetricLine, setMonthlyMetricLine] = useState<"completionRate" | "avgTatHours">(
    "completionRate",
  );
  const [performerView, setPerformerView] = useState<"split" | "high" | "low" | "all">("split");
  const [deptDailySearch, setDeptDailySearch] = useState<string>("");
  const [deptDailySelectedDept, setDeptDailySelectedDept] = useState<string>("all");
  const [selectedAgentDetail, setSelectedAgentDetail] =
    useState<SurveillanceAgentPerformanceItem | null>(null);
  const [selectedMistakeAgent, setSelectedMistakeAgent] =
    useState<SurveillanceAgentMistakeItem | null>(null);

  const [data, setData] = useState<SurveillanceDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(
    async (forceRefresh = false) => {
      if (!isAdmin) return;
      if (duration === "custom" && (!customRange?.from || !customRange?.to)) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await surveillanceService.getDashboardData({
          month: selectedMonth === "all" ? "all" : Number(selectedMonth),
          year: Number(selectedYear) || new Date().getFullYear(),
          duration,
          fromDate: customRange?.from ? toIsoDateInput(customRange.from) : undefined,
          toDate: customRange?.to ? toIsoDateInput(customRange.to) : undefined,
          market: marketFilter,
          department: departmentFilter,
          forceRefresh,
        });
        setData(result);
      } catch (err) {
        const msg = (err as Error)?.message || "Failed to load surveillance dashboard metrics.";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, selectedMonth, selectedYear, duration, customRange, marketFilter, departmentFilter],
  );

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    if (duration === "custom" || duration === "all_time") {
      setDuration("month");
    }
  };

  const handleDurationChange = (val: SurveillanceDashboardDurationPreset) => {
    setDuration(val);
    if (val === "custom" && !customRange?.from) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 13);
      setCustomRange({ from: start, to: end });
    }
  };

  const handleResetFilters = () => {
    setSelectedMonth(String(new Date().getMonth() + 1));
    setSelectedYear(String(new Date().getFullYear()));
    setDuration("month");
    setCustomRange(undefined);
    setMarketFilter("all");
    setDepartmentFilter("all");
    setDeptDailySearch("");
    setDeptDailySelectedDept("all");
  };

  const hasCustomFilters =
    selectedMonth !== String(now.getMonth() + 1) ||
    selectedYear !== String(now.getFullYear()) ||
    duration !== "month" ||
    marketFilter !== "all" ||
    departmentFilter !== "all";

  const filteredDepartmentalDaily = useMemo(() => {
    if (!data) return [];
    const term = deptDailySearch.trim().toLowerCase();
    return data.departmentalDaily.filter((row) => {
      if (deptDailySelectedDept !== "all" && row.department !== deptDailySelectedDept) {
        return false;
      }
      if (!term) return true;
      return (
        row.department.toLowerCase().includes(term) ||
        row.dateLabel.toLowerCase().includes(term) ||
        row.date.includes(term)
      );
    });
  }, [data, deptDailySearch, deptDailySelectedDept]);

  const handleExportCsv = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`Surveillance Dashboard Report,${data.periodLabel}`);
    lines.push(`Date Range,${data.rangeStart} to ${data.rangeEnd}`);
    lines.push("");
    lines.push("Departmental Daily Performance");
    lines.push(
      "Date,Department,Requests Received,Assigned,Reports Submitted,Completed,Rejected,Avg TAT (Hours),Accuracy (%)",
    );
    for (const row of filteredDepartmentalDaily) {
      lines.push(
        [
          `"${row.dateLabel}"`,
          `"${row.department.replace(/"/g, '""')}"`,
          row.requestsReceived,
          row.assigned,
          row.submitted,
          row.completed,
          row.rejected,
          row.avgTatHours !== null ? row.avgTatHours.toFixed(2) : "N/A",
          row.accuracyRate.toFixed(1),
        ].join(","),
      );
    }
    lines.push("");
    lines.push("Agent Performance & Mistakes");
    lines.push(
      "Agent Name,Department,Assigned,Completed,Rejected Reports,Approval Rate (%),Avg TAT (Hours),Avg Rating,Total Mistakes,Mistake Rate (%),Performance Score",
    );
    for (const ag of data.allAgentPerformance) {
      lines.push(
        [
          `"${ag.agentName.replace(/"/g, '""')}"`,
          `"${(ag.department || "").replace(/"/g, '""')}"`,
          ag.totalAssigned,
          ag.completedCount,
          ag.reportRejectedCount,
          ag.approvalRate.toFixed(1),
          ag.avgTatHours !== null ? ag.avgTatHours.toFixed(2) : "N/A",
          ag.avgManagerRating !== null ? ag.avgManagerRating.toFixed(2) : "N/A",
          ag.totalMistakes,
          ag.mistakeRate.toFixed(1),
          ag.performanceScore.toFixed(1),
        ].join(","),
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `surveillance-dashboard-${data.rangeStart}-to-${data.rangeEnd}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Surveillance dashboard report exported as CSV.");
  };

  if (!isAdmin) {
    return <Navigate to={getSurveillanceDefaultRoute(user)} replace />;
  }

  if (loading && !data) {
    return <SurveillanceDashboardSkeleton />;
  }

  const tooltipStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    color: "var(--foreground)",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
  };

  const overview = data?.overview;
  const tat = data?.tat;

  const pipelineSegments = overview
    ? [
        {
          label: "Completed",
          count: overview.completedCount,
          colorClass: "bg-emerald-500",
          textClass: "text-emerald-700 dark:text-emerald-400",
        },
        {
          label: "Pending Verification",
          count: overview.pendingVerificationCount,
          colorClass: "bg-violet-500",
          textClass: "text-violet-700 dark:text-violet-400",
        },
        {
          label: "Assigned",
          count: overview.assignedCount,
          colorClass: "bg-sky-500",
          textClass: "text-sky-700 dark:text-sky-400",
        },
        {
          label: "Unassigned",
          count: overview.unassignedCount,
          colorClass: "bg-amber-500",
          textClass: "text-amber-700 dark:text-amber-400",
        },
        {
          label: "Report Rejected",
          count: overview.rejectedReportsCount,
          colorClass: "bg-rose-500",
          textClass: "text-rose-700 dark:text-rose-400",
        },
        {
          label: "Request Rejected",
          count: overview.rejectedRequestsCount,
          colorClass: "bg-orange-500",
          textClass: "text-orange-700 dark:text-orange-400",
        },
      ]
    : [];

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Header & Interactive Controls */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Surveillance Dashboard
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground">
              <span>{data?.periodLabel || "Executive Overview"}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {data ? `${data.rangeStart} to ${data.rangeEnd}` : "Loading range"}
              </span>
              {marketFilter !== "all" && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-foreground">Market: {marketFilter}</span>
                </>
              )}
              {departmentFilter !== "all" && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-foreground">Dept: {departmentFilter}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!data || loading}
              className="h-9 gap-1.5 text-xs whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchDashboard(true);
                toast.info("Refreshing surveillance analytics...");
              }}
              disabled={loading}
              className="h-9 gap-1.5 text-xs whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Interactive Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="w-[148px]">
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="h-9 text-xs" aria-label="Select month">
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selector */}
          <div className="w-[104px]">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 text-xs" aria-label="Select year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {(data?.availableYears || [now.getFullYear(), now.getFullYear() - 1]).map((yr) => (
                  <SelectItem key={yr} value={String(yr)} className="text-xs tabular-nums">
                    {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration Selector */}
          <div className="w-[162px]">
            <Select
              value={duration}
              onValueChange={(v) => handleDurationChange(v as SurveillanceDashboardDurationPreset)}
            >
              <SelectTrigger className="h-9 text-xs" aria-label="Select duration">
                <Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range Picker (shown when Custom Range is active) */}
          {duration === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 text-xs font-normal whitespace-nowrap shrink-0"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="tabular-nums">
                    {customRange?.from
                      ? customRange.to
                        ? `${formatDateButtonLabel(customRange.from)} – ${formatDateButtonLabel(customRange.to)}`
                        : `${formatDateButtonLabel(customRange.from)} – Pick end date`
                      : "Pick custom date range"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Market Filter */}
          <div className="w-[175px]">
            <Select value={marketFilter} onValueChange={setMarketFilter}>
              <SelectTrigger className="h-9 text-xs" aria-label="Filter by market">
                <MapPin className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Markets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Markets
                </SelectItem>
                {(data?.availableMarkets || []).map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div className="w-[190px]">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-9 text-xs" aria-label="Filter by department">
                <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Departments
                </SelectItem>
                {(data?.availableDepartments || []).map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasCustomFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <Card className="border-destructive/40 bg-destructive/10 p-4 text-destructive">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboard(true)}
              className="h-8 text-xs border-destructive/30 hover:bg-destructive/20"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* 1. Basic & Overall Numbers */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card className="p-4 border-border/80">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Total Requests</span>
              <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">
              {overview?.totalRequests.toLocaleString() ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {overview?.unassignedCount ?? 0} unassigned · {overview?.assignedCount ?? 0} active
            </p>
          </Card>

          <Card className="p-4 border-border/80">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Completed Audits</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">
              {overview?.completedCount.toLocaleString() ?? 0}
            </div>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
              {overview?.completionRate ?? 0}% completion rate
            </p>
          </Card>

          <Card className="p-4 border-border/80">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Transactions Audited</span>
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">
              {overview?.totalAuditRows.toLocaleString() ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {overview?.totalBuyingCustomers ?? 0} buyers ·{" "}
              {overview?.totalNonBuyingCustomers ?? 0} non-buyers
            </p>
          </Card>

          <Card className="p-4 border-border/80">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Compliance Flags</span>
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">
              {overview?.flaggedComplianceIncidents.toLocaleString() ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {overview?.totalMissedOpportunities ?? 0} missed opps · $
              {Math.abs(overview?.netCashVariance ?? 0).toFixed(2)} var
            </p>
          </Card>

          <Card className="p-4 border-border/80">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Rejected Volume</span>
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">
              {(
                (overview?.rejectedRequestsCount ?? 0) + (overview?.rejectedReportsCount ?? 0)
              ).toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-rose-700 dark:text-rose-400 tabular-nums">
              {overview?.rejectionRate ?? 0}% rate ({overview?.rejectedReportsCount ?? 0} reports)
            </p>
          </Card>

          <Card className="p-4 border-border/80">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Coverage & Rating</span>
              <StoreIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">
              {overview?.auditedStoresCount ?? 0}
              <span className="text-sm font-normal text-muted-foreground">
                {overview && overview.totalStoresCount > 0
                  ? ` / ${overview.totalStoresCount}`
                  : " stores"}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
              <Users className="h-3 w-3 shrink-0" />
              <span>{overview?.activeAgentsCount ?? 0} agents</span>
              <span aria-hidden="true">·</span>
              <Star className="h-3 w-3 text-amber-500 shrink-0" />
              <span>
                {overview?.avgManagerRating !== null && overview?.avgManagerRating !== undefined
                  ? `${overview.avgManagerRating.toFixed(1)}/5`
                  : "Unrated"}
              </span>
            </p>
          </Card>
        </div>

        {/* Status Pipeline Distribution Bar */}
        <Card className="p-4 border-border/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-semibold text-foreground">
              Surveillance Request Lifecycle Breakdown
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {pipelineSegments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-xs ${seg.colorClass}`} />
                  <span>{seg.label}:</span>
                  <span className={`font-semibold tabular-nums ${seg.textClass}`}>{seg.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {overview && overview.totalRequests > 0 ? (
              pipelineSegments.map((seg) => {
                const pct = (seg.count / overview.totalRequests) * 100;
                if (pct <= 0) return null;
                return (
                  <div
                    key={seg.label}
                    style={{ width: `${pct}%` }}
                    className={`${seg.colorClass} transition-all duration-300`}
                    title={`${seg.label}: ${seg.count} (${pct.toFixed(1)}%)`}
                  />
                );
              })
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>
        </Card>
      </section>

      {/* 2. Overall TAT & 3. Monthly Performance */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Overall TAT Panel */}
        <Card className="lg:col-span-5 p-5 border-border/80 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="font-display text-base font-semibold text-foreground">
                  Overall Turnaround Time (TAT)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  End-to-end duration from request intake to report review (
                  {tat?.slaMeasuredCount ?? 0} measured)
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setTatChartMode("trend")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    tatChartMode === "trend"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Daily Trend
                </button>
                <button
                  type="button"
                  onClick={() => setTatChartMode("distribution")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    tatChartMode === "distribution"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Distribution
                </button>
              </div>
            </div>

            {/* Key TAT Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
                <div className="text-[11px] text-muted-foreground">Average TAT</div>
                <div className="mt-1 font-display text-lg font-bold text-foreground tabular-nums">
                  {formatHoursDuration(tat?.avgHours)}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
                <div className="text-[11px] text-muted-foreground">Median TAT</div>
                <div className="mt-1 font-display text-lg font-bold text-foreground tabular-nums">
                  {formatHoursDuration(tat?.medianHours)}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
                <div className="text-[11px] text-muted-foreground">48h SLA Rate</div>
                <div className="mt-1 font-display text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {tat?.slaMeasuredCount ? `${tat.slaComplianceRate}%` : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
                <div className="text-[11px] text-muted-foreground">Fastest / Max</div>
                <div className="mt-1 font-display text-sm font-bold text-foreground tabular-nums">
                  {formatHoursDuration(tat?.minHours)} / {formatHoursDuration(tat?.maxHours)}
                </div>
              </div>
            </div>

            {/* Stage-by-Stage Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-xs border-y border-border/60 py-2.5">
              <div>
                <div className="text-[11px] text-muted-foreground">1. Validation & Assign</div>
                <div className="font-semibold text-foreground tabular-nums mt-0.5">
                  {formatHoursDuration(tat?.validationAssignAvgHours)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">2. Agent Execution</div>
                <div className="font-semibold text-foreground tabular-nums mt-0.5">
                  {formatHoursDuration(tat?.executionAvgHours)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">3. Manager Review</div>
                <div className="font-semibold text-foreground tabular-nums mt-0.5">
                  {formatHoursDuration(tat?.reviewAvgHours)}
                </div>
              </div>
            </div>
          </div>

          <div className="h-[220px] w-full pt-3">
            {tatChartMode === "trend" ? (
              tat && tat.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tat.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tatAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => `${v}h`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [`${value.toFixed(1)} hrs`, "Avg TAT"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgHours"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#tatAreaGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No completed TAT timestamps available for this period.
                </div>
              )
            ) : tat && tat.slaMeasuredCount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tat.distribution}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value} audits`, "Count"]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={42}>
                    {tat.distribution.map((entry, idx) => (
                      <Cell
                        key={entry.bucket}
                        fill={idx === tat.distribution.length - 1 ? "#e11d48" : "#2563eb"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No TAT distribution data available for this period.
              </div>
            )}
          </div>
        </Card>

        {/* Monthly Performance Panel */}
        <Card className="lg:col-span-7 p-5 border-border/80 flex flex-col justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="font-display text-base font-semibold text-foreground">
                Monthly Performance ({selectedYear})
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Monthly audit volume breakdown and efficiency trend. Click any month bar to focus
                that month.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1 shrink-0 self-start">
              <button
                type="button"
                onClick={() => setMonthlyMetricLine("completionRate")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  monthlyMetricLine === "completionRate"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Completion %
              </button>
              <button
                type="button"
                onClick={() => setMonthlyMetricLine("avgTatHours")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  monthlyMetricLine === "avgTatHours"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Avg TAT (h)
              </button>
            </div>
          </div>

          <div className="h-[310px] w-full pt-4">
            {data && data.monthlyPerformance.some((m) => m.totalRequests > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data.monthlyPerformance}
                  margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
                  onClick={(state) => {
                    const idx = state?.activeTooltipIndex;
                    if (typeof idx === "number" && data.monthlyPerformance[idx]) {
                      setSelectedMonth(String(data.monthlyPerformance[idx].monthIndex));
                      setDuration("month");
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    yAxisId="left"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) =>
                      monthlyMetricLine === "completionRate" ? `${v}%` : `${v}h`
                    }
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar
                    yAxisId="left"
                    dataKey="completed"
                    name="Completed"
                    stackId="vol"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                    className="cursor-pointer"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="inProgress"
                    name="In Progress"
                    stackId="vol"
                    fill="#3b82f6"
                    className="cursor-pointer"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="rejected"
                    name="Rejected"
                    stackId="vol"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={monthlyMetricLine}
                    name={
                      monthlyMetricLine === "completionRate"
                        ? "Completion Rate (%)"
                        : "Avg TAT (hrs)"
                    }
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 3.5 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <p>No monthly surveillance records found for {selectedYear}.</p>
                {hasCustomFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-8 text-xs"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* 4. Top 5 Markets & Departmental Summary */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Top 5 Markets for Surveillance */}
        <Card className="lg:col-span-5 p-5 border-border/80">
          <div className="flex items-start justify-between gap-2 pb-4">
            <div>
              <CardTitle className="font-display text-base font-semibold text-foreground">
                Top 5 Markets for Surveillance
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Highest audit volume markets. Click any market to filter the dashboard.
              </CardDescription>
            </div>
            {marketFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMarketFilter("all")}
                className="h-7 px-2 text-xs whitespace-nowrap shrink-0"
              >
                Clear Market
              </Button>
            )}
          </div>

          {data && data.topMarkets.length > 0 ? (
            <div className="space-y-4">
              <div className="h-[190px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topMarkets}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="marketName"
                      width={110}
                      tick={{ fontSize: 11, fill: "var(--foreground)" }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val: number, name: string) => [val, name]}
                    />
                    <Bar
                      dataKey="totalRequests"
                      name="Total Audits"
                      radius={[0, 6, 6, 0]}
                      barSize={20}
                      className="cursor-pointer"
                      onClick={(entry) => {
                        if (entry?.marketName) {
                          setMarketFilter((prev) =>
                            prev === entry.marketName ? "all" : entry.marketName,
                          );
                        }
                      }}
                    >
                      {data.topMarkets.map((m, idx) => (
                        <Cell key={m.marketName} fill={MARKET_COLORS[idx % MARKET_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="divide-y divide-border/70 border-t border-border/70">
                {data.topMarkets.map((m, idx) => {
                  const isSelected = marketFilter === m.marketName;
                  return (
                    <button
                      key={m.marketName}
                      type="button"
                      onClick={() =>
                        setMarketFilter((prev) => (prev === m.marketName ? "all" : m.marketName))
                      }
                      className={`flex w-full items-center justify-between gap-3 py-2.5 px-2 text-left transition-colors rounded-md ${
                        isSelected ? "bg-accent/70" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: MARKET_COLORS[idx % MARKET_COLORS.length] }}
                          />
                          <span className="truncate">
                            {m.rank}. {m.marketName}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                          {m.storesAudited} stores · {m.flaggedIncidents} flags · Avg TAT{" "}
                          {formatHoursDuration(m.avgTatHours)}
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div className="text-xs font-bold text-foreground">
                          {m.totalRequests} audits ({m.sharePercentage}%)
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          {m.completionRate}% completed
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
              No market surveillance activity recorded in this period.
            </div>
          )}
        </Card>

        {/* Daily Performance Report - Departmental */}
        <Card className="lg:col-span-7 p-5 border-border/80 flex flex-col">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
            <div>
              <CardTitle className="font-display text-base font-semibold text-foreground">
                Daily Performance Report — Departmental
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Day-by-day surveillance intake, completion, rejection, and accuracy by requesting
                department.
              </CardDescription>
            </div>
          </div>

          {/* Departmental Summary Strip */}
          {data && data.departmentalSummary.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 pb-4">
              {data.departmentalSummary.slice(0, 6).map((dept) => {
                const isSelected = deptDailySelectedDept === dept.department;
                return (
                  <button
                    key={dept.department}
                    type="button"
                    onClick={() =>
                      setDeptDailySelectedDept((prev) =>
                        prev === dept.department ? "all" : dept.department,
                      )
                    }
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border/70 bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {dept.department}
                      </span>
                      <span className="text-xs font-bold text-foreground tabular-nums shrink-0">
                        {dept.totalRequests}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                      <span>
                        {dept.completed} done · {dept.rejected} rej
                      </span>
                      <span>
                        {dept.completionRate}% · {formatHoursDuration(dept.avgTatHours)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Table Search & Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={deptDailySearch}
                onChange={(e) => setDeptDailySearch(e.target.value)}
                placeholder="Search department or date..."
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={deptDailySelectedDept} onValueChange={setDeptDailySelectedDept}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Departments
                  </SelectItem>
                  {(data?.departmentalSummary || []).map((d) => (
                    <SelectItem key={d.department} value={d.department} className="text-xs">
                      {d.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Daily Departmental Data Table */}
          <div className="overflow-x-auto rounded-lg border border-border/80 flex-1 max-h-[340px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Department</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Received</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Assigned</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Submitted</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Completed</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Rejected</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Avg TAT</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDepartmentalDaily.length > 0 ? (
                  filteredDepartmentalDaily.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap tabular-nums">
                        {row.dateLabel}
                      </td>
                      <td className="px-3 py-2.5 text-foreground whitespace-nowrap">
                        {row.department}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {row.requestsReceived}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {row.assigned}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {row.submitted}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {row.completed}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                        {row.rejected}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatHoursDuration(row.avgTatHours)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {row.accuracyRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-xs text-muted-foreground"
                    >
                      No daily departmental performance entries match your current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* 5. Individual Performance (Top 10 High & Low Performers) */}
      <section className="space-y-4">
        <Card className="p-5 border-border/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
            <div>
              <CardTitle className="font-display text-base font-semibold text-foreground">
                Individual Performance — Top 10 High & Low Performers
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Ranked by composite score (approval rate 45%, manager rating 25%, TAT efficiency
                15%, completion consistency 15%, minus mistake penalty). Click any agent to inspect
                details.
              </CardDescription>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-muted p-1 shrink-0 self-start">
              {(
                [
                  { id: "split", label: "Split View" },
                  { id: "high", label: "Top 10 High" },
                  { id: "low", label: "Top 10 Low" },
                  { id: "all", label: "All Agents" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPerformerView(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    performerView === tab.id
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {data && data.allAgentPerformance.length > 0 ? (
            <div
              className={`pt-4 grid gap-5 ${
                performerView === "split" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {(performerView === "split" || performerView === "high") && (
                <AgentPerformerTable
                  title="Top 10 High Performers"
                  variant="high"
                  agents={data.topHighPerformers}
                  onInspect={setSelectedAgentDetail}
                />
              )}

              {(performerView === "split" || performerView === "low") && (
                <AgentPerformerTable
                  title="Top 10 Low Performers"
                  variant="low"
                  agents={data.topLowPerformers}
                  onInspect={setSelectedAgentDetail}
                />
              )}

              {performerView === "all" && (
                <AgentPerformerTable
                  title={`All Active Agents (${data.allAgentPerformance.length})`}
                  variant="high"
                  agents={[...data.allAgentPerformance].sort(
                    (a, b) => b.performanceScore - a.performanceScore,
                  )}
                  onInspect={setSelectedAgentDetail}
                />
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No assigned agent performance data is available for the selected duration.
            </div>
          )}
        </Card>
      </section>

      {/* 6. Most Number of Mistakes (Agent wise) */}
      <section>
        <Card className="p-5 border-border/80">
          <div className="flex flex-col gap-1 pb-4 border-b border-border/70">
            <CardTitle className="font-display text-base font-semibold text-foreground">
              Most Number of Mistakes — Agent Wise
            </CardTitle>
            <CardDescription className="text-xs">
              Tracks report rejections, audit row discrepancies (missing receipts, unexplained cash
              variance, unnoted flags), and SLA delays (&gt;48h).
            </CardDescription>
          </div>

          {data && data.agentMistakes.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 pt-4 lg:grid-cols-12">
              <div className="lg:col-span-5 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.agentMistakes.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="agentName"
                      width={115}
                      tick={{ fontSize: 11, fill: "var(--foreground)" }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar
                      dataKey="reportRejections"
                      name="Report Rejections"
                      stackId="m"
                      fill="#e11d48"
                    />
                    <Bar
                      dataKey="auditDiscrepancies"
                      name="Audit Discrepancies"
                      stackId="m"
                      fill="#f59e0b"
                    />
                    <Bar
                      dataKey="slaDelays"
                      name="SLA Delays (>48h)"
                      stackId="m"
                      fill="#6366f1"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-7 overflow-x-auto rounded-lg border border-border/80 max-h-[300px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5 whitespace-nowrap">Rank</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Agent</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Audits</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Total Mistakes</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Rejections</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Discrepancies</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">SLA Delays</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Mistake Rate</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.agentMistakes.map((item, idx) => (
                      <tr key={item.agentId}>
                        <td className="px-3 py-2.5 font-semibold tabular-nums text-muted-foreground">
                          #{idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">
                          {item.agentName}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {item.totalAudits}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums text-rose-600 dark:text-rose-400">
                          {item.totalMistakes}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {item.reportRejections}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {item.auditDiscrepancies}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{item.slaDelays}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                          {item.mistakeRate.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMistakeAgent(item)}
                            className="h-7 px-2 text-xs text-primary hover:text-primary whitespace-nowrap"
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Zero agent mistakes, rejections, or SLA breaches recorded in this period.
            </div>
          )}
        </Card>
      </section>

      {/* Agent Performance Drill-Down Modal */}
      <Dialog
        open={Boolean(selectedAgentDetail)}
        onOpenChange={(open) => !open && setSelectedAgentDetail(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {selectedAgentDetail?.agentName} — Performance Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedAgentDetail?.department || "Surveillance & Loss Prevention"}
              {selectedAgentDetail?.agentEmail ? ` · ${selectedAgentDetail.agentEmail}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedAgentDetail && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border/80 p-3">
                  <div className="text-[11px] text-muted-foreground">Score</div>
                  <div className="mt-1 font-display text-xl font-bold text-foreground tabular-nums">
                    {selectedAgentDetail.performanceScore.toFixed(1)}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 p-3">
                  <div className="text-[11px] text-muted-foreground">Completed / Assigned</div>
                  <div className="mt-1 font-display text-xl font-bold text-foreground tabular-nums">
                    {selectedAgentDetail.completedCount} / {selectedAgentDetail.totalAssigned}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 p-3">
                  <div className="text-[11px] text-muted-foreground">Approval Rate</div>
                  <div className="mt-1 font-display text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {selectedAgentDetail.approvalRate.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 p-3">
                  <div className="text-[11px] text-muted-foreground">Avg TAT</div>
                  <div className="mt-1 font-display text-xl font-bold text-foreground tabular-nums">
                    {formatHoursDuration(selectedAgentDetail.avgTatHours)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground">
                  Flagged Mistakes & Issues ({selectedAgentDetail.recentIssues.length})
                </h4>
                {selectedAgentDetail.recentIssues.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto divide-y divide-border/70 rounded-lg border border-border/80">
                    {selectedAgentDetail.recentIssues.map((iss, idx) => (
                      <div key={`${iss.requestId}-${idx}`} className="p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            {iss.storeName} · {iss.marketName}
                          </span>
                          <span className="text-muted-foreground tabular-nums">{iss.date}</span>
                        </div>
                        <div className="text-rose-700 dark:text-rose-400 font-medium">
                          {iss.category}
                        </div>
                        <p className="text-muted-foreground">{iss.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/80 p-4 text-xs text-muted-foreground">
                    No rejections, audit discrepancies, or SLA delays logged for this agent in the
                    selected range.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Agent Mistakes Drill-Down Modal */}
      <Dialog
        open={Boolean(selectedMistakeAgent)}
        onOpenChange={(open) => !open && setSelectedMistakeAgent(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {selectedMistakeAgent?.agentName} — Mistake Log
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedMistakeAgent?.totalMistakes} total mistakes across{" "}
              {selectedMistakeAgent?.totalAudits} assigned audits (
              {selectedMistakeAgent?.mistakeRate.toFixed(1)}% mistake rate)
            </DialogDescription>
          </DialogHeader>

          {selectedMistakeAgent && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/80 p-3">
                  <div className="text-[11px] text-muted-foreground">Report Rejections</div>
                  <div className="mt-1 font-display text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {selectedMistakeAgent.reportRejections}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 p-3">
                  <div className="text-[11px] text-muted-foreground">Audit Discrepancies</div>
                  <div className="mt-1 font-display text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {selectedMistakeAgent.auditDiscrepancies}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 p-3">
                  <div className="text-[11px] text-muted-foreground">SLA Delays (&gt;48h)</div>
                  <div className="mt-1 font-display text-xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {selectedMistakeAgent.slaDelays}
                  </div>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-border/70 rounded-lg border border-border/80">
                {selectedMistakeAgent.recentIssues.map((iss, idx) => (
                  <div key={`${iss.requestId}-${idx}`} className="p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {iss.storeName} · {iss.marketName}
                      </span>
                      <span className="text-muted-foreground tabular-nums">{iss.date}</span>
                    </div>
                    <div className="font-medium text-rose-700 dark:text-rose-400">
                      {iss.category}
                    </div>
                    <p className="text-muted-foreground">{iss.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgentPerformerTable({
  title,
  variant,
  agents,
  onInspect,
}: {
  title: string;
  variant: "high" | "low";
  agents: SurveillanceAgentPerformanceItem[];
  onInspect: (agent: SurveillanceAgentPerformanceItem) => void;
}) {
  const Icon = variant === "high" ? ArrowUpRight : ArrowDownRight;
  const accentText =
    variant === "high"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-rose-700 dark:text-rose-400";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Icon className={`h-4 w-4 ${accentText}`} />
          <span>{title}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{agents.length} shown</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="px-3 py-2.5 whitespace-nowrap">#</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Agent</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Done / Total</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Approval</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Avg TAT</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Mistakes</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {agents.map((ag, idx) => (
              <tr
                key={ag.agentId}
                onClick={() => onInspect(ag)}
                className="cursor-pointer"
                title="Click to inspect agent performance details"
              >
                <td className="px-3 py-2.5 font-semibold tabular-nums text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">
                  <div>{ag.agentName}</div>
                  {ag.avgManagerRating !== null && (
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      Rating: {ag.avgManagerRating.toFixed(1)}/5 ({ag.ratedCount})
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {ag.completedCount} / {ag.totalAssigned}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {ag.approvalRate.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                  {formatHoursDuration(ag.avgTatHours)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span
                    className={
                      ag.totalMistakes > 0
                        ? "font-semibold text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground"
                    }
                  >
                    {ag.totalMistakes}
                  </span>
                </td>
                <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${accentText}`}>
                  {ag.performanceScore.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
