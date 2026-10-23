import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Printer,
  Download,
  FileText,
  Paperclip,
  Check,
  X,
  Star,
  Lock,
  Search,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  INITIAL_SURVEILLANCE_REPORTS,
  INITIAL_SURVEILLANCE_REQUESTS,
} from "./surveillance-data";
import {
  surveillanceService,
  getSurveillanceRole,
  canApproveSurveillance,
  type SurveillanceReport,
  type SurveillanceRequest,
  type SurveillanceAuditRow,
} from "@/services/portals/surveillance";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseCurrencyValue(raw: string): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  const isParenNegative = trimmed.startsWith("(") && trimmed.endsWith(")");
  const numeric = parseFloat(trimmed.replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(numeric)) return 0;
  return isParenNegative ? -Math.abs(numeric) : numeric;
}

function formatAccountingCurrency(val: number): string {
  if (Math.abs(val) < 0.005) return "$0.00";
  if (val < 0) {
    return `($${Math.abs(val).toFixed(2)})`;
  }
  return `$${val.toFixed(2)}`;
}

function buildFallbackRowFromReport(report: SurveillanceReport): SurveillanceAuditRow {
  const isBillable = report.clientType === "Billable";
  const isCash = report.paymentMode === "Cash";
  const isCard = report.paymentMode === "Card";
  const yesNo = (v?: string) => (v && v.toLowerCase() === "yes" ? "YES" : v && v.toLowerCase() === "no" ? "NO" : v || "");

  return {
    id: `${report.id}-row-1`,
    date: report.date,
    storeName: report.storeName,
    invoice: report.invoiceNo,
    cashTime: report.cashTime,
    time: report.time,
    bdiTime: report.bdiTime,
    salesRep: report.salesRep,
    transType: report.transType,
    nb: isBillable ? "" : "NB",
    b: isBillable ? "B" : "",
    invoiceAmount: report.invoiceAmount,
    totalTaken: report.totalTaken,
    cash: isCash ? report.totalTaken : "",
    card: isCard ? report.totalTaken : "",
    difference: report.difference || "$0.00",
    receipt: yesNo(report.receipt),
    splitPayments: yesNo(report.splitPayments),
    fraudTransactions: yesNo(report.fraudTransactions) === "YES" ? "YES" : "",
    refundInvoice: yesNo(report.refundInvoice) === "YES" ? "YES" : "",
    missOpportunity: yesNo(report.missOpportunity) === "YES" ? "YES" : "",
    paymentFraud: yesNo(report.paymentFraud) === "YES" ? "YES" : "",
    aalSwap: yesNo(report.aalSwap) === "YES" ? "YES" : "",
    mim: yesNo(String(report.mim)) === "YES" ? "YES" : "",
    notes: report.notes || "",
    pitchNb: yesNo(report.pitchNb) === "YES" ? "YES" : report.pitchNb || "",
    pitchQuality: report.pitchQuality === "Not Observed" ? "" : report.pitchQuality.toUpperCase(),
    pitchNotes: report.pitchNotes || "",
    showingPhone: yesNo(report.showingPhone) === "YES" ? "YES" : "",
    accOffered: yesNo(report.accOffered) === "YES" ? "YES" : "",
    maximize: yesNo(report.maximize) === "YES" ? "YES" : "",
    flipping: yesNo(report.flipping) === "YES" ? "YES" : "",
    bundleNb: report.bundleNb && report.bundleNb !== "None" ? report.bundleNb : "",
    bundleStartB: report.bundleStartB && report.bundleStartB !== "—" ? report.bundleStartB : "",
    bundleEndB: report.bundleEndB && report.bundleEndB !== "—" ? report.bundleEndB : "",
    bundleAccGiven: yesNo(report.bundleAccGiven) === "YES" ? "YES" : "",
    portIn: yesNo(report.portIn) === "YES" ? "YES" : "",
    nonUp: yesNo(report.nonUp) === "YES" ? "YES" : "",
    smartPayMentioned: yesNo(report.smartPayMentioned) === "YES" ? "YES" : "",
    aalBillSame: yesNo(report.aalBillSame) === "YES" ? "YES" : "",
    onlineRejectedPayment: yesNo(report.onlineRejectedPayment) === "YES" ? "YES" : "",
    nameOfRepLeaving: report.nameOfRepLeaving && report.nameOfRepLeaving !== "None" ? report.nameOfRepLeaving : "",
    timeLeft: report.timeLeft && report.timeLeft !== "—" ? report.timeLeft : "",
    timeReturned: report.timeReturned && report.timeReturned !== "—" ? report.timeReturned : "",
    backRoomTimeIn: report.backRoomTimeIn && report.backRoomTimeIn !== "—" ? report.backRoomTimeIn : "",
    backRoomTimeOut: report.backRoomTimeOut && report.backRoomTimeOut !== "—" ? report.backRoomTimeOut : "",
    offline: yesNo(report.offline) === "YES" ? "YES" : "",
    rowHighlight:
      report.fraudTransactions === "Yes" || report.paymentFraud === "Yes"
        ? "violation"
        : undefined,
  };
}

