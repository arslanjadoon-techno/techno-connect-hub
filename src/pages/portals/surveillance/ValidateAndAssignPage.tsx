import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Store as StoreIcon,
  User as UserIcon,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStaticValidationQueue,
  getStaticAssignableAgents,
  validateAndAssignStaticRequest,
  rejectStaticValidationRequest,
} from "./surveillance-data";
import {
  canValidateSurveillance,
  getSurveillanceDefaultRoute,
  getSurveillanceRole,
  type SurveillanceAssignableAgent,
  type SurveillancePriority,
  type SurveillanceValidationItem,
  type SurveillanceValidationStatus,
} from "@/services/portals/surveillance/types";

const PRIORITY_TONES: Record<SurveillancePriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  high: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
};

const VALIDATION_STATUS_CONFIG: Record<
  SurveillanceValidationStatus,
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
  "Pending Verification": {
    label: "Pending Verification",
    tone: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400",
    dotClass: "bg-violet-500",
    textClass: "text-violet-800 dark:text-violet-300",
  },
  Rejected: {
    label: "Rejected",
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

export default function ValidateAndAssignPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = useMemo(() => getSurveillanceRole(user), [user]);
  const canAccessValidatePage = useMemo(() => canValidateSurveillance(userRole), [userRole]);

  const [requests, setRequests] = useState<SurveillanceValidationItem[]>([]);
  const [agents, setAgents] = useState<SurveillanceAssignableAgent[]>([]);

  // Drill-down detail state
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  // Filters (default status = "Unassigned")
  const [statusFilter, setStatusFilter] = useState<string>("Unassigned");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  // Validate & Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetAssignItem, setTargetAssignItem] = useState<SurveillanceValidationItem | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Reject / Cancel modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRejectItem, setTargetRejectItem] = useState<SurveillanceValidationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [submittingReject, setSubmittingReject] = useState(false);

  useEffect(() => {
    setRequests(getStaticValidationQueue());
    setAgents(getStaticAssignableAgents());
  }, []);

  const markets = useMemo(
    () => Array.from(new Set(requests.map((r) => r.marketName).filter(Boolean))).sort(),
    [requests],
  );

  const metrics = useMemo(() => {
    return {
      total: requests.length,
      unassigned: requests.filter((r) => r.validationStatus === "Unassigned").length,
      assigned: requests.filter((r) => r.validationStatus === "Assigned").length,
      pendingVerification: requests.filter((r) => r.validationStatus === "Pending Verification")
        .length,
      rejected: requests.filter((r) => r.validationStatus === "Rejected").length,
      completed: requests.filter((r) => r.validationStatus === "Completed").length,
    };
  }, [requests]);

  const agentMetrics = useMemo(() => {
    const availableAgents = agents.filter((a) => a.activeAssignments === 0);
    const assignedAgents = agents.filter((a) => a.activeAssignments > 0);
    return {
      total: agents.length,
      available: availableAgents.length,
      assigned: assignedAgents.length,
      availableAgents,
      assignedAgents,
    };
  }, [agents]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.validationStatus !== statusFilter) {
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
    () => agents.find((a) => a.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  );

  const selectedDetail = useMemo(
    () => (selectedDetailId ? requests.find((r) => r.id === selectedDetailId) || null : null),
    [requests, selectedDetailId],
  );

  const selectedDetailAssignedAgent = useMemo(() => {
    if (!selectedDetail?.assignedAgentId) return null;
    return agents.find((a) => a.id === selectedDetail.assignedAgentId) || null;
  }, [agents, selectedDetail]);

  const openAssignModal = useCallback((item: SurveillanceValidationItem) => {
    if (item.validationStatus !== "Unassigned") return;
    setTargetAssignItem(item);
    setSelectedAgentId("");
    setAssignModalOpen(true);
  }, []);

  const openRejectModal = useCallback((item: SurveillanceValidationItem) => {
    if (item.validationStatus !== "Unassigned") return;
    setTargetRejectItem(item);
    setRejectionReason("");
    setRejectModalOpen(true);
  }, []);

  const handleConfirmAssign = () => {
    if (!targetAssignItem) return;
    if (!selectedAgentId) {
      toast.error("Please select a user or agent to assign this request.");
      return;
    }

    setSubmittingAssign(true);
    try {
      const adminName = user?.fullName || "System Admin";
      const updated = validateAndAssignStaticRequest({
        requestId: targetAssignItem.id,
        agentId: selectedAgentId,
        priority: targetAssignItem.priority,
        assignedBy: adminName,
      });

      setRequests(getStaticValidationQueue());
      setAgents(getStaticAssignableAgents());
      setAssignModalOpen(false);
      toast.success(`Request validated and assigned to ${updated.assignedAgentName}.`);
    } catch (error) {
      toast.error(`Assignment failed: ${(error as Error).message}`);
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleConfirmReject = () => {
    if (!targetRejectItem) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejecting or cancelling this request.");
      return;
    }

    setSubmittingReject(true);
    try {
      const adminName = user?.fullName || "System Admin";
      rejectStaticValidationRequest({
        requestId: targetRejectItem.id,
        reason: rejectionReason.trim(),
        rejectedBy: adminName,
      });

      setRequests(getStaticValidationQueue());
      setAgents(getStaticAssignableAgents());
      setRejectModalOpen(false);
      toast.success("Surveillance request rejected and hidden from surveillance agents.");
    } catch (error) {
      toast.error(`Action failed: ${(error as Error).message}`);
    } finally {
      setSubmittingReject(false);
    }
  };

  const hasActiveFilters =
    marketFilter !== "all" ||
    statusFilter !== "Unassigned" ||
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
        searchValue: (r) => VALIDATION_STATUS_CONFIG[r.validationStatus].label,
        accessor: (r) => {
          const cfg = VALIDATION_STATUS_CONFIG[r.validationStatus];
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

  return (
    <div className="space-y-6 animate-fade-in">
      {selectedDetail ? (
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
              {selectedDetail.validationStatus === "Unassigned" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => openRejectModal(selectedDetail)}
                    className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-background border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 whitespace-nowrap shrink-0"
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

              {Boolean(selectedDetail.linkedReportId) && (
                <Button
                  onClick={() => navigate(`/surveillance/reports/${selectedDetail.linkedReportId}`)}
                  className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs whitespace-nowrap shrink-0"
                >
                  <Eye className="h-4 w-4" />
                  {selectedDetail.validationStatus === "Pending Verification"
                    ? "Review Report"
                    : "View Report"}
                </Button>
              )}
            </div>
          </div>

          {/* Store Header + 6 Distinctly Colored Summary Cards */}
          <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50 shrink-0">
                <StoreIcon className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground tracking-tight">
                {selectedDetail.storeName}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                      VALIDATION_STATUS_CONFIG[selectedDetail.validationStatus].dotClass
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-amber-800/80 dark:text-amber-300/80">
                    Current status
                  </div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      VALIDATION_STATUS_CONFIG[selectedDetail.validationStatus].textClass
                    }`}
                  >
                    {VALIDATION_STATUS_CONFIG[selectedDetail.validationStatus].label}
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

          {/* Rejection / Cancellation Reason Banner (when Rejected) */}
          {selectedDetail.validationStatus === "Rejected" && (
            <Card className="p-5 rounded-2xl border-rose-200/90 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/60 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-semibold text-sm">
                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>
                  {selectedDetail.linkedReportId
                    ? "Report Rejection Reason"
                    : "Rejection / Cancellation Reason"}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-rose-200/80 bg-background text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                {selectedDetail.rejectionReason ||
                  selectedDetail.managerComments ||
                  "Request rejected during review."}
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
                        {selectedDetail.assignedAgentRole ||
                          selectedDetailAssignedAgent?.role ||
                          "Surveillance Agent"}
                      </span>
                    ) : selectedDetail.validationStatus === "Rejected" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                        Rejected during validation
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
                          ? selectedDetail.assignedAgentPhone ||
                            selectedDetailAssignedAgent?.phone ||
                            "—"
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
                        {selectedDetail.assignedAgentName
                          ? selectedDetailAssignedAgent?.department ||
                            "Surveillance & Loss Prevention"
                          : "—"}
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
              {selectedDetail.validationStatus === "Completed" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-100/60 p-3.5 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Approved and completed by{" "}
                    <strong>{selectedDetail.reportReviewedBy || "Validator"}</strong>. Report is now
                    visible to the admin and requester.
                  </span>
                </div>
              ) : selectedDetail.validationStatus === "Pending Verification" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50/90 p-3.5 text-xs text-violet-900 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200">
                  <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                  <span>
                    Pending verification — surveillance report received from{" "}
                    <strong>{selectedDetail.assignedAgentName || "Assigned Agent"}</strong>. Click{" "}
                    <strong>Review Report</strong> above to rate and complete or reject.
                  </span>
                </div>
              ) : selectedDetail.validationStatus === "Assigned" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/90 p-3.5 text-xs text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200">
                  <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    Validated by <strong>{selectedDetail.assignedBy || "Validator"}</strong>.
                    Visible to assigned agent for audit report preparation.
                  </span>
                </div>
              ) : selectedDetail.validationStatus === "Rejected" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-100/60 p-3.5 text-xs text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200">
                  <EyeOff className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    Rejected by{" "}
                    <strong>
                      {selectedDetail.rejectedBy || selectedDetail.reportReviewedBy || "Validator"}
                    </strong>
                    .{" "}
                    {selectedDetail.linkedReportId
                      ? "Submitted report was declined during review."
                      : "Hidden from all surveillance users and agents."}
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
          <div className="border-b pb-4">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Validate and Assign
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review incoming surveillance requests, assign valid requests to agents for report
              preparation, and review returned reports to complete or reject them. Click any row to
              view details.
            </p>
          </div>

          {/* 6 KPI Summary Cards (Clickable to filter by status) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

            {/* 3. Assigned */}
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

            {/* 4. Pending Verification */}
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

            {/* 5. Rejected */}
            <Card
              role="button"
              tabIndex={0}
              onClick={() => setStatusFilter("Rejected")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setStatusFilter("Rejected");
              }}
              className={`p-4 cursor-pointer transition-all border-rose-300/80 bg-rose-50/50 hover:bg-rose-50/80 dark:bg-rose-950/20 dark:border-rose-900/50 ${
                statusFilter === "Rejected" ? "ring-2 ring-rose-500/70 shadow-xs" : ""
              }`}
            >
              <div className="text-xs text-rose-800 dark:text-rose-300 font-medium">Rejected</div>
              <div className="mt-1 text-2xl font-bold font-display text-rose-950 dark:text-rose-100 tabular-nums">
                {metrics.rejected}
              </div>
            </Card>

            {/* 6. Completed */}
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

          {/* Agent Workforce & Availability Overview */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Total Agents Card */}
            <Card className="p-4 border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Total Agents
                  </div>
                  <div className="mt-1 text-2xl font-bold font-display text-slate-950 dark:text-slate-100 tabular-nums">
                    {agentMetrics.total}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{agentMetrics.available} available</span>
                    <span aria-hidden="true">·</span>
                    <span>{agentMetrics.assigned} with active reports assigned</span>
                  </div>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-3 text-xs font-medium bg-background shrink-0"
                    >
                      <Users className="h-3.5 w-3.5" />
                      View Agents
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="end">
                    <div className="space-y-2.5">
                      <div className="border-b pb-2">
                        <div className="text-xs font-semibold text-foreground">
                          Surveillance Agent Availability
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {agentMetrics.available} of {agentMetrics.total} agents have no active
                          reports assigned
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-border/60">
                        {agents.map((agent) => {
                          const isAvailable = agent.activeAssignments === 0;
                          return (
                            <div
                              key={agent.id}
                              className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-foreground truncate">
                                  {agent.fullName}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {agent.email}
                                </div>
                              </div>
                              <span
                                className={`text-[11px] font-semibold whitespace-nowrap tabular-nums shrink-0 ${
                                  isAvailable
                                    ? "text-teal-700 dark:text-teal-400"
                                    : "text-sky-700 dark:text-sky-400"
                                }`}
                              >
                                {isAvailable
                                  ? "Available"
                                  : `${agent.activeAssignments} ${
                                      agent.activeAssignments === 1 ? "report" : "reports"
                                    } assigned`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </Card>

            {/* Available Agents Card */}
            <Card className="p-4 border-teal-200/90 bg-teal-50/50 dark:border-teal-900/50 dark:bg-teal-950/20">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-xs font-medium text-teal-800 dark:text-teal-300">
                  Available Agents
                </div>
                <span className="text-[11px] text-teal-700/80 dark:text-teal-300/80">
                  No reports currently assigned — ready for assignment
                </span>
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-teal-950 dark:text-teal-100 tabular-nums">
                {agentMetrics.available}
              </div>
              <div className="mt-1 text-xs text-teal-900/80 dark:text-teal-200/80 leading-relaxed">
                {agentMetrics.availableAgents.length > 0
                  ? agentMetrics.availableAgents.map((a) => a.fullName).join(" · ")
                  : "All surveillance agents currently have active reports assigned."}
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[195px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Unassigned">Unassigned</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Pending Verification">Pending Verification</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
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
                {agents.map((agent) => (
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
                setStatusFilter("Unassigned");
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

      {/* VALIDATE & ASSIGN SURVEILLANCE REQUEST MODAL */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Validate & Assign Surveillance Request</DialogTitle>
            <DialogDescription>
              Review the requested surveillance parameters and assign this request to an agent for
              audit preparation.
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

              {/* 4. Assign to User / Agent * (Required searchable dropdown showing ONLY Name and Email) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Assign to User / Agent <span className="text-destructive">*</span>
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
                          : "Select or search user / agent..."}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search by name or email..." />
                      <CommandList>
                        <CommandEmpty>No matching users found.</CommandEmpty>
                        <CommandGroup>
                          {agents.map((agent) => {
                            const isSelected = agent.id === selectedAgentId;
                            return (
                              <CommandItem
                                key={agent.id}
                                value={`${agent.fullName} ${agent.email}`}
                                onSelect={() => {
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
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
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
              {submittingAssign ? "Assigning..." : "Validate & Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT / CANCEL SURVEILLANCE REQUEST MODAL */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject / Cancel Surveillance Request</DialogTitle>
            <DialogDescription>
              Cancelling an invalid request prevents it from becoming visible to any surveillance
              user or agent.
            </DialogDescription>
          </DialogHeader>

          {targetRejectItem && (
            <div className="space-y-3.5 pt-1 text-xs">
              {/* 1. Requested Surveillance Date (Non-editable) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Requested Surveillance Date</Label>
                <Input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={formatDisplayDate(targetRejectItem.surveillanceDate)}
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
                  value={targetRejectItem.marketName}
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
                  value={targetRejectItem.storeName}
                  className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                />
              </div>

              {/* 4. Priority (Non-editable) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={formatPriorityLabel(targetRejectItem.priority)}
                  className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                />
              </div>

              {/* 5. Investigation Reason / Incident Summary (Non-editable) */}
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

              {/* 6. Additional Context / Special Instructions (Non-editable long textarea) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Additional Context / Special Instructions
                </Label>
                <Textarea
                  readOnly
                  tabIndex={-1}
                  value={
                    targetRejectItem.notes ||
                    "No additional context or special instructions provided."
                  }
                  rows={3}
                  className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0 resize-none"
                />
              </div>

              {/* 7. Rejection / Cancellation Reason * (Editable long textarea) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Rejection / Cancellation Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter the reason for rejecting or cancelling this surveillance request..."
                  rows={3}
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
            <Button variant="destructive" onClick={handleConfirmReject} disabled={submittingReject}>
              {submittingReject ? "Cancelling..." : "Reject & Cancel Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
