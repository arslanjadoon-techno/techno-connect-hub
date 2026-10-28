import { useEffect, useMemo, useState } from "react";
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
import {
  Plus,
  XCircle,
  Store as StoreIcon,
  RotateCcw,
  ArrowLeft,
  User as UserIcon,
  ShieldCheck,
  Star,
  Phone,
  Mail,
  Building2,
  Eye,
  AlertTriangle,
  Calendar,
  Clock,
  Search,
  ChevronsUpDown,
  MapPin,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStaticRequestReports,
  createStaticRequestReport,
  getStaticReports,
  getStaticStores,
  type StaticStoreOption,
} from "./surveillance-data";
import type {
  SurveillanceRequest,
  SurveillanceReport,
  SurveillancePriority,
} from "@/services/portals/surveillance/types";

type RequestReportPageStatus = "Requested" | "Completed" | "Pending";

const PRIORITY_TONES: Record<SurveillancePriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  high: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
};

const REQUEST_STATUS_CONFIG: Record<
  RequestReportPageStatus,
  { label: string; tone: string; dotClass: string; textClass: string }
> = {
  Requested: {
    label: "Requested",
    tone: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400",
    dotClass: "bg-sky-500",
    textClass: "text-sky-800 dark:text-sky-300",
  },
  Completed: {
    label: "Completed",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-800 dark:text-emerald-300",
  },
  Pending: {
    label: "Pending",
    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    dotClass: "bg-amber-500",
    textClass: "text-amber-900 dark:text-amber-100",
  },
};

function normalizeRequestStatus(raw: string): RequestReportPageStatus {
  if (raw === "Completed" || raw === "Approved") return "Completed";
  if (raw === "Pending" || raw === "Report Received") return "Pending";
  return "Requested";
}

function formatPriorityLabel(priority: SurveillancePriority): string {
  if (!priority) return "—";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDisplayDate(rawDate: string): string {
  if (!rawDate) return "—";
  const clean = rawDate.split(" - ")[0]?.trim() || rawDate;
  const parts = clean.split("-");
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
      return `${String(day).padStart(2, "0")} ${months[monthIdx]} ${year}`;
    }
  }
  return clean;
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

