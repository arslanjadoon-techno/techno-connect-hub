import { useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  INITIAL_SURVEILLANCE_REQUESTS,
  INITIAL_SURVEILLANCE_REPORTS,
} from "./surveillance-data";
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
    nb: "",
    b: "B",
    invoiceAmount: "",
    totalTaken: "",
    cash: "",
    card: "",
    difference: "$0.00",
    receipt: "YES",
    splitPayments: "NO",
    fraudTransactions: "NO",
    refundInvoice: "NO",
    missOpportunity: "NO",
    paymentFraud: "NO",
    aalSwap: "NO",
    mim: "NO",
    notes: "",
    pitchNb: "",
    pitchQuality: "GOOD",
    pitchNotes: "",
    showingPhone: "YES",
    accOffered: "YES",
    maximize: "YES",
    flipping: "NO",
    bundleNb: "",
    bundleStartB: "",
    bundleEndB: "",
    bundleAccGiven: "YES",
    portIn: "NO",
    nonUp: "NO",
    smartPayMentioned: "YES",
    aalBillSame: "YES",
    onlineRejectedPayment: "NO",
    nameOfRepLeaving: "",
    timeLeft: "",
    timeReturned: "",
    backRoomTimeIn: "",
    backRoomTimeOut: "",
    offline: "NO",
    attachments: [],
  };
}

