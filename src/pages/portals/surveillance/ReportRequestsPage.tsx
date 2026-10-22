import { useMemo, useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Video,
  Store as StoreIcon,
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  RotateCcw,
  Building2,
  Check,
  X,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  AVAILABLE_STORES,
  INITIAL_SURVEILLANCE_REQUESTS,
} from "./surveillance-data";
import {
  getSurveillanceRole,
  canApproveSurveillance,
  canRequestSurveillance,
  type SurveillanceRequest,
  type SurveillancePriority,
  type SurveillanceRole,
} from "@/services/portals/surveillance/types";

const PRIORITY_TONES: Record<SurveillancePriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  high: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  urgent: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
};

const STATUS_CONFIG: Record<
  SurveillanceRequest["status"],
  { label: string; tone: string }
> = {
  pending_approval: {
    label: "Pending Approval",
    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  in_progress: {
    label: "In Progress",
    tone: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400",
  },
  report_submitted: {
    label: "Report Submitted",
    tone: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400",
  },
  rejected: {
    label: "Rejected",
    tone: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
  },
};

const CAMERA_AREA_OPTIONS = [
  "POS 1 Register",
  "POS 2 Register",
  "Backroom / Cash Safe",
  "Customer Entrance / Exit",
  "Sales Floor & Displays",
  "Delivery Gate / Alleyway",
  "Inventory Stockroom",
];

const INVESTIGATION_TYPES = [
  "Cash Drawer Shortage",
  "Inventory Discrepancy / Shrinkage",
  "Customer Safety Incident",
  "Suspicious Activity / Loitering",
  "Employee Operational Audit",
  "Property Damage / Vandalism",
  "Other Special Review",
];

const SHIFT_OPTIONS = [
  "Morning Shift (08:00 - 16:00)",
  "Evening Shift (16:00 - 00:00)",
  "Closing Shift (20:00 - 23:00)",
  "Overnight (00:00 - 08:00)",
  "Full Day Review",
  "Custom Specific Time Range",
];

export default function ReportRequestsPage() {
  const { user } = useAuth();
  const detectedRole = useMemo(() => getSurveillanceRole(user), [user]);

  // Role simulation state (allows testing across Admin, State Manager, Market Manager, District Manager)
  const [activeRole, setActiveRole] = useState<SurveillanceRole>(() => {
    // Default to detected role, fallback to admin/market_manager if viewer
    return canRequestSurveillance(detectedRole) ? detectedRole : "admin";
  });

  const [requests, setRequests] = useState<SurveillanceRequest[]>(INITIAL_SURVEILLANCE_REQUESTS);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create Request Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(AVAILABLE_STORES[0].id);
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState(SHIFT_OPTIONS[0]);
  const [investigationType, setInvestigationType] = useState(INVESTIGATION_TYPES[0]);
  const [priority, setPriority] = useState<SurveillancePriority>("high");
  const [title, setTitle] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([
    "POS 1 Register",
    "Backroom / Cash Safe",
  ]);
  const [notes, setNotes] = useState("");

  // Details Modal
  const [detailTarget, setDetailTarget] = useState<SurveillanceRequest | null>(null);

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<SurveillanceRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<SurveillanceRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Permissions according to user specification:
  // "request approve sirf market manager ya state manager ya admin kr sakta hai, district manager k pas sirf view ka option hoga approve ka nahi."
  const userCanApprove = canApproveSurveillance(activeRole);

  // Handlers
  const handleOpenCreate = () => {
    setTitle("");
    setNotes("");
    setSelectedStoreId(AVAILABLE_STORES[0].id);
    setIncidentDate(new Date().toISOString().split("T")[0]);
    setShift(SHIFT_OPTIONS[0]);
    setInvestigationType(INVESTIGATION_TYPES[0]);
    setPriority("high");
    setSelectedAreas(["POS 1 Register", "Backroom / Cash Safe"]);
    setCreateModalOpen(true);
  };

  const handleToggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };

  const handleCreateRequest = () => {
    if (!title.trim()) {
      toast.error("Please enter a request title or incident summary.");
      return;
    }
    if (selectedAreas.length === 0) {
      toast.error("Please select at least one camera area to review.");
      return;
    }

    const store = AVAILABLE_STORES.find((s) => s.id === selectedStoreId) || AVAILABLE_STORES[0];
    const newId = `SRV-REQ-${Math.floor(106 + requests.length)}`;

    const requesterRoleLabel =
      activeRole === "admin"
        ? "Admin"
        : activeRole === "state_manager"
          ? "State Manager"
          : activeRole === "market_manager"
            ? "Market Manager"
            : "District Manager";

    const newRequest: SurveillanceRequest = {
      id: newId,
      storeId: store.id,
      storeName: store.name,
      storeNumber: store.number,
      marketName: store.market,
      districtName: store.district,
      incidentDate,
      shift,
      investigationType,
      priority,
      title: title.trim(),
      requestedBy: user?.fullName || "Current User",
      requestedById: user?.id || "u-1",
      requesterRole: requesterRoleLabel,
      requesterEmail: user?.email,
      areasToReview: selectedAreas,
      notes: notes.trim() || undefined,
      status: "pending_approval",
      createdAt: new Date().toISOString(),
    };

    setRequests((prev) => [newRequest, ...prev]);
    toast.success("Surveillance report request submitted successfully!");
    setCreateModalOpen(false);
  };

  const handleApprove = () => {
    if (!approveTarget) return;

    const updated: SurveillanceRequest = {
      ...approveTarget,
      status: "approved",
      approvedBy: user?.fullName || `${activeRole.replace(/_/g, " ")} Authority`,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRequests((prev) => prev.map((r) => (r.id === approveTarget.id ? updated : r)));
    if (detailTarget?.id === approveTarget.id) setDetailTarget(updated);

    toast.success(`Request ${approveTarget.id} approved successfully!`);
    setApproveTarget(null);
    setApprovalNotes("");
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      toast.error("Please specify a reason for rejecting the request.");
      return;
    }

    const updated: SurveillanceRequest = {
      ...rejectTarget,
      status: "rejected",
      rejectionReason: rejectionReason.trim(),
      updatedAt: new Date().toISOString(),
    };

    setRequests((prev) => prev.map((r) => (r.id === rejectTarget.id ? updated : r)));
    if (detailTarget?.id === rejectTarget.id) setDetailTarget(updated);

    toast.success(`Request ${rejectTarget.id} rejected.`);
    setRejectTarget(null);
    setRejectionReason("");
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      return true;
    });
  }, [requests, statusFilter, priorityFilter]);

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending_approval").length,
      approved: requests.filter((r) => r.status === "approved" || r.status === "in_progress").length,
      submitted: requests.filter((r) => r.status === "report_submitted").length,
    };
  }, [requests]);

  // Columns definition
  const columns: Column<SurveillanceRequest>[] = useMemo(
    () => [
      {
        key: "id",
        header: "Request ID",
        searchValue: (r) => r.id,
        accessor: (r) => (
          <span className="font-mono text-xs font-semibold text-primary">{r.id}</span>
        ),
      },
      {
        key: "store",
        header: "Store & Market",
        searchValue: (r) => `${r.storeName} ${r.marketName} ${r.districtName}`,
        accessor: (r) => (
          <div>
            <div className="font-medium text-foreground text-sm flex items-center gap-1.5">
              <StoreIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {r.storeName}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {r.marketName} • {r.districtName}
            </div>
          </div>
        ),
      },
      {
        key: "investigation",
        header: "Investigation Reason",
        searchValue: (r) => `${r.title} ${r.investigationType}`,
        accessor: (r) => (
          <div className="max-w-xs sm:max-w-sm">
            <span className="inline-block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {r.investigationType}
            </span>
            <div className="font-medium text-foreground text-xs line-clamp-1">{r.title}</div>
          </div>
        ),
      },
      {
        key: "schedule",
        header: "Date & Shift",
        searchValue: (r) => `${r.incidentDate} ${r.shift}`,
        accessor: (r) => (
          <div className="text-xs">
            <div className="font-medium text-foreground">{r.incidentDate}</div>
            <div className="text-muted-foreground line-clamp-1">{r.shift}</div>
          </div>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        searchValue: (r) => r.priority,
        accessor: (r) => (
          <Badge variant="outline" className={`capitalize text-xs font-medium ${PRIORITY_TONES[r.priority]}`}>
            {r.priority}
          </Badge>
        ),
      },
      {
        key: "requester",
        header: "Requested By",
        searchValue: (r) => `${r.requestedBy} ${r.requesterRole}`,
        accessor: (r) => (
          <div className="text-xs">
            <div className="font-medium text-foreground">{r.requestedBy}</div>
            <Badge variant="outline" className="text-[10px] mt-0.5 text-muted-foreground font-normal">
              {r.requesterRole}
            </Badge>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        searchValue: (r) => STATUS_CONFIG[r.status]?.label || r.status,
        accessor: (r) => {
          const cfg = STATUS_CONFIG[r.status] || {
            label: r.status,
            tone: "border-border text-foreground",
          };
          return (
            <Badge variant="outline" className={`text-xs font-semibold ${cfg.tone}`}>
              {cfg.label}
            </Badge>
          );
        },
      },
      {
        key: "actions",
        header: <span className="text-right block w-full pr-2">Actions</span>,
        accessor: (r) => {
          const isPending = r.status === "pending_approval";
          return (
            <div className="flex items-center justify-end gap-1.5 pr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailTarget(r);
                }}
                className="h-8 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                title="View request details"
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>

              {/* Approval Buttons: ONLY for Admin, State Manager, Market Manager!
                  District Manager has view option only per user instruction. */}
              {isPending && (
                <>
                  {userCanApprove ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setApproveTarget(r);
                        }}
                        className="h-8 px-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Approve request"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectTarget(r);
                        }}
                        className="h-8 px-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Reject request"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-dashed border-muted-foreground/30 text-muted-foreground text-[10px] gap-1 cursor-default py-0.5 px-1.5"
                      title="Only Market Managers, State Managers, and Admin can approve requests."
                    >
                      <Lock className="h-2.5 w-2.5" /> View Only
                    </Badge>
                  )}
                </>
              )}
            </div>
          );
        },
      },
    ],
    [userCanApprove],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Report Requests
            </h1>
            <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              Surveillance
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Request store surveillance video reviews, track approval lifecycle, and coordinate with auditing teams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Role switcher indicator for UI demonstration */}
          <div className="flex items-center gap-2 rounded-lg border bg-card/60 p-1 px-2 text-xs">
            <span className="text-muted-foreground font-medium">Active Role:</span>
            <Select
              value={activeRole}
              onValueChange={(v) => {
                setActiveRole(v as SurveillanceRole);
                toast.info(`Switched preview role to ${v.replace(/_/g, " ").toUpperCase()}`);
              }}
            >
              <SelectTrigger className="h-7 w-[155px] text-xs font-semibold border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="state_manager">State Manager</SelectItem>
                <SelectItem value="market_manager">Market Manager</SelectItem>
                <SelectItem value="district_manager">District Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleOpenCreate} className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            Request Surveillance
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 border-border/80">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Total Requests
          </div>
          <div className="mt-1 text-2xl font-bold font-display">{metrics.total}</div>
        </Card>
        <Card className="p-4 border-amber-300/80 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium uppercase tracking-wider">
            Pending Approval
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-950 dark:text-amber-100 font-display">
            {metrics.pending}
          </div>
        </Card>
        <Card className="p-4 border-emerald-300/80 bg-emerald-50/40 dark:bg-emerald-950/20">
          <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium uppercase tracking-wider">
            Approved & Active
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-950 dark:text-emerald-100 font-display">
            {metrics.approved}
          </div>
        </Card>
        <Card className="p-4 border-purple-300/80 bg-purple-50/40 dark:bg-purple-950/20">
          <div className="text-xs text-purple-800 dark:text-purple-300 font-medium uppercase tracking-wider">
            Report Submitted
          </div>
          <div className="mt-1 text-2xl font-bold text-purple-950 dark:text-purple-100 font-display">
            {metrics.submitted}
          </div>
        </Card>
      </div>

      {/* Toolbar filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="report_submitted">Report Submitted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || priorityFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPriorityFilter("all");
            }}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 border border-dashed"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        rows={filteredRequests}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search by Store, Request ID, Requester, or Reason..."
        onRowClick={(r) => setDetailTarget(r)}
      />

      {/* CREATE REQUEST DIALOG */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Store Surveillance Report</DialogTitle>
            <DialogDescription>
              Submit an official surveillance footage request for store review. Requests require Market/State Manager or Admin approval.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            {/* Store Selection */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">
                Store Location <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_STORES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.market} • {s.district})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Incident Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Incident / Target Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>

            {/* Shift / Time range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Shift / Time Window <span className="text-destructive">*</span>
              </Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Investigation Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Investigation Type <span className="text-destructive">*</span>
              </Label>
              <Select value={investigationType} onValueChange={setInvestigationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTIGATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as SurveillancePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Request Title */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">
                Request Title / Incident Summary <span className="text-destructive">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Discrepancy of $340 at Register #2 closing..."
              />
            </div>

            {/* Specific Areas to Review */}
            <div className="sm:col-span-2 space-y-2">
              <Label className="text-xs font-semibold">
                Specific Cameras / Areas to Inspect <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/40">
                {CAMERA_AREA_OPTIONS.map((area) => {
                  const isChecked = selectedAreas.includes(area);
                  return (
                    <label
                      key={area}
                      onClick={() => handleToggleArea(area)}
                      className={`flex items-center gap-2 p-2 rounded-md text-xs cursor-pointer border transition-colors ${
                        isChecked
                          ? "border-primary bg-primary/10 font-medium text-foreground"
                          : "border-transparent hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span>{area}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Notes / Context */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Additional Context / Special Instructions</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include cashier names, specific timecodes, suspect attire or transaction numbers..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REQUEST DETAILS MODAL */}
      <Dialog open={Boolean(detailTarget)} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailTarget && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="flex items-center gap-2 font-display text-lg">
                    <span>Request Details</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {detailTarget.id}
                    </Badge>
                  </DialogTitle>
                  <Badge variant="outline" className={STATUS_CONFIG[detailTarget.status]?.tone}>
                    {STATUS_CONFIG[detailTarget.status]?.label}
                  </Badge>
                </div>
                <DialogDescription>
                  Review the store surveillance requisition and investigation parameters.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Store Card */}
                <Card className="p-3.5 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <div className="text-muted-foreground font-medium uppercase text-[10px]">Store</div>
                      <div className="font-semibold text-foreground text-sm mt-0.5">{detailTarget.storeName}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground font-medium uppercase text-[10px]">Market & District</div>
                      <div className="font-semibold text-foreground mt-0.5">{detailTarget.marketName} • {detailTarget.districtName}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground font-medium uppercase text-[10px]">Target Date</div>
                      <div className="font-semibold text-foreground mt-0.5">{detailTarget.incidentDate}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground font-medium uppercase text-[10px]">Priority</div>
                      <Badge variant="outline" className={`mt-0.5 capitalize ${PRIORITY_TONES[detailTarget.priority]}`}>
                        {detailTarget.priority}
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* Details */}
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Incident Title & Scope
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {detailTarget.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong>Investigation Type:</strong> {detailTarget.investigationType} • <strong>Shift Window:</strong> {detailTarget.shift}
                  </div>
                </div>

                {detailTarget.notes && (
                  <div className="rounded-md border bg-card p-3">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                      Requester Notes & Instructions
                    </div>
                    <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {detailTarget.notes}
                    </p>
                  </div>
                )}

                {/* Camera Areas */}
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">
                    Designated Camera Angles
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailTarget.areasToReview.map((area) => (
                      <Badge key={area} variant="outline" className="bg-muted text-xs font-normal">
                        <Video className="h-3 w-3 mr-1 text-primary inline" />
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Audit & Workflow History */}
                <Card className="p-3 border-border/80">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">
                    Request Audit Trail
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div>
                      <span className="text-muted-foreground">Requested By:</span>
                      <div className="font-medium">{detailTarget.requestedBy} ({detailTarget.requesterRole})</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <div className="font-medium">{new Date(detailTarget.createdAt).toLocaleDateString()}</div>
                    </div>
                    {detailTarget.approvedBy && (
                      <div>
                        <span className="text-muted-foreground">Approved By:</span>
                        <div className="font-medium text-emerald-600">{detailTarget.approvedBy}</div>
                      </div>
                    )}
                    {detailTarget.rejectionReason && (
                      <div className="col-span-2 text-rose-600">
                        <span className="font-bold">Rejection Reason:</span>
                        <div>{detailTarget.rejectionReason}</div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setDetailTarget(null)}>
                  Close
                </Button>

                {detailTarget.status === "pending_approval" && userCanApprove && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setRejectTarget(detailTarget);
                        setDetailTarget(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject Request
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        setApproveTarget(detailTarget);
                        setDetailTarget(null);
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" /> Approve Request
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* APPROVE CONFIRMATION DIALOG */}
      <AlertDialog open={Boolean(approveTarget)} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Surveillance Request?</AlertDialogTitle>
            <AlertDialogDescription>
              You are authorizing store surveillance review for{" "}
              <strong className="text-foreground">{approveTarget?.storeName}</strong> ({approveTarget?.id}).
              Once approved, the investigation team can proceed with video audit submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-xs font-semibold">Approval Remarks (Optional)</Label>
            <Input
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Approved for expedited review..."
              className="mt-1.5"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Confirm Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* REJECT CONFIRMATION DIALOG */}
      <AlertDialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Surveillance Request</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for declining request{" "}
              <strong className="text-foreground">{rejectTarget?.id}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-xs font-semibold">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State why this surveillance cannot be authorized or if information is missing..."
              rows={3}
              className="mt-1.5"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
