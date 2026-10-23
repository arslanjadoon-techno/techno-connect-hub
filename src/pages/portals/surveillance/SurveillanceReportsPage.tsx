import { useMemo, useRef, useState } from "react";
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
import {
  Plus,
  Eye,
  Store as StoreIcon,
  Printer,
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Image as ImageIcon,
  DollarSign,
  UploadCloud,
  X,
  RotateCcw,
  ShoppingBag,
  ShieldAlert,
  UserCheck,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  INITIAL_SURVEILLANCE_REQUESTS,
  INITIAL_SURVEILLANCE_REPORTS,
} from "./surveillance-data";
import {
  type SurveillanceReport,
  type SurveillanceRequest,
  type SurveillanceAttachment,
  type SurveillanceRole,
} from "@/services/portals/surveillance/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SurveillanceReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // View as is restricted strictly to User as per specifications
  const [activeRole] = useState<SurveillanceRole>("user");

  const [requests] = useState<SurveillanceRequest[]>(INITIAL_SURVEILLANCE_REQUESTS);
  const [reports, setReports] = useState<SurveillanceReport[]>(INITIAL_SURVEILLANCE_REPORTS);

  // Filter states
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("all");
  const [fraudFilter, setFraudFilter] = useState<string>("all");

  // Create Report Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");

  // All 44 Surveillance Retail Audit Form Fields
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formStoreName, setFormStoreName] = useState("");
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formCashTime, setFormCashTime] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formBdiTime, setFormBdiTime] = useState("");
  const [formSalesRep, setFormSalesRep] = useState("");
  const [formTransType, setFormTransType] = useState("New Activation");
  const [formClientType, setFormClientType] = useState<"Billable" | "Non Billable">("Billable");
  const [formInvoiceAmount, setFormInvoiceAmount] = useState("$0.00");
  const [formTotalTaken, setFormTotalTaken] = useState("$0.00");
  const [formPaymentMode, setFormPaymentMode] = useState<"Cash" | "Card" | "Split">("Card");
  const [formDifference, setFormDifference] = useState("$0.00");
  const [formReceipt, setFormReceipt] = useState<"Yes" | "No">("Yes");
  const [formSplitPayments, setFormSplitPayments] = useState<"Yes" | "No">("No");
  const [formFraudTransactions, setFormFraudTransactions] = useState<"Yes" | "No">("No");
  const [formRefundInvoice, setFormRefundInvoice] = useState<"Yes" | "No">("No");
  const [formMissOpportunity, setFormMissOpportunity] = useState<"Yes" | "No">("No");
  const [formPaymentFraud, setFormPaymentFraud] = useState<"Yes" | "No">("No");
  const [formAalSwap, setFormAalSwap] = useState<"Yes" | "No">("No");
  const [formMim, setFormMim] = useState<"Yes" | "No">("Yes");
  const [formNotes, setFormNotes] = useState("");
  const [formPitchNb, setFormPitchNb] = useState("Yes");
  const [formPitchQuality, setFormPitchQuality] = useState<"Good" | "Fair" | "Poor" | "Not Observed">("Good");
  const [formPitchNotes, setFormPitchNotes] = useState("");
  const [formShowingPhone, setFormShowingPhone] = useState<"Yes" | "No">("Yes");
  const [formAccOffered, setFormAccOffered] = useState<"Yes" | "No">("Yes");
  const [formMaximize, setFormMaximize] = useState<"Yes" | "No">("Yes");
  const [formFlipping, setFormFlipping] = useState<"Yes" | "No">("No");
  const [formBundleNb, setFormBundleNb] = useState("Standard Bundle");
  const [formBundleStartB, setFormBundleStartB] = useState("Screen Protector");
  const [formBundleEndB, setFormBundleEndB] = useState("Fast Charger");
  const [formBundleAccGiven, setFormBundleAccGiven] = useState<"Yes" | "No">("Yes");
  const [formPortIn, setFormPortIn] = useState<"Yes" | "No">("No");
  const [formNonUp, setFormNonUp] = useState<"Yes" | "No">("No");
  const [formSmartPayMentioned, setFormSmartPayMentioned] = useState<"Yes" | "No">("Yes");
  const [formAalBillSame, setFormAalBillSame] = useState<"Yes" | "No">("Yes");
  const [formOnlineRejectedPayment, setFormOnlineRejectedPayment] = useState<"Yes" | "No">("No");
  const [formNameOfRepLeaving, setFormNameOfRepLeaving] = useState("");
  const [formTimeLeft, setFormTimeLeft] = useState("");
  const [formTimeReturned, setFormTimeReturned] = useState("");
  const [formBackRoomTimeIn, setFormBackRoomTimeIn] = useState("");
  const [formBackRoomTimeOut, setFormBackRoomTimeOut] = useState("");
  const [formOffline, setFormOffline] = useState<"Yes" | "No">("No");

  const [attachments, setAttachments] = useState<SurveillanceAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail Modal state
  const [detailTarget, setDetailTarget] = useState<SurveillanceReport | null>(null);

  // Selectable requests
  const eligibleRequests = useMemo(() => {
    return requests.filter(
      (r) => r.status === "Approved" || r.status === "Report Requested",
    );
  }, [requests]);

  const selectedRequest = useMemo(() => {
    return requests.find((r) => r.id === selectedRequestId);
  }, [requests, selectedRequestId]);

  const handleOpenCreate = () => {
    const targetReq = eligibleRequests[0] || requests[0];
    setSelectedRequestId(targetReq ? targetReq.id : "");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStoreName(targetReq ? targetReq.storeName : "Store #101 - Uptown Dallas");
    setFormInvoiceNo(`INV-${Math.floor(70000 + Math.random() * 20000)}`);
    setFormCashTime("14:15");
    setFormTime("14:20");
    setFormBdiTime("14:25");
    setFormSalesRep("Marcus Young");
    setFormTransType("New Activation & Accessory Bundle");
    setFormClientType("Billable");
    setFormInvoiceAmount("$350.00");
    setFormTotalTaken("$350.00");
    setFormPaymentMode("Card");
    setFormDifference("$0.00");
    setFormReceipt("Yes");
    setFormSplitPayments("No");
    setFormFraudTransactions("No");
    setFormRefundInvoice("No");
    setFormMissOpportunity("No");
    setFormPaymentFraud("No");
    setFormAalSwap("No");
    setFormMim("Yes");
    setFormNotes("");
    setFormPitchNb("Yes");
    setFormPitchQuality("Good");
    setFormPitchNotes("Rep offered phone protection and tempered glass.");
    setFormShowingPhone("Yes");
    setFormAccOffered("Yes");
    setFormMaximize("Yes");
    setFormFlipping("No");
    setFormBundleNb("Complete 2-Acc Bundle");
    setFormBundleStartB("Case");
    setFormBundleEndB("Charger");
    setFormBundleAccGiven("Yes");
    setFormPortIn("No");
    setFormNonUp("No");
    setFormSmartPayMentioned("Yes");
    setFormAalBillSame("Yes");
    setFormOnlineRejectedPayment("No");
    setFormNameOfRepLeaving("None");
    setFormTimeLeft("");
    setFormTimeReturned("");
    setFormBackRoomTimeIn("");
    setFormBackRoomTimeOut("");
    setFormOffline("No");
    setAttachments([]);
    setCreateModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newAtts: SurveillanceAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setAttachments((prev) => [...prev, ...newAtts]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmitReport = () => {
    if (!selectedRequestId) {
      toast.error("Please select an approved request to conduct surveillance against.");
      return;
    }
    if (!formInvoiceNo.trim()) {
      toast.error("Please enter the invoice number.");
      return;
    }
    if (!formSalesRep.trim()) {
      toast.error("Please enter the sales representative name.");
      return;
    }

    const req = requests.find((r) => r.id === selectedRequestId);
    const newReportId = `SRV-REP-${Math.floor(203 + reports.length)}`;

    const newReport: SurveillanceReport = {
      id: newReportId,
      requestId: selectedRequestId,
      investigatorName: user?.fullName || "Alex Rivera",
      investigatorId: user?.id || "u-1",
      investigatorEmail: user?.email || "alex.rivera@techno.com",
      submittedAt: new Date().toISOString(),
      status: "Report Received",

      // 44 Form Attributes
      date: formDate,
      storeName: formStoreName || req?.storeName || "Store Location",
      invoiceNo: formInvoiceNo.trim(),
      cashTime: formCashTime,
      time: formTime,
      bdiTime: formBdiTime,
      salesRep: formSalesRep.trim(),
      transType: formTransType,
      clientType: formClientType,
      invoiceAmount: formInvoiceAmount,
      totalTaken: formTotalTaken,
      paymentMode: formPaymentMode,
      difference: formDifference,
      receipt: formReceipt,
      splitPayments: formSplitPayments,
      fraudTransactions: formFraudTransactions,
      refundInvoice: formRefundInvoice,
      missOpportunity: formMissOpportunity,
      paymentFraud: formPaymentFraud,
      aalSwap: formAalSwap,
      mim: formMim,
      notes: formNotes.trim(),
      pitchNb: formPitchNb,
      pitchQuality: formPitchQuality,
      pitchNotes: formPitchNotes.trim(),
      showingPhone: formShowingPhone,
      accOffered: formAccOffered,
      maximize: formMaximize,
      flipping: formFlipping,
      bundleNb: formBundleNb,
      bundleStartB: formBundleStartB,
      bundleEndB: formBundleEndB,
      bundleAccGiven: formBundleAccGiven,
      portIn: formPortIn,
      nonUp: formNonUp,
      smartPayMentioned: formSmartPayMentioned,
      aalBillSame: formAalBillSame,
      onlineRejectedPayment: formOnlineRejectedPayment,
      nameOfRepLeaving: formNameOfRepLeaving.trim(),
      timeLeft: formTimeLeft,
      timeReturned: formTimeReturned,
      backRoomTimeIn: formBackRoomTimeIn,
      backRoomTimeOut: formBackRoomTimeOut,
      offline: formOffline,

      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setReports((prev) => [newReport, ...prev]);

    // Update request status locally to Report Received
    if (req) {
      req.status = "Report Received";
      req.linkedReportId = newReportId;
      req.preparedBy = user?.fullName || "Alex Rivera";
      req.preparedAt = new Date().toISOString();
    }

    toast.success("Surveillance audit report submitted successfully!");
    setCreateModalOpen(false);
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      if (paymentModeFilter !== "all" && rep.paymentMode !== paymentModeFilter) return false;
      if (fraudFilter !== "all") {
        const isFraud = rep.fraudTransactions === "Yes" || rep.paymentFraud === "Yes";
        if (fraudFilter === "yes" && !isFraud) return false;
        if (fraudFilter === "no" && isFraud) return false;
      }
      return true;
    });
  }, [reports, paymentModeFilter, fraudFilter]);

  // Columns definition (Single information per column)
  const columns: Column<SurveillanceReport>[] = useMemo(
    () => [
      {
        key: "id",
        header: "Report ID",
        searchValue: (r) => r.id,
        accessor: (r) => (
          <span className="font-mono text-xs font-semibold text-primary">{r.id}</span>
        ),
      },
      {
        key: "store",
        header: "Store",
        searchValue: (r) => r.storeName,
        accessor: (r) => (
          <span className="font-medium text-foreground text-sm">{r.storeName}</span>
        ),
      },
      {
        key: "invoice",
        header: "Invoice No",
        searchValue: (r) => r.invoiceNo,
        accessor: (r) => (
          <span className="font-mono text-xs font-medium text-foreground">{r.invoiceNo}</span>
        ),
      },
      {
        key: "salesRep",
        header: "Sales Rep",
        searchValue: (r) => r.salesRep,
        accessor: (r) => (
          <span className="text-foreground text-sm">{r.salesRep}</span>
        ),
      },
      {
        key: "amount",
        header: "Invoice Amount",
        searchValue: (r) => r.invoiceAmount,
        accessor: (r) => (
          <span className="font-semibold text-foreground text-xs">{r.invoiceAmount}</span>
        ),
      },
      {
        key: "difference",
        header: "Difference",
        searchValue: (r) => r.difference,
        accessor: (r) => (
          <span className={`font-semibold text-xs ${r.difference !== "$0.00" && r.difference !== "0" ? "text-rose-600" : "text-emerald-600"}`}>
            {r.difference}
          </span>
        ),
      },
      {
        key: "fraud",
        header: "Fraud / Violations",
        searchValue: (r) => `${r.fraudTransactions} ${r.paymentFraud}`,
        accessor: (r) => {
          const hasViolation = r.fraudTransactions === "Yes" || r.paymentFraud === "Yes";
          return hasViolation ? (
            <Badge variant="destructive" className="text-[10px]">
              Violation Detected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
              Clear
            </Badge>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        searchValue: (r) => r.status,
        accessor: (r) => (
          <Badge
            variant="outline"
            className={`text-xs font-semibold ${
              r.status === "Approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : r.status === "Rejected"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-sky-50 text-sky-700 border-sky-200"
            }`}
          >
            {r.status}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: <span className="text-right block w-full pr-2">Actions</span>,
        accessor: (r) => (
          <div className="flex items-center justify-end pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/surveillance/reports/${r.id}`);
              }}
              className="h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Eye className="h-3.5 w-3.5" />
              View Report
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Surveillance Reports
            </h1>
            <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              Audits & Submissions
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Submit full surveillance audits, document transactions, compliance, and pitch quality.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View As selector: strictly User option only */}
          <div className="flex items-center gap-2 rounded-lg border bg-card/60 p-1 px-2.5 text-xs">
            <span className="text-muted-foreground font-medium">View As:</span>
            <Select value="user" onValueChange={() => {}}>
              <SelectTrigger className="h-7 w-[90px] text-xs font-semibold border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User role submission action */}
          <Button onClick={handleOpenCreate} className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            Submit Surveillance Report
          </Button>
        </div>
      </div>

      {/* Toolbar filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="Payment Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Modes</SelectItem>
            <SelectItem value="Card">Card</SelectItem>
            <SelectItem value="Cash">Cash</SelectItem>
            <SelectItem value="Split">Split</SelectItem>
          </SelectContent>
        </Select>

        <Select value={fraudFilter} onValueChange={setFraudFilter}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="Fraud Verification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Audits</SelectItem>
            <SelectItem value="yes">Violations Detected</SelectItem>
            <SelectItem value="no">Clear of Violations</SelectItem>
          </SelectContent>
        </Select>

        {(paymentModeFilter !== "all" || fraudFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPaymentModeFilter("all");
              setFraudFilter("all");
            }}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 border border-dashed"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        rows={filteredReports}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search by Report ID, Store, Invoice No, or Sales Rep..."
        onRowClick={(r) => navigate(`/surveillance/reports/${r.id}`)}
      />

      {/* SUBMIT SURVEILLANCE REPORT DIALOG (WITH ALL 44 ATTRIBUTES) */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Surveillance Report</DialogTitle>
            <DialogDescription>
              Complete the official surveillance audit form across all required retail transaction, pitch, and timing fields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2 text-xs">
            {/* Requisition link */}
            <div className="space-y-1.5 p-3 rounded-lg border bg-muted/40">
              <Label className="text-xs font-semibold">
                Select Authorized Request Reference <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedRequestId}
                onValueChange={(v) => {
                  setSelectedRequestId(v);
                  const found = requests.find((r) => r.id === v);
                  if (found) setFormStoreName(found.storeName);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an approved request" />
                </SelectTrigger>
                <SelectContent>
                  {requests.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.id}: {r.storeName} — {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SECTION 1: Transaction & Timing Details */}
            <div className="space-y-3 rounded-lg border p-3.5">
              <div className="flex items-center gap-2 border-b pb-1 font-semibold text-foreground text-xs uppercase tracking-wide">
                <ShoppingBag className="h-4 w-4 text-primary" />
                1. Transaction & Billing Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Date</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Store Name</Label>
                  <Input value={formStoreName} onChange={(e) => setFormStoreName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Invoice No</Label>
                  <Input value={formInvoiceNo} onChange={(e) => setFormInvoiceNo(e.target.value)} placeholder="e.g. INV-78412" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Sales Rep</Label>
                  <Input value={formSalesRep} onChange={(e) => setFormSalesRep(e.target.value)} placeholder="e.g. Elena Cole" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Time</Label>
                  <Input value={formTime} onChange={(e) => setFormTime(e.target.value)} placeholder="e.g. 14:20" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Cash Time</Label>
                  <Input value={formCashTime} onChange={(e) => setFormCashTime(e.target.value)} placeholder="e.g. 14:15" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">BDI Time</Label>
                  <Input value={formBdiTime} onChange={(e) => setFormBdiTime(e.target.value)} placeholder="e.g. 14:25" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Trans/Type</Label>
                  <Input value={formTransType} onChange={(e) => setFormTransType(e.target.value)} placeholder="e.g. Upgrade / Bill Payment" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Client Type</Label>
                  <Select value={formClientType} onValueChange={(v) => setFormClientType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Billable">Billable</SelectItem>
                      <SelectItem value="Non Billable">Non Billable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Invoice Amount</Label>
                  <Input value={formInvoiceAmount} onChange={(e) => setFormInvoiceAmount(e.target.value)} placeholder="$0.00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Total Taken</Label>
                  <Input value={formTotalTaken} onChange={(e) => setFormTotalTaken(e.target.value)} placeholder="$0.00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Payment mode</Label>
                  <Select value={formPaymentMode} onValueChange={(v) => setFormPaymentMode(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Split">Split</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Difference</Label>
                  <Input value={formDifference} onChange={(e) => setFormDifference(e.target.value)} placeholder="$0.00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Receipt Given</Label>
                  <Select value={formReceipt} onValueChange={(v) => setFormReceipt(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Split Payments</Label>
                  <Select value={formSplitPayments} onValueChange={(v) => setFormSplitPayments(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SECTION 2: Fraud & Audit Verification */}
            <div className="space-y-3 rounded-lg border p-3.5">
              <div className="flex items-center gap-2 border-b pb-1 font-semibold text-foreground text-xs uppercase tracking-wide">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                2. Fraud & Compliance Audit
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Fraud Transactions</Label>
                  <Select value={formFraudTransactions} onValueChange={(v) => setFormFraudTransactions(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Refund Invoice</Label>
                  <Select value={formRefundInvoice} onValueChange={(v) => setFormRefundInvoice(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Miss Opportunity</Label>
                  <Select value={formMissOpportunity} onValueChange={(v) => setFormMissOpportunity(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Payment fraud</Label>
                  <Select value={formPaymentFraud} onValueChange={(v) => setFormPaymentFraud(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">AAL Swap</Label>
                  <Select value={formAalSwap} onValueChange={(v) => setFormAalSwap(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">MIM</Label>
                  <Select value={formMim} onValueChange={(v) => setFormMim(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Online/Rejected Payment</Label>
                  <Select value={formOnlineRejectedPayment} onValueChange={(v) => setFormOnlineRejectedPayment(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <Label className="text-[11px] font-semibold">Audit Notes</Label>
                <Textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Document specific transaction details, cashier movements, drawer handling, or discrepancies..."
                  rows={2}
                />
              </div>
            </div>

            {/* SECTION 3: Sales Pitch & Bundle Review */}
            <div className="space-y-3 rounded-lg border p-3.5">
              <div className="flex items-center gap-2 border-b pb-1 font-semibold text-foreground text-xs uppercase tracking-wide">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                3. Sales Pitch & Bundle Verification
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Pitch NB</Label>
                  <Input value={formPitchNb} onChange={(e) => setFormPitchNb(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Pitch Quality</Label>
                  <Select value={formPitchQuality} onValueChange={(v) => setFormPitchQuality(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Poor">Poor</SelectItem>
                      <SelectItem value="Not Observed">Not Observed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Showing Phone</Label>
                  <Select value={formShowingPhone} onValueChange={(v) => setFormShowingPhone(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Acc Offered</Label>
                  <Select value={formAccOffered} onValueChange={(v) => setFormAccOffered(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Maximize</Label>
                  <Select value={formMaximize} onValueChange={(v) => setFormMaximize(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Flipping</Label>
                  <Select value={formFlipping} onValueChange={(v) => setFormFlipping(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Bundle NB</Label>
                  <Input value={formBundleNb} onChange={(e) => setFormBundleNb(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Bundle-Start B</Label>
                  <Input value={formBundleStartB} onChange={(e) => setFormBundleStartB(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Bundle-End B</Label>
                  <Input value={formBundleEndB} onChange={(e) => setFormBundleEndB(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Bundle Acc Given</Label>
                  <Select value={formBundleAccGiven} onValueChange={(v) => setFormBundleAccGiven(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Port In</Label>
                  <Select value={formPortIn} onValueChange={(v) => setFormPortIn(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Non-Up</Label>
                  <Select value={formNonUp} onValueChange={(v) => setFormNonUp(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">SmartPay Mentioned</Label>
                  <Select value={formSmartPayMentioned} onValueChange={(v) => setFormSmartPayMentioned(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">AAL Bill Same</Label>
                  <Select value={formAalBillSame} onValueChange={(v) => setFormAalBillSame(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <Label className="text-[11px] font-semibold">Pitch Notes</Label>
                <Input
                  value={formPitchNotes}
                  onChange={(e) => setFormPitchNotes(e.target.value)}
                  placeholder="Note customer response, accessory push, and closing pitch details..."
                />
              </div>
            </div>

            {/* SECTION 4: Floor Presence & Rep Timings */}
            <div className="space-y-3 rounded-lg border p-3.5">
              <div className="flex items-center gap-2 border-b pb-1 font-semibold text-foreground text-xs uppercase tracking-wide">
                <Clock className="h-4 w-4 text-primary" />
                4. Floor Presence & Rep Timings
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Name of Rep Leaving</Label>
                  <Input value={formNameOfRepLeaving} onChange={(e) => setFormNameOfRepLeaving(e.target.value)} placeholder="e.g. Elena Cole" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Time Left</Label>
                  <Input value={formTimeLeft} onChange={(e) => setFormTimeLeft(e.target.value)} placeholder="e.g. 15:00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Time Returned</Label>
                  <Input value={formTimeReturned} onChange={(e) => setFormTimeReturned(e.target.value)} placeholder="e.g. 15:30" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Back Room Time - In</Label>
                  <Input value={formBackRoomTimeIn} onChange={(e) => setFormBackRoomTimeIn(e.target.value)} placeholder="e.g. 15:05" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Back Room Time - Out</Label>
                  <Input value={formBackRoomTimeOut} onChange={(e) => setFormBackRoomTimeOut(e.target.value)} placeholder="e.g. 15:20" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Offline</Label>
                  <Select value={formOffline} onValueChange={(v) => setFormOffline(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  Video Stills & Evidence Attachments
                </Label>
                <span className="text-[11px] text-muted-foreground">Images, PDFs up to 10MB</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <UploadCloud className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs font-medium text-foreground">Click to upload footage stills or audit files</p>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {attachments.map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/60 border text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {file.type?.includes("image") ? (
                          <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="text-muted-foreground text-[10px]">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReport}>Submit Surveillance Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