interface AuditColumnDef {
  key: keyof SurveillanceAuditRow;
  label: string;
  align?: "left" | "center" | "right";
  mono?: boolean;
  minWidth?: string;
}

const AUDIT_TABLE_COLUMNS: AuditColumnDef[] = [
  { key: "date", label: "Date", align: "center", mono: true, minWidth: "min-w-[96px]" },
  { key: "storeName", label: "Store Name", align: "left", minWidth: "min-w-[210px]" },
  { key: "invoice", label: "Invoice", align: "center", mono: true, minWidth: "min-w-[82px]" },
  { key: "cashTime", label: "Cash Time", align: "center", mono: true, minWidth: "min-w-[98px]" },
  { key: "time", label: "Time", align: "center", mono: true, minWidth: "min-w-[98px]" },
  { key: "bdiTime", label: "BDI TIME", align: "center", mono: true, minWidth: "min-w-[98px]" },
  { key: "salesRep", label: "Sales Rep", align: "center", minWidth: "min-w-[130px]" },
  { key: "transType", label: "Trans/Type", align: "center", minWidth: "min-w-[170px]" },
  { key: "nb", label: "NB", align: "center", minWidth: "min-w-[44px]" },
  { key: "b", label: "B", align: "center", minWidth: "min-w-[40px]" },
  { key: "invoiceAmount", label: "Invoice Amount", align: "right", mono: true, minWidth: "min-w-[116px]" },
  { key: "totalTaken", label: "Total Taken", align: "right", mono: true, minWidth: "min-w-[104px]" },
  { key: "cash", label: "Cash", align: "right", mono: true, minWidth: "min-w-[88px]" },
  { key: "card", label: "Card", align: "right", mono: true, minWidth: "min-w-[88px]" },
  { key: "difference", label: "Difference", align: "right", mono: true, minWidth: "min-w-[96px]" },
  { key: "receipt", label: "Receipt", align: "center", minWidth: "min-w-[74px]" },
  { key: "splitPayments", label: "Split Payments", align: "center", minWidth: "min-w-[110px]" },
  { key: "fraudTransactions", label: "Fraud Transactions", align: "center", minWidth: "min-w-[136px]" },
  { key: "refundInvoice", label: "Refund Invoice", align: "center", minWidth: "min-w-[114px]" },
  { key: "missOpportunity", label: "Miss Opportunity", align: "center", minWidth: "min-w-[126px]" },
  { key: "paymentFraud", label: "Payment fraud", align: "center", minWidth: "min-w-[114px]" },
  { key: "aalSwap", label: "AAL Swap", align: "center", minWidth: "min-w-[88px]" },
  { key: "mim", label: "MIM", align: "center", minWidth: "min-w-[64px]" },
  { key: "notes", label: "Notes", align: "left", minWidth: "min-w-[220px]" },
  { key: "pitchNb", label: "Pitch NB", align: "center", minWidth: "min-w-[82px]" },
  { key: "pitchQuality", label: "Pitch Quality", align: "center", minWidth: "min-w-[104px]" },
  { key: "pitchNotes", label: "Pitch Notes", align: "left", minWidth: "min-w-[200px]" },
  { key: "showingPhone", label: "Showing Phone?", align: "center", minWidth: "min-w-[124px]" },
  { key: "accOffered", label: "Acc Offered", align: "center", minWidth: "min-w-[98px]" },
  { key: "maximize", label: "Maximize", align: "center", minWidth: "min-w-[88px]" },
  { key: "flipping", label: "Flipping", align: "center", minWidth: "min-w-[82px]" },
  { key: "bundleNb", label: "Bundle NB", align: "center", minWidth: "min-w-[96px]" },
  { key: "bundleStartB", label: "Bundle-Start B", align: "center", minWidth: "min-w-[118px]" },
  { key: "bundleEndB", label: "Bundle-End B", align: "center", minWidth: "min-w-[114px]" },
  { key: "bundleAccGiven", label: "Bundle Acc Given", align: "center", minWidth: "min-w-[128px]" },
  { key: "portIn", label: "Port In", align: "center", minWidth: "min-w-[74px]" },
  { key: "nonUp", label: "Non-Up", align: "center", minWidth: "min-w-[76px]" },
  { key: "smartPayMentioned", label: "SmartPay Mentioned", align: "center", minWidth: "min-w-[148px]" },
  { key: "aalBillSame", label: "AAL Bill Same", align: "center", minWidth: "min-w-[110px]" },
  { key: "onlineRejectedPayment", label: "Online/Rejected Payment", align: "center", minWidth: "min-w-[176px]" },
  { key: "nameOfRepLeaving", label: "Name of Rep Leaving", align: "center", minWidth: "min-w-[152px]" },
  { key: "timeLeft", label: "Time Left", align: "center", mono: true, minWidth: "min-w-[94px]" },
  { key: "timeReturned", label: "Time Returned", align: "center", mono: true, minWidth: "min-w-[114px]" },
  { key: "backRoomTimeIn", label: "Back Room Time - In", align: "center", mono: true, minWidth: "min-w-[144px]" },
  { key: "backRoomTimeOut", label: "Back Room Time - Out", align: "center", mono: true, minWidth: "min-w-[152px]" },
  { key: "offline", label: "Offline", align: "center", minWidth: "min-w-[74px]" },
];

