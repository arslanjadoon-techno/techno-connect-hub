import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FilterReset } from "@/components/filter-reset";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronsUpDown,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Store as StoreIcon,
  User as UserIcon,
  UserPlus,
  Users,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { surveillanceService } from "@/services/portals/surveillance/surveillance.service";
import {
  canValidateSurveillance,
  getSurveillanceDefaultRoute,
  getSurveillanceRole,
  type SurveillanceAssignableAgent,
  type SurveillanceMarketOption,
  type SurveillancePriority,
  type SurveillanceValidationItem,
} from "@/services/portals/surveillance/types";
import {
  SurveillanceDetailPageSkeleton,
  SurveillanceListPageSkeleton,
} from "./SurveillanceSkeletons";

const PRIORITY_TONES: Record<SurveillancePriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  high: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
};

type ValidationDisplayStatus =
  | "Unassigned"
  | "Assigned"
  | "Request Rejected"
  | "Pending Verification"
  | "Report Rejected"
  | "Completed";

const VALIDATION_STATUS_CONFIG: Record<
  ValidationDisplayStatus,
  { label: string; tone: string; dotClass: string; textClass: string }
> = {
  Unassigned: {
    label: "Unassigned",
    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    dotClass: "bg-amber-500",
    textClass: "text-amber-900 dark:text-amber-100",
  },
  Assigned: {
    label: "Assigned",
    tone: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400",
    dotClass: "bg-sky-500",
    textClass: "text-sky-800 dark:text-sky-300",
  },
  "Request Rejected": {
    label: "Request Rejected",
    tone: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400",
    dotClass: "bg-orange-500",
    textClass: "text-orange-800 dark:text-orange-300",
  },
  "Pending Verification": {
    label: "Pending Verification",
    tone: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400",
    dotClass: "bg-violet-500",
    textClass: "text-violet-800 dark:text-violet-300",
  },
  "Report Rejected": {
    label: "Report Rejected",
    tone: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
    dotClass: "bg-rose-500",
    textClass: "text-rose-700 dark:text-rose-300",
  },
  Completed: {
    label: "Completed",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-300",
  },
};

function resolveValidationDisplayStatus(
  item: SurveillanceValidationItem,
): ValidationDisplayStatus {
  const raw = String(item.validationStatus || "");
  if (raw === "Request Rejected") return "Request Rejected";
  if (raw === "Report Rejected") return "Report Rejected";
  if (raw === "Rejected") {
    return item.linkedReportId || item.reportStatus === "Rejected"
      ? "Report Rejected"
      : "Request Rejected";
  }
  if (
    raw === "Unassigned" ||
    raw === "Assigned" ||
    raw === "Pending Verification" ||
    raw === "Completed"
  ) {
    return raw;
  }
  return "Unassigned";
}

function formatPriorityLabel(priority: SurveillancePriority): string {
  if (!priority) return "—";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "—";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const monthIdx = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    if (!Number.isNaN(year) && months[monthIdx] && !Number.isNaN(day)) {
      return `${String(day).padStart(2, "0")} ${months[monthIdx]}, ${year}`;
    }
  }
  return isoDate;
}

