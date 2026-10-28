import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
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
  ArrowLeft,
  Building,
  Check,
  ChevronsUpDown,
  EyeOff,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Store as StoreIcon,
  User as UserIcon,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { surveillanceService } from "@/services/portals/surveillance";
import {
  canRequestSurveillance,
  getSurveillanceRole,
  isSurveillanceAdmin,
  isSurveillanceUserRole,
  type SurveillanceAssignableAgent,
  type SurveillancePriority,
  type SurveillanceValidationItem,
  type SurveillanceValidationStatus,
} from "@/services/portals/surveillance/types";

const PRIORITY_TONES: Record<SurveillancePriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  high: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
};

const VALIDATION_STATUS_CONFIG: Record<
  SurveillanceValidationStatus,
  { label: string; tone: string }
> = {
  "Pending Validation": {
    label: "Pending Validation",
    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  },
  Assigned: {
    label: "Assigned",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  Rejected: {
    label: "Rejected",
    tone: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
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

export default function ValidateAndAssignPage() {
  const { user } = useAuth();
  const isAdmin = useMemo(() => isSurveillanceAdmin(user), [user]);
  const fallbackRole = useMemo(() => getSurveillanceRole(user), [user]);

  const [requests, setRequests] = useState<SurveillanceValidationItem[]>([]);
  const [agents, setAgents] = useState<SurveillanceAssignableAgent[]>([]);
  const [loading, setLoading] = useState(true);

  // Drill-down detail state
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  // Validate & Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetAssignItem, setTargetAssignItem] =
    useState<SurveillanceValidationItem | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Reject / Cancel modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRejectItem, setTargetRejectItem] =
    useState<SurveillanceValidationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const loadQueueData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueData, agentsData] = await Promise.all([
        surveillanceService.getValidationQueue(),
        surveillanceService.getAssignableAgents(),
      ]);
      setRequests(queueData);
      setAgents(agentsData);
    } catch (error) {
      console.error("Failed to load validation queue:", error);
      toast.error("Failed to load surveillance validation queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueueData();
  }, [loadQueueData]);

  const markets = useMemo(
    () =>
      Array.from(
        new Set(requests.map((r) => r.marketName).filter(Boolean)),
      ).sort(),
    [requests],
  );

  const metrics = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(
        (r) => r.validationStatus === "Pending Validation",
      ).length,
      assigned: requests.filter((r) => r.validationStatus === "Assigned").length,
      rejected: requests.filter((r) => r.validationStatus === "Rejected").length,
    };
  }, [requests]);

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
    () =>
      selectedDetailId
        ? requests.find((r) => r.id === selectedDetailId) || null
        : null,
    [requests, selectedDetailId],
  );

  const openAssignModal = useCallback((item: SurveillanceValidationItem) => {
    setTargetAssignItem(item);
    setSelectedAgentId(item.assignedAgentId || "");
    setAssignModalOpen(true);
  }, []);

  const openRejectModal = useCallback((item: SurveillanceValidationItem) => {
    setTargetRejectItem(item);
    setRejectionReason(item.rejectionReason || "");
    setRejectModalOpen(true);
  }, []);

  const handleConfirmAssign = async () => {
    if (!targetAssignItem) return;
    if (!selectedAgentId) {
      toast.error("Please select a user or agent to assign this request.");
      return;
    }

    setSubmittingAssign(true);
    try {
      const adminName = user?.fullName || "System Admin";
      const updated = await surveillanceService.validateAndAssignRequest({
        requestId: targetAssignItem.id,
        agentId: selectedAgentId,
        priority: targetAssignItem.priority,
        assignedBy: adminName,
      });

      const refreshedAgents = await surveillanceService.getAssignableAgents();
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setAgents(refreshedAgents);
      setAssignModalOpen(false);
      toast.success(
        `Request validated and assigned to ${updated.assignedAgentName}.`,
      );
    } catch (error) {
      toast.error(`Assignment failed: ${(error as Error).message}`);
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!targetRejectItem) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejecting or cancelling this request.");
      return;
    }

    setSubmittingReject(true);
    try {
      const adminName = user?.fullName || "System Admin";
      const updated = await surveillanceService.rejectValidationRequest({
        requestId: targetRejectItem.id,
        reason: rejectionReason.trim(),
        rejectedBy: adminName,
      });

      const refreshedAgents = await surveillanceService.getAssignableAgents();
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setAgents(refreshedAgents);
      setRejectModalOpen(false);
      toast.success(
        "Surveillance request rejected and hidden from surveillance agents.",
      );
    } catch (error) {
      toast.error(`Action failed: ${(error as Error).message}`);
    } finally {
      setSubmittingReject(false);
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
        searchValue: (r) =>
          `${r.surveillanceDate} ${formatDisplayDate(r.surveillanceDate)}`,
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
        accessor: (r) => (
          <span className="font-medium text-sm text-foreground">
            {r.storeName}
          </span>
        ),
      },
      {
        key: "market",
        header: "Market",
        searchValue: (r) => r.marketName,
        accessor: (r) => (
          <span className="text-sm text-foreground whitespace-nowrap">
            {r.marketName}
          </span>
        ),
      },
      {
        key: "reason",
        header: "Investigation Reason",
        searchValue: (r) => `${r.title} ${r.notes || ""}`,
        accessor: (r) => (
          <span className="text-sm text-foreground line-clamp-1 max-w-[280px]">
            {r.title}
          </span>
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
          <span className="text-sm text-foreground whitespace-nowrap">
            {r.requestedBy}
          </span>
        ),
      },
      {
        key: "assignedAgent",
        header: "Assigned To",
        searchValue: (r) =>
          r.assignedAgentName ||
          (r.validationStatus === "Rejected" ? "Hidden" : "Unassigned"),
        accessor: (r) => {
          if (r.validationStatus === "Assigned" && r.assignedAgentName) {
            return (
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {r.assignedAgentName}
              </span>
            );
          }
          if (r.validationStatus === "Rejected") {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                <EyeOff className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                Hidden from Agents
              </span>
            );
          }
          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              -
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        searchValue: (r) => r.validationStatus,
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

  // Strict Admin-only safeguard
  if (!isAdmin) {
    return (
      <Navigate
        to={
          isSurveillanceUserRole(user)
            ? "/surveillance/reports"
            : canRequestSurveillance(fallbackRole)
              ? "/surveillance/requests"
              : "/ai-chat"
        }
        replace
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {selectedDetail ? (
        /* DRILL-DOWN REQUEST VALIDATION & ASSIGNMENT VIEW */
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDetailId(null)}
                className="h-8 gap-1.5 px-2.5 text-xs font-medium whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Validate and Assign
              </Button>
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Request Details
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedDetail.validationStatus === "Pending Validation" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => openRejectModal(selectedDetail)}
                    className="h-9 gap-1.5 text-xs font-medium border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 whitespace-nowrap shrink-0"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Request
                  </Button>
                  <Button
                    onClick={() => openAssignModal(selectedDetail)}
                    className="h-9 gap-1.5 text-xs font-medium whitespace-nowrap shrink-0"
                  >
                    <UserPlus className="h-4 w-4" />
                    Validate & Assign
                  </Button>
                </>
              )}

              {selectedDetail.validationStatus === "Assigned" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => openRejectModal(selectedDetail)}
                    className="h-9 gap-1.5 text-xs font-medium border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 whitespace-nowrap shrink-0"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Assignment
                  </Button>
                  <Button
                    onClick={() => openAssignModal(selectedDetail)}
                    className="h-9 gap-1.5 text-xs font-medium whitespace-nowrap shrink-0"
                  >
                    <UserCheck className="h-4 w-4" />
                    Reassign Agent
                  </Button>
                </>
              )}

              {selectedDetail.validationStatus === "Rejected" && (
                <Button
                  onClick={() => openAssignModal(selectedDetail)}
                  className="h-9 gap-1.5 text-xs font-medium whitespace-nowrap shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  Revalidate & Assign Agent
                </Button>
              )}
            </div>
          </div>

          {/* Overview Banner */}
          <Card className="p-4 bg-muted/20 border-border/80">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-base text-foreground">
                    <StoreIcon className="h-4 w-4 text-primary shrink-0" />
                    {selectedDetail.storeName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedDetail.marketName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedDetail.districtName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums font-medium text-foreground">
                    Surveillance Date:{" "}
                    {formatDisplayDate(selectedDetail.surveillanceDate)}
                  </span>
                </div>
                <h2 className="mt-1.5 text-sm font-medium text-foreground">
                  {selectedDetail.title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Badge
                  variant="outline"
                  className={`capitalize text-xs font-semibold px-2.5 py-1 whitespace-nowrap ${PRIORITY_TONES[selectedDetail.priority]}`}
                >
                  Priority: {selectedDetail.priority}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2.5 py-1 whitespace-nowrap ${VALIDATION_STATUS_CONFIG[selectedDetail.validationStatus].tone}`}
                >
                  {
                    VALIDATION_STATUS_CONFIG[selectedDetail.validationStatus]
                      .label
                  }
                </Badge>
              </div>
            </div>
          </Card>

          {/* 2-Column Section: Requester Info & Validation/Assignment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* Requested By Card */}
            <Card className="p-4 border-blue-200/80 bg-blue-50/40 dark:bg-blue-950/25 dark:border-blue-900/50 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                  <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Requested By</span>
                </div>
                <span className="text-xs font-medium text-blue-800 dark:text-blue-300">
                  {selectedDetail.requesterRole}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">
                    Full Name:
                  </span>
                  <span className="col-span-2 font-semibold text-foreground">
                    {selectedDetail.requestedBy}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">
                    Email:
                  </span>
                  <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono break-all">
                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                    {selectedDetail.requesterEmail}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">
                    Phone:
                  </span>
                  <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono tabular-nums">
                    <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                    {selectedDetail.requesterPhone}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">
                    Department:
                  </span>
                  <span className="col-span-2 text-foreground flex items-center gap-1.5">
                    <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                    {selectedDetail.requesterDepartment}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">
                    Submitted At:
                  </span>
                  <span className="col-span-2 text-muted-foreground tabular-nums">
                    {new Date(selectedDetail.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Assignment & Visibility Status Card */}
            <Card className="p-4 border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/50 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Agent Assignment & Visibility</span>
                </div>
              </div>

              {selectedDetail.validationStatus === "Assigned" &&
              selectedDetail.assignedAgentName ? (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground font-medium">
                      Assigned Agent:
                    </span>
                    <span className="col-span-2 font-semibold text-foreground">
                      {selectedDetail.assignedAgentName}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground font-medium">
                      Role:
                    </span>
                    <span className="col-span-2 text-foreground">
                      {selectedDetail.assignedAgentRole || "Surveillance Agent"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground font-medium">
                      Email:
                    </span>
                    <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono break-all">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      {selectedDetail.assignedAgentEmail}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground font-medium">
                      Validated By:
                    </span>
                    <span className="col-span-2 text-foreground font-medium">
                      {selectedDetail.assignedBy || "Admin"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground font-medium">
                      Assigned At:
                    </span>
                    <span className="col-span-2 text-muted-foreground tabular-nums">
                      {selectedDetail.assignedAt
                        ? new Date(selectedDetail.assignedAt).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </div>
              ) : selectedDetail.validationStatus === "Rejected" ? (
                <div className="py-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold">
                    <EyeOff className="h-4 w-4 shrink-0" />
                    <span>Hidden from Surveillance Agents</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    This request was rejected/cancelled during admin validation
                    and is not visible to any surveillance user or auditor.
                  </p>
                  {selectedDetail.rejectedBy && (
                    <p className="text-muted-foreground pt-1 tabular-nums">
                      Cancelled by{" "}
                      <strong className="text-foreground">
                        {selectedDetail.rejectedBy}
                      </strong>
                      {selectedDetail.rejectedAt
                        ? ` on ${new Date(selectedDetail.rejectedAt).toLocaleString()}`
                        : ""}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">
                    Awaiting Admin Validation
                  </p>
                  <p className="max-w-sm mx-auto leading-relaxed">
                    This request is currently held in the admin review queue and
                    is not visible to any agent until validated and assigned.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Admin Assignment Instructions (if Assigned and present) */}
          {selectedDetail.validationStatus === "Assigned" &&
            selectedDetail.adminInstructions && (
              <Card className="p-4 border-emerald-200/80 bg-card space-y-2">
                <div className="text-xs font-semibold text-foreground">
                  Admin Assignment Instructions for Agent
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedDetail.adminInstructions}
                </p>
              </Card>
            )}

          {/* Rejection / Cancellation Reason Card */}
          {selectedDetail.validationStatus === "Rejected" && (
            <Card className="p-4 border-rose-200/90 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/60 space-y-2.5">
              <div className="flex items-center justify-between border-b border-rose-200/80 dark:border-rose-900/40 pb-2">
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-semibold text-sm">
                  <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Rejection / Cancellation Reason</span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-rose-200/80 bg-background text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                {selectedDetail.rejectionReason ||
                  "Request cancelled during admin validation."}
              </div>
            </Card>
          )}

          {/* Investigation Parameters */}
          <Card className="p-4 border-border/80 space-y-3">
            <div className="border-b pb-2">
              <h3 className="text-sm font-semibold text-foreground">
                Request Details & Investigation Scope
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2">
                <span className="text-muted-foreground block font-medium">
                  Investigation Reason / Incident Summary:
                </span>
                <div className="font-semibold text-foreground mt-0.5 text-sm">
                  {selectedDetail.title}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block font-medium">
                  Surveillance Date:
                </span>
                <div className="font-semibold text-foreground mt-0.5 text-sm tabular-nums">
                  {formatDisplayDate(selectedDetail.surveillanceDate)}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <span className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Additional Context / Special Instructions from Requester
              </span>
              <div className="p-3 rounded-lg border bg-muted/20 text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                {selectedDetail.notes ||
                  "No additional context or special instructions were provided by the requester."}
              </div>
            </div>
          </Card>
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
              Review incoming surveillance requests, assign valid requests to
              agents for report preparation, or reject invalid requests so they
              remain hidden from agents. Click any row to review details.
            </p>
          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50">
              <div className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                Incoming Requests
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-blue-950 dark:text-blue-100 tabular-nums">
                {metrics.total}
              </div>
            </Card>

            <Card className="p-4 border-amber-300/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50">
              <div className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                Pending Validation
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-amber-950 dark:text-amber-100 tabular-nums">
                {metrics.pending}
              </div>
            </Card>

            <Card className="p-4 border-emerald-300/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50">
              <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                Validated & Assigned
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-emerald-950 dark:text-emerald-100 tabular-nums">
                {metrics.assigned}
              </div>
            </Card>

            <Card className="p-4 border-rose-300/80 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/50">
              <div className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                Rejected / Cancelled
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-rose-950 dark:text-rose-100 tabular-nums">
                {metrics.rejected}
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
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending Validation">
                  Pending Validation
                </SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
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
            loading={loading}
          />
        </>
      )}

      {/* VALIDATE & ASSIGN SURVEILLANCE REQUEST MODAL */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {targetAssignItem?.validationStatus === "Assigned"
                ? "Reassign Surveillance Agent"
                : "Validate & Assign Surveillance Request"}
            </DialogTitle>
            <DialogDescription>
              Review the requested surveillance parameters and assign this
              request to an agent for audit preparation.
            </DialogDescription>
          </DialogHeader>

          {targetAssignItem && (
            <div className="space-y-3.5 pt-1 text-xs">
              {/* 1. Requested Surveillance Date (Non-editable) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Requested Surveillance Date
                </Label>
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
                  Assign to User / Agent{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Popover
                  open={agentPickerOpen}
                  onOpenChange={setAgentPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-xs text-foreground hover:bg-accent"
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span
                        className={`flex-1 text-left truncate ${
                          selectedAgent
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {selectedAgent
                          ? selectedAgent.fullName
                          : "Select or search user / agent..."}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
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
            <Button
              onClick={handleConfirmAssign}
              disabled={submittingAssign || !selectedAgentId}
            >
              {submittingAssign
                ? "Assigning..."
                : targetAssignItem?.validationStatus === "Assigned"
                  ? "Save Assignment"
                  : "Validate & Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT / CANCEL SURVEILLANCE REQUEST MODAL */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject / Cancel Surveillance Request</DialogTitle>
            <DialogDescription>
              Cancelling an invalid request prevents it from becoming visible to
              any surveillance user or agent.
            </DialogDescription>
          </DialogHeader>

          {targetRejectItem && (
            <div className="space-y-3.5 pt-1 text-xs">
              {/* 1. Requested Surveillance Date (Non-editable) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Requested Surveillance Date
                </Label>
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
                  Rejection / Cancellation Reason{" "}
                  <span className="text-destructive">*</span>
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
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={submittingReject}
            >
              {submittingReject ? "Cancelling..." : "Reject & Cancel Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
