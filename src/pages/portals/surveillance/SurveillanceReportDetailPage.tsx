import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  surveillanceService,
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

function formatSurveillanceDateCell(raw?: string): string {
  const str = (raw || "").split(" - ")[0]?.trim() || "";
  if (!str) return "-";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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
  | "attachments"
  | "rowHighlight"
  | "otherDetails"
  | `${CustomCapableKey}Details`
>;

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
  const s = String(val ?? "").trim().toLowerCase();
  return (
    s === "custom" ||
    s === "other" ||
    s.startsWith("custom:") ||
    s.startsWith("custom (")
  );
}

function isFieldCustomInRow(row: SurveillanceAuditRow, key: BaseAuditRowKey): boolean {
  if (!CUSTOM_CAPABLE_KEYS.has(key)) return false;
  if (key === "transType") {
    return (row.transType || "")
      .split(/\s*\/\s*/)
      .some((part) => isCustomToken(part));
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

export default function SurveillanceReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
        try {
          const req = await surveillanceService.getRequest(rep.requestId);
          if (active) {
            setLinkedRequest(req);
          }
        } catch {
          // The linked request is only used for fallback display fields -
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
              (merged as Record<string, unknown>)[detailProp] = repDetail;
            }
          }
        }
        return merged;
      });
    }
    return [buildFallbackRowFromReport(report, fallbackMarket)];
  }, [report, linkedRequest]);

  const resolveFieldDisplay = (
    row: SurveillanceAuditRow,
    key: BaseAuditRowKey,
  ): string => {
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
    return formatCellValue(row[key]);
  };

  // Dynamically swap any column where "Custom" was selected with its "<Field> Details" column
  const activeAuditFields = useMemo(() => {
    return AUDIT_DATA_FIELDS.map((field) => {
      const hasCustom = allRows.some((r) => isFieldCustomInRow(r, field.key));
      const cleanBaseLabel = field.label.replace(/\?+$/, "").trim();
      return {
        baseKey: field.key,
        colKey: hasCustom ? `${field.key}Details` : field.key,
        header: hasCustom ? `${cleanBaseLabel} Details` : field.label,
        hasCustom,
      };
    });
  }, [allRows]);

  // Consistent DataTable columns with uniform text color, "-" for missing values, and Attachments last column
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
    link.download = `${report.id}_Surveillance_Audit_Report.csv`;
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
    </div>
  );
}