function getInitials(name?: string): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDateTimeDisplay(isoString?: string): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const timeStr = d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} ${month} ${year}, ${timeStr}`;
}

function getSurveyStartsAtDisplay(
  item: SurveillanceValidationItem,
  displayStatus: ValidationDisplayStatus,
): string {
  if (displayStatus === "Unassigned" || displayStatus === "Request Rejected") {
    return item.surveyStartsAt ? formatDateTimeDisplay(item.surveyStartsAt) : "-";
  }
  const startRaw =
    item.surveyStartsAt ||
    item.assignedAt ||
    (displayStatus !== "Assigned" ? item.createdAt : undefined);
  return startRaw ? formatDateTimeDisplay(startRaw) : "-";
}

function getSurveyEndsAtDisplay(
  item: SurveillanceValidationItem,
  displayStatus: ValidationDisplayStatus,
): string {
  if (displayStatus !== "Completed" && displayStatus !== "Pending Verification") {
    return "-";
  }
  const endRaw = item.surveyEndsAt || item.reportSubmittedAt || item.reportReviewedAt;
  return endRaw ? formatDateTimeDisplay(endRaw) : "-";
}

export default function ValidateAndAssignPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const userRole = useMemo(() => getSurveillanceRole(user), [user]);
  const canAccessValidatePage = useMemo(() => canValidateSurveillance(userRole), [userRole]);

  const [requests, setRequests] = useState<SurveillanceValidationItem[]>([]);
  const [marketOptions, setMarketOptions] = useState<SurveillanceMarketOption[]>([]);
  // Search results for the "Assign to User / Agent" picker only - fetched
  // on demand as the validator types (search-as-you-type), never the full
  // user roster up front.
  const [agentSearchResults, setAgentSearchResults] = useState<SurveillanceAssignableAgent[]>([]);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [agentSearchLoading, setAgentSearchLoading] = useState(false);

  // Drill-down detail state synced with URL search params; statusFilter defaults to "all"
  // ("Total Requests Received") on every page mount / browser refresh.
  const selectedDetailId = searchParams.get("detail");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const setSelectedDetailId = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete("status");
    if (id) {
      next.set("detail", id);
    } else {
      next.delete("detail");
    }
    setSearchParams(next, { replace: true });
  };

  // Filters
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  // Validate & Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetAssignItem, setTargetAssignItem] = useState<SurveillanceValidationItem | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Reject Request modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRejectItem, setTargetRejectItem] = useState<SurveillanceValidationItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  // Full-screen blocking overlay shown while an assign/reject action is in flight.
  const [blockingMessage, setBlockingMessage] = useState<string | null>(null);
  const blockingOverlay = blockingMessage ? (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/30 backdrop-blur-[2px]">
      <Loader2 className="h-9 w-9 animate-spin text-primary" />
      <p className="text-sm font-semibold text-foreground drop-shadow-sm">{blockingMessage}</p>
    </div>
  ) : null;

  const loadQueue = async () => {
    try {
      setRequests(await surveillanceService.getValidationQueue());
    } catch (error) {
      toast.error(`Failed to load validation queue: ${(error as Error).message}`);
    }
  };

  const loadMarkets = async () => {
    try {
      setMarketOptions(await surveillanceService.getMarkets(0, 500));
    } catch (error) {
      toast.error(`Failed to load markets: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    if (searchParams.has("status")) {
      const next = new URLSearchParams(searchParams);
      next.delete("status");
      setSearchParams(next, { replace: true });
    }
    Promise.all([loadQueue(), loadMarkets()]).finally(() => {
      setInitialLoading(false);
      setBlockingMessage(null);
    });
  }, []);

  // Debounced search-as-you-type for the "Assign to User / Agent" picker -
  // only queries the backend once the validator has typed 2+ characters, and
  // only while the modal is actually open.
  useEffect(() => {
    if (!agentPickerOpen) return;
    const query = agentSearchQuery.trim();
    if (query.length < 2) {
      setAgentSearchResults([]);
      return;
    }
    setAgentSearchLoading(true);
    const timer = setTimeout(() => {
      surveillanceService
        .getAssignableAgents(query)
        .then(setAgentSearchResults)
        .catch((error) => toast.error(`Agent search failed: ${(error as Error).message}`))
        .finally(() => setAgentSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [agentSearchQuery, agentPickerOpen]);

  const markets = useMemo(
    () =>
      Array.from(
        new Set(marketOptions.map((m) => m.name?.trim()).filter((n): n is string => Boolean(n))),
      ).sort(),
    [marketOptions],
  );

  const metrics = useMemo(() => {
    let unassigned = 0;
    let assigned = 0;
    let requestRejected = 0;
    let pendingVerification = 0;
    let reportRejected = 0;
    let completed = 0;

    for (const r of requests) {
      const displayStatus = resolveValidationDisplayStatus(r);
      if (displayStatus === "Unassigned") unassigned += 1;
      else if (displayStatus === "Assigned") assigned += 1;
      else if (displayStatus === "Request Rejected") requestRejected += 1;
      else if (displayStatus === "Pending Verification") pendingVerification += 1;
      else if (displayStatus === "Report Rejected") reportRejected += 1;
      else if (displayStatus === "Completed") completed += 1;
    }

    return {
      total: requests.length,
      unassigned,
      assigned,
      requestRejected,
      pendingVerification,
      reportRejected,
      completed,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const displayStatus = resolveValidationDisplayStatus(r);
      if (statusFilter !== "all" && displayStatus !== statusFilter) {
        return false;
      }
      if (marketFilter !== "all" && r.marketName !== marketFilter) {
        return false;
      }
      if (priorityFilter !== "all" && r.priority !== priorityFilter) {
        return false;
      }
      if (agentFilter === "unassigned" && r.assignedAgentId) {
        return false;
      }
      if (
        agentFilter !== "all" &&
        agentFilter !== "unassigned" &&
        r.assignedAgentId !== agentFilter
      ) {
        return false;
      }
      return true;
    });
  }, [requests, statusFilter, marketFilter, priorityFilter, agentFilter]);

  const selectedAgent = useMemo(
    () => agentSearchResults.find((a) => a.id === selectedAgentId) || null,
    [agentSearchResults, selectedAgentId],
  );

  const selectedDetail = useMemo(
    () => (selectedDetailId ? requests.find((r) => r.id === selectedDetailId) || null : null),
    [requests, selectedDetailId],
  );

  const selectedDetailDisplayStatus = useMemo(
    () => (selectedDetail ? resolveValidationDisplayStatus(selectedDetail) : null),
    [selectedDetail],
  );

  // Assigned-agent options for the toolbar filter, derived from the queue
  // itself (already loaded) rather than a separate full-roster fetch.
  const assignedAgentOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of requests) {
      if (r.assignedAgentId && r.assignedAgentName && !seen.has(r.assignedAgentId)) {
        seen.set(r.assignedAgentId, r.assignedAgentName);
      }
    }
    return Array.from(seen.entries()).map(([id, fullName]) => ({ id, fullName }));
  }, [requests]);

  const isReassignModal =
    targetAssignItem !== null && resolveValidationDisplayStatus(targetAssignItem) === "Assigned";

  const openAssignModal = useCallback((item: SurveillanceValidationItem) => {
    const status = resolveValidationDisplayStatus(item);
    if (status !== "Unassigned" && status !== "Assigned") return;
    setTargetAssignItem(item);
    setSelectedAgentId("");
    setAgentSearchQuery("");
    setAgentSearchResults([]);
    setAssignModalOpen(true);
  }, []);

  const openRejectModal = useCallback((item: SurveillanceValidationItem) => {
    if (resolveValidationDisplayStatus(item) !== "Unassigned") return;
    setTargetRejectItem(item);
    setRejectReason("");
    setRejectModalOpen(true);
  }, []);

  const handleConfirmReject = async () => {
    if (!targetRejectItem) return;
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      toast.error("Please enter a reason for rejecting this surveillance request.");
      return;
    }

    setSubmittingReject(true);
    setBlockingMessage("Rejecting surveillance request...");
    try {
      await surveillanceService.rejectValidationRequest({
        requestId: targetRejectItem.id,
        reason: trimmedReason,
      });
      await loadQueue();
      setRejectModalOpen(false);
      toast.success("Surveillance request rejected successfully.");
    } catch (error) {
      toast.error(`Failed to reject request: ${(error as Error).message}`);
    } finally {
      setSubmittingReject(false);
      setBlockingMessage(null);
    }
  };

  const handleConfirmAssign = async () => {
    if (!targetAssignItem) return;
    if (!selectedAgentId) {
      toast.error("Please select a user or agent to assign this request.");
      return;
    }
    const isReassigning = resolveValidationDisplayStatus(targetAssignItem) === "Assigned";
    if (isReassigning && targetAssignItem.assignedAgentId === selectedAgentId) {
      toast.error("Please select a different user or agent to reassign this request.");
      return;
    }

    setSubmittingAssign(true);
    setBlockingMessage(
      isReassigning
        ? "Reassigning request to new agent..."
        : "Validating and assigning request...",
    );
    try {
      const updated = await surveillanceService.validateAndAssignRequest({
        requestId: targetAssignItem.id,
        agentId: selectedAgentId,
        priority: targetAssignItem.priority,
      });

      await loadQueue();
      setAssignModalOpen(false);
      toast.success(
        isReassigning
          ? `Request reassigned to ${updated.assignedAgentName}.`
          : `Request validated and assigned to ${updated.assignedAgentName}.`,
      );
    } catch (error) {
      toast.error(
        `${isReassigning ? "Reassignment" : "Assignment"} failed: ${(error as Error).message}`,
      );
    } finally {
      setSubmittingAssign(false);
      setBlockingMessage(null);
    }
  };

  const hasActiveFilters =
    marketFilter !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    agentFilter !== "all";

  const columns: Column<SurveillanceValidationItem>[] = useMemo(
    () => [
      {
        key: "surveillanceDate",
        header: "Surveillance Date",
        searchValue: (r) => `${r.surveillanceDate} ${formatDisplayDate(r.surveillanceDate)}`,
        accessor: (r) => (
          <span className="text-sm text-foreground tabular-nums whitespace-nowrap">
            {formatDisplayDate(r.surveillanceDate)}
          </span>
        ),
      },
      {
        key: "store",
        header: "Store",
        searchValue: (r) => r.storeName,
        accessor: (r) => <span className="font-medium text-sm text-foreground">{r.storeName}</span>,
      },
      {
        key: "market",
        header: "Market",
        searchValue: (r) => r.marketName,
        accessor: (r) => (
          <span className="text-sm text-foreground whitespace-nowrap">{r.marketName}</span>
        ),
      },
      {
        key: "reason",
        header: "Investigation Reason",
        searchValue: (r) => `${r.title} ${r.notes || ""}`,
        accessor: (r) => (
          <span className="text-sm text-foreground line-clamp-1 max-w-[280px]">{r.title}</span>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        searchValue: (r) => r.priority,
        accessor: (r) => (
          <Badge
            variant="outline"
            className={`capitalize text-xs font-medium whitespace-nowrap ${PRIORITY_TONES[r.priority]}`}
          >
            {r.priority}
          </Badge>
        ),
      },
      {
        key: "requestedBy",
        header: "Requested By",
        searchValue: (r) => `${r.requestedBy} ${r.requesterRole}`,
        accessor: (r) => (
          <span className="text-sm text-foreground whitespace-nowrap">{r.requestedBy}</span>
        ),
      },
      {
        key: "assignedAgent",
        header: "Assigned To",
        searchValue: (r) => r.assignedAgentName || "-",
        accessor: (r) => {
          if (r.assignedAgentName) {
            return (
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {r.assignedAgentName}
              </span>
            );
          }
          return <span className="text-sm text-muted-foreground whitespace-nowrap">-</span>;
        },
      },
      {
        key: "status",
        header: "Status",
        searchValue: (r) => VALIDATION_STATUS_CONFIG[resolveValidationDisplayStatus(r)].label,
        accessor: (r) => {
          const cfg = VALIDATION_STATUS_CONFIG[resolveValidationDisplayStatus(r)];
          return (
            <Badge
              variant="outline"
              className={`text-xs font-semibold whitespace-nowrap ${cfg.tone}`}
            >
              {cfg.label}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  // Safeguard: Allow Admin, State Manager, and Market Manager
  if (!canAccessValidatePage) {
    return <Navigate to={getSurveillanceDefaultRoute(user)} replace />;
  }

  if (initialLoading) {
    return selectedDetailId ? (
      <SurveillanceDetailPageSkeleton summaryCardCount={8} />
    ) : (
      <SurveillanceListPageSkeleton
        kpiCount={7}
        kpiGridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
        filterCount={3}
        showHeaderAction
      />
    );
  }

  return (
    <div className="relative space-y-6 animate-fade-in">
      {blockingOverlay}
      {selectedDetail && selectedDetailDisplayStatus ? (
        /* DRILL-DOWN REQUEST VALIDATION & ASSIGNMENT VIEW */
        <div className="space-y-5">
          {/* Top Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDetailId(null)}
                className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium bg-background shadow-xs whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Validate & Assign
              </Button>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                  Validate and Assign
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground leading-tight">
                  Request Details
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {selectedDetailDisplayStatus === "Unassigned" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => openRejectModal(selectedDetail)}
                    className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100/80 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 shadow-xs whitespace-nowrap shrink-0"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Request
                  </Button>
                  <Button
                    onClick={() => openAssignModal(selectedDetail)}
                    className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs whitespace-nowrap shrink-0"
                  >
                    <UserPlus className="h-4 w-4" />
                    Validate & Assign
                  </Button>
                </>
              )}

              {selectedDetailDisplayStatus === "Assigned" && (
                <Button
                  onClick={() => openAssignModal(selectedDetail)}
                  className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reassign
                </Button>
              )}

              {Boolean(selectedDetail.linkedReportId) && (
                <>
                  {(selectedDetailDisplayStatus === "Completed" ||
                    selectedDetailDisplayStatus === "Pending Verification") && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/surveillance/validate-and-assign/summary/${selectedDetail.linkedReportId}`,
                        )
                      }
                      className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100/80 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70 shadow-xs whitespace-nowrap shrink-0"
                    >
                      <FileText className="h-4 w-4" />
                      View Summary
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      navigate(
                        `/surveillance/validate-and-assign/review/${selectedDetail.linkedReportId}`,
                      )
                    }
                    className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs whitespace-nowrap shrink-0"
                  >
                    <Eye className="h-4 w-4" />
                    {selectedDetailDisplayStatus === "Pending Verification"
                      ? "Review Report"
                      : "View Report"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Store Header + 8 Distinctly Colored Summary Cards */}
          <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50 shrink-0">
                <StoreIcon className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground tracking-tight">
                {selectedDetail.storeName}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Market Card - Blue */}
              <div className="flex items-start gap-3.5 rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/25">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 border border-blue-100 shadow-2xs dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900 shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-blue-700/80 dark:text-blue-300/80">
                    Market
                  </div>
                  <div className="text-sm font-bold text-blue-950 dark:text-blue-100 truncate mt-0.5">
                    {selectedDetail.marketName}
                  </div>
                  {selectedDetail.districtName && (
                    <div className="text-[11px] text-blue-700/70 dark:text-blue-300/70 mt-0.5">
                      {selectedDetail.districtName}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Priority Card - Orange */}
              <div className="flex items-start gap-3.5 rounded-xl border border-orange-200/80 bg-orange-50/60 p-4 dark:border-orange-900/50 dark:bg-orange-950/25">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-orange-600 border border-orange-100 shadow-2xs dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-orange-700/80 dark:text-orange-300/80">
                    Priority
                  </div>
                  <div className="text-sm font-bold text-orange-950 dark:text-orange-100 capitalize mt-0.5">
                    {formatPriorityLabel(selectedDetail.priority)}
                  </div>
                </div>
              </div>

              {/* 3. Current Status Card - Amber */}
              <div className="flex items-start gap-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-amber-100 shadow-2xs dark:bg-amber-950 dark:border-amber-900 shrink-0">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      VALIDATION_STATUS_CONFIG[selectedDetailDisplayStatus].dotClass
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-amber-800/80 dark:text-amber-300/80">
                    Current status
                  </div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      VALIDATION_STATUS_CONFIG[selectedDetailDisplayStatus].textClass
                    }`}
                  >
                    {VALIDATION_STATUS_CONFIG[selectedDetailDisplayStatus].label}
                  </div>
                </div>
              </div>

              {/* 4. Surveillance Date Card - Purple */}
              <div className="flex items-start gap-3.5 rounded-xl border border-purple-200/80 bg-purple-50/60 p-4 dark:border-purple-900/50 dark:bg-purple-950/25">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-purple-600 border border-purple-100 shadow-2xs dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900 shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-purple-700/80 dark:text-purple-300/80">
                    Surveillance date
                  </div>
                  <div className="text-sm font-bold text-purple-950 dark:text-purple-100 tabular-nums mt-0.5">
                    {formatDisplayDate(selectedDetail.surveillanceDate)}
                  </div>
                </div>
              </div>

              {/* 5. Requested By Card - Cyan */}
              <div className="flex items-start gap-3.5 rounded-xl border border-cyan-200/80 bg-cyan-50/60 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/25">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-cyan-600 border border-cyan-100 shadow-2xs dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-900 shrink-0">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-cyan-700/80 dark:text-cyan-300/80">
                    Requested by
                  </div>
                  <div className="text-sm font-bold text-cyan-950 dark:text-cyan-100 truncate mt-0.5">
                    {selectedDetail.requestedBy}
                  </div>
                </div>
              </div>

              {/* 6. Assigned To Card - Emerald */}
              <div className="flex items-start gap-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-600 border border-emerald-100 shadow-2xs dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-300/80">
                    Assigned to
                  </div>
                  <div className="text-sm font-bold text-emerald-950 dark:text-emerald-100 truncate mt-0.5">
                    {selectedDetail.assignedAgentName || "—"}
                  </div>
                </div>
              </div>

              {/* 7. Survey Starts At Card - Indigo */}
              <div className="flex items-start gap-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/25">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 border border-indigo-100 shadow-2xs dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-900 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-indigo-700/80 dark:text-indigo-300/80">
                    Survey starts at
                  </div>
                  <div className="text-sm font-bold text-indigo-950 dark:text-indigo-100 tabular-nums mt-0.5">
                    {getSurveyStartsAtDisplay(selectedDetail, selectedDetailDisplayStatus)}
                  </div>
                </div>
              </div>

              {/* 8. Survey Ends At Card - Teal */}
              <div className="flex items-start gap-3.5 rounded-xl border border-teal-200/80 bg-teal-50/60 p-4 dark:border-teal-900/50 dark:bg-teal-950/25">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-600 border border-teal-100 shadow-2xs dark:bg-teal-950 dark:text-teal-400 dark:border-teal-900 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-teal-700/80 dark:text-teal-300/80">
                    Survey ends at
                  </div>
                  <div className="text-sm font-bold text-teal-950 dark:text-teal-100 tabular-nums mt-0.5">
                    {getSurveyEndsAtDisplay(selectedDetail, selectedDetailDisplayStatus)}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Investigation Scope Section */}
          <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50 shrink-0">
                <Search className="h-4 w-4" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">
                Investigation scope
              </h3>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                REASON / INCIDENT SUMMARY
              </div>
              <div className="text-base font-bold text-foreground">{selectedDetail.title}</div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                SPECIAL INSTRUCTIONS FROM REQUESTER
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/45 p-4 text-xs text-foreground leading-relaxed dark:border-indigo-900/40 dark:bg-indigo-950/25">
                <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="whitespace-pre-wrap">
                  {selectedDetail.notes ||
                    "No additional context or special instructions were provided by the requester."}
                </p>
              </div>
            </div>
          </Card>

          {/* Read-Only Report Rating Banner (Displayed when Completed with rating) */}
          {Boolean(selectedDetail.managerRating && selectedDetail.managerRating > 0) && (
            <Card className="p-5 rounded-2xl border-amber-200/90 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/50 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                    <span>Report Rating</span>
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-100/70 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-medium"
                    >
                      View Only
                    </Badge>
                  </div>
                  {selectedDetail.reportReviewedBy && (
                    <p className="text-xs text-muted-foreground">
                      Rated by{" "}
                      <strong className="font-semibold text-foreground">
                        {selectedDetail.reportReviewedBy}
                      </strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 select-none pointer-events-none">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= (selectedDetail.managerRating || 0)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-1 text-xs font-semibold text-foreground">
                    {selectedDetail.managerRating} / 5
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Rejection Reason Banner (when Request Rejected or Report Rejected) */}
          {(selectedDetailDisplayStatus === "Request Rejected" ||
            selectedDetailDisplayStatus === "Report Rejected") && (
            <Card className="p-5 rounded-2xl border-rose-200/90 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/60 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-semibold text-sm">
                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>
                  {selectedDetailDisplayStatus === "Report Rejected"
                    ? "Report Rejection Reason"
                    : "Request Rejection Reason"}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-rose-200/80 bg-background text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                {selectedDetail.rejectionReason ||
                  selectedDetail.managerComments ||
                  (selectedDetailDisplayStatus === "Report Rejected"
                    ? "Submitted report was declined during review."
                    : "Surveillance request was rejected during validation.")}
              </div>
            </Card>
          )}

          {/* Bottom 2-Column Section: "Requested by" & "Assigned To" with Distinct Colors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            {/* Left Card: Requested by (Blue Tint) */}
            <Card className="p-6 rounded-2xl border-blue-200/80 bg-blue-50/35 dark:bg-blue-950/20 dark:border-blue-900/50 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-5">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-900/80 dark:text-blue-300">
                  Requested by
                </div>

                {/* Avatar + Name + Role Pill */}
                <div className="flex items-center gap-3.5 border-b border-blue-200/60 dark:border-blue-900/50 pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-display text-sm font-bold shadow-xs shrink-0">
                    {getInitials(selectedDetail.requestedBy)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="text-base font-bold text-foreground truncate">
                      {selectedDetail.requestedBy}
                    </div>
                    <span className="inline-flex items-center rounded-md bg-blue-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                      {selectedDetail.requesterRole}
                    </span>
                  </div>
                </div>

                {/* Contact & Metadata Rows */}
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900 shrink-0">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">Email</div>
                      <div className="font-medium text-blue-700 dark:text-blue-300 break-all">
                        {selectedDetail.requesterEmail || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900 shrink-0">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">Phone</div>
                      <div className="font-medium text-blue-700 dark:text-blue-300 tabular-nums">
                        {selectedDetail.requesterPhone || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900 shrink-0">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">Department</div>
                      <div className="font-medium text-foreground">
                        {selectedDetail.requesterDepartment || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900 shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">Request received at</div>
                      <div className="font-medium text-foreground tabular-nums">
                        {formatDateTimeDisplay(selectedDetail.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Right Card: Assigned To (Emerald Tint) */}
            <Card className="p-6 rounded-2xl border-emerald-200/80 bg-emerald-50/35 dark:bg-emerald-950/20 dark:border-emerald-900/50 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-5">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-900/80 dark:text-emerald-300">
                  Assigned To
                </div>

                {/* Avatar + Agent Name / Placeholder + Status Pill */}
                <div className="flex items-center gap-3.5 border-b border-emerald-200/60 dark:border-emerald-900/50 pb-4">
                  {selectedDetail.assignedAgentName ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white font-display text-sm font-bold shadow-xs shrink-0">
                      {getInitials(selectedDetail.assignedAgentName)}
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-emerald-300 bg-white/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 shrink-0">
                      <UserIcon className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="text-base font-bold text-foreground truncate">
                      {selectedDetail.assignedAgentName || "—"}
                    </div>

                    {selectedDetail.assignedAgentName ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        {selectedDetail.assignedAgentRole || "Surveillance Agent"}
                      </span>
                    ) : selectedDetailDisplayStatus === "Request Rejected" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-orange-800 dark:bg-orange-900/60 dark:text-orange-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
                        Request rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Awaiting validation
                      </span>
                    )}
                  </div>
                </div>

                {/* Agent Contact & Assignment Rows */}
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">Email</div>
                      <div className="font-medium text-foreground break-all">
                        {selectedDetail.assignedAgentEmail || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">Phone</div>
                      <div className="font-medium text-foreground tabular-nums">
                        {selectedDetail.assignedAgentName
                          ? selectedDetail.assignedAgentPhone || "—"
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">Department</div>
                      <div className="font-medium text-foreground">
                        {selectedDetail.assignedAgentName ? "Surveillance & Loss Prevention" : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">Assigned at</div>
                      <div className="font-medium text-foreground tabular-nums">
                        {selectedDetail.assignedAt
                          ? formatDateTimeDisplay(selectedDetail.assignedAt)
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visibility Status Callout Footer */}
              {selectedDetailDisplayStatus === "Completed" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-100/60 p-3.5 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Approved and completed by{" "}
                    <strong>{selectedDetail.reportReviewedBy || "Validator"}</strong>. Report is now
                    visible to the admin and requester.
                  </span>
                </div>
              ) : selectedDetailDisplayStatus === "Pending Verification" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50/90 p-3.5 text-xs text-violet-900 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200">
                  <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                  <span>
                    Pending verification — surveillance report received from{" "}
                    <strong>{selectedDetail.assignedAgentName || "Assigned Agent"}</strong>. Click{" "}
                    <strong>Review Report</strong> above to mark as completed or decline.
                  </span>
                </div>
              ) : selectedDetailDisplayStatus === "Assigned" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/90 p-3.5 text-xs text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200">
                  <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    Validated by <strong>{selectedDetail.assignedBy || "Validator"}</strong>.
                    Visible to assigned agent for audit report preparation.
                  </span>
                </div>
              ) : selectedDetailDisplayStatus === "Report Rejected" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-100/60 p-3.5 text-xs text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200">
                  <EyeOff className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    Report rejected by{" "}
                    <strong>
                      {selectedDetail.reportReviewedBy || selectedDetail.rejectedBy || "Validator"}
                    </strong>
                    . Submitted report was declined during review.
                  </span>
                </div>
              ) : selectedDetailDisplayStatus === "Request Rejected" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-orange-200 bg-orange-100/60 p-3.5 text-xs text-orange-900 dark:border-orange-800/60 dark:bg-orange-950/50 dark:text-orange-200">
                  <EyeOff className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <span>
                    Request rejected by{" "}
                    <strong>{selectedDetail.rejectedBy || "Validator"}</strong>. Hidden from all
                    surveillance agents and marked as Rejected for the requester.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <EyeOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Unassigned in the validation queue. Not visible to any agent until validated and
                    assigned.
                  </span>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        /* MAIN QUEUE LIST VIEW */
        <>
          {/* Header */}
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Validate and Assign
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Review incoming surveillance requests, assign valid requests to agents for report
                preparation, and review returned reports to complete or reject them.
              </p>
            </div>

            <div className="flex items-center shrink-0">
              <Button
                onClick={() => navigate("/surveillance/validate-and-assign/agents")}
                className="gap-2 shadow-xs"
              >
                <Users className="h-4 w-4" />
                View Agents
              </Button>
            </div>
          </div>

          {/* 7 KPI Summary Cards (Clickable to filter by status) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {/* 1. Total Requests Received */}
            <Card
              role="button"
              tabIndex={0}
              onClick={() => setStatusFilter("all")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setStatusFilter("all");
              }}
              className={`p-4 cursor-pointer transition-all border-blue-200 bg-blue-50/50 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:border-blue-900/50 ${
                statusFilter === "all" ? "ring-2 ring-blue-500/70 shadow-xs" : ""
              }`}
            >
              <div className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                Total Requests Received
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-blue-950 dark:text-blue-100 tabular-nums">
                {metrics.total}
              </div>
            </Card>

            {/* 2. Unassigned */}
            <Card
              role="button"
              tabIndex={0}
              onClick={() => setStatusFilter("Unassigned")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setStatusFilter("Unassigned");
              }}
              className={`p-4 cursor-pointer transition-all border-amber-300/80 bg-amber-50/50 hover:bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900/50 ${
                statusFilter === "Unassigned" ? "ring-2 ring-amber-500/70 shadow-xs" : ""
              }`}
            >
              <div className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                Unassigned
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-amber-950 dark:text-amber-100 tabular-nums">
                {metrics.unassigned}
              </div>
            </Card>

            {/* 3. Request Rejected */}
            <Card
              role="button"
              tabIndex={0}
              onClick={() => setStatusFilter("Request Rejected")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setStatusFilter("Request Rejected");
              }}
              className={`p-4 cursor-pointer transition-all border-orange-300/80 bg-orange-50/50 hover:bg-orange-50/80 dark:bg-orange-950/20 dark:border-orange-900/50 ${
                statusFilter === "Request Rejected" ? "ring-2 ring-orange-500/70 shadow-xs" : ""
              }`}
            >
              <div className="text-xs text-orange-800 dark:text-orange-300 font-medium">
                Request Rejected
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-orange-950 dark:text-orange-100 tabular-nums">
                {metrics.requestRejected}
              </div>
            </Card>

            {/* 4. Assigned */}
            <Card
              role="button"
              tabIndex={0}
              onClick={() => setStatusFilter("Assigned")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setStatusFilter("Assigned");
              }}
              className={`p-4 cursor-pointer transition-all border-sky-300/80 bg-sky-50/50 hover:bg-sky-50/80 dark:bg-sky-950/20 dark:border-sky-900/50 ${
                statusFilter === "Assigned" ? "ring-2 ring-sky-500/70 shadow-xs" : ""
              }`}
            >
              <div className="text-xs text-sky-800 dark:text-sky-300 font-medium">Assigned</div>
              <div className="mt-1 text-2xl font-bold font-display text-sky-950 dark:text-sky-100 tabular-nums">
                {metrics.assigned}
              </div>
            </Card>

            {/* 5. Pending Verification */}
            <Card
              role="button"
              tabIndex={0}
              onClick={() => setStatusFilter("Pending Verification")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setStatusFilter("Pending Verification");
              }}
              className={`p-4 cursor-pointer transition-all border-violet-300/80 bg-violet-50/50 hover:bg-violet-50/80 dark:bg-violet-950/20 dark:border-violet-900/50 ${
                statusFilter === "Pending Verification" ? "ring-2 ring-violet-500/70 shadow-xs" : ""
              }`}
            >
              <div className="text-xs text-violet-800 dark:text-violet-300 font-medium">
                Pending Verification
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-violet-950 dark:text-violet-100 tabular-nums">
                {metrics.pendingVerification}
              </div>
            </Card>

            {/* 6. Report Rejected */}
            <Card
              role="button"
              tabIndex={0}
              onClick={() => setStatusFilter("Report Rejected")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setStatusFilter("Report Rejected");
              }}
              className={`p-4 cursor-pointer transition-all border-rose-300/80 bg-rose-50/50 hover:bg-rose-50/80 dark:bg-rose-950/20 dark:border-rose-900/50 ${
                statusFilter === "Report Rejected" ? "ring-2 ring-rose-500/70 shadow-xs" : ""
              }`}
            >
              <div className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                Report Rejected
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-rose-950 dark:text-rose-100 tabular-nums">
                {metrics.reportRejected}
              </div>
            </Card>

            {/* 7. Completed */}
            <Card
              role="button"
              tabIndex={0}
              onClick={() => setStatusFilter("Completed")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setStatusFilter("Completed");
              }}
              className={`p-4 cursor-pointer transition-all border-emerald-300/80 bg-emerald-50/50 hover:bg-emerald-50/80 dark:bg-emerald-950/20 dark:border-emerald-900/50 ${
                statusFilter === "Completed" ? "ring-2 ring-emerald-500/70 shadow-xs" : ""
              }`}
            >
              <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                Completed
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-emerald-950 dark:text-emerald-100 tabular-nums">
                {metrics.completed}
              </div>
            </Card>
          </div>

          {/* Left-Aligned Filter Toolbar with Reset Button */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={marketFilter} onValueChange={setMarketFilter}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                {markets.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="h-9 w-[185px]">
                <SelectValue placeholder="Assigned Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="unassigned">Unassigned Only</SelectItem>
                {assignedAgentOptions.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <FilterReset
              active={hasActiveFilters}
              onReset={() => {
                setMarketFilter("all");
                setStatusFilter("all");
                setPriorityFilter("all");
                setAgentFilter("all");
              }}
            />
          </div>

          {/* Clickable Queue DataTable */}
          <DataTable
            rows={filteredRequests}
            columns={columns}
            rowKey={(r) => r.id}
            searchPlaceholder="Search by Store, Market, Reason, Requester, or Agent..."
            onRowClick={(r) => setSelectedDetailId(r.id)}
          />
        </>
      )}

      {/* VALIDATE & ASSIGN / REASSIGN SURVEILLANCE REQUEST MODAL */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isReassignModal
                ? "Reassign Surveillance Request"
                : "Validate & Assign Surveillance Request"}
            </DialogTitle>
            <DialogDescription>
              {isReassignModal
                ? "Select a new user or agent to replace the currently assigned agent for this surveillance request."
                : "Review the requested surveillance parameters and assign this request to an agent for audit preparation."}
            </DialogDescription>
          </DialogHeader>

          {targetAssignItem && (
            <div className="space-y-3.5 pt-1 text-xs">
              {/* 1. Requested Surveillance Date (Non-editable) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Requested Surveillance Date</Label>
                <Input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={formatDisplayDate(targetAssignItem.surveillanceDate)}
                  className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0 tabular-nums"
                />
              </div>

              {/* 2. Market (Non-editable) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Market</Label>
                <Input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={targetAssignItem.marketName}
                  className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                />
              </div>

              {/* 3. Store Name (Non-editable) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Store Name</Label>
                <Input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={targetAssignItem.storeName}
                  className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                />
              </div>

              {/* Currently Assigned Agent (shown when reassigning) */}
              {isReassignModal && targetAssignItem.assignedAgentName && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Currently Assigned To</Label>
                  <Input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={
                      targetAssignItem.assignedAgentEmail
                        ? `${targetAssignItem.assignedAgentName} (${targetAssignItem.assignedAgentEmail})`
                        : targetAssignItem.assignedAgentName
                    }
                    className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                  />
                </div>
              )}

              {/* 4. Assign to User / Agent * (Required searchable dropdown showing ONLY Name and Email) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {isReassignModal ? "Reassign to New User / Agent" : "Assign to User / Agent"}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Popover open={agentPickerOpen} onOpenChange={setAgentPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-xs text-foreground hover:bg-accent"
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span
                        className={`flex-1 text-left truncate ${
                          selectedAgent ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {selectedAgent
                          ? selectedAgent.fullName
                          : isReassignModal
                            ? "Select or search new user / agent..."
                            : "Select or search user / agent..."}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-(--radix-popover-trigger-width) min-w-(--radix-popover-trigger-width) p-0"
                    align="start"
                  >
                    <Command className="w-full" shouldFilter={false}>
                      <CommandInput
                        placeholder="Type 2+ characters to search by name or email..."
                        value={agentSearchQuery}
                        onValueChange={setAgentSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {agentSearchLoading
                            ? "Searching..."
                            : agentSearchQuery.trim().length < 2
                              ? "Type at least 2 characters to search."
                              : "No matching users found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {agentSearchResults.map((agent) => {
                            const isSelected = agent.id === selectedAgentId;
                            const isCurrentAgent =
                              isReassignModal && agent.id === targetAssignItem.assignedAgentId;
                            return (
                              <CommandItem
                                key={agent.id}
                                value={`${agent.fullName} ${agent.email}`}
                                disabled={isCurrentAgent}
                                onSelect={() => {
                                  if (isCurrentAgent) return;
                                  setSelectedAgentId(agent.id);
                                  setAgentPickerOpen(false);
                                }}
                                className="flex items-center justify-between gap-2 py-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-xs text-foreground truncate">
                                    {agent.fullName}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate">
                                    {agent.email}
                                  </div>
                                </div>
                                {isCurrentAgent ? (
                                  <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                                    Currently Assigned
                                  </span>
                                ) : (
                                  isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 5. Priority (Non-editable) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={formatPriorityLabel(targetAssignItem.priority)}
                  className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                />
              </div>

              {/* 6. Investigation Reason / Incident Summary (Non-editable) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Investigation Reason / Incident Summary
                </Label>
                <Input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={targetAssignItem.title}
                  className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                />
              </div>

              {/* 7. Additional Context / Special Instructions (Non-editable long textarea) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Additional Context / Special Instructions
                </Label>
                <Textarea
                  readOnly
                  tabIndex={-1}
                  value={
                    targetAssignItem.notes ||
                    "No additional context or special instructions provided."
                  }
                  rows={3}
                  className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0 resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setAssignModalOpen(false)}
              disabled={submittingAssign}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAssign} disabled={submittingAssign || !selectedAgentId}>
              {submittingAssign
                ? isReassignModal
                  ? "Reassigning..."
                  : "Assigning..."
                : isReassignModal
                  ? "Reassign"
                  : "Validate & Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT SURVEILLANCE REQUEST MODAL */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Surveillance Request</DialogTitle>
            <DialogDescription>
              Provide a clear reason for rejecting this incoming surveillance request. The requester
              will see this status and reason under Rejected requests.
            </DialogDescription>
          </DialogHeader>

          {targetRejectItem && (
            <div className="space-y-3.5 pt-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Store Name</Label>
                  <Input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={targetRejectItem.storeName}
                    className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Surveillance Date</Label>
                  <Input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={formatDisplayDate(targetRejectItem.surveillanceDate)}
                    className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0 tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Investigation Reason / Incident Summary
                </Label>
                <Input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={targetRejectItem.title}
                  className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Rejection Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter the reason for rejecting this surveillance request..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              disabled={submittingReject}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={submittingReject || !rejectReason.trim()}
            >
              {submittingReject ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