function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
}) {
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const displayVal = hoverVal ?? value;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange && onChange(star === value ? 0 : star)}
            onMouseEnter={() => !disabled && setHoverVal(star)}
            onMouseLeave={() => !disabled && setHoverVal(null)}
            className={`p-0.5 transition-transform ${
              disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= displayVal
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground font-medium ml-1">
        {displayVal > 0 ? `${displayVal} of 5 Stars` : "(No rating)"}
      </span>
      {!disabled && value > 0 && (
        <button
          type="button"
          onClick={() => onChange && onChange(0)}
          className="text-[11px] text-muted-foreground hover:text-foreground underline ml-2"
        >
          Clear
        </button>
      )}
    </div>
  );
}

type RowFilterMode = "all" | "invoiced" | "discrepancies";

export default function SurveillanceReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = useMemo(() => getSurveillanceRole(user), [user]);
  const userCanApprove = canApproveSurveillance(userRole);

  const [reportList, setReportList] = useState<SurveillanceReport[]>(INITIAL_SURVEILLANCE_REPORTS);
  const [requestsList, setRequestsList] = useState<SurveillanceRequest[]>(INITIAL_SURVEILLANCE_REQUESTS);

  const report = useMemo(() => {
    return (
      reportList.find((r) => r.id === id || r.requestId === id) ||
      reportList[0]
    );
  }, [reportList, id]);

  const linkedRequest = useMemo(() => {
    if (!report) return null;
    return requestsList.find((r) => r.id === report.requestId || r.linkedReportId === report.id);
  }, [requestsList, report]);

  // Table search & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [rowFilter, setRowFilter] = useState<RowFilterMode>("all");

  // Review states
  const [managerRating, setManagerRating] = useState<number>(report?.managerRating || 0);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Resolve multi-row audit dataset
  const allRows: SurveillanceAuditRow[] = useMemo(() => {
    if (!report) return [];
    if (report.rows && report.rows.length > 0) {
      return report.rows;
    }
    return [buildFallbackRowFromReport(report)];
  }, [report]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter((row) => {
      if (rowFilter === "invoiced" && !row.invoice.trim()) {
        return false;
      }
      if (rowFilter === "discrepancies") {
        const diffNum = parseCurrencyValue(row.difference);
        const hasFlag =
          Math.abs(diffNum) >= 0.01 ||
          row.fraudTransactions === "YES" ||
          row.paymentFraud === "YES" ||
          row.refundInvoice === "YES" ||
          row.missOpportunity === "YES" ||
          row.receipt === "NO";
        if (!hasFlag) return false;
      }
      if (!q) return true;
      return (
        row.invoice.toLowerCase().includes(q) ||
        row.salesRep.toLowerCase().includes(q) ||
        row.transType.toLowerCase().includes(q) ||
        row.storeName.toLowerCase().includes(q) ||
        row.notes.toLowerCase().includes(q) ||
        row.pitchNotes.toLowerCase().includes(q)
      );
    });
  }, [allRows, searchQuery, rowFilter]);

  // Computed ledger totals across filtered rows
  const ledgerTotals = useMemo(() => {
    let totalInvoice = 0;
    let totalTaken = 0;
    let totalCash = 0;
    let totalCard = 0;
    let totalDiff = 0;
    let nbCount = 0;
    let bCount = 0;
    let violationCount = 0;

    for (const r of filteredRows) {
      totalInvoice += parseCurrencyValue(r.invoiceAmount);
      totalTaken += parseCurrencyValue(r.totalTaken);
      totalCash += parseCurrencyValue(r.cash);
      totalCard += parseCurrencyValue(r.card);
      totalDiff += parseCurrencyValue(r.difference);
      if (r.nb === "NB") nbCount += 1;
      if (r.b === "B") bCount += 1;
      if (
        r.fraudTransactions === "YES" ||
        r.paymentFraud === "YES" ||
        r.refundInvoice === "YES"
      ) {
        violationCount += 1;
      }
    }

    return {
      totalInvoice,
      totalTaken,
      totalCash,
      totalCard,
      totalDiff,
      nbCount,
      bCount,
      violationCount,
    };
  }, [filteredRows]);

  const handleExportCsv = () => {
    if (!report) return;
    const headers = AUDIT_TABLE_COLUMNS.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
    const csvLines = filteredRows.map((row) =>
      AUDIT_TABLE_COLUMNS.map((c) => {
        const val = String(row[c.key] ?? "");
        return `"${val.replace(/"/g, '""')}"`;
      }).join(","),
    );
    const csvContent = [headers, ...csvLines].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.id}_Surveillance_Audit_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredRows.length} audit rows to CSV.`);
  };

  const handleApprove = async () => {
    if (!report) return;
    const reviewerName = user?.fullName || "Regional Management Authority";
    const now = new Date().toISOString();

    try {
      await surveillanceService.reviewReport(report.id, {
        action: "approve",
        rating: managerRating > 0 ? managerRating : undefined,
      });
    } catch {
      // Fallback to local state update when previewing without live backend endpoint
    }

    const updated: SurveillanceReport = {
      ...report,
      status: "Approved",
      reviewedBy: reviewerName,
      reviewedAt: now,
      managerRating: managerRating > 0 ? managerRating : report.managerRating,
    };

    setReportList((prev) => prev.map((r) => (r.id === report.id ? updated : r)));

    const targetRep = INITIAL_SURVEILLANCE_REPORTS.find((r) => r.id === report.id);
    if (targetRep) {
      targetRep.status = "Approved";
      targetRep.reviewedBy = reviewerName;
      targetRep.reviewedAt = now;
      if (managerRating > 0) targetRep.managerRating = managerRating;
    }

    if (linkedRequest) {
      setRequestsList((prev) =>
        prev.map((req) =>
          req.id === linkedRequest.id
            ? {
                ...req,
                status: "Approved",
                reportStatus: "Approved",
                reportApprovedBy: reviewerName,
                reportApprovedAt: now,
                managerRating: managerRating > 0 ? managerRating : req.managerRating,
              }
            : req,
        ),
      );

      const targetReq = INITIAL_SURVEILLANCE_REQUESTS.find((r) => r.id === linkedRequest.id);
      if (targetReq) {
        targetReq.status = "Approved";
        targetReq.reportStatus = "Approved";
        targetReq.reportApprovedBy = reviewerName;
        targetReq.reportApprovedAt = now;
        if (managerRating > 0) targetReq.managerRating = managerRating;
      }
    }

    toast.success(`Surveillance report ${report.id} approved successfully.`);
  };

  const executeDecline = async (reason: string) => {
    if (!report) return;
    const reviewerName = user?.fullName || "Regional Management Authority";
    const now = new Date().toISOString();

    try {
      await surveillanceService.reviewReport(report.id, {
        action: "reject",
        comments: reason,
        rating: managerRating > 0 ? managerRating : undefined,
      });
    } catch {
      // Fallback to local state update when previewing without live backend endpoint
    }

    const updated: SurveillanceReport = {
      ...report,
      status: "Rejected",
      reviewedBy: reviewerName,
      reviewedAt: now,
      managerComments: reason,
      managerRating: managerRating > 0 ? managerRating : undefined,
    };

    setReportList((prev) => prev.map((r) => (r.id === report.id ? updated : r)));

    const targetRep = INITIAL_SURVEILLANCE_REPORTS.find((r) => r.id === report.id);
    if (targetRep) {
      targetRep.status = "Rejected";
      targetRep.reviewedBy = reviewerName;
      targetRep.reviewedAt = now;
      targetRep.managerComments = reason;
      if (managerRating > 0) targetRep.managerRating = managerRating;
    }

    if (linkedRequest) {
      setRequestsList((prev) =>
        prev.map((req) =>
          req.id === linkedRequest.id
            ? {
                ...req,
                status: "Rejected",
                reportStatus: "Rejected",
                reportApprovedBy: reviewerName,
                reportApprovedAt: now,
                rejectionReason: reason,
                managerComments: reason,
                managerRating: managerRating > 0 ? managerRating : undefined,
              }
            : req,
        ),
      );

      const targetReq = INITIAL_SURVEILLANCE_REQUESTS.find((r) => r.id === linkedRequest.id);
      if (targetReq) {
        targetReq.status = "Rejected";
        targetReq.reportStatus = "Rejected";
        targetReq.reportApprovedBy = reviewerName;
        targetReq.reportApprovedAt = now;
        targetReq.rejectionReason = reason;
        targetReq.managerComments = reason;
        if (managerRating > 0) {
          targetReq.managerRating = managerRating;
        }
      }
    }

    toast.success(`Surveillance report ${report.id} has been declined.`);
  };

  if (!report) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold">Report Not Found</h2>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Reports
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-9 gap-1.5 px-3 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Surveillance Audit Report
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="font-mono font-semibold text-foreground">{report.id}</span>
              <span aria-hidden="true">·</span>
              <span
                className={`font-semibold ${
                  report.status === "Approved"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : report.status === "Rejected"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-sky-600 dark:text-sky-400"
                }`}
              >
                {report.status}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Auditor: <strong className="text-foreground">{report.investigatorName}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>Submitted {new Date(report.submittedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 px-3.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9 gap-1.5 px-3.5 text-xs font-medium"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-card border-border/80">
          <span className="text-[11px] font-medium text-muted-foreground block">
            Store Location
          </span>
          <div className="font-semibold text-sm text-foreground truncate mt-1" title={report.storeName}>
            {report.storeName}
          </div>
        </Card>

        <Card className="p-3.5 bg-card border-border/80">
          <span className="text-[11px] font-medium text-muted-foreground block">
            Logged Audit Rows
          </span>
          <div className="font-mono tabular-nums font-bold text-base text-foreground mt-1">
            {filteredRows.length}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({ledgerTotals.nbCount} NB / {ledgerTotals.bCount} B)
            </span>
          </div>
        </Card>

        <Card className="p-3.5 bg-card border-border/80">
          <span className="text-[11px] font-medium text-muted-foreground block">
            Invoice Total
          </span>
          <div className="font-mono tabular-nums font-bold text-base text-foreground mt-1">
            {formatAccountingCurrency(ledgerTotals.totalInvoice)}
          </div>
        </Card>

        <Card className="p-3.5 bg-card border-border/80">
          <span className="text-[11px] font-medium text-muted-foreground block">
            Total Taken
          </span>
          <div className="font-mono tabular-nums font-bold text-base text-foreground mt-1">
            {formatAccountingCurrency(ledgerTotals.totalTaken)}
          </div>
        </Card>

        <Card className="p-3.5 bg-card border-border/80">
          <span className="text-[11px] font-medium text-muted-foreground block">
            Net Difference
          </span>
          <div
            className={`font-mono tabular-nums font-bold text-base mt-1 ${
              Math.abs(ledgerTotals.totalDiff) >= 0.01
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatAccountingCurrency(ledgerTotals.totalDiff)}
          </div>
        </Card>

        <Card className="p-3.5 bg-card border-border/80">
          <span className="text-[11px] font-medium text-muted-foreground block">
            Audit Compliance
          </span>
          <div
            className={`font-semibold text-sm mt-1 ${
              ledgerTotals.violationCount > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {ledgerTotals.violationCount > 0
              ? `${ledgerTotals.violationCount} Violation Flagged`
              : "Clear — Verified"}
          </div>
        </Card>
      </div>

      {/* Multi-Row Surveillance Audit Spreadsheet Table */}
      <Card className="border-border/90 overflow-hidden shadow-xs">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 border-b bg-muted/20 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice, sales rep, trans/type, notes..."
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setRowFilter("all")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  rowFilter === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Rows ({allRows.length})
              </button>
              <button
                type="button"
                onClick={() => setRowFilter("invoiced")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  rowFilter === "invoiced"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Invoiced Only
              </button>
              <button
                type="button"
                onClick={() => setRowFilter("discrepancies")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  rowFilter === "discrepancies"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Discrepancies & Flags
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Spreadsheet Grid */}
        <div className="w-full overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="bg-amber-500 text-slate-950">
                <th className="sticky left-0 z-30 bg-amber-500 border-b border-r border-slate-700/35 px-2.5 py-2.5 text-center font-bold whitespace-nowrap min-w-[42px]">
                  #
                </th>
                {AUDIT_TABLE_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`border-b border-r border-slate-700/35 px-3 py-2.5 font-bold whitespace-nowrap ${
                      col.minWidth || ""
                    } ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={AUDIT_TABLE_COLUMNS.length + 1}
                    className="py-12 text-center text-muted-foreground text-sm"
                  >
                    No audit rows match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isOpeningRow = row.rowHighlight === "opening";
                  const rowBgClass =
                    row.rowHighlight === "amber"
                      ? "bg-amber-100/75 hover:bg-amber-100 dark:bg-amber-950/35 dark:hover:bg-amber-950/50"
                      : row.rowHighlight === "green"
                        ? "bg-emerald-100/65 hover:bg-emerald-100/90 dark:bg-emerald-950/35 dark:hover:bg-emerald-950/50"
                        : row.rowHighlight === "violation"
                          ? "bg-rose-100/70 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/55"
                          : "bg-background hover:bg-muted/40";

                  const stickyIndexBg =
                    row.rowHighlight === "amber"
                      ? "bg-amber-100 dark:bg-amber-950"
                      : row.rowHighlight === "green"
                        ? "bg-emerald-100 dark:bg-emerald-950"
                        : row.rowHighlight === "violation"
                          ? "bg-rose-100 dark:bg-rose-950"
                          : "bg-muted/60 dark:bg-slate-900";

                  return (
                    <tr key={row.id || idx} className={`transition-colors ${rowBgClass}`}>
                      <td
                        className={`sticky left-0 z-10 border-b border-r border-slate-300 dark:border-slate-800 px-2 py-2 text-center font-mono tabular-nums text-[11px] text-muted-foreground font-semibold ${stickyIndexBg}`}
                      >
                        {idx + 1}
                      </td>

                      {AUDIT_TABLE_COLUMNS.map((col) => {
                        const rawVal = String(row[col.key] ?? "");

                        // Opening / Shift Handover purple/maroon highlight on Time through Trans/Type cells (matching spreadsheet format)
                        const isOpeningHighlightCell =
                          isOpeningRow &&
                          (col.key === "time" ||
                            col.key === "bdiTime" ||
                            col.key === "salesRep" ||
                            col.key === "transType");

                        // Negative Difference or Flagged Fraud styling
                        const isNegativeDiff =
                          col.key === "difference" &&
                          (rawVal.startsWith("(") || rawVal.startsWith("-"));

                        const isPositiveDiff =
                          col.key === "difference" &&
                          !isNegativeDiff &&
                          rawVal !== "" &&
                          rawVal !== "$0.00" &&
                          rawVal !== "0";

                        const isFraudFlag =
                          (col.key === "fraudTransactions" ||
                            col.key === "paymentFraud" ||
                            col.key === "refundInvoice" ||
                            col.key === "onlineRejectedPayment") &&
                          rawVal.toUpperCase() === "YES";

                        const isNoReceiptFlag =
                          col.key === "receipt" && rawVal.toUpperCase() === "NO";

                        return (
                          <td
                            key={col.key}
                            className={`border-b border-r border-slate-300 dark:border-slate-800 px-2.5 py-2 ${
                              col.key === "notes" || col.key === "pitchNotes"
                                ? "whitespace-normal min-w-[220px] max-w-[300px]"
                                : "whitespace-nowrap"
                            } ${
                              col.mono ? "font-mono tabular-nums" : ""
                            } ${
                              col.align === "right"
                                ? "text-right"
                                : col.align === "center"
                                  ? "text-center"
                                  : "text-left"
                            } ${
                              isOpeningHighlightCell
                                ? "bg-[#6b1d4a] text-white font-bold"
                                : isNegativeDiff || isFraudFlag
                                  ? "text-rose-600 dark:text-rose-400 font-bold"
                                  : isPositiveDiff
                                    ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                                    : isNoReceiptFlag
                                      ? "text-amber-700 dark:text-amber-400 font-semibold"
                                      : "text-foreground"
                            }`}
                          >
                            {rawVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Spreadsheet Summary Totals Footer */}
            {filteredRows.length > 0 && (
              <tfoot className="sticky bottom-0 z-10 bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-400 dark:border-slate-700 font-semibold text-xs">
                <tr>
                  <td className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 px-2 py-2.5 text-center font-mono">
                    Σ
                  </td>
                  {AUDIT_TABLE_COLUMNS.map((col) => {
                    if (col.key === "storeName") {
                      return (
                        <td
                          key={col.key}
                          className="border-r border-slate-300 dark:border-slate-800 px-3 py-2.5 text-left font-bold text-foreground"
                        >
                          Total ({filteredRows.length} Audit Rows)
                        </td>
                      );
                    }
                    if (col.key === "nb") {
                      return (
                        <td
                          key={col.key}
                          className="border-r border-slate-300 dark:border-slate-800 px-2 py-2.5 text-center font-mono tabular-nums"
                        >
                          {ledgerTotals.nbCount || ""}
                        </td>
                      );
                    }
                    if (col.key === "b") {
                      return (
                        <td
                          key={col.key}
                          className="border-r border-slate-300 dark:border-slate-800 px-2 py-2.5 text-center font-mono tabular-nums"
                        >
                          {ledgerTotals.bCount || ""}
                        </td>
                      );
                    }
                    if (col.key === "invoiceAmount") {
                      return (
                        <td
                          key={col.key}
                          className="border-r border-slate-300 dark:border-slate-800 px-2.5 py-2.5 text-right font-mono tabular-nums font-bold"
                        >
                          {formatAccountingCurrency(ledgerTotals.totalInvoice)}
                        </td>
                      );
                    }
                    if (col.key === "totalTaken") {
                      return (
                        <td
                          key={col.key}
                          className="border-r border-slate-300 dark:border-slate-800 px-2.5 py-2.5 text-right font-mono tabular-nums font-bold"
                        >
                          {formatAccountingCurrency(ledgerTotals.totalTaken)}
                        </td>
                      );
                    }
                    if (col.key === "cash") {
                      return (
                        <td
                          key={col.key}
                          className="border-r border-slate-300 dark:border-slate-800 px-2.5 py-2.5 text-right font-mono tabular-nums font-bold"
                        >
                          {formatAccountingCurrency(ledgerTotals.totalCash)}
                        </td>
                      );
                    }
                    if (col.key === "card") {
                      return (
                        <td
                          key={col.key}
                          className="border-r border-slate-300 dark:border-slate-800 px-2.5 py-2.5 text-right font-mono tabular-nums font-bold"
                        >
                          {formatAccountingCurrency(ledgerTotals.totalCard)}
                        </td>
                      );
                    }
                    if (col.key === "difference") {
                      return (
                        <td
                          key={col.key}
                          className={`border-r border-slate-300 dark:border-slate-800 px-2.5 py-2.5 text-right font-mono tabular-nums font-bold ${
                            ledgerTotals.totalDiff < -0.005
                              ? "text-rose-600 dark:text-rose-400"
                              : ""
                          }`}
                        >
                          {formatAccountingCurrency(ledgerTotals.totalDiff)}
                        </td>
                      );
                    }
                    return (
                      <td
                        key={col.key}
                        className="border-r border-slate-300 dark:border-slate-800 px-2.5 py-2.5"
                      />
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Evidence Attachments */}
      {report.attachments && report.attachments.length > 0 && (
        <Card className="p-5 border-border/80 space-y-3">
          <div className="flex items-center gap-2 border-b pb-2 font-semibold text-foreground text-sm">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            Evidence Attachments & Footage Stills
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-foreground truncate block">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Manager Review, Decline Reason & Optional 5-Star Submitter Rating */}
      <Card className="p-5 border-border/80 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Manager Review & Submitter Rating
          </div>
          {!userCanApprove && (
            <span className="inline-flex items-center text-xs text-amber-700 dark:text-amber-400 font-medium">
              <Lock className="h-3.5 w-3.5 mr-1" /> View Only (District Manager)
            </span>
          )}
        </div>

        {report.reviewedBy ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-lg border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Reviewed & Decided By:</span>
                <span className="font-semibold text-foreground text-sm">{report.reviewedBy}</span>
                <span className="text-muted-foreground text-[11px] block mt-0.5">
                  on {report.reviewedAt ? new Date(report.reviewedAt).toLocaleString() : ""}
                </span>
              </div>

              {report.managerRating && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Submitter Rating:</span>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= (report.managerRating || 0)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                    <span className="text-xs font-semibold ml-1.5 text-foreground">
                      {report.managerRating} / 5
                    </span>
                  </div>
                </div>
              )}
            </div>

            {report.managerComments && (
              <div className="p-3.5 rounded-lg border bg-card text-xs">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  {report.status === "Rejected" ? "Decline Reason:" : "Manager Remarks:"}
                </span>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {report.managerComments}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {userCanApprove && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Rate Submitter's Investigation (Optional 5-Star Rating)
              </Label>
              <StarRating
                value={managerRating}
                onChange={(v) => setManagerRating(v)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="destructive"
                onClick={() => {
                  setDeclineReason("");
                  setDeclineModalOpen(true);
                }}
                className="py-2 px-4 text-xs font-medium"
              >
                <X className="h-4 w-4 mr-1.5" />
                Decline Report
              </Button>
              <Button
                onClick={handleApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 text-xs font-medium"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Approve Report
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Decline Report Modal with Mandatory Reason */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Surveillance Report</DialogTitle>
            <DialogDescription>
              Please enter the decline reason. A valid reason is required to decline this report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">
              Decline Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="State why this report is declined or requires reinvestigation..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!declineReason.trim()) {
                  toast.error("Please enter a reason for declining the report.");
                  return;
                }
                executeDecline(declineReason.trim());
                setDeclineModalOpen(false);
              }}
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
