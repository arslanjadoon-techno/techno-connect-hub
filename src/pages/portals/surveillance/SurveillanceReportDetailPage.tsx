import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
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
  const displayVal = disabled ? value : (hoverVal ?? value);

  return (
    <div className={`flex items-center gap-1.5 ${disabled ? "select-none" : ""}`}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && onChange && onChange(star === value ? 0 : star)}
            onMouseEnter={() => !disabled && setHoverVal(star)}
            onMouseLeave={() => !disabled && setHoverVal(null)}
            className={`p-0.5 transition-transform ${
              disabled
                ? "pointer-events-none cursor-default"
                : "cursor-pointer hover:scale-110"
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

  const [report, setReport] = useState<SurveillanceReport | null>(null);
  const [linkedRequest, setLinkedRequest] = useState<SurveillanceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    surveillanceService
      .getReport(id)
      .then(async (rep) => {
        if (!active) return;
        setReport(rep);
        setManagerRating(rep.managerRating || 0);
        try {
          const req = await surveillanceService.getRequest(rep.requestId);
          if (active) {
            setLinkedRequest(req);
            if (!rep.managerRating && req.managerRating) {
              setManagerRating(req.managerRating);
            }
          }
        } catch {
          // The linked request is only used for a few display fields below -
          // the report itself still renders fine without it.
        }
      })
      .catch((error) => {
        console.error("Error loading surveillance report:", error);
        toast.error("Failed to load the surveillance report");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

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

  const [reviewing, setReviewing] = useState(false);

  const handleApprove = async () => {
    if (!report) return;
    setReviewing(true);
    try {
      const updated = await surveillanceService.reviewReport(report.id, {
        action: "approve",
        rating: managerRating > 0 ? managerRating : undefined,
      });
      setReport(updated);
      if (linkedRequest) {
        setLinkedRequest({
          ...linkedRequest,
          status: "Approved",
          reportStatus: "Approved",
          reportApprovedBy: updated.reviewedBy,
          reportApprovedAt: updated.reviewedAt,
          managerRating: updated.managerRating,
        });
      }
      toast.success(`Surveillance report ${report.id} approved successfully.`);
    } catch (error) {
      toast.error(`Failed to approve report: ${(error as Error).message}`);
    } finally {
      setReviewing(false);
    }
  };

  const executeDecline = async (reason: string) => {
    if (!report) return;
    setReviewing(true);
    try {
      const updated = await surveillanceService.reviewReport(report.id, {
        action: "reject",
        comments: reason,
        rating: managerRating > 0 ? managerRating : undefined,
      });
      setReport(updated);
      if (linkedRequest) {
        setLinkedRequest({
          ...linkedRequest,
          status: "Rejected",
          reportStatus: "Rejected",
          reportApprovedBy: updated.reviewedBy,
          reportApprovedAt: updated.reviewedAt,
          rejectionReason: reason,
          managerComments: reason,
          managerRating: updated.managerRating,
        });
      }
      toast.success(`Surveillance report ${report.id} has been declined.`);
    } catch (error) {
      toast.error(`Failed to decline report: ${(error as Error).message}`);
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading report...</div>;
  }

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

      {/* Manager Review, Finalized Status & Optional 5-Star Submitter Rating */}
      {(() => {
        const isApproved =
          report.status === "Approved" ||
          linkedRequest?.status === "Approved" ||
          linkedRequest?.reportStatus === "Approved";
        const isRejected =
          report.status === "Rejected" ||
          linkedRequest?.status === "Rejected" ||
          linkedRequest?.reportStatus === "Rejected";
        const isAlreadyReviewed = isApproved || isRejected;
        const savedRating = report.managerRating ?? linkedRequest?.managerRating ?? 0;
        const isRatingLocked = savedRating > 0 || isAlreadyReviewed;
        const reviewerDisplayName =
          report.reviewedBy || linkedRequest?.reportApprovedBy || linkedRequest?.approvedBy;
        const reviewedAtDisplay =
          report.reviewedAt || linkedRequest?.reportApprovedAt || linkedRequest?.approvedAt;
        const reviewComments = report.managerComments || linkedRequest?.rejectionReason || linkedRequest?.managerComments;

        const shouldShowReviewCard =
          userCanApprove ||
          isAlreadyReviewed ||
          Boolean(reviewerDisplayName) ||
          savedRating > 0 ||
          userRole === "district_manager";

        if (!shouldShowReviewCard) return null;

        return (
          <Card className="p-5 border-border/80 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Manager Review & Submitter Rating
              </div>
              {(!userCanApprove || isAlreadyReviewed) && (
                <span className="inline-flex items-center text-xs text-amber-700 dark:text-amber-400 font-medium">
                  <Lock className="h-3.5 w-3.5 mr-1" />{" "}
                  {isAlreadyReviewed
                    ? "Decision Finalized"
                    : userRole === "district_manager"
                      ? "View Only (District Manager)"
                      : "Read Only"}
                </span>
              )}
            </div>

            {/* Finalized Status Banner (Replaces Approve / Decline buttons once Approved or Rejected) */}
            {isAlreadyReviewed && (
              <div
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3.5 text-xs ${
                  isApproved
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/25"
                    : "border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/25"
                }`}
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  {isApproved ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground text-xs sm:text-sm">
                      {isApproved
                        ? "This report has already been approved."
                        : "This report has already been rejected."}
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      {reviewerDisplayName
                        ? `Reviewed by ${reviewerDisplayName}${
                            reviewedAtDisplay
                              ? ` on ${new Date(reviewedAtDisplay).toLocaleString()}`
                              : ""
                          }. `
                        : ""}
                      Once a decision is recorded, this report cannot be approved or rejected again.
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs font-semibold ${
                    isApproved
                      ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "border-rose-300 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}
                >
                  {isApproved ? "Approved" : "Rejected"}
                </Badge>
              </div>
            )}

            {/* Reviewer Remarks / Decline Reason */}
            {reviewComments && (
              <div className="p-3.5 rounded-lg border bg-card text-xs">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  {isRejected ? "Decline Reason:" : "Manager Remarks:"}
                </span>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {reviewComments}
                </p>
              </div>
            )}

            {/* Pending state message for non-approvers */}
            {!isAlreadyReviewed && !userCanApprove && (
              <p className="text-xs text-muted-foreground">
                This report is currently awaiting management review.
              </p>
            )}

            {/* Submitter Rating (Interactive only before rating is submitted and while report is pending review) */}
            {(userCanApprove || isAlreadyReviewed || savedRating > 0) && (
              <div className="space-y-1.5 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-xs font-semibold">
                    {isRatingLocked
                      ? "Submitter Rating"
                      : "Rate Submitter's Investigation (Optional 5-Star Rating)"}
                  </Label>
                  {savedRating > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      • Rating has already been submitted and cannot be modified.
                    </span>
                  )}
                </div>
                <StarRating
                  value={savedRating > 0 ? savedRating : managerRating}
                  onChange={(v) => setManagerRating(v)}
                  disabled={isRatingLocked || !userCanApprove}
                />
              </div>
            )}

            {/* Approve & Decline Action Buttons (Strictly hidden once Approved or Rejected) */}
            {userCanApprove && !isAlreadyReviewed && (
              <div className="flex items-center justify-end gap-3 pt-2 border-t">
                <Button
                  variant="destructive"
                  disabled={reviewing}
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
                  disabled={reviewing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 text-xs font-medium"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {reviewing ? "Approving..." : "Approve Report"}
                </Button>
              </div>
            )}
          </Card>
        );
      })()}

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
              disabled={reviewing}
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
