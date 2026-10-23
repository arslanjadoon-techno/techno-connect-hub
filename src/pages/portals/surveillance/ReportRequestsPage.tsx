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
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create Request Modal state - strictly conforming to requested fields:
  // 1. Market dropdown
  // 2. Store dropdown (filtered by selected market)
  // 3. Date interval (single day or multiple days)
  // 4. Priority (default "low")
  // 5. Investigation Reason / Incident Summary
  // 6. Additional Context / Special Instructions (optional, no red star)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(MARKETS[0]);
  const [selectedStoreId, setSelectedStoreId] = useState(
    AVAILABLE_STORES.find((s) => s.market === MARKETS[0])?.id || AVAILABLE_STORES[0].id,
  );
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [priority, setPriority] = useState<SurveillancePriority>("low");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

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
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
    setPriority("low");
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
    if (!startDate) {
      toast.error("Please select a start date.");
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

    const formattedDateRange = endDate && endDate !== startDate ? `${startDate} - ${endDate}` : startDate;

    const newRequest: SurveillanceRequest = {
      id: newId,
      storeId: store.id,
      storeName: store.name,
      storeNumber: store.number,
      marketName: store.market,
      districtName: store.district,
      incidentDate: formattedDateRange,
      shift: "Surveillance Review",
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

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (marketFilter !== "all" && r.marketName !== marketFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      return true;
    });
  }, [requests, marketFilter, statusFilter, priorityFilter]);

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
    const item =
      requests.find((r) => r.id === selectedDetail.id) ||
      INITIAL_SURVEILLANCE_REQUESTS.find((r) => r.id === selectedDetail.id) ||
      selectedDetail;

    const isPending = item.status === "Report Requested";
    const reportExists = Boolean(
      item.linkedReportId ||
      item.preparedBy ||
      item.status === "Report Received" ||
      item.status === "Approved" ||
      item.status === "Rejected",
    );

    const targetReportId = item.linkedReportId || (item.id === "SRV-REQ-101" ? "SRV-REP-202" : "SRV-REP-201");

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
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Report Button -> Only when status is NOT 'Report Requested' and report exists */}
            {item.status !== "Report Requested" && reportExists && (
              <Button
                onClick={() => navigate(`/surveillance/reports/${targetReportId}`)}
                className="gap-2 bg-primary text-primary-foreground shadow-xs font-medium text-xs h-9"
              >
                <Eye className="h-4 w-4" />
                View Report
                {item.status === "Approved" && (
                  <Badge variant="secondary" className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Approved
                  </Badge>
                )}
                {item.status === "Rejected" && (
                  <Badge variant="secondary" className="ml-1 text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                    Rejected
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Top Banner Overview */}
        <Card className="p-4 bg-muted/20 border-border/80">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <StoreIcon className="h-4 w-4 text-primary" />
                <span className="font-semibold text-base text-foreground">
                  {item.storeName}
                </span>
                <span className="text-xs text-muted-foreground">
                  • {item.marketName}
                </span>
              </div>
              <h2 className="mt-1 text-sm font-medium text-foreground">
                {item.title}
              </h2>
            </div>

            {/* Middle: Prominent Report Status */}
            <div className="flex flex-col items-center justify-center px-5 py-2 rounded-lg border bg-card shadow-xs">
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Report Status
              </span>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    item.status === "Approved"
                      ? "bg-emerald-500"
                      : item.status === "Rejected"
                        ? "bg-rose-500"
                        : item.status === "Report Received"
                          ? "bg-blue-500"
                          : "bg-amber-500"
                  }`}
                />
                <span className="text-base font-bold text-foreground">
                  {STATUS_CONFIG[item.status]?.label || item.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`capitalize text-xs font-semibold px-2.5 py-1 ${PRIORITY_TONES[item.priority]}`}>
                Priority: {item.priority}
              </Badge>
            </div>
          </div>
        </Card>

        {/* 2-Column Section: Requested By & Prepared By with distinct colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Requested By Profile Card (Blue Accent Tone) */}
          <Card className="p-4 border-blue-200/80 bg-blue-50/40 dark:bg-blue-950/25 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Requested By</span>
              </div>
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-800 dark:text-blue-300">
                {item.requesterRole}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Full Name:</span>
                <span className="col-span-2 font-semibold text-foreground">
                  {item.requestedBy}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Email:</span>
                <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  {item.requesterEmail || "david.kim@techno.com"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Phone:</span>
                <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {item.requesterPhone || "+1 (214) 555-0192"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Department:</span>
                <span className="col-span-2 text-foreground flex items-center gap-1.5">
                  <Building className="h-3 w-3 text-muted-foreground" />
                  {item.requesterDepartment || "Regional Operations"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-medium">Request Date:</span>
                <span className="col-span-2 text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Prepared By Profile Card (Purple Accent Tone, without Assigned & Active tag) */}
          <Card className="p-4 border-purple-200/80 bg-purple-50/40 dark:bg-purple-950/25 dark:border-purple-900/50 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Prepared By (Submitter / Auditor)</span>
              </div>
            </div>

            {item.preparedBy ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Auditor Name:</span>
                  <span className="col-span-2 font-semibold text-foreground">
                    {item.preparedBy}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Role:</span>
                  <span className="col-span-2 text-foreground">
                    {item.preparedByRole || "Surveillance Auditor"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Email:</span>
                  <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    {item.preparedByEmail || "investigator@techno.com"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Phone:</span>
                  <span className="col-span-2 text-foreground flex items-center gap-1.5 font-mono">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    {item.preparedByPhone || "+1 (214) 555-0821"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Submitted At:</span>
                  <span className="col-span-2 text-muted-foreground">
                    {item.preparedAt ? new Date(item.preparedAt).toLocaleString() : "Recently submitted"}
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

        {/* Rejection / Declined Reason Section (Displayed when the report or request is rejected) */}
        {(item.status === "Rejected" ||
          item.reportStatus === "Rejected" ||
          Boolean(item.rejectionReason || (item.status !== "Approved" && item.managerComments))) && (
          <Card className="p-4 border-rose-200/90 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/60 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200/80 dark:border-rose-900/40 pb-2">
              <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-semibold text-sm">
                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Rejection Reason</span>
              </div>
              <Badge
                variant="outline"
                className="border-rose-300 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-semibold"
              >
                Rejected
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3.5 rounded-lg border border-rose-200/90 bg-white/90 dark:bg-card text-foreground leading-relaxed whitespace-pre-wrap text-xs shadow-xs font-medium">
                {item.rejectionReason ||
                  item.managerComments ||
                  "This report was declined during management review."}
              </div>

              {(item.reportApprovedBy || item.approvedBy) && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1 px-0.5">
                  <span>
                    Reviewed by:{" "}
                    <strong className="text-foreground font-semibold">
                      {item.reportApprovedBy || item.approvedBy}
                    </strong>
                  </span>
                  {(item.reportApprovedAt || item.approvedAt) && (
                    <span>
                      Date:{" "}
                      {new Date(
                        item.reportApprovedAt || item.approvedAt || "",
                      ).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Investigation Parameters: Strictly Investigation Reason, Surveillance Date, and Additional Context */}
        <Card className="p-4 border-border/80 space-y-3">
          <div className="border-b pb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Investigation Parameters
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block font-medium">Investigation Reason:</span>
              <div className="font-semibold text-foreground mt-0.5 text-sm">{item.title}</div>
            </div>
            <div>
              <span className="text-muted-foreground block font-medium">Surveillance Date:</span>
              <div className="font-semibold text-foreground mt-0.5 text-sm">{item.incidentDate}</div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Additional Context / Special Instructions
            </span>
            <div className="p-3 rounded-lg border bg-card text-foreground text-xs leading-relaxed whitespace-pre-wrap">
              {item.notes || "No additional context or special instructions provided."}
            </div>
          </div>
        </Card>
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

      {/* Toolbar filters: Market (1st), Status, Priority */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={marketFilter} onValueChange={setMarketFilter}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="Market" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Markets</SelectItem>
            {MARKETS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        {(statusFilter !== "all" || priorityFilter !== "all" || marketFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMarketFilter("all");
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

            {/* 3. Date Interval (Single day or multiple days) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Date <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Start Date</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate || e.target.value > endDate) {
                        setEndDate(e.target.value);
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground block">End Date</span>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pick the same start and end date for a single day, or different dates for an interval range.
              </p>
            </div>

            {/* 4. Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as SurveillancePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
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
