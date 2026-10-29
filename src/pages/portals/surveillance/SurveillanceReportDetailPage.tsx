import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Download,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Check,
  X,
  Star,
  Lock,
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
  type SurveillanceAttachment,
} from "@/services/portals/surveillance";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "-";
  const str = String(val).trim();
  if (!str || str === "—" || str.toLowerCase() === "none") return "-";
  return str;
}

function buildFallbackRowFromReport(report: SurveillanceReport): SurveillanceAuditRow {
  const isBillable = report.clientType === "Billable";
  const isCash = report.paymentMode === "Cash";
  const isCard = report.paymentMode === "Card";
  const yesNo = (v?: string) =>
    v && v.toLowerCase() === "yes" ? "YES" : v && v.toLowerCase() === "no" ? "NO" : v || "";

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
    clientType: report.clientType,
    nb: isBillable ? "" : "NB",
    b: isBillable ? "B" : "",
    invoiceAmount: report.invoiceAmount,
    totalTaken: report.totalTaken,
    paymentType: report.paymentMode === "Cash" ? "Cash" : report.paymentMode === "Card" ? "Card" : "",
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
    nameOfRepLeaving:
      report.nameOfRepLeaving && report.nameOfRepLeaving !== "None" ? report.nameOfRepLeaving : "",
    timeLeft: report.timeLeft && report.timeLeft !== "—" ? report.timeLeft : "",
    timeReturned: report.timeReturned && report.timeReturned !== "—" ? report.timeReturned : "",
    backRoomTimeIn:
      report.backRoomTimeIn && report.backRoomTimeIn !== "—" ? report.backRoomTimeIn : "",
    backRoomTimeOut:
      report.backRoomTimeOut && report.backRoomTimeOut !== "—" ? report.backRoomTimeOut : "",
    offline: yesNo(report.offline) === "YES" ? "YES" : "",
    attachments: report.attachments,
  };
}

interface AuditDataField {
  key: Exclude<keyof SurveillanceAuditRow, "id" | "attachments" | "rowHighlight">;
  label: string;
}

