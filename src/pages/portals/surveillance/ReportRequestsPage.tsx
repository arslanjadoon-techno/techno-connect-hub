import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  CheckCircle2,
  XCircle,
  Video,
  Store as StoreIcon,
  RotateCcw,
  Check,
  X,
  ArrowLeft,
  User as UserIcon,
  ShieldCheck,
  FileText,
  Star,
  Phone,
  Mail,
  Building,
  Eye,
  AlertCircle,
  Calendar,
  Clock,
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
  type SurveillanceRequestStatus,
} from "@/services/portals/surveillance/types";

// Exactly 3 priorities: low, medium, high (urgent removed)
const PRIORITY_TONES: Record<SurveillancePriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  high: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
};

// Exactly 4 statuses: Report Requested, Report Received, Approved, Rejected
const STATUS_CONFIG: Record<
  SurveillanceRequestStatus,
  { label: string; tone: string }
> = {
  "Report Requested": {
    label: "Report Requested",
    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  },
  "Report Received": {
    label: "Report Received",
    tone: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400",
  },
  Approved: {
    label: "Approved",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  Rejected: {
    label: "Rejected",
    tone: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
  },
};

// Extract unique markets
const MARKETS = Array.from(new Set(AVAILABLE_STORES.map((s) => s.market)));

export default function ReportRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const detectedRole = useMemo(() => getSurveillanceRole(user), [user]);

  // Active role selector for testing between Admin / State Mgr / Market Mgr (can approve) and District Mgr (view only)
  const [activeRole, setActiveRole] = useState<SurveillanceRole>(() => {
    return canRequestSurveillance(detectedRole) ? detectedRole : "admin";
  });

  const [requests, setRequests] = useState<SurveillanceRequest[]>(INITIAL_SURVEILLANCE_REQUESTS);

  // Active drill-down detail view state (null = list view)
  const [selectedDetail, setSelectedDetail] = useState<SurveillanceRequest | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create Request Modal state - strictly conforming to requested fields:
  // 1. Market dropdown
  // 2. Store dropdown (filtered by selected market)
  // 3. Date & time interval (both single date + interval time)
  // 4. Priority (default "low")
  // 5. Investigation Reason / Incident Summary
  // 6. Additional Context / Special Instructions (optional, no red star)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(MARKETS[0]);
  const [selectedStoreId, setSelectedStoreId] = useState(
    AVAILABLE_STORES.find((s) => s.market === MARKETS[0])?.id || AVAILABLE_STORES[0].id,
  );
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [intervalStart, setIntervalStart] = useState("14:00");
  const [intervalEnd, setIntervalEnd] = useState("18:00");
  const [priority, setPriority] = useState<SurveillancePriority>("low");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  // Requisition Approve / Reject dialogs
  const [approveTarget, setApproveTarget] = useState<SurveillanceRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectTarget, setRejectTarget] = useState<SurveillanceRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Role permissions
  const userCanApprove = canApproveSurveillance(activeRole);

  // Stores filtered by currently selected market in modal
  const storesForMarket = useMemo(() => {
    return AVAILABLE_STORES.filter((s) => s.market === selectedMarket);
  }, [selectedMarket]);

  // Market change handler in modal
  const handleMarketChange = (newMarket: string) => {
    setSelectedMarket(newMarket);
    const storesInNewMarket = AVAILABLE_STORES.filter((s) => s.market === newMarket);
    if (storesInNewMarket.length > 0) {
      setSelectedStoreId(storesInNewMarket[0].id);
    }
  };

  // Handlers for creating request
  const handleOpenCreate = () => {
    setTitle("");
    setNotes("");
    const defaultMarket = MARKETS[0];
    setSelectedMarket(defaultMarket);
    const firstStore = AVAILABLE_STORES.find((s) => s.market === defaultMarket) || AVAILABLE_STORES[0];
    setSelectedStoreId(firstStore.id);
    setIncidentDate(new Date().toISOString().split("T")[0]);
    setIntervalStart("14:00");
    setIntervalEnd("18:00");
    setPriority("low"); // By default low selected
    setCreateModalOpen(true);
  };

  const handleCreateRequest = () => {
    if (!selectedMarket) {
      toast.error("Please select a market.");
      return;
    }
    if (!selectedStoreId) {
      toast.error("Please select a store location.");
      return;
    }
    if (!incidentDate) {
      toast.error("Please select an incident date.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter the investigation reason or incident summary.");
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

    const formattedShift = intervalStart && intervalEnd ? `${intervalStart} - ${intervalEnd}` : "Full Day Review";

    const newRequest: SurveillanceRequest = {
      id: newId,
      storeId: store.id,
      storeName: store.name,
      storeNumber: store.number,
      marketName: store.market,
      districtName: store.district,
      incidentDate,
      shift: formattedShift,
      investigationType: "Store Audit & Surveillance",
      priority,
      title: title.trim(),
      requestedBy: user?.fullName || "Current User",
      requestedById: user?.id || "u-1",
      requesterRole: requesterRoleLabel,
      requesterEmail: user?.email || "user@techno.com",
      requesterPhone: user?.phone || "+1 (555) 012-3456",
      requesterDepartment: user?.department?.name || "Operations",
      areasToReview: ["POS Registers", "Sales Floor", "Backroom / Cash Safe"],
      notes: notes.trim() || undefined,
      status: "Report Requested",
      createdAt: new Date().toISOString(),
    };

    setRequests((prev) => [newRequest, ...prev]);
    toast.success("Surveillance report request submitted successfully!");
    setCreateModalOpen(false);
  };

  // Requisition Approval
  const handleApprove = () => {
    if (!approveTarget) return;

    const updated: SurveillanceRequest = {
      ...approveTarget,
      status: "Approved",
      approvedBy: user?.fullName || `${activeRole.replace(/_/g, " ")} Authority`,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRequests((prev) => prev.map((r) => (r.id === approveTarget.id ? updated : r)));
    if (selectedDetail?.id === approveTarget.id) setSelectedDetail(updated);

    toast.success(`Request ${approveTarget.id} approved successfully!`);
    setApproveTarget(null);
    setApprovalNotes("");
  };

  // Requisition Rejection
  const handleReject = () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      toast.error("Please specify a reason for rejecting the request.");
      return;
    }

    const updated: SurveillanceRequest = {
      ...rejectTarget,
      status: "Rejected",
      rejectionReason: rejectionReason.trim(),
      updatedAt: new Date().toISOString(),
    };

    setRequests((prev) => prev.map((r) => (r.id === rejectTarget.id ? updated : r)));
    if (selectedDetail?.id === rejectTarget.id) setSelectedDetail(updated);

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

  // Metrics: exactly 3 cards as requested: Total Requests, Pending Approval (Report Requested), and Approved
  const metrics = useMemo(() => {
    return {
      total: requests.length,
      pendingApproval: requests.filter((r) => r.status === "Report Requested").length,
      approved: requests.filter((r) => r.status === "Approved").length,
    };
  }, [requests]);

  // Columns: Single information per column, no dual text / subtitles!
  // Columns: Store, Market, Investigation Reason, Priority, Requested By, Prepared by, Status.
  const columns: Column<SurveillanceRequest>[] = useMemo(
    () => [
      {
        key: "store",
        header: "Store",
        searchValue: (r) => r.storeName,
        accessor: (r) => (
          <span className="font-medium text-foreground text-sm">{r.storeName}</span>
        ),
      },
      {
        key: "market",
        header: "Market",
        searchValue: (r) => r.marketName,
        accessor: (r) => (
          <span className="text-foreground text-sm">{r.marketName}</span>
        ),
      },
      {
        key: "investigation",
        header: "Investigation Reason",
        searchValue: (r) => r.title,
        accessor: (r) => (
          <span className="text-foreground text-sm line-clamp-1">{r.title}</span>
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
        key: "requestedBy",
        header: "Requested By",
        searchValue: (r) => r.requestedBy,
        accessor: (r) => (
          <span className="text-foreground text-sm">{r.requestedBy}</span>
        ),
      },
      {
        key: "preparedBy",
        header: "Prepared by",
        searchValue: (r) => r.preparedBy || "—",
        accessor: (r) => (
          <span className="text-foreground text-sm">{r.preparedBy || "—"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        searchValue: (r) => r.status,
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
    ],
    [],
  );

  // If a detail row is selected, render the dedicated Detail Page
  if (selectedDetail) {
    const isPending = selectedDetail.status === "Report Requested";
    const reportExists = Boolean(
      selectedDetail.linkedReportId ||
      selectedDetail.preparedBy ||
      selectedDetail.status === "Report Received" ||
      selectedDetail.status === "Approved",
    );

    const targetReportId = selectedDetail.linkedReportId || (selectedDetail.id === "SRV-REQ-101" ? "SRV-REP-202" : "SRV-REP-201");

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Top Header / Back Bar */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDetail(null)}
              className="h-8 gap-1.5 px-2.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Reports
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Report Details
              </h1>
              <Badge variant="outline" className="font-mono text-xs font-semibold">
                {selectedDetail.id}
              </Badge>
              <Badge variant="outline" className={`text-xs font-semibold ${STATUS_CONFIG[selectedDetail.status]?.tone}`}>
                {STATUS_CONFIG[selectedDetail.status]?.label}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Report Button -> Navigates to dedicated report page! */}
            {reportExists ? (
              <Button
                onClick={() => navigate(`/surveillance/reports/${targetReportId}`)}
                className="gap-2 bg-primary text-primary-foreground shadow-xs font-medium text-xs h-9"
              >
                <Eye className="h-4 w-4" />
                View Report
                {selectedDetail.reportStatus === "Approved" && (
                  <Badge variant="secondary" className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Approved
                  </Badge>
                )}
              </Button>
            ) : (
              <Badge variant="outline" className="border-dashed text-muted-foreground text-xs py-1 px-2 gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> Report Not Yet Submitted
              </Badge>
            )}

            {/* Quick Actions for Requisition approval if still pending */}
            {isPending && userCanApprove && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRejectTarget(selectedDetail)}
                  className="h-9 text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Reject Request
                </Button>
                <Button
                  size="sm"
                  className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setApproveTarget(selectedDetail)}
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Approve Request
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Top Banner Overview */}
        <Card className="p-4 bg-muted/20 border-border/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <StoreIcon className="h-4 w-4 text-primary" />
                <span className="font-semibold text-base text-foreground">
                  {selectedDetail.storeName}
                </span>
                <span className="text-xs text-muted-foreground">
                  • {selectedDetail.marketName}
                </span>
              </div>
              <h2 className="mt-1 text-sm font-medium text-foreground">
                {selectedDetail.title}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`capitalize text-xs font-medium ${PRIORITY_TONES[selectedDetail.priority]}`}>
                Priority: {selectedDetail.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Incident Date: {selectedDetail.incidentDate}
              </Badge>
            </div>
          </div>
        </Card>

        {/* 2-Column Section: Requested By & Prepared By */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Requested By Profile Card */}
          <Card className="p-4 border-border/80 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <UserIcon className="h-4 w-4 text-primary" />
                <span>Requested By</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {selectedDetail.requesterRole}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Full Name:</span>
                <span className="col-span-2 font-semibold text-foreground">
                  {selectedDetail.requestedBy}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Email:</span>
                <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  {selectedDetail.requesterEmail || "david.kim@techno.com"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Phone:</span>
                <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {selectedDetail.requesterPhone || "+1 (214) 555-0192"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Department:</span>
                <span className="col-span-2 text-foreground flex items-center gap-1.5">
                  <Building className="h-3 w-3 text-muted-foreground" />
                  {selectedDetail.requesterDepartment || "Regional Operations"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Request Date:</span>
                <span className="col-span-2 text-muted-foreground">
                  {new Date(selectedDetail.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Prepared By Profile Card */}
          <Card className="p-4 border-border/80 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Prepared By (Submitter / Auditor)</span>
              </div>
              {selectedDetail.preparedBy ? (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Assigned & Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Pending Assignment
                </Badge>
              )}
            </div>

            {selectedDetail.preparedBy ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Auditor Name:</span>
                  <span className="col-span-2 font-semibold text-foreground">
                    {selectedDetail.preparedBy}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Role:</span>
                  <span className="col-span-2 text-foreground">
                    {selectedDetail.preparedByRole || "Surveillance Auditor"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Email:</span>
                  <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    {selectedDetail.preparedByEmail || "investigator@techno.com"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Phone:</span>
                  <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    {selectedDetail.preparedByPhone || "+1 (214) 555-0821"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Submitted At:</span>
                  <span className="col-span-2 text-muted-foreground">
                    {selectedDetail.preparedAt ? new Date(selectedDetail.preparedAt).toLocaleString() : "Recently submitted"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">No Surveillance Report Submitted Yet</p>
                <p>Once an auditor submits the surveillance audit form, their complete report will appear here.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Investigation Scope & Parameters */}
        <Card className="p-4 border-border/80 space-y-3">
          <div className="border-b pb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Investigation Parameters
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Investigation Reason:</span>
              <div className="font-semibold text-foreground mt-0.5">{selectedDetail.title}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Target Incident Date:</span>
              <div className="font-semibold text-foreground mt-0.5">{selectedDetail.incidentDate}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Target Shift / Interval:</span>
              <div className="font-semibold text-foreground mt-0.5">{selectedDetail.shift}</div>
            </div>
          </div>

          {/* Notes */}
          {selectedDetail.notes && (
            <div className="pt-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Additional Context / Special Instructions
              </span>
              <div className="p-3 rounded-lg border bg-card text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                {selectedDetail.notes}
              </div>
            </div>
          )}
        </Card>

        {/* Manager Review Status on Submitted Report */}
        {selectedDetail.reportStatus && (
          <Card className={`p-4 border ${selectedDetail.reportStatus === "Approved" ? "border-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/20" : "border-rose-300 bg-rose-50/30 dark:bg-rose-950/20"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedDetail.reportStatus === "Approved" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-600" />
                )}
                <div>
                  <div className="font-semibold text-sm text-foreground">
                    Surveillance Report {selectedDetail.reportStatus === "Approved" ? "Approved" : "Rejected"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Reviewed by {selectedDetail.reportApprovedBy || "Management"} on{" "}
                    {selectedDetail.reportApprovedAt ? new Date(selectedDetail.reportApprovedAt).toLocaleDateString() : ""}
                  </div>
                </div>
              </div>

              {selectedDetail.managerRating && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-medium">Auditor Rating:</span>
                  <div className="flex items-center gap-0.5">
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
                </div>
              )}
            </div>

            {selectedDetail.managerComments && (
              <div className="mt-3 p-3 rounded-md bg-background/80 border text-xs text-foreground">
                <span className="font-semibold block mb-0.5 text-muted-foreground">Manager Comments:</span>
                {selectedDetail.managerComments}
              </div>
            )}
          </Card>
        )}

        {/* APPROVE CONFIRMATION DIALOG (For Request requisition) */}
        <AlertDialog open={Boolean(approveTarget)} onOpenChange={(open) => !open && setApproveTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Surveillance Request?</AlertDialogTitle>
              <AlertDialogDescription>
                Authorize store surveillance review for{" "}
                <strong className="text-foreground">{approveTarget?.storeName}</strong> ({approveTarget?.id}).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label className="text-xs font-semibold">Approval Remarks (Optional)</Label>
              <Input
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="e.g. Authorized for priority review..."
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

        {/* REJECT CONFIRMATION DIALOG (For Request requisition) */}
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
                placeholder="State why this surveillance cannot be authorized..."
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

  // DEFAULT VIEW: "Reports" List Table View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Reports
            </h1>
            <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              Surveillance
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Store surveillance reports and requests overview. Click any row to view full details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Active Role Selector for Testing Permissions */}
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

      {/* KPI Cards: Exactly 3 cards with distinct colors as requested */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Card 1: Total Requests (Primary / Blue tone) */}
        <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50">
          <div className="text-xs text-blue-800 dark:text-blue-300 font-medium uppercase tracking-wider">
            Total Requests
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-blue-950 dark:text-blue-100">
            {metrics.total}
          </div>
        </Card>

        {/* Card 2: Pending Approval (status === 'Report Requested') (Amber tone) */}
        <Card className="p-4 border-amber-300/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50">
          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium uppercase tracking-wider">
            Pending Approval
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-950 dark:text-amber-100 font-display">
            {metrics.pendingApproval}
          </div>
        </Card>

        {/* Card 3: Approved (status === 'Approved') (Emerald tone) */}
        <Card className="p-4 border-emerald-300/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50">
          <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium uppercase tracking-wider">
            Approved
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-950 dark:text-emerald-100 font-display">
            {metrics.approved}
          </div>
        </Card>
      </div>

      {/* Toolbar filters: Statuses and 3 Priorities */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Report Requested">Report Requested</SelectItem>
            <SelectItem value="Report Received">Report Received</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
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

      {/* Table: strictly 7 columns, single info per column, no actions column, row click opens detail page */}
      <DataTable
        rows={filteredRequests}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search by Store, Market, Reason, or Requester..."
        onRowClick={(r) => setSelectedDetail(r)}
      />

      {/* CREATE REQUEST DIALOG - STRICTLY USER-REQUESTED FIELDS ONLY */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Store Surveillance Report</DialogTitle>
            <DialogDescription>
              Submit a surveillance footage review request for store investigation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* 1. Market Dropdown (First Field) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Market <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedMarket} onValueChange={handleMarketChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  {MARKETS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Store Name List Dropdown (Filtered by Selected Market) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Store <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {storesForMarket.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Date & Time Interval (Both single date + interval time) */}
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Incident Date & Time Interval <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Target Date</span>
                  <Input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Interval Start Time</span>
                  <Input
                    type="time"
                    value={intervalStart}
                    onChange={(e) => setIntervalStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Interval End Time</span>
                  <Input
                    type="time"
                    value={intervalEnd}
                    onChange={(e) => setIntervalEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 4. Priority (By default "low" selected) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as SurveillancePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Default)</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. Investigation Reason / Incident Summary */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Investigation Reason / Incident Summary <span className="text-destructive">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Discrepancy of $340 at Register #2 closing..."
              />
            </div>

            {/* 6. Additional Context / Special Instructions (Optional: no red star) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Additional Context / Special Instructions
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include cashier names, suspect attire, specific transaction numbers or timecodes..."
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
    </div>
  );
}