const YES_NO_OPTIONS = [
  { value: "__empty__", label: "-" },
  { value: "YES", label: "YES" },
  { value: "NO", label: "NO" },
];

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

  const [requests, setRequests] = useState<SurveillanceRequest[]>(INITIAL_SURVEILLANCE_REQUESTS);
  const [reports, setReports] = useState<SurveillanceReport[]>(INITIAL_SURVEILLANCE_REPORTS);

  // Drill-down state: null = main table, non-null = Report Detail view
  const [selectedDetail, setSelectedDetail] = useState<SurveillanceRequest | null>(null);

  // Editable Report Form state (opened when clicking "Submit Report" inside Report Details)
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editableRows, setEditableRows] = useState<SurveillanceAuditRow[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const existingReport = reports.find(
      (rep) => rep.id === reqItem.linkedReportId || rep.requestId === reqItem.id,
    );

    const initialDate = reqItem.incidentDate?.split(" - ")[0]?.trim() || new Date().toISOString().split("T")[0];

    if (existingReport && existingReport.rows && existingReport.rows.length > 0) {
      const cloned = existingReport.rows.map((r) => ({
        ...r,
        attachments: r.attachments ? [...r.attachments] : [],
      }));
      setEditableRows(cloned);
      setExpandedRowIds({ [cloned[0].id]: true });
    } else {
      const firstRow = createEmptyAuditRow(reqItem.storeName, initialDate);
      setEditableRows([firstRow]);
      setExpandedRowIds({ [firstRow.id]: true });
    }

    setIsEditingReport(true);
  };

  const handleUpdateRowField = <K extends keyof SurveillanceAuditRow>(
    rowId: string,
    field: K,
    value: SurveillanceAuditRow[K],
  ) => {
    setEditableRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  };

  const handleAddAuditRow = (storeName: string, defaultDate?: string) => {
    const nextRow = createEmptyAuditRow(storeName, defaultDate);
    setEditableRows((prev) => [...prev, nextRow]);
    setExpandedRowIds((prev) => ({ ...prev, [nextRow.id]: true }));
  };

  const handleRemoveAuditRow = (rowId: string) => {
    if (editableRows.length <= 1) {
      toast.error("At least one audit entry row is required to submit a report.");
      return;
    }
    setEditableRows((prev) => prev.filter((r) => r.id !== rowId));
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

  const handleSubmitEditableReport = async (reqItem: SurveillanceRequest) => {
    if (editableRows.length === 0) {
      toast.error("Please add at least one audit row before submitting.");
      return;
    }

    const hasMissingRep = editableRows.some((r) => !r.salesRep.trim());
    if (hasMissingRep) {
      toast.error("Please enter the Sales Rep name for every audit row before submitting.");
      return;
    }

    setIsSubmitting(true);

    const existingReport = reports.find(
      (rep) => rep.id === reqItem.linkedReportId || rep.requestId === reqItem.id,
    );
    const reportId =
      existingReport?.id ||
      reqItem.linkedReportId ||
      `SRV-REP-${Math.floor(203 + reports.length)}`;

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
      clientType: (primaryRow.nb === "NB" ? "Non Billable" : "Billable") as
        | "Billable"
        | "Non Billable",
      invoiceAmount: primaryRow.invoiceAmount || "$0.00",
      totalTaken: primaryRow.totalTaken || "$0.00",
      paymentMode: (primaryRow.cash && primaryRow.card
        ? "Split"
        : primaryRow.cash
          ? "Cash"
          : "Card") as "Cash" | "Card" | "Split",
      difference: primaryRow.difference || "$0.00",
      receipt: yesOrNo(primaryRow.receipt),
      splitPayments: yesOrNo(primaryRow.splitPayments),
      fraudTransactions: yesOrNo(primaryRow.fraudTransactions),
      refundInvoice: yesOrNo(primaryRow.refundInvoice),
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

    try {
      await surveillanceService.submitReport(payload);
    } catch {
      // Fallback to local state persistence when running without live backend endpoint
    }

    const now = new Date().toISOString();
    const auditorName = user?.fullName || "Surveillance Auditor";
    const auditorEmail = user?.email || "auditor@techno.com";
    const auditorPhone = user?.phone || "+1 (214) 555-0821";

    const savedReport: SurveillanceReport = {
      id: reportId,
      investigatorName: auditorName,
      investigatorId: String(user?.id || "u-1"),
      investigatorEmail: auditorEmail,
      investigatorPhone: auditorPhone,
      investigatorRole: "Surveillance Auditor",
      investigatorDepartment: user?.departmentName || "Surveillance & Loss Prevention",
      submittedAt: now,
      status: "Report Received",
      ...payload,
    };

    const existingIdx = INITIAL_SURVEILLANCE_REPORTS.findIndex((r) => r.id === reportId);
    if (existingIdx >= 0) {
      INITIAL_SURVEILLANCE_REPORTS[existingIdx] = savedReport;
    } else {
      INITIAL_SURVEILLANCE_REPORTS.unshift(savedReport);
    }

    setReports((prev) => {
      const exists = prev.some((r) => r.id === reportId);
      return exists
        ? prev.map((r) => (r.id === reportId ? savedReport : r))
        : [savedReport, ...prev];
    });

    const updatedReq: SurveillanceRequest = {
      ...reqItem,
      status: "Report Received",
      reportStatus: "Pending Review",
      linkedReportId: reportId,
      preparedBy: auditorName,
      preparedById: String(user?.id || "u-1"),
      preparedByEmail: auditorEmail,
      preparedByPhone: auditorPhone,
      preparedByRole: "Surveillance Auditor",
      preparedByDepartment: user?.departmentName || "Surveillance & Loss Prevention",
      preparedAt: now,
      rejectionReason: undefined,
      managerComments: undefined,
    };

    const sharedReq = INITIAL_SURVEILLANCE_REQUESTS.find((r) => r.id === reqItem.id);
    if (sharedReq) {
      Object.assign(sharedReq, updatedReq);
    }

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
        searchValue: (r) => r.status || "-",
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
    const activeItem =
      requests.find((r) => r.id === selectedDetail.id) ||
      INITIAL_SURVEILLANCE_REQUESTS.find((r) => r.id === selectedDetail.id) ||
      selectedDetail;

    const defaultDate =
      activeItem.incidentDate?.split(" - ")[0]?.trim() ||
      new Date().toISOString().split("T")[0];

    return (
      <div className="space-y-6 pb-12 animate-fade-in">
        {/* Top Bar */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingReport(false)}
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
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmitEditableReport(activeItem)}
              className="h-9 gap-2 text-xs font-semibold shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>

        {/* Editable Multi-Row Audit Form Cards */}
        <div className="space-y-4">
          {editableRows.map((row, index) => {
            const isExpanded = expandedRowIds[row.id] ?? true;

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
                      {row.time.trim() ? ` • Time: ${row.time}` : ""}
                    </span>
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
                      onClick={() => handleRemoveAuditRow(row.id)}
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
                          <Input
                            value={row.salesRep}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "salesRep", e.target.value)
                            }
                            placeholder="Enter sales rep name"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Cash Time</Label>
                          <Input
                            value={row.cashTime}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "cashTime", e.target.value)
                            }
                            placeholder="e.g. 14:15"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Time</Label>
                          <Input
                            value={row.time}
                            onChange={(e) => handleUpdateRowField(row.id, "time", e.target.value)}
                            placeholder="e.g. 14:20"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">BDI TIME</Label>
                          <Input
                            value={row.bdiTime}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "bdiTime", e.target.value)
                            }
                            placeholder="e.g. 14:25"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Trans/Type</Label>
                          <Input
                            value={row.transType}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "transType", e.target.value)
                            }
                            placeholder="e.g. New Activation / Upgrade"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">NB (Non-Billable)</Label>
                          <Select
                            value={toSelectVal(row.nb)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "nb", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__empty__">-</SelectItem>
                              <SelectItem value="NB">NB</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">B (Billable)</Label>
                          <Select
                            value={toSelectVal(row.b)}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "b", fromSelectVal(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__empty__">-</SelectItem>
                              <SelectItem value="B">B</SelectItem>
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
                          <Label className="text-[11px] font-semibold">Cash</Label>
                          <Input
                            value={row.cash}
                            onChange={(e) => handleUpdateRowField(row.id, "cash", e.target.value)}
                            placeholder="$0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Card</Label>
                          <Input
                            value={row.card}
                            onChange={(e) => handleUpdateRowField(row.id, "card", e.target.value)}
                            placeholder="$0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Difference</Label>
                          <Input
                            value={row.difference}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "difference", e.target.value)
                            }
                            placeholder="$0.00"
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
                            { key: "refundInvoice", label: "Refund Invoice" },
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
                          <Input
                            value={row.pitchNb}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "pitchNb", e.target.value)
                            }
                            placeholder="e.g. YES"
                          />
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
                          <Input
                            value={row.timeLeft}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "timeLeft", e.target.value)
                            }
                            placeholder="e.g. 15:00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Time Returned</Label>
                          <Input
                            value={row.timeReturned}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "timeReturned", e.target.value)
                            }
                            placeholder="e.g. 15:12"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Back Room Time - In</Label>
                          <Input
                            value={row.backRoomTimeIn}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "backRoomTimeIn", e.target.value)
                            }
                            placeholder="e.g. 16:05"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Back Room Time - Out</Label>
                          <Input
                            value={row.backRoomTimeOut}
                            onChange={(e) =>
                              handleUpdateRowField(row.id, "backRoomTimeOut", e.target.value)
                            }
                            placeholder="e.g. 16:10"
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
              onClick={() => setIsEditingReport(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmitEditableReport(activeItem)}
              className="gap-2 text-xs font-semibold"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: REPORT DETAILS PAGE (Identical structure to ReportRequestsPage detail view + "Submit Report" button)
  if (selectedDetail) {
    const item =
      requests.find((r) => r.id === selectedDetail.id) ||
      INITIAL_SURVEILLANCE_REQUESTS.find((r) => r.id === selectedDetail.id) ||
      selectedDetail;

    const reportExists = Boolean(
      item.linkedReportId ||
        item.preparedBy ||
        item.status === "Report Received" ||
        item.status === "Approved" ||
        item.status === "Rejected",
    );

    const targetReportId =
      item.linkedReportId || (item.id === "SRV-REQ-101" ? "SRV-REP-202" : "SRV-REP-201");

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
            {item.status !== "Report Requested" && reportExists && (
              <Button
                variant="outline"
                onClick={() => navigate(`/surveillance/reports/${targetReportId}`)}
                className="gap-2 font-medium text-xs h-9"
              >
                <Eye className="h-4 w-4" />
                View Report
              </Button>
            )}

            <Button
              onClick={() => handleOpenEditableForm(item)}
              className="gap-2 bg-primary text-primary-foreground shadow-xs font-medium text-xs h-9"
            >
              <FileText className="h-4 w-4" />
              Submit Report
            </Button>
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
          Click any row to view report details and submit a surveillance audit report.
        </p>
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