const AUDIT_DATA_FIELDS: AuditDataField[] = [
  { key: "date", label: "Date" },
  { key: "storeName", label: "Store Name" },
  { key: "invoice", label: "Invoice" },
  { key: "cashTime", label: "Cash Time" },
  { key: "time", label: "Time" },
  { key: "bdiTime", label: "BDI TIME" },
  { key: "salesRep", label: "Sales Rep" },
  { key: "transType", label: "Trans/Type" },
  { key: "clientType", label: "Client Type" },
  { key: "invoiceAmount", label: "Invoice Amount" },
  { key: "totalTaken", label: "Total Taken" },
  { key: "paymentType", label: "Payment Type" },
  { key: "difference", label: "Difference" },
  { key: "receipt", label: "Receipt" },
  { key: "splitPayments", label: "Split Payments" },
  { key: "fraudTransactions", label: "Fraud Transactions" },
  { key: "refundInvoice", label: "Refund Invoice" },
  { key: "missOpportunity", label: "Miss Opportunity" },
  { key: "paymentFraud", label: "Payment fraud" },
  { key: "aalSwap", label: "AAL Swap" },
  { key: "mim", label: "MIM" },
  { key: "notes", label: "Notes" },
  { key: "pitchNb", label: "Pitch NB" },
  { key: "pitchQuality", label: "Pitch Quality" },
  { key: "pitchNotes", label: "Pitch Notes" },
  { key: "showingPhone", label: "Showing Phone?" },
  { key: "accOffered", label: "Acc Offered" },
  { key: "maximize", label: "Maximize" },
  { key: "flipping", label: "Flipping" },
  { key: "bundleNb", label: "Bundle NB" },
  { key: "bundleStartB", label: "Bundle-Start B" },
  { key: "bundleEndB", label: "Bundle-End B" },
  { key: "bundleAccGiven", label: "Bundle Acc Given" },
  { key: "portIn", label: "Port In" },
  { key: "nonUp", label: "Non-Up" },
  { key: "smartPayMentioned", label: "SmartPay Mentioned" },
  { key: "aalBillSame", label: "AAL Bill Same" },
  { key: "onlineRejectedPayment", label: "Online/Rejected Payment" },
  { key: "nameOfRepLeaving", label: "Name of Rep Leaving" },
  { key: "timeLeft", label: "Time Left" },
  { key: "timeReturned", label: "Time Returned" },
  { key: "backRoomTimeIn", label: "Back Room Time - In" },
  { key: "backRoomTimeOut", label: "Back Room Time - Out" },
  { key: "offline", label: "Offline" },
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

  // Row attachment viewer modal state
  const [selectedRowAttachments, setSelectedRowAttachments] = useState<{
    invoice: string;
    time: string;
    files: SurveillanceAttachment[];
  } | null>(null);

  // Review states
  const [managerRating, setManagerRating] = useState<number>(report?.managerRating || 0);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Multi-row audit dataset
  const allRows: SurveillanceAuditRow[] = useMemo(() => {
    if (!report) return [];
    if (report.rows && report.rows.length > 0) {
      return report.rows;
    }
    return [buildFallbackRowFromReport(report)];
  }, [report]);

  const resolveFieldDisplay = (
    row: SurveillanceAuditRow,
    key: AuditDataField["key"],
  ): string => {
    if (key === "clientType") {
      if (row.clientType && row.clientType.trim()) return formatCellValue(row.clientType);
      if (row.b?.trim().toUpperCase() === "B") return "Billable";
      if (row.nb?.trim().toUpperCase() === "NB") return "Non Billable";
      return "-";
    }
    if (key === "paymentType") {
      if (row.paymentType && row.paymentType.trim()) return formatCellValue(row.paymentType);
      if (row.card && row.card.trim() && row.cash && row.cash.trim()) return "Card / Cash";
      if (row.card && row.card.trim()) return "Card";
      if (row.cash && row.cash.trim()) return "Cash";
      return "-";
    }
    return formatCellValue(row[key]);
  };

  // Consistent DataTable columns with uniform text color, "-" for missing values, and Attachments last column
  const columns: Column<SurveillanceAuditRow>[] = useMemo(() => {
    const dataCols: Column<SurveillanceAuditRow>[] = AUDIT_DATA_FIELDS.map((field) => ({
      key: field.key,
      header: field.label,
      className:
        field.key === "notes" || field.key === "pitchNotes"
          ? "min-w-[220px] max-w-[300px] whitespace-normal text-foreground"
          : "whitespace-nowrap text-foreground",
      searchValue: (row) => resolveFieldDisplay(row, field.key),
      accessor: (row) => (
        <span className="text-foreground">{resolveFieldDisplay(row, field.key)}</span>
      ),
    }));

    const attachmentCol: Column<SurveillanceAuditRow> = {
      key: "attachments",
      header: "Attachments",
      className: "whitespace-nowrap text-foreground",
      searchValue: (row) =>
        row.attachments && row.attachments.length > 0
          ? row.attachments.map((a) => a.name).join(" ")
          : "-",
      accessor: (row) => {
        if (!row.attachments || row.attachments.length === 0) {
          return <span className="text-foreground">-</span>;
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRowAttachments({
                invoice: formatCellValue(row.invoice),
                time: formatCellValue(row.time),
                files: row.attachments || [],
              });
            }}
            className="inline-flex items-center gap-1.5 text-foreground underline-offset-4 hover:underline"
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>
              {row.attachments.length === 1
                ? row.attachments[0].name
                : `${row.attachments[0].name} (+${row.attachments.length - 1})`}
            </span>
          </button>
        );
      },
    };

    return [...dataCols, attachmentCol];
  }, []);

  const handleExportCsv = () => {
    if (!report) return;
    const headers = [
      ...AUDIT_DATA_FIELDS.map((c) => `"${c.label.replace(/"/g, '""')}"`),
      '"Attachments"',
    ].join(",");

    const csvLines = allRows.map((row) => {
      const cells = AUDIT_DATA_FIELDS.map((c) => {
        const val = resolveFieldDisplay(row, c.key);
        return `"${val.replace(/"/g, '""')}"`;
      });
      const attCell =
        row.attachments && row.attachments.length > 0
          ? row.attachments.map((a) => a.name).join("; ")
          : "-";
      cells.push(`"${attCell.replace(/"/g, '""')}"`);
      return cells.join(",");
    });

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
    toast.success(`Exported ${allRows.length} audit rows to CSV.`);
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
      {/* Top Header (Clean Title without sub-tags) */}
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
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Surveillance Audit Report
          </h1>
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
        </div>
      </div>

      {/* Consistent Application DataTable with Top-Right Search Bar */}
      <DataTable
        rows={allRows}
        columns={columns}
        rowKey={(r, i) => r.id || String(i)}
        pageSize={25}
        searchPlaceholder="Search audit records..."
      />

      {/* Manager Review, Decline Reason & Optional 5-Star Submitter Rating */}
      {(userCanApprove || Boolean(report.reviewedBy) || userRole === "district_manager") && (
        <Card className="p-5 border-border/80 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Manager Review & Submitter Rating
            </div>
            {!userCanApprove && (
              <span className="inline-flex items-center text-xs text-amber-700 dark:text-amber-400 font-medium">
                <Lock className="h-3.5 w-3.5 mr-1" />{" "}
                {userRole === "district_manager" ? "View Only (District Manager)" : "Read Only"}
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
                    on {report.reviewedAt ? new Date(report.reviewedAt).toLocaleString() : "-"}
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
          ) : (
            !userCanApprove && (
              <p className="text-xs text-muted-foreground">
                This report is currently awaiting management review.
              </p>
            )
          )}

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
      )}

      {/* Row Attachments Viewer Dialog */}
      <Dialog
        open={Boolean(selectedRowAttachments)}
        onOpenChange={(open) => {
          if (!open) setSelectedRowAttachments(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Row Attachments</DialogTitle>
            <DialogDescription>
              Invoice: {selectedRowAttachments?.invoice || "-"} · Time:{" "}
              {selectedRowAttachments?.time || "-"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {selectedRowAttachments?.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  {file.type?.includes("image") ? (
                    <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="truncate">
                    <span className="font-medium text-foreground truncate block">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRowAttachments(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