export default function ReportRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [requests, setRequests] = useState<SurveillanceRequest[]>([]);
  const [reports, setReports] = useState<SurveillanceReport[]>([]);
  const [stores, setStores] = useState<StaticStoreOption[]>([]);

  useEffect(() => {
    setRequests(getStaticRequestReports());
    setReports(getStaticReports());
    setStores(getStaticStores());
  }, []);

  // Active drill-down detail view state (null = list view)
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  // Filter states
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const MARKETS = useMemo(
    () =>
      Array.from(
        new Set(stores.map((s) => s.market).filter(Boolean)),
      ).sort(),
    [stores],
  );

  // Create Request Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [priority, setPriority] = useState<SurveillancePriority>("low");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const storesForMarket = useMemo(() => {
    return stores.filter((s) => s.market === selectedMarket);
  }, [stores, selectedMarket]);

  const selectedStore = useMemo(
    () => stores.find((s) => s.id === selectedStoreId) || null,
    [stores, selectedStoreId],
  );

  const handleMarketChange = (newMarket: string) => {
    setSelectedMarket(newMarket);
    const storesInNewMarket = stores.filter((s) => s.market === newMarket);
    setSelectedStoreId(storesInNewMarket[0]?.id ?? "");
  };

  const handleOpenCreate = () => {
    setTitle("");
    setNotes("");
    const defaultMarket = MARKETS[0] ?? "";
    setSelectedMarket(defaultMarket);
    const firstStore =
      stores.find((s) => s.market === defaultMarket) || stores[0];
    setSelectedStoreId(firstStore?.id ?? "");
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
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
      toast.error("Please select a date.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter the investigation reason or incident summary.");
      return;
    }

    const store = stores.find((s) => s.id === selectedStoreId);
    if (!store) {
      toast.error("Please select a store location.");
      return;
    }

    setSubmittingRequest(true);
    try {
      const result = createStaticRequestReport(
        {
          storeId: store.id,
          storeName: store.name,
          storeNumber: store.number,
          marketName: store.market,
          districtName: store.district,
          incidentDate: startDate,
          shift: "Surveillance Review",
          investigationType: "Store Audit & Surveillance",
          priority,
          title: title.trim(),
          areasToReview: ["POS Registers", "Sales Floor", "Backroom / Cash Safe"],
          notes: notes.trim() || undefined,
        },
        {
          name: user?.fullName || "David Kim",
          role: user?.roleName || "Market Manager",
          email: user?.email || "david.kim@techno-communications.com",
        },
      );

      if (result.isDuplicate) {
        toast.error(
          `A surveillance request for this store and date already exists (requested by ${result.requestedBy}).`,
        );
        return;
      }

      setRequests(getStaticRequestReports());
      toast.success("Surveillance report request submitted successfully.");
      setCreateModalOpen(false);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const normalizedStatus = normalizeRequestStatus(r.status);
      if (marketFilter !== "all" && r.marketName !== marketFilter) return false;
      if (statusFilter !== "all" && normalizedStatus !== statusFilter)
        return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter)
        return false;
      return true;
    });
  }, [requests, marketFilter, statusFilter, priorityFilter]);

  // Strictly 3 KPI summary cards: Total Requests, Completed, and Pending
  const metrics = useMemo(() => {
    return {
      total: requests.length,
      completed: requests.filter(
        (r) => normalizeRequestStatus(r.status) === "Completed",
      ).length,
      pending: requests.filter(
        (r) => normalizeRequestStatus(r.status) === "Pending",
      ).length,
    };
  }, [requests]);

  const columns: Column<SurveillanceRequest>[] = useMemo(
    () => [
      {
        key: "store",
        header: "Store",
        searchValue: (r) => r.storeName,
        accessor: (r) => (
          <span className="font-medium text-foreground text-sm">
            {r.storeName}
          </span>
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
          <Badge
            variant="outline"
            className={`capitalize text-xs font-medium ${PRIORITY_TONES[r.priority]}`}
          >
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
        searchValue: (r) => r.preparedBy || "-",
        accessor: (r) => (
          <span className="text-foreground text-sm">{r.preparedBy || "-"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        searchValue: (r) => normalizeRequestStatus(r.status),
        accessor: (r) => {
          const normalized = normalizeRequestStatus(r.status);
          const cfg = REQUEST_STATUS_CONFIG[normalized];
          return (
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${cfg.tone}`}
            >
              {cfg.label}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  const selectedDetail = useMemo(
    () =>
      selectedDetailId
        ? requests.find((r) => r.id === selectedDetailId) || null
        : null,
    [requests, selectedDetailId],
  );

  // REPORT DETAILS PAGE (Consistent UI format matching Request Details)
  if (selectedDetail) {
    const item = selectedDetail;
    const normalizedStatus = normalizeRequestStatus(item.status);
    const statusCfg = REQUEST_STATUS_CONFIG[normalizedStatus];

    const linkedReport = reports.find(
      (rep) => rep.id === item.linkedReportId || rep.requestId === item.id,
    );
    const targetReportId = item.linkedReportId || linkedReport?.id;
    const givenRating = item.managerRating ?? linkedReport?.managerRating;
    const ratingReviewer = item.reportApprovedBy || linkedReport?.reviewedBy;

    return (
      <div className="space-y-5 animate-fade-in">
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
              Back to Request Reports
            </Button>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                Request Reports
              </p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground leading-tight">
                Report Details
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {normalizedStatus !== "Requested" && Boolean(targetReportId) && (
              <Button
                onClick={() => navigate(`/surveillance/reports/${targetReportId}`)}
                className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs whitespace-nowrap shrink-0"
              >
                <Eye className="h-4 w-4" />
                View Report
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
              {item.storeName}
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
                  {item.marketName}
                </div>
                {item.districtName && (
                  <div className="text-[11px] text-blue-700/70 dark:text-blue-300/70 mt-0.5">
                    {item.districtName}
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
                  {formatPriorityLabel(item.priority)}
                </div>
              </div>
            </div>

            {/* 3. Current Status Card - Amber */}
            <div className="flex items-start gap-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-amber-100 shadow-2xs dark:bg-amber-950 dark:border-amber-900 shrink-0">
                <span className={`h-2.5 w-2.5 rounded-full ${statusCfg.dotClass}`} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-amber-800/80 dark:text-amber-300/80">
                  Current status
                </div>
                <div className={`text-sm font-bold mt-0.5 ${statusCfg.textClass}`}>
                  {statusCfg.label}
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
                  {formatDisplayDate(item.incidentDate)}
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
                  {item.requestedBy}
                </div>
              </div>
            </div>

            {/* 6. Prepared By Card - Emerald */}
            <div className="flex items-start gap-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-600 border border-emerald-100 shadow-2xs dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                <UserPlus className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-300/80">
                  Prepared by
                </div>
                <div className="text-sm font-bold text-emerald-950 dark:text-emerald-100 truncate mt-0.5">
                  {item.preparedBy || "—"}
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
            <div className="text-base font-bold text-foreground">
              {item.title}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              SPECIAL INSTRUCTIONS FROM REQUESTER
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/45 p-4 text-xs text-foreground leading-relaxed dark:border-indigo-900/40 dark:bg-indigo-950/25">
              <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <p className="whitespace-pre-wrap">
                {item.notes ||
                  "No additional context or special instructions were provided by the requester."}
              </p>
            </div>
          </div>
        </Card>

        {/* Read-Only Report Rating Banner (Displayed when a rating has been given) */}
        {Boolean(givenRating && givenRating > 0) && (
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
                {ratingReviewer && (
                  <p className="text-xs text-muted-foreground">
                    Rated by{" "}
                    <strong className="font-semibold text-foreground">
                      {ratingReviewer}
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
                        s <= (givenRating || 0)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-1 text-xs font-semibold text-foreground">
                  {givenRating} / 5
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Decline / Rejection Reason Banner (if report was declined during review) */}
        {item.reportStatus === "Rejected" && Boolean(item.rejectionReason || item.managerComments) && (
          <Card className="p-5 rounded-2xl border-rose-200/90 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/60 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-semibold text-sm">
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Report Decline Reason</span>
            </div>
            <div className="p-3.5 rounded-xl border border-rose-200/80 bg-background text-foreground text-xs leading-relaxed whitespace-pre-wrap">
              {item.rejectionReason || item.managerComments}
            </div>
          </Card>
        )}

        {/* Bottom 2-Column Section: "Requested by" & "Prepared by" with Distinct Colors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* Left Card: Requested by (Blue Tint) */}
          <Card className="p-6 rounded-2xl border-blue-200/80 bg-blue-50/35 dark:bg-blue-950/20 dark:border-blue-900/50 shadow-xs flex flex-col justify-between space-y-5">
            <div className="space-y-5">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-900/80 dark:text-blue-300">
                Requested by
              </div>

              <div className="flex items-center gap-3.5 border-b border-blue-200/60 dark:border-blue-900/50 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-display text-sm font-bold shadow-xs shrink-0">
                  {getInitials(item.requestedBy)}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-base font-bold text-foreground truncate">
                    {item.requestedBy}
                  </div>
                  <span className="inline-flex items-center rounded-md bg-blue-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                    {item.requesterRole}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900 shrink-0">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">Email</div>
                    <div className="font-medium text-blue-700 dark:text-blue-300 break-all">
                      {item.requesterEmail || "—"}
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
                      {item.requesterPhone || "—"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900 shrink-0">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">
                      Department
                    </div>
                    <div className="font-medium text-foreground">
                      {item.requesterDepartment || "—"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900 shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">
                      Request received at
                    </div>
                    <div className="font-medium text-foreground tabular-nums">
                      {formatDateTimeDisplay(item.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Right Card: Prepared by (Emerald Tint) */}
          <Card className="p-6 rounded-2xl border-emerald-200/80 bg-emerald-50/35 dark:bg-emerald-950/20 dark:border-emerald-900/50 shadow-xs flex flex-col justify-between space-y-5">
            <div className="space-y-5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-900/80 dark:text-emerald-300">
                Prepared by
              </div>

              <div className="flex items-center gap-3.5 border-b border-emerald-200/60 dark:border-emerald-900/50 pb-4">
                {item.preparedBy ? (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white font-display text-sm font-bold shadow-xs shrink-0">
                    {getInitials(item.preparedBy)}
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-emerald-300 bg-white/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 shrink-0">
                    <UserIcon className="h-5 w-5" />
                  </div>
                )}

                <div className="min-w-0 space-y-1">
                  <div className="text-base font-bold text-foreground truncate">
                    {item.preparedBy || "—"}
                  </div>

                  {item.preparedBy ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      {item.preparedByRole || "Surveillance Auditor"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Awaiting assignment
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">Email</div>
                    <div className="font-medium text-foreground break-all">
                      {item.preparedByEmail || "—"}
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
                      {item.preparedByPhone || "—"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">
                      Department
                    </div>
                    <div className="font-medium text-foreground">
                      {item.preparedBy
                        ? item.preparedByDepartment ||
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
                    <div className="text-[11px] text-muted-foreground">
                      Submitted at
                    </div>
                    <div className="font-medium text-foreground tabular-nums">
                      {item.preparedAt
                        ? formatDateTimeDisplay(item.preparedAt)
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {normalizedStatus === "Completed" ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-100/60 p-3.5 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Surveillance audit report completed and verified. Click{" "}
                  <strong>View Report</strong> above to inspect the full audit log.
                </span>
              </div>
            ) : normalizedStatus === "Pending" ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {targetReportId
                    ? "Audit report submitted and pending management review."
                    : "Assigned to surveillance auditor — report preparation in progress."}
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/90 p-3.5 text-xs text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200">
                <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <span>
                  Request submitted and awaiting validation and auditor assignment.
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // DEFAULT VIEW: "Request Reports" List Table View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Request Reports
            </h1>
            <Badge
              variant="outline"
              className="border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
            >
              Surveillance
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Store surveillance reports and requests overview. Click any row to
            view full details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleOpenCreate} className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            Request Surveillance
          </Button>
        </div>
      </div>

      {/* KPI Cards: Strictly 3 cards — Total Requests, Completed, and Pending */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Card 1: Total Requests (Blue tone) */}
        <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50">
          <div className="text-xs text-blue-800 dark:text-blue-300 font-medium uppercase tracking-wider">
            Total Requests
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-blue-950 dark:text-blue-100 tabular-nums">
            {metrics.total}
          </div>
        </Card>

        {/* Card 2: Completed (Emerald tone) */}
        <Card className="p-4 border-emerald-300/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50">
          <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium uppercase tracking-wider">
            Completed
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-emerald-950 dark:text-emerald-100 tabular-nums">
            {metrics.completed}
          </div>
        </Card>

        {/* Card 3: Pending (Amber tone) */}
        <Card className="p-4 border-amber-300/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50">
          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium uppercase tracking-wider">
            Pending
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-amber-950 dark:text-amber-100 tabular-nums">
            {metrics.pending}
          </div>
        </Card>
      </div>

      {/* Toolbar filters: Market, Status (Requested, Completed, Pending), Priority */}
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
            <SelectItem value="Requested">Requested</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
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

        {(statusFilter !== "all" ||
          priorityFilter !== "all" ||
          marketFilter !== "all") && (
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

      {/* Clickable DataTable */}
      <DataTable
        rows={filteredRequests}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search by Store, Market, Reason, or Requester..."
        onRowClick={(r) => setSelectedDetailId(r.id)}
      />

      {/* CREATE REQUEST DIALOG */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Store Surveillance Report</DialogTitle>
            <DialogDescription>
              Submit a surveillance footage review request for store
              investigation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* 1. Market Dropdown */}
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

            {/* 2. Store Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Store <span className="text-destructive">*</span>
              </Label>
              <Popover open={storePickerOpen} onOpenChange={setStorePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-xs text-foreground hover:bg-accent"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-left truncate">
                      {selectedStore
                        ? `${selectedStore.name}${selectedStore.number ? ` (#${selectedStore.number})` : ""}`
                        : "Select or type a store name..."}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Type a store name..." />
                    <CommandList>
                      <CommandEmpty>No stores found in this market.</CommandEmpty>
                      <CommandGroup>
                        {storesForMarket.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.name} ${s.number}`}
                            onSelect={() => {
                              setSelectedStoreId(s.id);
                              setStorePickerOpen(false);
                            }}
                          >
                            {s.name}
                            {s.number ? ` (#${s.number})` : ""}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* 3. Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* 4. Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as SurveillancePriority)}
              >
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
                Investigation Reason / Incident Summary{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Discrepancy of $340 at Register #2 closing..."
              />
            </div>

            {/* 6. Additional Context / Special Instructions */}
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
            <Button onClick={handleCreateRequest} disabled={submittingRequest}>
              {submittingRequest ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
