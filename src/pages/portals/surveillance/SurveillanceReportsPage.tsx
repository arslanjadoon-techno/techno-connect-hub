import { useEffect, useMemo, useState } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Store as StoreIcon,
  FileText,
  Paperclip,
  XCircle,
  UploadCloud,
  X,
  ShoppingBag,
  ShieldAlert,
  UserCheck,
  Clock,
  ArrowLeft,
  User as UserIcon,
  ShieldCheck,
  Phone,
  Mail,
  Building,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  Save,
  CheckCircle2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  surveillanceService,
  isSurveillanceUserRole,
  getSurveillanceRole,
  canRequestSurveillance,
  type SurveillanceReport,
  type SurveillanceRequest,
  type SurveillanceAttachment,
  type SurveillanceAuditRow,
  type SurveillancePriority,
  type SurveillanceRequestStatus,
} from "@/services/portals/surveillance";

const PRIORITY_TONES: Record<SurveillancePriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  high: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
};

// Statuses for Surveillance Reports page: Report Requested, Report Submitted, Approved, Rejected
const STATUS_CONFIG: Record<
  SurveillanceRequestStatus,
  { label: string; tone: string }
> = {
  "Report Requested": {
    label: "Report Requested",
    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  },
  "Report Received": {
    label: "Report Submitted",
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

const SALES_REP_NAMES = ["Abdul Razzak", "Dakshay Raval", "Marcus Young"];

const TRANSACTION_TYPE_OPTIONS = [
  "ACC",
  "ACT Pay",
  "Bill Payment",
  "Client",
  "FEA",
  "LOA",
  "Refunded ACC",
  "REVVL Tab",
  "Store Closed",
  "Store Opened",
  "2 Magenta in Metro",
];

const YES_NO_OPTIONS = [
  { value: "__empty__", label: "-" },
  { value: "YES", label: "YES" },
  { value: "NO", label: "NO" },
];

function parseCurrencyNumber(raw: string | undefined): { valid: boolean; value: number } {
  if (!raw || !raw.trim()) return { valid: false, value: 0 };
  const trimmed = raw.trim();
  const isParenNegative = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return { valid: false, value: 0 };
  }
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return { valid: false, value: 0 };
  return { valid: true, value: isParenNegative ? -Math.abs(num) : num };
}

function calculateDifferenceDisplay(invoiceAmountRaw: string, totalTakenRaw: string): string {
  const inv = parseCurrencyNumber(invoiceAmountRaw);
  const taken = parseCurrencyNumber(totalTakenRaw);
  if (!inv.valid && !taken.valid) return "$0.00";
  const diff = (taken.valid ? taken.value : 0) - (inv.valid ? inv.value : 0);
  if (Math.abs(diff) < 0.005) return "$0.00";
  if (diff < 0) return `-$${Math.abs(diff).toFixed(2)}`;
  return `$${diff.toFixed(2)}`;
}

const HOURS_12 = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function parseAmPmValue(raw: string | undefined): {
  hour: string;
  minute: string;
  period: "AM" | "PM";
  hasValue: boolean;
} {
  if (!raw || !raw.trim()) {
    return { hour: "10", minute: "00", period: "AM", hasValue: false };
  }
  const str = raw.trim();
  const match12 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (match12) {
    const h = String(Math.max(1, Math.min(12, parseInt(match12[1], 10))));
    const m = match12[2];
    const p = match12[3].toUpperCase() === "PM" ? "PM" : "AM";
    return { hour: h, minute: m, period: p, hasValue: true };
  }
  const match24 = str.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    let h24 = parseInt(match24[1], 10);
    const m = match24[2];
    const p: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
    h24 = h24 % 12 || 12;
    return { hour: String(h24), minute: m, period: p, hasValue: true };
  }
  return { hour: "10", minute: "00", period: "AM", hasValue: false };
}

function AmPmTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (nextVal: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseAmPmValue(value);

  const commitTime = (h: string, m: string, p: "AM" | "PM") => {
    onChange(`${h}:${m} ${p}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className="flex items-center gap-2 truncate">
            <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {value && value.trim() ? (
              <span className="font-medium text-foreground">{value}</span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </span>
          {value && value.trim() ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Clear time"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[272px] p-3 space-y-3">
        {/* Live Preview Header */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {parsed.hasValue ? `${parsed.hour}:${parsed.minute} ${parsed.period}` : "Select Time"}
            </span>
          </div>
          {parsed.hasValue && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline"
            >
              Reset (-)
            </button>
          )}
        </div>

        {/* Hour / Minute / AM-PM Selector */}
        <div className="grid grid-cols-12 gap-2">
          {/* Hours (1-12) */}
          <div className="col-span-5 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hour
            </div>
            <div className="grid grid-cols-3 gap-1">
              {HOURS_12.map((h) => {
                const selected = parsed.hasValue && parsed.hour === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => commitTime(h, parsed.minute, parsed.period)}
                    className={`h-7 rounded text-xs font-medium transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border/60 bg-card hover:bg-accent text-foreground"
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minutes (00-59 scrollable) */}
          <div className="col-span-4 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Minute
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-[124px] overflow-y-auto pr-1">
              {MINUTES_60.map((m) => {
                const selected = parsed.hasValue && parsed.minute === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => commitTime(parsed.hour, m, parsed.period)}
                    className={`h-7 rounded text-xs font-mono font-medium transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border/60 bg-card hover:bg-accent text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AM / PM Period */}
          <div className="col-span-3 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              AM/PM
            </div>
            <div className="flex flex-col gap-1.5">
              {(["AM", "PM"] as const).map((p) => {
                const selected = parsed.hasValue && parsed.period === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => commitTime(parsed.hour, parsed.minute, p)}
                    className={`h-9 rounded-md text-xs font-semibold transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border bg-card hover:bg-accent text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t pt-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-7 px-3 text-xs font-medium"
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// All dropdowns (Yes/No/-, Sales Rep, Client Type, Payment Type, Pitch Quality) default to "" ("-")
function createEmptyAuditRow(storeName: string, defaultDate?: string): SurveillanceAuditRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: defaultDate || new Date().toISOString().split("T")[0],
    storeName: storeName || "",
    invoice: "",
    cashTime: "",
    time: "",
    bdiTime: "",
    salesRep: "",
    transType: "",
    clientType: "",
    nb: "",
    b: "",
    invoiceAmount: "",
    totalTaken: "",
    paymentType: "",
    cash: "",
    card: "",
    difference: "$0.00",
    receipt: "",
    splitPayments: "",
    fraudTransactions: "",
    refundInvoice: "",
    missOpportunity: "",
    paymentFraud: "",
    aalSwap: "",
    mim: "",
    notes: "",
    pitchNb: "",
    pitchQuality: "",
    pitchNotes: "",
    showingPhone: "",
    accOffered: "",
    maximize: "",
    flipping: "",
    bundleNb: "",
    bundleStartB: "",
    bundleEndB: "",
    bundleAccGiven: "",
    portIn: "",
    nonUp: "",
    smartPayMentioned: "",
    aalBillSame: "",
    onlineRejectedPayment: "",
    nameOfRepLeaving: "",
    timeLeft: "",
    timeReturned: "",
    backRoomTimeIn: "",
    backRoomTimeOut: "",
    offline: "",
    attachments: [],
  };
}

function toSelectVal(val: string | undefined): string {
  if (!val || !val.trim()) return "__empty__";
  return val;
}

function fromSelectVal(val: string): string {
  return val === "__empty__" ? "" : val;
}

export default function SurveillanceReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<SurveillanceRequest[]>([]);
  const [reports, setReports] = useState<SurveillanceReport[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Drill-down state: null = main table, non-null = Report Detail view
  const [selectedDetail, setSelectedDetail] = useState<SurveillanceRequest | null>(null);

  // Editable Report Form state (opened when clicking "Submit Report" inside Report Details)
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editableRows, setEditableRows] = useState<SurveillanceAuditRow[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [savedRowTimestamps, setSavedRowTimestamps] = useState<Record<string, string>>({});
  const [dirtyRowIds, setDirtyRowIds] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const metrics = useMemo(() => {
    return {
      total: requests.length,
      submitted: requests.filter(
        (r) =>
          r.status === "Report Received" ||
          r.status === "Approved" ||
          r.status === "Rejected",
      ).length,
      pending: requests.filter((r) => r.status === "Report Requested").length,
      approved: requests.filter((r) => r.status === "Approved").length,
    };
  }, [requests]);

  // Load requests + reports from the backend on mount.
  useEffect(() => {
    let active = true;
    Promise.all([surveillanceService.getRequests(), surveillanceService.getReports()])
      .then(([reqData, repData]) => {
        if (!active) return;
        setRequests(reqData);
        setReports(repData);
      })
      .catch((error) => {
        console.error("Error loading surveillance data:", error);
        toast.error("Failed to load surveillance reports");
      })
      .finally(() => active && setDataLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  // Automatically restore active MMKV draft session after an unexpected refresh or
  // power loss - waits for the real request list to finish loading first, since the
  // draft only makes sense against a request that still exists server-side.
  useEffect(() => {
    if (!dataLoaded) return;
    const activeSession = surveillanceService.getActiveDraftSession();
    if (!activeSession?.isEditing || !activeSession.requestId) return;

    const targetReq = requests.find(
      (r) => r.id === activeSession.requestId && r.status === "Report Requested",
    );
    if (!targetReq) {
      surveillanceService.clearActiveDraftSession();
      return;
    }

    const savedRecords = surveillanceService.getDraftRows(targetReq.id);
    if (savedRecords.length === 0) return;

    const restoredRows = savedRecords.map((rec) => ({
      ...rec.row,
      attachments: rec.row.attachments ? [...rec.row.attachments] : [],
    }));
    const timestamps: Record<string, string> = {};
    const expanded: Record<string, boolean> = {};
    for (const rec of savedRecords) {
      timestamps[rec.row.id] = rec.savedAt;
      expanded[rec.row.id] = true;
    }

    setSelectedDetail(targetReq);
    setEditableRows(restoredRows);
    setSavedRowTimestamps(timestamps);
    setDirtyRowIds({});
    setExpandedRowIds(expanded);
    setIsEditingReport(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded]);

  // Strictly restrict Surveillance Reports page to "user" role
  if (!isSurveillanceUserRole(user)) {
    const role = getSurveillanceRole(user);
    return (
      <Navigate
        to={canRequestSurveillance(role) ? "/surveillance/requests" : "/ai-chat"}
        replace
      />
    );
  }

  const handleOpenEditableForm = (reqItem: SurveillanceRequest) => {
    // 1. Check MMKV storage first for previously saved row-by-row draft entries
    const savedRecords = surveillanceService.getDraftRows(reqItem.id);
    if (savedRecords.length > 0) {
      const restoredRows = savedRecords.map((rec) => ({
        ...rec.row,
        attachments: rec.row.attachments ? [...rec.row.attachments] : [],
      }));
      const timestamps: Record<string, string> = {};
      const expanded: Record<string, boolean> = {};
      for (const rec of savedRecords) {
        timestamps[rec.row.id] = rec.savedAt;
        expanded[rec.row.id] = true;
      }

      setEditableRows(restoredRows);
      setSavedRowTimestamps(timestamps);
      setDirtyRowIds({});
      setExpandedRowIds(expanded);
      surveillanceService.saveActiveDraftSession(reqItem.id, true);
      setIsEditingReport(true);
      toast.info(
        `Restored ${restoredRows.length} saved audit ${restoredRows.length === 1 ? "row" : "rows"} from local storage.`,
      );
      return;
    }

    // 2. Otherwise initialize from existing report or start with a blank audit row
    const existingReport = reports.find(
      (rep) => rep.id === reqItem.linkedReportId || rep.requestId === reqItem.id,
    );

    const initialDate =
      reqItem.incidentDate?.split(" - ")[0]?.trim() ||
      new Date().toISOString().split("T")[0];

    setSavedRowTimestamps({});
    setDirtyRowIds({});

    if (existingReport && existingReport.rows && existingReport.rows.length > 0) {
      const cloned = existingReport.rows.map((r) => ({
        ...r,
        clientType:
          r.clientType ||
          (r.b?.trim().toUpperCase() === "B"
            ? "Billable"
            : r.nb?.trim().toUpperCase() === "NB"
              ? "Non Billable"
              : ""),
        paymentType:
          r.paymentType ||
          (r.card?.trim() && r.cash?.trim()
            ? "Mix Payment"
            : r.card?.trim()
              ? "Card"
              : r.cash?.trim()
                ? "Cash"
                : ""),
        difference: calculateDifferenceDisplay(r.invoiceAmount, r.totalTaken),
        attachments: r.attachments ? [...r.attachments] : [],
      }));
      setEditableRows(cloned);
      setExpandedRowIds({ [cloned[0].id]: true });
    } else {
      const firstRow = createEmptyAuditRow(reqItem.storeName, initialDate);
      setEditableRows([firstRow]);
      setExpandedRowIds({ [firstRow.id]: true });
    }

    surveillanceService.saveActiveDraftSession(reqItem.id, true);
    setIsEditingReport(true);
  };

  const handleCloseEditableForm = () => {
    surveillanceService.clearActiveDraftSession();
    setIsEditingReport(false);
  };

  const handleSaveAuditRow = (
    requestId: string,
    row: SurveillanceAuditRow,
    rowIndex: number,
  ) => {
    const savedRecord = surveillanceService.saveDraftRow(requestId, row, rowIndex);
    setSavedRowTimestamps((prev) => ({
      ...prev,
      [row.id]: savedRecord.savedAt,
    }));
    setDirtyRowIds((prev) => ({
      ...prev,
      [row.id]: false,
    }));
    surveillanceService.saveActiveDraftSession(requestId, true);
    toast.success(`Row #${rowIndex + 1} has been saved locally.`);
  };

  const handleUpdateRowField = <K extends keyof SurveillanceAuditRow>(
    rowId: string,
    field: K,
    value: SurveillanceAuditRow[K],
  ) => {
    setDirtyRowIds((prev) => ({ ...prev, [rowId]: true }));
    setEditableRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        const updated: SurveillanceAuditRow = { ...row, [field]: value };

        // Keep nb / b synchronized with merged Client Type dropdown
        if (field === "clientType") {
          const ct = String(value || "");
          updated.b = ct === "Billable" ? "B" : "";
          updated.nb = ct === "Non Billable" ? "NB" : "";
        }

        // Keep card / cash synchronized with Payment Type dropdown
        if (field === "paymentType") {
          const pt = String(value || "");
          const amt = (updated.totalTaken || "").trim();
          if (pt === "Card") {
            updated.card = amt || "Card";
            updated.cash = "";
          } else if (pt === "Cash") {
            updated.cash = amt || "Cash";
            updated.card = "";
          } else if (pt === "Mix Payment") {
            if (updated.card === "Card") updated.card = "";
            if (updated.cash === "Cash") updated.cash = "";
          } else {
            updated.card = "";
            updated.cash = "";
          }
        } else if (field === "totalTaken") {
          const pt = updated.paymentType || "";
          const amt = String(value || "").trim();
          if (pt === "Card") {
            updated.card = amt || "Card";
            updated.cash = "";
          } else if (pt === "Cash") {
            updated.cash = amt || "Cash";
            updated.card = "";
          }
        }

        // Auto-calculate Difference whenever Invoice Amount or Total Taken changes
        if (field === "invoiceAmount" || field === "totalTaken") {
          updated.difference = calculateDifferenceDisplay(
            updated.invoiceAmount,
            updated.totalTaken,
          );
        }

        return updated;
      }),
    );
  };

  // Adds a fresh audit row with all time fields reset to default ('-')
  const handleAddAuditRow = (storeName: string, defaultDate?: string) => {
    const nextRow = createEmptyAuditRow(storeName, defaultDate);
    setEditableRows((prev) => [...prev, nextRow]);
    setExpandedRowIds((prev) => ({ ...prev, [nextRow.id]: true }));
  };

  const handleRemoveAuditRow = (requestId: string, rowId: string) => {
    if (editableRows.length <= 1) {
      toast.error("At least one audit entry row is required to submit a report.");
      return;
    }
    surveillanceService.removeDraftRow(requestId, rowId);
    setEditableRows((prev) => prev.filter((r) => r.id !== rowId));
    setSavedRowTimestamps((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    setDirtyRowIds((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const toggleRowExpanded = (rowId: string) => {
    setExpandedRowIds((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const handleRowAttachmentUpload = (
    rowId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploaded: SurveillanceAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }));

    setDirtyRowIds((prev) => ({ ...prev, [rowId]: true }));
    setEditableRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, attachments: [...(row.attachments || []), ...uploaded] }
          : row,
      ),
    );
    e.target.value = "";
  };

  const handleRemoveRowAttachment = (rowId: string, attId: string) => {
    setDirtyRowIds((prev) => ({ ...prev, [rowId]: true }));
    setEditableRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              attachments: (row.attachments || []).filter((a) => a.id !== attId),
            }
          : row,
      ),
    );
  };

  const handleRequestSubmitConfirmation = () => {
    if (editableRows.length === 0) {
      toast.error("Please add at least one audit row before submitting.");
      return;
    }

    const hasMissingRep = editableRows.some((r) => !r.salesRep.trim());
    if (hasMissingRep) {
      toast.error("Please select a Sales Rep for every audit row before submitting.");
      return;
    }

    setConfirmSubmitOpen(true);
  };

  const handleSubmitEditableReport = async (reqItem: SurveillanceRequest) => {
    if (editableRows.length === 0) {
      toast.error("Please add at least one audit row before submitting.");
      return;
    }

    const hasMissingRep = editableRows.some((r) => !r.salesRep.trim());
    if (hasMissingRep) {
      toast.error("Please select a Sales Rep for every audit row before submitting.");
      return;
    }

    setConfirmSubmitOpen(false);
    setIsSubmitting(true);

    const primaryRow = editableRows[0];
    const yesOrNo = (val: string): "Yes" | "No" =>
      val.trim().toUpperCase() === "YES" ? "Yes" : "No";

    const combinedAttachments = editableRows.flatMap((r) => r.attachments || []);

    const payload = {
      requestId: reqItem.id,
      rows: editableRows.map((r) => ({
        ...r,
        attachments: r.attachments && r.attachments.length > 0 ? r.attachments : undefined,
      })),
      date: primaryRow.date || new Date().toISOString().split("T")[0],
      storeName: primaryRow.storeName || reqItem.storeName,
      invoiceNo:
        editableRows.length > 1
          ? `${primaryRow.invoice || "Audit"} (${editableRows.length} Rows)`
          : primaryRow.invoice || "-",
      cashTime: primaryRow.cashTime,
      time: primaryRow.time,
      bdiTime: primaryRow.bdiTime,
      salesRep: primaryRow.salesRep.trim(),
      transType:
        editableRows.length > 1
          ? `Shift Audit (${editableRows.length} Entries)`
          : primaryRow.transType || "Audit Entry",
      clientType: (primaryRow.clientType === "Non Billable" ? "Non Billable" : "Billable") as
        | "Billable"
        | "Non Billable",
      invoiceAmount: primaryRow.invoiceAmount || "$0.00",
      totalTaken: primaryRow.totalTaken || "$0.00",
      paymentMode: (primaryRow.paymentType === "Mix Payment"
        ? "Split"
        : primaryRow.paymentType === "Cash"
          ? "Cash"
          : "Card") as "Cash" | "Card" | "Split",
      difference: calculateDifferenceDisplay(primaryRow.invoiceAmount, primaryRow.totalTaken),
      receipt: yesOrNo(primaryRow.receipt),
      splitPayments:
        primaryRow.paymentType === "Mix Payment" ? "Yes" : yesOrNo(primaryRow.splitPayments),
      fraudTransactions: yesOrNo(primaryRow.fraudTransactions),
      refundInvoice: primaryRow.refundInvoice?.trim() || "No",
      missOpportunity: yesOrNo(primaryRow.missOpportunity),
      paymentFraud: yesOrNo(primaryRow.paymentFraud),
      aalSwap: yesOrNo(primaryRow.aalSwap),
      mim: yesOrNo(primaryRow.mim),
      notes: primaryRow.notes,
      pitchNb: primaryRow.pitchNb,
      pitchQuality: primaryRow.pitchQuality || "Not Observed",
      pitchNotes: primaryRow.pitchNotes,
      showingPhone: yesOrNo(primaryRow.showingPhone),
      accOffered: yesOrNo(primaryRow.accOffered),
      maximize: yesOrNo(primaryRow.maximize),
      flipping: yesOrNo(primaryRow.flipping),
      bundleNb: primaryRow.bundleNb,
      bundleStartB: primaryRow.bundleStartB,
      bundleEndB: primaryRow.bundleEndB,
      bundleAccGiven: yesOrNo(primaryRow.bundleAccGiven),
      portIn: yesOrNo(primaryRow.portIn),
      nonUp: yesOrNo(primaryRow.nonUp),
      smartPayMentioned: yesOrNo(primaryRow.smartPayMentioned),
      aalBillSame: yesOrNo(primaryRow.aalBillSame),
      onlineRejectedPayment: yesOrNo(primaryRow.onlineRejectedPayment),
      nameOfRepLeaving: primaryRow.nameOfRepLeaving,
      timeLeft: primaryRow.timeLeft,
      timeReturned: primaryRow.timeReturned,
      backRoomTimeIn: primaryRow.backRoomTimeIn,
      backRoomTimeOut: primaryRow.backRoomTimeOut,
      offline: yesOrNo(primaryRow.offline),
      attachments: combinedAttachments.length > 0 ? combinedAttachments : undefined,
    };

    let savedReport: SurveillanceReport;
    try {
      savedReport = await surveillanceService.submitReport(payload);
    } catch (error) {
      toast.error(`Failed to submit report: ${(error as Error).message}`);
      setIsSubmitting(false);
      return;
    }

    setReports((prev) => {
      const exists = prev.some((r) => r.id === savedReport.id);
      return exists
        ? prev.map((r) => (r.id === savedReport.id ? savedReport : r))
        : [savedReport, ...prev];
    });

    const updatedReq: SurveillanceRequest = {
      ...reqItem,
      status: "Report Received",
      reportStatus: "Pending Review",
      linkedReportId: savedReport.id,
      preparedBy: savedReport.investigatorName,
      preparedById: savedReport.investigatorId,
      preparedByEmail: savedReport.investigatorEmail,
      preparedByPhone: savedReport.investigatorPhone,
      preparedByRole: savedReport.investigatorRole,
      preparedByDepartment: savedReport.investigatorDepartment,
      preparedAt: savedReport.submittedAt,
      rejectionReason: undefined,
      managerComments: undefined,
    };

    // Clear MMKV draft storage for this request once final submission succeeds
    surveillanceService.clearRequestDraft(reqItem.id);
    setSavedRowTimestamps({});
    setDirtyRowIds({});

    setRequests((prev) => prev.map((r) => (r.id === reqItem.id ? updatedReq : r)));
    setSelectedDetail(updatedReq);
    setIsSubmitting(false);
    setIsEditingReport(false);

    toast.success("Surveillance audit report has been submitted successfully.");
  };

  // Strictly the 5 requested columns: Store Name, Market, Requested Date, Requested By, Status
  const columns: Column<SurveillanceRequest>[] = useMemo(
    () => [
      {
        key: "storeName",
        header: "Store Name",
        searchValue: (r) => r.storeName || "-",
        accessor: (r) => (
          <span className="font-medium text-foreground text-sm">
            {r.storeName?.trim() ? r.storeName : "-"}
          </span>
        ),
      },
      {
        key: "market",
        header: "Market",
        searchValue: (r) => r.marketName || "-",
        accessor: (r) => (
          <span className="text-foreground text-sm">
            {r.marketName?.trim() ? r.marketName : "-"}
          </span>
        ),
      },
      {
        key: "requestedDate",
        header: "Requested Date",
        searchValue: (r) =>
          r.createdAt ? new Date(r.createdAt).toLocaleDateString() : r.incidentDate || "-",
        accessor: (r) => (
          <span className="text-foreground text-sm">
            {r.createdAt
              ? new Date(r.createdAt).toLocaleDateString()
              : r.incidentDate?.trim()
                ? r.incidentDate
                : "-"}
          </span>
        ),
      },
      {
        key: "requestedBy",
        header: "Requested By",
        searchValue: (r) => r.requestedBy || "-",
        accessor: (r) => (
          <span className="text-foreground text-sm">
            {r.requestedBy?.trim() ? r.requestedBy : "-"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        searchValue: (r) => (r.status ? STATUS_CONFIG[r.status]?.label || r.status : "-"),
        accessor: (r) => {
          if (!r.status) return <span className="text-foreground text-sm">-</span>;
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

  // VIEW 3: EDITABLE SURVEILLANCE AUDIT REPORT FORM (Opened when clicking "Submit Report" inside Report Details)
  if (selectedDetail && isEditingReport) {
    const activeItem = requests.find((r) => r.id === selectedDetail.id) || selectedDetail;

    const defaultDate =
      activeItem.incidentDate?.split(" - ")[0]?.trim() ||
      new Date().toISOString().split("T")[0];

    return (
      <div className="space-y-6 pb-12 animate-fade-in">
        {/* Top Bar (Only Add Row on top right; Submit Report is strictly at bottom right) */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseEditableForm}
              className="h-8 gap-1.5 px-2.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Report Details
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Submit Surveillance Audit Report
              </h1>
              <p className="text-xs text-muted-foreground">
                {activeItem.storeName} • {activeItem.marketName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddAuditRow(activeItem.storeName, defaultDate)}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Row ({editableRows.length})
            </Button>
          </div>
        </div>

        {/* Editable Multi-Row Audit Form Cards */}
        <div className="space-y-4">
          {editableRows.map((row, index) => {
            const isExpanded = expandedRowIds[row.id] ?? true;
            const rowSavedAt = savedRowTimestamps[row.id];
            const isRowDirty = Boolean(dirtyRowIds[row.id]);
            const isRowSavedClean = Boolean(rowSavedAt && !isRowDirty);
            const salesRepChoices =
              row.salesRep && !SALES_REP_NAMES.includes(row.salesRep)
                ? [row.salesRep, ...SALES_REP_NAMES]
                : SALES_REP_NAMES;
            const transTypeChoices =
              row.transType && !TRANSACTION_TYPE_OPTIONS.includes(row.transType)
                ? [row.transType, ...TRANSACTION_TYPE_OPTIONS]
                : TRANSACTION_TYPE_OPTIONS;
            const computedDifference = calculateDifferenceDisplay(
              row.invoiceAmount,
              row.totalTaken,
            );

            return (
              <Card key={row.id} className="border-border/80 overflow-hidden shadow-xs">
                {/* Row Header */}
                <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleRowExpanded(row.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <Badge variant="outline" className="font-mono text-xs font-semibold">
                      Row #{index + 1}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      {row.salesRep.trim() ? row.salesRep : "New Audit Entry"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.invoice.trim() ? `• Invoice: ${row.invoice}` : ""}
                      {row.time.trim() ? ` • Entrance Time: ${row.time}` : ""}
                    </span>
                    {isRowSavedClean && (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                      >
                        Saved
                      </Badge>
                    )}
                    {rowSavedAt && isRowDirty && (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                      >
                        Unsaved Changes
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {editableRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAuditRow(activeItem.id, row.id)}
                      className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                      title="Remove Row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-5 text-xs">
                    {/* 1. Transaction & Billing Details */}
                    <div className="space-y-3 rounded-lg border p-3.5">
                      <div className="flex items-center gap-2 border-b pb-1.5 font-semibold text-foreground text-xs uppercase tracking-wide">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                        1. Transaction & Billing Details
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Date</Label>
                          <Input
                            type="date"
                            value={row.date}
                            onChange={(e) => handleUpdateRowField(row.id, "date", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Store Name</Label>
                          <Input
                            value={row.storeName}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "storeName", e.target.value)
                            }
                            placeholder="Store Name"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Invoice</Label>
                          <Input
                            value={row.invoice}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "invoice", e.target.value)
                            }
                            placeholder="e.g. INV-78412"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">
                            Sales Rep <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={toSelectVal(row.salesRep)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "salesRep", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__empty__">-</SelectItem>
                              {salesRepChoices.map((repName) => (
                                <SelectItem key={repName} value={repName}>
                                  {repName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Cash Time</Label>
                          <AmPmTimePicker
                            value={row.cashTime}
                            onChange={(val) => handleUpdateRowField(row.id, "cashTime", val)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Entrance Time</Label>
                          <AmPmTimePicker
                            value={row.time}
                            onChange={(val) => handleUpdateRowField(row.id, "time", val)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">BDI TIME</Label>
                          <AmPmTimePicker
                            value={row.bdiTime}
                            onChange={(val) => handleUpdateRowField(row.id, "bdiTime", val)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Transaction Type</Label>
                          <Select
                            value={toSelectVal(row.transType)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "transType", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__empty__">-</SelectItem>
                              {transTypeChoices.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Client Type</Label>
                          <Select
                            value={toSelectVal(row.clientType)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "clientType", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__empty__">-</SelectItem>
                              <SelectItem value="Billable">Billable</SelectItem>
                              <SelectItem value="Non Billable">Non Billable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Invoice Amount</Label>
                          <Input
                            value={row.invoiceAmount}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "invoiceAmount", e.target.value)
                            }
                            placeholder="$0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Total Taken</Label>
                          <Input
                            value={row.totalTaken}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "totalTaken", e.target.value)
                            }
                            placeholder="$0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Difference</Label>
                          <Input
                            value={computedDifference}
                            readOnly
                            disabled
                            className="bg-muted/50 font-semibold text-foreground cursor-not-allowed opacity-100"
                            placeholder="$0.00"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Payment Type</Label>
                          <Select
                            value={toSelectVal(row.paymentType)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "paymentType", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__empty__">-</SelectItem>
                              <SelectItem value="Card">Card</SelectItem>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Mix Payment">Mix Payment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {row.paymentType === "Mix Payment" && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Cash Payment</Label>
                              <Input
                                value={row.cash}
                                onChange={(e) =>
                                  handleUpdateRowField(row.id, "cash", e.target.value)
                                }
                                placeholder="$0.00"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Card Payment</Label>
                              <Input
                                value={row.card}
                                onChange={(e) =>
                                  handleUpdateRowField(row.id, "card", e.target.value)
                                }
                                placeholder="$0.00"
                              />
                            </div>
                          </>
                        )}

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Refund Invoice</Label>
                          <Input
                            value={row.refundInvoice}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "refundInvoice", e.target.value)
                            }
                            placeholder="Enter refund invoice..."
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Receipt</Label>
                          <Select
                            value={toSelectVal(row.receipt)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "receipt", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {YES_NO_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Split Payments</Label>
                          <Select
                            value={toSelectVal(row.splitPayments)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "splitPayments", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {YES_NO_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* 2. Fraud & Compliance Verification */}
                    <div className="space-y-3 rounded-lg border p-3.5">
                      <div className="flex items-center gap-2 border-b pb-1.5 font-semibold text-foreground text-xs uppercase tracking-wide">
                        <ShieldAlert className="h-4 w-4 text-rose-600" />
                        2. Fraud & Compliance Verification
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(
                          [
                            { key: "fraudTransactions", label: "Fraud Transactions" },
                            { key: "missOpportunity", label: "Miss Opportunity" },
                            { key: "paymentFraud", label: "Payment fraud" },
                            { key: "aalSwap", label: "AAL Swap" },
                            { key: "mim", label: "MIM" },
                            { key: "onlineRejectedPayment", label: "Online/Rejected Payment" },
                          ] as const
                        ).map((field) => (
                          <div key={field.key} className="space-y-1">
                            <Label className="text-[11px] font-semibold">{field.label}</Label>
                            <Select
                              value={toSelectVal(row[field.key])}
                              onValueChange={(v) =>
                                handleUpdateRowField(row.id, field.key, fromSelectVal(v))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {YES_NO_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1 pt-1">
                        <Label className="text-[11px] font-semibold">Notes</Label>
                        <Textarea
                          value={row.notes}
                          onChange={(e) => handleUpdateRowField(row.id, "notes", e.target.value)}
                          placeholder="Document transaction observations, cash handling, or compliance notes..."
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* 3. Sales Pitch & Bundle Verification */}
                    <div className="space-y-3 rounded-lg border p-3.5">
                      <div className="flex items-center gap-2 border-b pb-1.5 font-semibold text-foreground text-xs uppercase tracking-wide">
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                        3. Sales Pitch & Bundle Verification
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Pitch NB</Label>
                          <Select
                            value={toSelectVal(row.pitchNb)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "pitchNb", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {YES_NO_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Pitch Quality</Label>
                          <Select
                            value={toSelectVal(row.pitchQuality)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "pitchQuality", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__empty__">-</SelectItem>
                              <SelectItem value="GOOD">GOOD</SelectItem>
                              <SelectItem value="AVG">AVG</SelectItem>
                              <SelectItem value="FAIR">FAIR</SelectItem>
                              <SelectItem value="POOR">POOR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(
                          [
                            { key: "showingPhone", label: "Showing Phone?" },
                            { key: "accOffered", label: "Acc Offered" },
                            { key: "maximize", label: "Maximize" },
                            { key: "flipping", label: "Flipping" },
                          ] as const
                        ).map((field) => (
                          <div key={field.key} className="space-y-1">
                            <Label className="text-[11px] font-semibold">{field.label}</Label>
                            <Select
                              value={toSelectVal(row[field.key])}
                              onValueChange={(v) =>
                                handleUpdateRowField(row.id, field.key, fromSelectVal(v))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {YES_NO_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Bundle NB</Label>
                          <Input
                            value={row.bundleNb}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "bundleNb", e.target.value)
                            }
                            placeholder="e.g. Standard Bundle"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Bundle-Start B</Label>
                          <Input
                            value={row.bundleStartB}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "bundleStartB", e.target.value)
                            }
                            placeholder="e.g. Case"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Bundle-End B</Label>
                          <Input
                            value={row.bundleEndB}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "bundleEndB", e.target.value)
                            }
                            placeholder="e.g. Charger"
                          />
                        </div>

                        {(
                          [
                            { key: "bundleAccGiven", label: "Bundle Acc Given" },
                            { key: "portIn", label: "Port In" },
                            { key: "nonUp", label: "Non-Up" },
                            { key: "smartPayMentioned", label: "SmartPay Mentioned" },
                            { key: "aalBillSame", label: "AAL Bill Same" },
                          ] as const
                        ).map((field) => (
                          <div key={field.key} className="space-y-1">
                            <Label className="text-[11px] font-semibold">{field.label}</Label>
                            <Select
                              value={toSelectVal(row[field.key])}
                              onValueChange={(v) =>
                                handleUpdateRowField(row.id, field.key, fromSelectVal(v))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {YES_NO_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1 pt-1">
                        <Label className="text-[11px] font-semibold">Pitch Notes</Label>
                        <Input
                          value={row.pitchNotes}
                          onChange={(e) =>
                            handleUpdateRowField(row.id, "pitchNotes", e.target.value)
                          }
                          placeholder="Enter customer response, accessory pitch, and closing notes..."
                        />
                      </div>
                    </div>

                    {/* 4. Floor Presence & Rep Timings */}
                    <div className="space-y-3 rounded-lg border p-3.5">
                      <div className="flex items-center gap-2 border-b pb-1.5 font-semibold text-foreground text-xs uppercase tracking-wide">
                        <Clock className="h-4 w-4 text-primary" />
                        4. Floor Presence & Rep Timings
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Name of Rep Leaving</Label>
                          <Input
                            value={row.nameOfRepLeaving}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "nameOfRepLeaving", e.target.value)
                            }
                            placeholder="Rep Name"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Time Left</Label>
                          <AmPmTimePicker
                            value={row.timeLeft}
                            onChange={(val) => handleUpdateRowField(row.id, "timeLeft", val)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Time Returned</Label>
                          <AmPmTimePicker
                            value={row.timeReturned}
                            onChange={(val) => handleUpdateRowField(row.id, "timeReturned", val)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Back Room Time - In</Label>
                          <AmPmTimePicker
                            value={row.backRoomTimeIn}
                            onChange={(val) =>
                              handleUpdateRowField(row.id, "backRoomTimeIn", val)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Back Room Time - Out</Label>
                          <AmPmTimePicker
                            value={row.backRoomTimeOut}
                            onChange={(val) =>
                              handleUpdateRowField(row.id, "backRoomTimeOut", val)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Offline</Label>
                          <Select
                            value={toSelectVal(row.offline)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "offline", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {YES_NO_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* 5. Optional Row Attachments */}
                    <div className="space-y-3 rounded-lg border p-3.5">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wide">
                          <Paperclip className="h-4 w-4 text-primary" />
                          5. Attachments (Optional)
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors">
                          <UploadCloud className="h-3.5 w-3.5 text-primary" />
                          Attach Files
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleRowAttachmentUpload(row.id, e)}
                          />
                        </label>
                      </div>

                      {row.attachments && row.attachments.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {row.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <div className="min-w-0">
                                  <div className="truncate font-medium text-foreground text-xs">
                                    {att.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {formatFileSize(att.size)}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveRowAttachment(row.id, att.id)}
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                title="Remove attachment"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No attachments added for this row.
                        </p>
                      )}
                    </div>

                    {/* Row-level MMKV Save Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        {isRowSavedClean ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Saved locally at{" "}
                            {new Date(rowSavedAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : rowSavedAt && isRowDirty ? (
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            Unsaved changes in this row — click Save to update local draft.
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Click Save to preserve this row locally against accidental navigation or power loss.
                          </span>
                        )}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={isRowSavedClean ? "outline" : "default"}
                        onClick={() => handleSaveAuditRow(activeItem.id, row, index)}
                        className="h-8 gap-1.5 px-3.5 text-xs font-semibold"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isRowSavedClean ? "Saved" : "Save"}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Bottom Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddAuditRow(activeItem.storeName, defaultDate)}
            className="gap-1.5 text-xs font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Another Audit Row
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseEditableForm}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleRequestSubmitConfirmation}
              className="gap-2 text-xs font-semibold"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>

        {/* Submit Report Confirmation Modal */}
        <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Report Submission</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to submit this surveillance audit report? Once submitted, this report will be finalized for management review and cannot be modified later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isSubmitting}
                onClick={() => handleSubmitEditableReport(activeItem)}
              >
                {isSubmitting ? "Submitting..." : "Confirm & Submit"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // VIEW 2: REPORT DETAILS PAGE (Identical structure to ReportRequestsPage detail view)
  if (selectedDetail) {
    const item = requests.find((r) => r.id === selectedDetail.id) || selectedDetail;

    const linkedReport = reports.find(
      (rep) => rep.id === item.linkedReportId || rep.requestId === item.id,
    );
    const targetReportId = item.linkedReportId || linkedReport?.id;
    const givenRating = item.managerRating ?? linkedReport?.managerRating;
    const ratingReviewer = item.reportApprovedBy || linkedReport?.reviewedBy;

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
              Back to Surveillance Reports
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Report Details
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {item.status === "Report Requested" ? (
              <Button
                onClick={() => handleOpenEditableForm(item)}
                className="gap-2 bg-primary text-primary-foreground shadow-xs font-medium text-xs h-9"
              >
                <FileText className="h-4 w-4" />
                Submit Report
              </Button>
            ) : (
              <Button
                onClick={() => navigate(`/surveillance/reports/${targetReportId}`)}
                className="gap-2 bg-primary text-primary-foreground shadow-xs font-medium text-xs h-9"
              >
                <Eye className="h-4 w-4" />
                View Report
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
                <span className="text-xs text-muted-foreground">• {item.marketName}</span>
              </div>
              <h2 className="mt-1 text-sm font-medium text-foreground">{item.title}</h2>
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
              <Badge
                variant="outline"
                className={`capitalize text-xs font-semibold px-2.5 py-1 ${PRIORITY_TONES[item.priority]}`}
              >
                Priority: {item.priority}
              </Badge>
            </div>
          </div>
        </Card>

        {/* 2-Column Section: Requested By & Prepared By */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Requested By Profile Card (Blue Accent Tone) */}
          <Card className="p-4 border-blue-200/80 bg-blue-50/40 dark:bg-blue-950/25 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Requested By</span>
              </div>
              <Badge
                variant="outline"
                className="text-xs border-blue-300 text-blue-800 dark:text-blue-300"
              >
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

          {/* Prepared By Profile Card (Purple Accent Tone) */}
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
                    {item.preparedAt
                      ? new Date(item.preparedAt).toLocaleString()
                      : "Recently submitted"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">No Surveillance Report Submitted Yet</p>
                <p>Click "Submit Report" above to fill out and submit the surveillance audit report.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Read-Only Report Rating Card (Displayed when a rating has been given) */}
        {Boolean(givenRating && givenRating > 0) && (
          <Card className="p-4 border-amber-200/90 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/50">
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
                    Rated by <strong className="font-semibold text-foreground">{ratingReviewer}</strong>
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

        {/* Rejection Reason Section (Displayed when rejected) */}
        {(item.status === "Rejected" ||
          item.reportStatus === "Rejected" ||
          Boolean(
            item.rejectionReason || (item.status !== "Approved" && item.managerComments),
          )) && (
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

        {/* Investigation Parameters */}
        <Card className="p-4 border-border/80 space-y-3">
          <div className="border-b pb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Investigation Parameters
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block font-medium">
                Investigation Reason:
              </span>
              <div className="font-semibold text-foreground mt-0.5 text-sm">{item.title}</div>
            </div>
            <div>
              <span className="text-muted-foreground block font-medium">
                Surveillance Date:
              </span>
              <div className="font-semibold text-foreground mt-0.5 text-sm">
                {item.incidentDate}
              </div>
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

  // VIEW 1 (DEFAULT): SURVEILLANCE REPORTS LIST TABLE
  return (
    <div className="space-y-6">
      {/* Clean Header without View As tag or filters */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Surveillance Reports
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Click any row to view report details or submit a surveillance audit report.
        </p>
      </div>

      {/* Top Dashboard Summary Cards (4 Distinct Colors) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Requests (Blue tone) */}
        <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50">
          <div className="text-xs text-blue-800 dark:text-blue-300 font-medium uppercase tracking-wider">
            Total Requests
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-blue-950 dark:text-blue-100">
            {metrics.total}
          </div>
        </Card>

        {/* Card 2: Total Submitted (Purple tone) */}
        <Card className="p-4 border-purple-300/80 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900/50">
          <div className="text-xs text-purple-800 dark:text-purple-300 font-medium uppercase tracking-wider">
            Total Submitted
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-purple-950 dark:text-purple-100">
            {metrics.submitted}
          </div>
        </Card>

        {/* Card 3: Pending (Amber tone) */}
        <Card className="p-4 border-amber-300/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50">
          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium uppercase tracking-wider">
            Pending
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-amber-950 dark:text-amber-100">
            {metrics.pending}
          </div>
        </Card>

        {/* Card 4: Approved (Emerald tone) */}
        <Card className="p-4 border-emerald-300/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50">
          <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium uppercase tracking-wider">
            Approved
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-emerald-950 dark:text-emerald-100">
            {metrics.approved}
          </div>
        </Card>
      </div>

      {/* Standard DataTable with only the 5 requested columns */}
      <DataTable
        rows={requests}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search by Store Name, Market, Requested By, or Status..."
        onRowClick={(r) => {
          setSelectedDetail(r);
          setIsEditingReport(false);
        }}
      />
    </div>
  );
}
