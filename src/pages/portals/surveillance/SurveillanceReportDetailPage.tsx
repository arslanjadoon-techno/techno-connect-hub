import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
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
  Printer,
  FileText,
  ShoppingBag,
  ShieldAlert,
  UserCheck,
  Clock,
  Paperclip,
  Check,
  X,
  Star,
  Lock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Store as StoreIcon,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  INITIAL_SURVEILLANCE_REPORTS,
  INITIAL_SURVEILLANCE_REQUESTS,
} from "./surveillance-data";
import {
  getSurveillanceRole,
  canApproveSurveillance,
  type SurveillanceReport,
  type SurveillanceRequest,
} from "@/services/portals/surveillance/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  // Retrieve report from state or mock
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

  // Review states
  const [managerRating, setManagerRating] = useState<number>(report?.managerRating || 0);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const handleApprove = () => {
    if (!report) return;
    const reviewerName = user?.fullName || "Regional Management Authority";
    const now = new Date().toISOString();

    const updated: SurveillanceReport = {
      ...report,
      status: "Approved",
      reviewedBy: reviewerName,
      reviewedAt: now,
      managerRating: managerRating > 0 ? managerRating : report.managerRating,
    };

    setReportList((prev) => prev.map((r) => (r.id === report.id ? updated : r)));

    // Also update linked request if present
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
    }

    toast.success(`Surveillance report ${report.id} approved successfully!`);
  };

  const executeDecline = (reason: string) => {
    if (!report) return;
    const reviewerName = user?.fullName || "Regional Management Authority";
    const now = new Date().toISOString();

    const updated: SurveillanceReport = {
      ...report,
      status: "Rejected",
      reviewedBy: reviewerName,
      reviewedAt: now,
      managerComments: reason,
      managerRating: managerRating > 0 ? managerRating : undefined,
    };

    setReportList((prev) => prev.map((r) => (r.id === report.id ? updated : r)));

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
                managerComments: reason,
                managerRating: managerRating > 0 ? managerRating : undefined,
              }
            : req,
        ),
      );
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

  const hasViolation =
    report.fraudTransactions === "Yes" ||
    report.paymentFraud === "Yes" ||
    report.refundInvoice === "Yes";

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-8 gap-1.5 px-3 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Surveillance Audit Report
              </h1>
              <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                {report.id}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${
                  report.status === "Approved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : report.status === "Rejected"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-sky-50 text-sky-700 border-sky-200"
                }`}
              >
                {report.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auditor: <strong className="text-foreground">{report.investigatorName}</strong> • Submitted: {new Date(report.submittedAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <Printer className="h-3.5 w-3.5" /> Print / Export
          </Button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="p-3 bg-card border-border/80">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Store Location
          </span>
          <div className="font-semibold text-sm text-foreground truncate mt-1">
            {report.storeName}
          </div>
        </Card>

        <Card className="p-3 bg-card border-border/80">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Invoice No
          </span>
          <div className="font-mono font-semibold text-sm text-foreground mt-1">
            {report.invoiceNo}
          </div>
        </Card>

        <Card className="p-3 bg-card border-border/80">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Invoice Amount
          </span>
          <div className="font-semibold text-sm text-foreground mt-1">
            {report.invoiceAmount}
          </div>
        </Card>

        <Card className="p-3 bg-card border-border/80">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Total Taken
          </span>
          <div className="font-semibold text-sm text-foreground mt-1">
            {report.totalTaken}
          </div>
        </Card>

        <Card className="p-3 bg-card border-border/80">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Difference
          </span>
          <div
            className={`font-semibold text-sm mt-1 ${
              report.difference !== "$0.00" && report.difference !== "0"
                ? "text-rose-600 font-bold"
                : "text-emerald-600"
            }`}
          >
            {report.difference}
          </div>
        </Card>

        <Card className="p-3 bg-card border-border/80">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Compliance Status
          </span>
          <div className="mt-1">
            {hasViolation ? (
              <Badge variant="destructive" className="text-[10px]">
                Violation Flagged
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50/50">
                Audit Clear
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* SECTION 1: Transaction & Invoicing Specifics */}
      <Card className="p-5 border-border/80 space-y-4">
        <div className="flex items-center gap-2 border-b pb-2 font-semibold text-foreground text-sm uppercase tracking-wide">
          <ShoppingBag className="h-4 w-4 text-primary" />
          1. Transaction & Billing Details
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Date</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.date}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Store Name</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.storeName}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Invoice No</span>
            <span className="font-mono font-semibold text-foreground mt-0.5 block">{report.invoiceNo}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Sales Rep</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.salesRep}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Trans / Type</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.transType}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Time</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.time}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Cash Time</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.cashTime}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">BDI Time</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.bdiTime}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Client Type</span>
            <Badge variant="outline" className="text-[11px] mt-0.5">
              {report.clientType}
            </Badge>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Payment Mode</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.paymentMode}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Invoice Amount</span>
            <span className="font-bold text-foreground mt-0.5 block">{report.invoiceAmount}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Total Taken</span>
            <span className="font-bold text-foreground mt-0.5 block">{report.totalTaken}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Difference</span>
            <span className={`font-bold mt-0.5 block ${report.difference !== "$0.00" && report.difference !== "0" ? "text-rose-600" : "text-emerald-600"}`}>
              {report.difference}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Receipt Given?</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.receipt}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Split Payments</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.splitPayments}</span>
          </div>
        </div>
      </Card>

      {/* SECTION 2: Fraud & Audit Verification */}
      <Card className="p-5 border-border/80 space-y-4">
        <div className="flex items-center gap-2 border-b pb-2 font-semibold text-foreground text-sm uppercase tracking-wide">
          <ShieldAlert className="h-4 w-4 text-rose-600" />
          2. Fraud & Compliance Audit
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Fraud Transactions</span>
            <Badge variant={report.fraudTransactions === "Yes" ? "destructive" : "outline"} className="mt-1 text-[11px]">
              {report.fraudTransactions}
            </Badge>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Refund Invoice</span>
            <Badge variant={report.refundInvoice === "Yes" ? "destructive" : "outline"} className="mt-1 text-[11px]">
              {report.refundInvoice}
            </Badge>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Payment Fraud</span>
            <Badge variant={report.paymentFraud === "Yes" ? "destructive" : "outline"} className="mt-1 text-[11px]">
              {report.paymentFraud}
            </Badge>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Miss Opportunity</span>
            <span className="font-semibold text-foreground mt-1 block">{report.missOpportunity}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">AAL Swap</span>
            <span className="font-semibold text-foreground mt-1 block">{report.aalSwap}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">MIM</span>
            <span className="font-semibold text-foreground mt-1 block">{report.mim}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Online / Rejected Payment</span>
            <span className="font-semibold text-foreground mt-1 block">{report.onlineRejectedPayment}</span>
          </div>
        </div>

        {report.notes && (
          <div className="pt-3 border-t">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Audit Findings & Notes:
            </span>
            <div className="p-3.5 rounded-lg border bg-muted/30 text-foreground text-xs leading-relaxed whitespace-pre-wrap">
              {report.notes}
            </div>
          </div>
        )}
      </Card>

      {/* SECTION 3: Sales Pitch & Bundle Audit */}
      <Card className="p-5 border-border/80 space-y-4">
        <div className="flex items-center gap-2 border-b pb-2 font-semibold text-foreground text-sm uppercase tracking-wide">
          <UserCheck className="h-4 w-4 text-emerald-600" />
          3. Sales Pitch, Pitch Quality & Bundle Audit
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Pitch NB</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.pitchNb}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Pitch Quality</span>
            <Badge variant="outline" className="text-[11px] mt-0.5">
              {report.pitchQuality}
            </Badge>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Showing Phone</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.showingPhone}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Acc Offered</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.accOffered}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Maximize</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.maximize}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Flipping</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.flipping}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Bundle NB</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.bundleNb}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Bundle Acc Given</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.bundleAccGiven}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Bundle-Start B</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.bundleStartB}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Bundle-End B</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.bundleEndB}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Port In</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.portIn}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Non-Up</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.nonUp}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">SmartPay Mentioned</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.smartPayMentioned}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">AAL Bill Same</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.aalBillSame}</span>
          </div>
        </div>

        {report.pitchNotes && (
          <div className="pt-3 border-t">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Pitch Observations:
            </span>
            <p className="p-3 rounded-lg border bg-muted/30 text-foreground text-xs leading-relaxed">
              {report.pitchNotes}
            </p>
          </div>
        )}
      </Card>

      {/* SECTION 4: Floor Presence & Rep Timings */}
      <Card className="p-5 border-border/80 space-y-4">
        <div className="flex items-center gap-2 border-b pb-2 font-semibold text-foreground text-sm uppercase tracking-wide">
          <Clock className="h-4 w-4 text-primary" />
          4. Floor Presence & Rep Timings
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Name of Rep Leaving</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.nameOfRepLeaving || "None"}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Time Left</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.timeLeft || "—"}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Time Returned</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.timeReturned || "—"}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Offline</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.offline}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Back Room Time - In</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.backRoomTimeIn || "—"}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Back Room Time - Out</span>
            <span className="font-semibold text-foreground mt-0.5 block">{report.backRoomTimeOut || "—"}</span>
          </div>
        </div>
      </Card>

      {/* SECTION 5: Evidence Attachments */}
      {report.attachments && report.attachments.length > 0 && (
        <Card className="p-5 border-border/80 space-y-3">
          <div className="flex items-center gap-2 border-b pb-2 font-semibold text-foreground text-sm uppercase tracking-wide">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            5. Evidence Attachments & Footage Stills
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

      {/* SECTION 6: Manager Review, Comments & 5-Star Rating */}
      <Card className="p-5 border-border/80 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2 font-semibold text-foreground text-sm uppercase tracking-wide">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            6. Manager Review & Submitter Rating
          </div>
          {!userCanApprove && (
            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
              <Lock className="h-3 w-3 mr-1" /> View Only (District Manager)
            </Badge>
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
              <div className="p-3 rounded-lg border bg-card text-xs">
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

        {/* If review action is available for eligible manager */}
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
                className="text-xs font-medium"
              >
                <X className="h-4 w-4 mr-1.5" />
                Decline Report
              </Button>
              <Button
                onClick={handleApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
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
