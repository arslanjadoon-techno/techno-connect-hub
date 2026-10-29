import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Paperclip,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  canApproveSurveillance,
  getSurveillanceRole,
  type SurveillanceReport,
  type SurveillanceRequest,
  type SurveillanceAuditRow,
  type SurveillanceAttachment,
} from "@/services/portals/surveillance";
import { getStaticReportById, getStaticRequestById, reviewStaticReport } from "./surveillance-data";

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

function formatSurveillanceDateCell(raw?: string): string {
  const str = (raw || "").split(" - ")[0]?.trim() || "";
  if (!str) return "-";
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
  const already = str.match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/);
  if (already) {
    const dd = already[1].padStart(2, "0");
    const mmm = already[2].charAt(0).toUpperCase() + already[2].slice(1, 3).toLowerCase();
    return `${dd} ${mmm}, ${already[3]}`;
  }
  const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    const mIdx = Number(ymd[2]) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${String(Number(ymd[3])).padStart(2, "0")} ${months[mIdx]}, ${ymd[1]}`;
    }
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return `${String(parsed.getDate()).padStart(2, "0")} ${months[parsed.getMonth()]}, ${parsed.getFullYear()}`;
  }
  return str;
}

function formatReviewDateTime(raw?: string): string {
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const datePart = parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = parsed.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  }
  return raw;
}

function buildFallbackRowFromReport(
  report: SurveillanceReport,
  fallbackMarket?: string,
): SurveillanceAuditRow {
  const ctTrimmed = (report.clientType || "").trim();
  const isCustomClient =
    ctTrimmed.toLowerCase() === "custom" || ctTrimmed.toLowerCase() === "other";
  const isBuyer = ctTrimmed === "Buyer" || ctTrimmed === "Billable";
  const isCash = report.paymentMode === "Cash";
  const isCard = report.paymentMode === "Card";
  const yesNoOrCustom = (v?: string) => {
    if (!v) return "";
    const low = v.trim().toLowerCase();
    if (low === "custom" || low === "other") return "Custom";
    if (low === "yes") return "YES";
    if (low === "no") return "NO";
    return v.trim();
  };
  const pqTrimmed = (report.pitchQuality || "").trim();
  const normalizedPitchQuality =
    !pqTrimmed || pqTrimmed === "Not Observed"
      ? ""
      : pqTrimmed.toLowerCase() === "custom" || pqTrimmed.toLowerCase() === "other"
        ? "Custom"
        : pqTrimmed.toUpperCase();

  return {
    id: `${report.id}-row-1`,
    date: report.date,
    marketName: report.marketName || fallbackMarket || "",
    storeName: report.storeName,
    invoice: report.invoiceNo,
    cashTime: report.cashTime,
    time: report.time,
    bdiTime: report.bdiTime,
    salesRep: report.salesRep,
    transType: report.transType,
    transTypeDetails: report.transTypeDetails || "",
    clientType: isCustomClient ? "Custom" : isBuyer ? "Buyer" : "Non-Buyer",
    clientTypeDetails: report.clientTypeDetails || "",
    nb: isCustomClient || isBuyer ? "" : "NB",
    b: isBuyer ? "B" : "",
    invoiceAmount: report.invoiceAmount,
    totalTaken: report.totalTaken,
    paymentType:
      report.paymentMode === "Split"
        ? "Mix Payment"
        : report.paymentMode === "Cash"
          ? "Cash"
          : report.paymentMode === "Card"
            ? "Card"
            : "",
    cash: isCash ? report.totalTaken : "",
    card: isCard ? report.totalTaken : "",
    difference: report.difference || "$0.00",
    receipt: yesNoOrCustom(report.receipt),
    receiptDetails: report.receiptDetails || "",
    splitPayments: yesNoOrCustom(report.splitPayments),
    fraudTransactions: yesNoOrCustom(report.fraudTransactions),
    fraudTransactionsDetails: report.fraudTransactionsDetails || "",
    refundInvoice:
      report.refundInvoice && report.refundInvoice.toLowerCase() !== "no"
        ? report.refundInvoice
        : "",
    missOpportunity: yesNoOrCustom(report.missOpportunity),
    missOpportunityDetails: report.missOpportunityDetails || "",
    paymentFraud: yesNoOrCustom(report.paymentFraud),
    paymentFraudDetails: report.paymentFraudDetails || "",
    aalSwap: yesNoOrCustom(report.aalSwap),
    aalSwapDetails: report.aalSwapDetails || "",
    mim: yesNoOrCustom(String(report.mim)),
    mimDetails: report.mimDetails || "",
    notes: report.notes || "",
    pitchNb: yesNoOrCustom(report.pitchNb),
    pitchNbDetails: report.pitchNbDetails || "",
    pitchQuality: normalizedPitchQuality,
    pitchQualityDetails: report.pitchQualityDetails || "",
    pitchNotes: report.pitchNotes || "",
    showingPhone: yesNoOrCustom(report.showingPhone),
    showingPhoneDetails: report.showingPhoneDetails || "",
    accOffered: yesNoOrCustom(report.accOffered),
    accOfferedDetails: report.accOfferedDetails || "",
    maximize: yesNoOrCustom(report.maximize),
    maximizeDetails: report.maximizeDetails || "",
    flipping: yesNoOrCustom(report.flipping),
    flippingDetails: report.flippingDetails || "",
    bundleNb: report.bundleNb && report.bundleNb !== "None" ? report.bundleNb : "",
    bundleStartB: report.bundleStartB && report.bundleStartB !== "—" ? report.bundleStartB : "",
    bundleEndB: report.bundleEndB && report.bundleEndB !== "—" ? report.bundleEndB : "",
    bundleAccGiven: yesNoOrCustom(report.bundleAccGiven),
    bundleAccGivenDetails: report.bundleAccGivenDetails || "",
    portIn: yesNoOrCustom(report.portIn),
    portInDetails: report.portInDetails || "",
    nonUp: yesNoOrCustom(report.nonUp),
    nonUpDetails: report.nonUpDetails || "",
    smartPayMentioned: yesNoOrCustom(report.smartPayMentioned),
    smartPayMentionedDetails: report.smartPayMentionedDetails || "",
    aalBillSame: yesNoOrCustom(report.aalBillSame),
    aalBillSameDetails: report.aalBillSameDetails || "",
    onlineRejectedPayment: yesNoOrCustom(report.onlineRejectedPayment),
    onlineRejectedPaymentDetails: report.onlineRejectedPaymentDetails || "",
    nameOfRepLeaving:
      report.nameOfRepLeaving && report.nameOfRepLeaving !== "None" ? report.nameOfRepLeaving : "",
    timeLeft: report.timeLeft && report.timeLeft !== "—" ? report.timeLeft : "",
    timeReturned: report.timeReturned && report.timeReturned !== "—" ? report.timeReturned : "",
    backRoomTimeIn:
      report.backRoomTimeIn && report.backRoomTimeIn !== "—" ? report.backRoomTimeIn : "",
    backRoomTimeOut:
      report.backRoomTimeOut && report.backRoomTimeOut !== "—" ? report.backRoomTimeOut : "",
    offline: yesNoOrCustom(report.offline),
    offlineDetails: report.offlineDetails || "",
    attachments: report.attachments,
  };
}

type CustomCapableKey =
  | "transType"
  | "clientType"
  | "receipt"
  | "fraudTransactions"
  | "missOpportunity"
  | "paymentFraud"
  | "aalSwap"
  | "mim"
  | "onlineRejectedPayment"
  | "pitchNb"
  | "pitchQuality"
  | "showingPhone"
  | "accOffered"
  | "maximize"
  | "flipping"
  | "bundleAccGiven"
  | "portIn"
  | "nonUp"
  | "smartPayMentioned"
  | "aalBillSame"
  | "offline";

const CUSTOM_CAPABLE_KEYS = new Set<string>([
  "transType",
  "clientType",
  "receipt",
  "fraudTransactions",
  "missOpportunity",
  "paymentFraud",
  "aalSwap",
  "mim",
  "onlineRejectedPayment",
  "pitchNb",
  "pitchQuality",
  "showingPhone",
  "accOffered",
  "maximize",
  "flipping",
  "bundleAccGiven",
  "portIn",
  "nonUp",
  "smartPayMentioned",
  "aalBillSame",
  "offline",
]);

type BaseAuditRowKey = Exclude<
  keyof SurveillanceAuditRow,
  | "id"
  | "customerGroupId"
  | "additionalInvoices"
  | "attachments"
  | "rowHighlight"
  | "otherDetails"
  | `${CustomCapableKey}Details`
>;

const CUSTOMER_GROUP_HIGHLIGHT_PALETTE = [
  "bg-sky-50/85 hover:bg-sky-100/75 dark:bg-sky-950/35 dark:hover:bg-sky-950/55 border-l-4 border-l-sky-500",
  "bg-amber-50/85 hover:bg-amber-100/75 dark:bg-amber-950/35 dark:hover:bg-amber-950/55 border-l-4 border-l-amber-500",
  "bg-emerald-50/85 hover:bg-emerald-100/75 dark:bg-emerald-950/35 dark:hover:bg-emerald-950/55 border-l-4 border-l-emerald-500",
  "bg-purple-50/85 hover:bg-purple-100/75 dark:bg-purple-950/35 dark:hover:bg-purple-950/55 border-l-4 border-l-purple-500",
  "bg-rose-50/85 hover:bg-rose-100/75 dark:bg-rose-950/35 dark:hover:bg-rose-950/55 border-l-4 border-l-rose-500",
  "bg-teal-50/85 hover:bg-teal-100/75 dark:bg-teal-950/35 dark:hover:bg-teal-950/55 border-l-4 border-l-teal-500",
];

function getRowGroupIdentifier(row: SurveillanceAuditRow): string {
  const grp = (row.customerGroupId || "").trim();
  if (grp) return `grp:${grp}`;
  const inv = (row.invoice || "").trim().toLowerCase();
  if (inv && inv !== "-" && inv !== "—") return `inv:${inv}`;
  return "";
}

interface AuditDataField {
  key: BaseAuditRowKey;
  label: string;
}

const AUDIT_DATA_FIELDS: AuditDataField[] = [
  { key: "date", label: "Surveillance Date" },
  { key: "marketName", label: "Market" },
  { key: "storeName", label: "Store Name" },
  { key: "invoice", label: "Invoice No" },
  { key: "cashTime", label: "Cash Time" },
  { key: "time", label: "Entrance Time" },
  { key: "bdiTime", label: "BDI TIME" },
  { key: "salesRep", label: "Sales Rep" },
  { key: "transType", label: "Transaction Type" },
  { key: "clientType", label: "Client Type" },
  { key: "invoiceAmount", label: "Invoice Amount" },
  { key: "totalTaken", label: "Total Taken" },
  { key: "difference", label: "Difference" },
  { key: "paymentType", label: "Payment Type" },
  { key: "cash", label: "Cash Payment" },
  { key: "card", label: "Card Payment" },
  { key: "refundInvoice", label: "Refund Invoice" },
  { key: "receipt", label: "Receipt" },
  { key: "fraudTransactions", label: "Fraud Transactions" },
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

function isCustomToken(val: unknown): boolean {
  const s = String(val ?? "")
    .trim()
    .toLowerCase();
  return s === "custom" || s === "other" || s.startsWith("custom:") || s.startsWith("custom (");
}

function isFieldCustomInRow(row: SurveillanceAuditRow, key: BaseAuditRowKey): boolean {
  if (!CUSTOM_CAPABLE_KEYS.has(key)) return false;
  if (key === "transType") {
    return (row.transType || "").split(/\s*\/\s*/).some((part) => isCustomToken(part));
  }
  return isCustomToken(row[key]);
}

function extractLegacyInlineDetail(raw: unknown): string {
  const str = String(raw ?? "").trim();
  const colonMatch = str.match(/^custom:\s*(.+)$/i);
  if (colonMatch) return colonMatch[1].trim();
  const parenMatch = str.match(/^custom\s*\((.+)\)$/i);
  if (parenMatch) return parenMatch[1].trim();
  return "";
}

function getRowFieldDetail(row: SurveillanceAuditRow, key: BaseAuditRowKey): string {
  if (!CUSTOM_CAPABLE_KEYS.has(key)) return "";
  const detailProp = `${key}Details` as keyof SurveillanceAuditRow;
  const direct = row[detailProp];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  const fromMap = row.otherDetails?.[key]?.trim();
  if (fromMap) return fromMap;
  return extractLegacyInlineDetail(row[key]);
}

/**
 * Dedicated Review Verification Page opened ONLY from Validate and Assign > Request Details > Review Report.
 * Features:
 * - NO "Manager Review & Submitter Rating" section.
 * - Bottom Actions: "Decline Report" (asks reason) and "Mark as Completed".
 */
export default function SurveillanceReportReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [report, setReport] = useState<SurveillanceReport | null>(null);
  const [linkedRequest, setLinkedRequest] = useState<SurveillanceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Decline Report modal & action state
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState<string>("");
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const userRole = getSurveillanceRole(user);
  const canReviewReport = canApproveSurveillance(userRole);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const rep = getStaticReportById(id);
    if (rep) {
      setReport(rep);
      setLinkedRequest(getStaticRequestById(rep.requestId));
    } else {
      setReport(null);
      setLinkedRequest(null);
    }
    setLoading(false);
  }, [id]);

  const isReportFinalized = report?.status === "Approved" || report?.status === "Rejected";
  const canTakeReviewAction = Boolean(report) && canReviewReport && !isReportFinalized;

  const handleConfirmMarkAsCompleted = () => {
    if (!report) return;

    setSubmittingReview(true);
    try {
      const updated = reviewStaticReport(report.id, {
        action: "approve",
        reviewedBy: user?.fullName || "System Admin",
      });
      setReport(updated);
      setLinkedRequest(getStaticRequestById(updated.requestId));
      setCompleteModalOpen(false);
      toast.success(
        "Surveillance audit report marked as Completed and is now visible on the requester dashboard.",
      );
    } catch (error) {
      toast.error(`Failed to mark report as completed: ${(error as Error).message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenDeclineModal = () => {
    setDeclineReason("");
    setDeclineModalOpen(true);
  };

  const handleConfirmDeclineReport = () => {
    if (!report) return;
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining this report.");
      return;
    }

    setSubmittingReview(true);
    try {
      const updated = reviewStaticReport(report.id, {
        action: "reject",
        comments: declineReason.trim(),
        reviewedBy: user?.fullName || "System Admin",
      });
      setReport(updated);
      setLinkedRequest(getStaticRequestById(updated.requestId));
      setDeclineModalOpen(false);
      toast.success("Surveillance audit report has been rejected with reason.");
    } catch (error) {
      toast.error(`Failed to decline report: ${(error as Error).message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Row attachment viewer modal state
  const [selectedRowAttachments, setSelectedRowAttachments] = useState<{
    invoice: string;
    time: string;
    files: SurveillanceAttachment[];
  } | null>(null);

  // Multi-row audit dataset
  const allRows: SurveillanceAuditRow[] = useMemo(() => {
    if (!report) return [];
    const fallbackMarket = report.marketName || linkedRequest?.marketName || "";
    if (report.rows && report.rows.length > 0) {
      return report.rows.map((r, idx) => {
        const merged: SurveillanceAuditRow = {
          ...r,
          marketName: r.marketName || fallbackMarket,
        };
        if (idx === 0) {
          for (const key of CUSTOM_CAPABLE_KEYS) {
            const detailProp = `${key}Details` as keyof SurveillanceAuditRow;
            const repDetail = report[detailProp as keyof SurveillanceReport];
            if (merged[detailProp] === undefined && typeof repDetail === "string") {
              (merged as unknown as Record<string, unknown>)[detailProp] = repDetail;
            }
          }
        }
        return merged;
      });
    }
    return [buildFallbackRowFromReport(report, fallbackMarket)];
  }, [report, linkedRequest]);

  // Compute group highlight class map for rows sharing the same customerGroupId or duplicate invoice number
  const rowHighlightClassMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of allRows) {
      const key = getRowGroupIdentifier(row);
      if (key) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    const assignedColorByGroup = new Map<string, string>();
    let colorIdx = 0;
    for (const [key, count] of counts.entries()) {
      if (count > 1) {
        assignedColorByGroup.set(
          key,
          CUSTOMER_GROUP_HIGHLIGHT_PALETTE[colorIdx % CUSTOMER_GROUP_HIGHLIGHT_PALETTE.length],
        );
        colorIdx++;
      }
    }

    const mapByRowId = new Map<string, string>();
    for (const row of allRows) {
      const key = getRowGroupIdentifier(row);
      const colorClass = key ? assignedColorByGroup.get(key) : undefined;
      if (colorClass) {
        mapByRowId.set(row.id, colorClass);
      }
    }
    return mapByRowId;
  }, [allRows]);

  const resolveFieldDisplay = (row: SurveillanceAuditRow, key: BaseAuditRowKey): string => {
    if (key === "date") {
      return formatSurveillanceDateCell(row.date);
    }
    if (key === "transType") {
      if (!row.transType || !row.transType.trim()) return "-";
      const parts = row.transType
        .split(/\s*\/\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      const mapped = parts
        .map((p) => {
          if (isCustomToken(p)) {
            return getRowFieldDetail(row, "transType") || extractLegacyInlineDetail(p);
          }
          return p;
        })
        .filter(Boolean);
      return mapped.length > 0 ? mapped.join(" / ") : "-";
    }
    if (key === "clientType") {
      if (row.clientType && row.clientType.trim()) {
        const ct = row.clientType.trim();
        if (isCustomToken(ct)) {
          return formatCellValue(getRowFieldDetail(row, "clientType"));
        }
        if (ct === "Billable") return "Buyer";
        if (ct === "Non Billable") return "Non-Buyer";
        return formatCellValue(ct);
      }
      if (row.b?.trim().toUpperCase() === "B") return "Buyer";
      if (row.nb?.trim().toUpperCase() === "NB") return "Non-Buyer";
      return "-";
    }
    if (key === "paymentType") {
      if (row.paymentType && row.paymentType.trim()) {
        const pt = row.paymentType.trim();
        if (isCustomToken(pt)) return "-";
        return formatCellValue(pt);
      }
      if (row.card && row.card.trim() && row.cash && row.cash.trim()) return "Mix Payment";
      if (row.card && row.card.trim()) return "Card";
      if (row.cash && row.cash.trim()) return "Cash";
      return "-";
    }
    if (isFieldCustomInRow(row, key)) {
      return formatCellValue(getRowFieldDetail(row, key));
    }
    const baseVal = formatCellValue(row[key]);
    const detailVal = getRowFieldDetail(row, key);
    if (detailVal && baseVal !== "-") {
      return `${baseVal} — ${detailVal}`;
    }
    return baseVal;
  };

  const activeAuditFields = useMemo(() => {
    return AUDIT_DATA_FIELDS.map((field) => {
      const hasCustom = allRows.some((r) => isFieldCustomInRow(r, field.key));
      const hasDetails = allRows.some((r) => Boolean(getRowFieldDetail(r, field.key)));
      const cleanBaseLabel = field.label.replace(/\?+$/, "").trim();
      return {
        baseKey: field.key,
        colKey: hasCustom ? `${field.key}Details` : field.key,
        header: hasCustom ? `${cleanBaseLabel} Details` : field.label,
        hasCustom: hasCustom || hasDetails,
      };
    });
  }, [allRows]);

  const columns: Column<SurveillanceAuditRow>[] = useMemo(() => {
    const dataCols: Column<SurveillanceAuditRow>[] = activeAuditFields.map((col) => ({
      key: col.colKey,
      header: col.header,
      className:
        col.baseKey === "notes" || col.baseKey === "pitchNotes" || col.hasCustom
          ? "min-w-[180px] max-w-[300px] whitespace-normal text-foreground"
          : "whitespace-nowrap text-foreground",
      searchValue: (row) => resolveFieldDisplay(row, col.baseKey),
      accessor: (row) => (
        <span className="text-foreground">{resolveFieldDisplay(row, col.baseKey)}</span>
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
  }, [activeAuditFields]);

  const handleExportCsv = () => {
    if (!report) return;
    const headers = [
      ...activeAuditFields.map((c) => `"${c.header.replace(/"/g, '""')}"`),
      '"Attachments"',
    ].join(",");

    const csvLines = allRows.map((row) => {
      const cells = activeAuditFields.map((c) => {
        const val = resolveFieldDisplay(row, c.baseKey);
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
    link.download = `${report.id}_Review_Surveillance_Audit_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${allRows.length} audit rows to CSV.`);
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading report...</div>;
  }

  if (!report) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold">Report Not Found</h2>
        <Button variant="outline" onClick={() => navigate("/surveillance/validate-and-assign")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Validate &amp; Assign
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/surveillance/validate-and-assign")}
            className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Validate &amp; Assign
          </Button>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Review Surveillance Audit Report
          </h1>
          {report.status === "Approved" && (
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed
            </Badge>
          )}
          {report.status === "Rejected" && (
            <Badge
              variant="outline"
              className="border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-semibold gap-1"
            >
              <XCircle className="h-3.5 w-3.5" />
              Rejected
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Audit Data Table */}
      <DataTable
        rows={allRows}
        columns={columns}
        rowKey={(r, i) => r.id || String(i)}
        rowClassName={(r) => rowHighlightClassMap.get(r.id)}
        pageSize={25}
        searchPlaceholder="Search audit records..."
      />

      {/* Rejection Reason Banner (shown if report was declined / rejected) */}
      {report.status === "Rejected" && (
        <Card className="p-5 rounded-2xl border-rose-200/90 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/60 space-y-2.5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-semibold text-sm">
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Rejection Reason</span>
            </div>
            {report.reviewedBy && (
              <span className="text-xs text-muted-foreground">
                Rejected by{" "}
                <strong className="font-semibold text-foreground">{report.reviewedBy}</strong>
                {report.reviewedAt ? ` on ${formatReviewDateTime(report.reviewedAt)}` : ""}
              </span>
            )}
          </div>
          <div className="p-3.5 rounded-xl border border-rose-200/80 bg-background text-foreground text-xs leading-relaxed whitespace-pre-wrap">
            {report.managerComments || "Report was declined during review."}
          </div>
        </Card>
      )}

      {/* Bottom Action Buttons: Decline Report & Mark as Completed */}
      {canTakeReviewAction && (
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenDeclineModal}
            disabled={submittingReview}
            className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/60 dark:text-rose-400"
          >
            <X className="h-3.5 w-3.5" />
            Decline Report
          </Button>
          <Button
            type="button"
            onClick={() => setCompleteModalOpen(true)}
            disabled={submittingReview}
            className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Check className="h-3.5 w-3.5" />
            Mark as Completed
          </Button>
        </div>
      )}

      {/* Decline Report Reason Dialog */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Decline Surveillance Report</DialogTitle>
            <DialogDescription>
              Provide the reason for declining this surveillance audit report. The report status
              will be updated to Rejected with this reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1">
            <Label htmlFor="decline-report-reason" className="text-xs font-semibold">
              Reason for Declining <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="decline-report-reason"
              required
              rows={4}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter the reason for declining this report..."
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeclineModalOpen(false)}
              disabled={submittingReview}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeclineReport}
              disabled={submittingReview || !declineReason.trim()}
            >
              {submittingReview ? "Declining..." : "Decline Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <span className="font-medium text-foreground truncate block">{file.name}</span>
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

      {/* Mark as Completed Confirmation Modal */}
      <AlertDialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Report Completion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this surveillance audit report as Completed? Once completed, this report will be finalized and made visible on the requester dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingReview}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmMarkAsCompleted}
              disabled={submittingReview}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submittingReview ? "Completing..." : "Confirm & Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
