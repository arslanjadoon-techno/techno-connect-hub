import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Building2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  Save,
  CheckCircle2,
  Star,
  AlertTriangle,
  Calendar,
  MapPin,
  MessageSquare,
  Search,
  UserPlus,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import {
  canAccessSurveillanceReports,
  getSurveillanceRole,
  getSurveillanceDefaultRoute,
  type SurveillanceReport,
  type SurveillanceRequest,
  type SurveillanceAttachment,
  type SurveillanceAuditRow,
  type SurveillanceAdditionalInvoice,
  type SurveillancePriority,
  type SurveillanceRequestStatus,
} from "@/services/portals/surveillance";
import {
  getStaticAgentRequests,
  getStaticReports,
  submitStaticAuditReport,
  saveStaticDraftRow,
  getStaticDraftRows,
  removeStaticDraftRow,
  clearStaticRequestDraft,
  saveStaticActiveDraftSession,
  getStaticActiveDraftSession,
  clearStaticActiveDraftSession,
} from "./surveillance-data";

const PRIORITY_TONES: Record<SurveillancePriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  high: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
};

// Statuses for Surveillance Reports page
const STATUS_CONFIG: Record<
  SurveillanceRequestStatus,
  { label: string; tone: string; dotClass: string; textClass: string }
> = {
  Requested: {
    label: "Report Requested",
    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-400",
  },
  Pending: {
    label: "Pending",
    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-400",
  },
  Completed: {
    label: "Completed",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  "Report Requested": {
    label: "Report Requested",
    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-400",
  },
  "Report Received": {
    label: "Report Submitted",
    tone: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400",
    dotClass: "bg-sky-500",
    textClass: "text-sky-700 dark:text-sky-400",
  },
  Approved: {
    label: "Approved",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  Rejected: {
    label: "Rejected",
    tone: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
    dotClass: "bg-rose-500",
    textClass: "text-rose-700 dark:text-rose-400",
  },
};

function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatPriorityLabel(priority: SurveillancePriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDisplayDate(raw?: string): string {
  if (!raw) return "—";
  const parsed = new Date(`${raw}T00:00:00`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return raw;
}

function formatDateTimeDisplay(raw?: string): string {
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
  "2 Magenta in Metro",
];

const YES_NO_OPTIONS = [
  { value: "__empty__", label: "-" },
  { value: "YES", label: "YES" },
  { value: "NO", label: "NO" },
];

const CLIENT_TYPE_OPTIONS = [
  { value: "__empty__", label: "-" },
  { value: "Buyer", label: "Buyer" },
  { value: "Non-Buyer", label: "Non-Buyer" },
];

const REP_NAME_OPTIONS = [
  { value: "__empty__", label: "-" },
  ...SALES_REP_NAMES.map((rep) => ({ value: rep, label: rep })),
];

const PAYMENT_TYPE_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "Mix Payment", label: "Mix Payment" },
];

const PITCH_QUALITY_OPTIONS = [
  { value: "__empty__", label: "-" },
  { value: "Good", label: "Good" },
  { value: "Average", label: "Average" },
  { value: "Poor", label: "Poor" },
];

type FraudCheckboxFieldKey =
  | "missOpportunity"
  | "paymentFraud"
  | "aalSwap"
  | "mim"
  | "onlineRejectedPayment"
  | "flipping"
  | "portIn"
  | "nonUp"
  | "smartPayMentioned"
  | "aalBillSame";

const FRAUD_VERIFICATION_ITEMS: {
  key: FraudCheckboxFieldKey;
  detailKey: `${FraudCheckboxFieldKey}Details`;
  label: string;
  notesPlaceholder: string;
}[] = [
  {
    key: "missOpportunity",
    detailKey: "missOpportunityDetails",
    label: "Miss Opportunity",
    notesPlaceholder: "Miss Opportunity notes",
  },
  {
    key: "paymentFraud",
    detailKey: "paymentFraudDetails",
    label: "Payment Fraud",
    notesPlaceholder: "Payment Fraud notes",
  },
  {
    key: "aalSwap",
    detailKey: "aalSwapDetails",
    label: "AAL Swap",
    notesPlaceholder: "AAL Swap notes",
  },
  {
    key: "mim",
    detailKey: "mimDetails",
    label: "MIM",
    notesPlaceholder: "MIM notes",
  },
  {
    key: "onlineRejectedPayment",
    detailKey: "onlineRejectedPaymentDetails",
    label: "Online/Rejected Payment",
    notesPlaceholder: "Online/Rejected Payment notes",
  },
  {
    key: "flipping",
    detailKey: "flippingDetails",
    label: "Flipping",
    notesPlaceholder: "Flipping notes",
  },
  {
    key: "portIn",
    detailKey: "portInDetails",
    label: "Port In",
    notesPlaceholder: "Port In notes",
  },
  {
    key: "nonUp",
    detailKey: "nonUpDetails",
    label: "Non-Up",
    notesPlaceholder: "Non-Up notes",
  },
  {
    key: "smartPayMentioned",
    detailKey: "smartPayMentionedDetails",
    label: "SmartPay Mentioned",
    notesPlaceholder: "SmartPay Mentioned notes",
  },
  {
    key: "aalBillSame",
    detailKey: "aalBillSameDetails",
    label: "AAL Bill Same",
    notesPlaceholder: "AAL Bill Same notes",
  },
];

function hasAnyActiveFraudItem(row: SurveillanceAuditRow): boolean {
  return FRAUD_VERIFICATION_ITEMS.some(
    (item) =>
      (row[item.key] || "").trim().toUpperCase() === "YES" ||
      Boolean((row[item.detailKey] || "").trim()),
  );
}

type CustomDetailFieldKey =
  | "transType"
  | "clientType"
  | "pitchQuality"
  | "receipt"
  | "fraudTransactions"
  | "missOpportunity"
  | "paymentFraud"
  | "aalSwap"
  | "mim"
  | "onlineRejectedPayment"
  | "pitchNb"
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

type AuditRowDetailProp = `${CustomDetailFieldKey}Details`;

const CUSTOM_DETAIL_PROP_MAP: Record<CustomDetailFieldKey, AuditRowDetailProp> = {
  transType: "transTypeDetails",
  clientType: "clientTypeDetails",
  pitchQuality: "pitchQualityDetails",
  receipt: "receiptDetails",
  fraudTransactions: "fraudTransactionsDetails",
  missOpportunity: "missOpportunityDetails",
  paymentFraud: "paymentFraudDetails",
  aalSwap: "aalSwapDetails",
  mim: "mimDetails",
  onlineRejectedPayment: "onlineRejectedPaymentDetails",
  pitchNb: "pitchNbDetails",
  showingPhone: "showingPhoneDetails",
  accOffered: "accOfferedDetails",
  maximize: "maximizeDetails",
  flipping: "flippingDetails",
  bundleAccGiven: "bundleAccGivenDetails",
  portIn: "portInDetails",
  nonUp: "nonUpDetails",
  smartPayMentioned: "smartPayMentionedDetails",
  aalBillSame: "aalBillSameDetails",
  offline: "offlineDetails",
};

const CUSTOM_DETAIL_KEYS = Object.keys(CUSTOM_DETAIL_PROP_MAP) as CustomDetailFieldKey[];

function hydrateAuditRowDetails(
  row: SurveillanceAuditRow,
  reportFallback?: SurveillanceReport,
): SurveillanceAuditRow {
  const next: SurveillanceAuditRow = { ...row };
  for (const key of CUSTOM_DETAIL_KEYS) {
    const prop = CUSTOM_DETAIL_PROP_MAP[key];
    const existing =
      typeof row[prop] === "string"
        ? row[prop]
        : (row.otherDetails?.[key] ??
          (reportFallback ? (reportFallback[prop] as string | undefined) : undefined) ??
          "");
    next[prop] = existing;
  }
  return next;
}

function hasCustomInTransType(raw: string | undefined): boolean {
  return (raw || "")
    .split(/\s*\/\s*/)
    .some((s) => {
      const low = s.trim().toLowerCase();
      return low === "custom" || low === "other";
    });
}

function getRowCustomDetail(row: SurveillanceAuditRow, fieldKey: CustomDetailFieldKey): string {
  const prop = CUSTOM_DETAIL_PROP_MAP[fieldKey];
  const direct = row[prop];
  if (typeof direct === "string") return direct;
  return row.otherDetails?.[fieldKey] || "";
}

function normalizeCustomOption(val: string | undefined): string {
  const trimmed = (val || "").trim();
  if (!trimmed || trimmed === "__empty__") return "";
  if (trimmed === "Other") return "Custom";
  return trimmed;
}

function normalizePitchQualitySelectValue(raw: string | undefined): string {
  const s = (raw || "").trim().toLowerCase();
  if (!s || s === "__empty__" || s === "-" || s === "—" || s === "not observed") return "";
  if (s === "good") return "Good";
  if (s === "avg" || s === "average" || s === "fair") return "Average";
  if (s === "poor" || s === "bad") return "Poor";
  return (raw || "").trim();
}

function createEmptyAdditionalInvoice(): SurveillanceAdditionalInvoice {
  return {
    id: `add-inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    invoice: "",
    bdiTime: "",
    transType: "",
    invoiceAmount: "",
    totalTaken: "",
    difference: "$0.00",
    paymentType: "Cash",
    cash: "",
    card: "",
    receipt: "",
  };
}

function normalizeClientType(raw: string | undefined, b?: string, nb?: string): string {
  const trimmed = (raw || "").trim();
  if (trimmed === "Buyer" || trimmed === "Billable") return "Buyer";
  if (trimmed === "Non-Buyer" || trimmed === "Non Billable") return "Non-Buyer";
  if (trimmed) return trimmed;
  if (b?.trim().toUpperCase() === "B") return "Buyer";
  if (nb?.trim().toUpperCase() === "NB") return "Non-Buyer";
  return "";
}

function TransactionTypeMultiSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (nextVal: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedList = useMemo(
    () =>
      (value || "")
        .split(/\s*\/\s*/)
        .map((s) => s.trim())
        .filter(Boolean),
    [value],
  );

  const toggleOption = (opt: string) => {
    const exists = selectedList.includes(opt);
    const next = exists ? selectedList.filter((item) => item !== opt) : [...selectedList, opt];
    onChange(next.join(" / "));
  };

  const displayString = selectedList.join(" / ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={displayString || "-"}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span
            className={`truncate text-left ${
              displayString ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {displayString || "-"}
          </span>
          {displayString ? (
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
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
              title="Clear selection"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-1.5"
      >
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <span>- (Clear Selection)</span>
          </button>
          {options.map((opt) => {
            const checked = selectedList.includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer text-xs text-foreground hover:bg-accent"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleOption(opt)} />
                <span className="flex-1 truncate">{opt}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StandardSelect({
  label,
  required = false,
  options,
  value,
  onValueChange,
}: {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
  value: string | undefined;
  onValueChange: (val: string) => void;
}) {
  const selectVal = !value || value === "__empty__" ? "__empty__" : value;

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Select value={selectVal} onValueChange={(v) => onValueChange(v === "__empty__" ? "" : v)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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

function normalizePaymentTypeSelection(
  paymentType?: string,
  cash?: string,
  card?: string,
): "Cash" | "Card" | "Mix Payment" {
  const pt = (paymentType || "").trim();
  if (pt === "Card" || pt === "Cash" || pt === "Mix Payment") {
    return pt;
  }
  const hasCard = Boolean(card && card.trim() && card.trim().toLowerCase() !== "card");
  const hasCash = Boolean(cash && cash.trim() && cash.trim().toLowerCase() !== "cash");
  if (hasCard && hasCash) return "Mix Payment";
  if (hasCard) return "Card";
  return "Cash";
}

function sanitizePaymentInputValue(
  raw: string | undefined,
  fallbackTotalTaken?: string,
): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase() === "cash" || trimmed.toLowerCase() === "card") {
    return (fallbackTotalTaken || "").trim();
  }
  return trimmed;
}

function computeTotalTakenFromPayments(
  paymentType: string | undefined,
  cashRaw: string | undefined,
  cardRaw: string | undefined,
): string {
  const pt = normalizePaymentTypeSelection(paymentType, cashRaw, cardRaw);
  const cashParsed = parseCurrencyNumber(cashRaw);
  const cardParsed = parseCurrencyNumber(cardRaw);
  if (pt === "Card") {
    return cardParsed.valid ? `$${cardParsed.value.toFixed(2)}` : "";
  }
  if (pt === "Mix Payment") {
    if (!cashParsed.valid && !cardParsed.valid) return "";
    const sum =
      (cashParsed.valid ? cashParsed.value : 0) + (cardParsed.valid ? cardParsed.value : 0);
    return `$${sum.toFixed(2)}`;
  }
  return cashParsed.valid ? `$${cashParsed.value.toFixed(2)}` : "";
}

function calculatePaymentDifferenceDisplay(
  invoiceAmountRaw: string | undefined,
  paymentType: string | undefined,
  cashRaw: string | undefined,
  cardRaw: string | undefined,
): string {
  const totalTakenStr = computeTotalTakenFromPayments(paymentType, cashRaw, cardRaw);
  return calculateDifferenceDisplay(invoiceAmountRaw || "", totalTakenStr);
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
              <span className="text-muted-foreground font-mono font-medium">--:--</span>
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

const MONTH_SHORT_NAMES = [
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

function formatSurveillanceDate(raw?: string): string {
  const str = (raw || "").split(" - ")[0]?.trim() || "";
  if (!str) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mmm = MONTH_SHORT_NAMES[now.getMonth()];
    const yyyy = now.getFullYear();
    return `${dd} ${mmm}, ${yyyy}`;
  }

  const alreadyFormatted = str.match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/);
  if (alreadyFormatted) {
    const dd = alreadyFormatted[1].padStart(2, "0");
    const mmm =
      alreadyFormatted[2].charAt(0).toUpperCase() + alreadyFormatted[2].slice(1, 3).toLowerCase();
    const yyyy = alreadyFormatted[3];
    return `${dd} ${mmm}, ${yyyy}`;
  }

  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const yyyy = Number(ymdMatch[1]);
    const monthIdx = Number(ymdMatch[2]) - 1;
    const dd = String(Number(ymdMatch[3])).padStart(2, "0");
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${dd} ${MONTH_SHORT_NAMES[monthIdx]}, ${yyyy}`;
    }
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mmm = MONTH_SHORT_NAMES[parsed.getMonth()];
    const yyyy = parsed.getFullYear();
    return `${dd} ${mmm}, ${yyyy}`;
  }

  return str;
}

export interface RepTimingRow {
  id: string;
  repName: string;
  timeLeft: string;
  timeReturned: string;
  backRoomTimeIn: string;
  backRoomTimeOut: string;
}

function createEmptyRepTimingRow(): RepTimingRow {
  return {
    id: `rep-timing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    repName: "",
    timeLeft: "",
    timeReturned: "",
    backRoomTimeIn: "",
    backRoomTimeOut: "",
  };
}

export interface CameraUptimeRow {
  id: string;
  cameraName: string;
  onlineTime: string;
  offlineTime: string;
}

function createEmptyCameraUptimeRow(): CameraUptimeRow {
  return {
    id: `cam-uptime-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    cameraName: "",
    onlineTime: "",
    offlineTime: "",
  };
}

// Dropdowns default to "" ("-"), except Payment Type which defaults to "Cash"
function createEmptyAuditRow(
  storeName: string,
  marketName: string,
  defaultDate?: string,
): SurveillanceAuditRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    additionalInvoices: [],
    date: formatSurveillanceDate(defaultDate),
    marketName: marketName || "",
    storeName: storeName || "",
    invoice: "",
    cashTime: "",
    time: "",
    bdiTime: "",
    salesRep: "",
    transType: "",
    transTypeDetails: "",
    clientType: "",
    clientTypeDetails: "",
    nb: "",
    b: "",
    invoiceAmount: "",
    totalTaken: "",
    paymentType: "Cash",
    cash: "",
    card: "",
    difference: "$0.00",
    receipt: "",
    receiptDetails: "",
    splitPayments: "",
    fraudTransactions: "",
    fraudTransactionsDetails: "",
    refundInvoice: "",
    missOpportunity: "",
    missOpportunityDetails: "",
    paymentFraud: "",
    paymentFraudDetails: "",
    aalSwap: "",
    aalSwapDetails: "",
    mim: "",
    mimDetails: "",
    notes: "",
    pitchNb: "",
    pitchNbDetails: "",
    pitchNotes: "",
    pitchQuality: "",
    pitchQualityDetails: "",
    showingPhone: "",
    showingPhoneDetails: "",
    accOffered: "",
    accOfferedDetails: "",
    maximize: "",
    maximizeDetails: "",
    flipping: "",
    flippingDetails: "",
    bundleNb: "",
    bundleStartB: "",
    bundleEndB: "",
    bundleAccGiven: "",
    bundleAccGivenDetails: "",
    portIn: "",
    portInDetails: "",
    nonUp: "",
    nonUpDetails: "",
    smartPayMentioned: "",
    smartPayMentionedDetails: "",
    aalBillSame: "",
    aalBillSameDetails: "",
    onlineRejectedPayment: "",
    onlineRejectedPaymentDetails: "",
    nameOfRepLeaving: "",
    timeLeft: "",
    timeReturned: "",
    backRoomTimeIn: "",
    backRoomTimeOut: "",
    offline: "",
    offlineDetails: "",
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
    pqTrimmed.toLowerCase() === "custom" || pqTrimmed.toLowerCase() === "other"
      ? "Custom"
      : normalizePitchQualitySelectValue(pqTrimmed);

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

export default function SurveillanceReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Top / bottom store open & close time fields
  const [headerStoreOpenTime, setHeaderStoreOpenTime] = useState<string>("");
  const [headerStoreCloseTime, setHeaderStoreCloseTime] = useState<string>("");

  // Standalone Floor Presence & Rep Timings rows
  const [repTimingRows, setRepTimingRows] = useState<RepTimingRow[]>([
    createEmptyRepTimingRow(),
  ]);
  const [isFloorPresenceEnabled, setIsFloorPresenceEnabled] = useState<boolean>(false);
  const [isTimingSectionDirty, setIsTimingSectionDirty] = useState<boolean>(false);
  const [, setIsTimingSectionSaved] = useState<boolean>(false);

  // Standalone Camera Uptime Logs rows
  const [cameraUptimeRows, setCameraUptimeRows] = useState<CameraUptimeRow[]>([
    createEmptyCameraUptimeRow(),
  ]);
  const [isCameraUptimeEnabled, setIsCameraUptimeEnabled] = useState<boolean>(false);
  const [isCameraUptimeDirty, setIsCameraUptimeDirty] = useState<boolean>(false);
  const [, setIsCameraUptimeSaved] = useState<boolean>(false);

  const [fraudSectionEnabledByRow, setFraudSectionEnabledByRow] = useState<Record<string, boolean>>(
    {},
  );
  const [salesPitchSectionEnabledByRow, setSalesPitchSectionEnabledByRow] = useState<
    Record<string, boolean>
  >({});
  const [headerGeneralNotes, setHeaderGeneralNotes] = useState<string>("");

  const metrics = useMemo(() => {
    return {
      total: requests.length,
      submitted: requests.filter(
        (r) => r.status === "Report Received" || r.status === "Approved" || r.status === "Rejected",
      ).length,
      pending: requests.filter((r) => r.status === "Report Requested").length,
      rejected: requests.filter(
        (r) => r.status === "Rejected" || r.reportStatus === "Rejected",
      ).length,
      approved: requests.filter((r) => r.status === "Approved").length,
    };
  }, [requests]);

  // Load sample static requests + reports on mount (backend API disabled during UI iteration)
  useEffect(() => {
    setRequests(getStaticAgentRequests());
    setReports(getStaticReports());
    setDataLoaded(true);
  }, []);

  // Listen for resubmitRequestId passed from detail view navigation
  useEffect(() => {
    if (!dataLoaded) return;
    const resubmitId = (location.state as { resubmitRequestId?: string } | null)?.resubmitRequestId;
    if (resubmitId) {
      const targetReq = requests.find((r) => r.id === resubmitId);
      if (targetReq) {
        setSelectedDetail(targetReq);
        handleOpenEditableForm(targetReq);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded, location.state]);

  // Automatically restore active MMKV draft session after an unexpected refresh
  useEffect(() => {
    if (!dataLoaded) return;
    const activeSession = getStaticActiveDraftSession();
    if (!activeSession?.isEditing || !activeSession.requestId) return;

    const targetReq = requests.find(
      (r) => r.id === activeSession.requestId && r.status === "Report Requested",
    );
    if (!targetReq) {
      clearStaticActiveDraftSession();
      return;
    }

    const savedRecords = getStaticDraftRows(targetReq.id);
    if (savedRecords.length === 0) return;

    const restoredRows = savedRecords.map((rec) => {
      const resolvedPt = normalizePaymentTypeSelection(
        rec.row.paymentType,
        rec.row.cash,
        rec.row.card,
      );
      const cleanCash = sanitizePaymentInputValue(
        rec.row.cash,
        resolvedPt === "Cash" ? rec.row.totalTaken : "",
      );
      const cleanCard = sanitizePaymentInputValue(
        rec.row.card,
        resolvedPt === "Card" ? rec.row.totalTaken : "",
      );
      const computedTaken = computeTotalTakenFromPayments(resolvedPt, cleanCash, cleanCard);
      return hydrateAuditRowDetails({
        ...rec.row,
        date: formatSurveillanceDate(rec.row.date || targetReq.incidentDate),
        marketName: rec.row.marketName?.trim() || targetReq.marketName || "",
        storeName: rec.row.storeName?.trim() || targetReq.storeName || "",
        clientType: normalizeClientType(rec.row.clientType, rec.row.b, rec.row.nb),
        paymentType: resolvedPt,
        cash: cleanCash,
        card: cleanCard,
        totalTaken: computedTaken,
        difference: calculatePaymentDifferenceDisplay(
          rec.row.invoiceAmount,
          resolvedPt,
          cleanCash,
          cleanCard,
        ),
        attachments: rec.row.attachments ? [...rec.row.attachments] : [],
      });
    });
    const timestamps: Record<string, string> = {};
    const expanded: Record<string, boolean> = {};
    const initialFraudOpen: Record<string, boolean> = {};
    for (const rec of savedRecords) {
      timestamps[rec.row.id] = rec.savedAt;
      expanded[rec.row.id] = true;
    }
    for (const r of restoredRows) {
      if (hasAnyActiveFraudItem(r)) {
        initialFraudOpen[r.id] = true;
      }
    }

    setSelectedDetail(targetReq);
    setEditableRows(restoredRows);
    setSavedRowTimestamps(timestamps);
    setDirtyRowIds({});
    setExpandedRowIds(expanded);
    setFraudSectionEnabledByRow(initialFraudOpen);
    setIsEditingReport(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded]);

  const handleOpenEditableForm = (reqItem: SurveillanceRequest) => {
    // 1. Check MMKV storage first for previously saved row-by-row draft entries
    const savedRecords = getStaticDraftRows(reqItem.id);
    if (savedRecords.length > 0) {
      const restoredRows = savedRecords.map((rec) => {
        const resolvedPt = normalizePaymentTypeSelection(
          rec.row.paymentType,
          rec.row.cash,
          rec.row.card,
        );
        const cleanCash = sanitizePaymentInputValue(
          rec.row.cash,
          resolvedPt === "Cash" ? rec.row.totalTaken : "",
        );
        const cleanCard = sanitizePaymentInputValue(
          rec.row.card,
          resolvedPt === "Card" ? rec.row.totalTaken : "",
        );
        const computedTaken = computeTotalTakenFromPayments(resolvedPt, cleanCash, cleanCard);
        return hydrateAuditRowDetails({
          ...rec.row,
          date: formatSurveillanceDate(rec.row.date || reqItem.incidentDate),
          marketName: rec.row.marketName?.trim() || reqItem.marketName || "",
          storeName: rec.row.storeName?.trim() || reqItem.storeName || "",
          clientType: normalizeClientType(rec.row.clientType, rec.row.b, rec.row.nb),
          paymentType: resolvedPt,
          cash: cleanCash,
          card: cleanCard,
          totalTaken: computedTaken,
          difference: calculatePaymentDifferenceDisplay(
            rec.row.invoiceAmount,
            resolvedPt,
            cleanCash,
            cleanCard,
          ),
          attachments: rec.row.attachments ? [...rec.row.attachments] : [],
        });
      });
      const timestamps: Record<string, string> = {};
      const expanded: Record<string, boolean> = {};
      const initialFraudOpen: Record<string, boolean> = {};
      for (const rec of savedRecords) {
        timestamps[rec.row.id] = rec.savedAt;
        expanded[rec.row.id] = true;
      }
      for (const r of restoredRows) {
        if (hasAnyActiveFraudItem(r)) {
          initialFraudOpen[r.id] = true;
        }
      }

      setEditableRows(restoredRows);
      setSavedRowTimestamps(timestamps);
      setDirtyRowIds({});
      setExpandedRowIds(expanded);
      setIsFloorPresenceEnabled(false);
      setFraudSectionEnabledByRow(initialFraudOpen);
      setSalesPitchSectionEnabledByRow({});
      saveStaticActiveDraftSession(reqItem.id, true);
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

    const initialDate = formatSurveillanceDate(reqItem.incidentDate);

    setSavedRowTimestamps({});
    setDirtyRowIds({});
    setIsFloorPresenceEnabled(false);
    setIsCameraUptimeEnabled(false);
    setIsTimingSectionDirty(false);
    setIsCameraUptimeDirty(false);
    setFraudSectionEnabledByRow({});
    setSalesPitchSectionEnabledByRow({});

    if (existingReport) {
      setHeaderStoreOpenTime(existingReport.cashTime || existingReport.time || "");
      setHeaderStoreCloseTime(existingReport.timeReturned || "");
      setHeaderGeneralNotes(existingReport.notes || "");
      if (existingReport.nameOfRepLeaving || existingReport.timeLeft) {
        setRepTimingRows([
          {
            id: `rep-timing-${Date.now()}`,
            repName: existingReport.nameOfRepLeaving?.trim() || "",
            timeLeft: existingReport.timeLeft || "",
            timeReturned: existingReport.timeReturned || "",
            backRoomTimeIn: existingReport.backRoomTimeIn || "",
            backRoomTimeOut: existingReport.backRoomTimeOut || "",
          },
        ]);
      } else {
        setRepTimingRows([createEmptyRepTimingRow()]);
      }
      setCameraUptimeRows([createEmptyCameraUptimeRow()]);
    } else {
      setHeaderStoreOpenTime("");
      setHeaderStoreCloseTime("");
      setHeaderGeneralNotes("");
      setRepTimingRows([createEmptyRepTimingRow()]);
      setCameraUptimeRows([createEmptyCameraUptimeRow()]);
    }

    if (existingReport && existingReport.rows && existingReport.rows.length > 0) {
      const cloned = existingReport.rows.map((r, idx) => {
        const resolvedPt = normalizePaymentTypeSelection(r.paymentType, r.cash, r.card);
        const cleanCash = sanitizePaymentInputValue(
          r.cash,
          resolvedPt === "Cash" ? r.totalTaken : "",
        );
        const cleanCard = sanitizePaymentInputValue(
          r.card,
          resolvedPt === "Card" ? r.totalTaken : "",
        );
        const computedTaken = computeTotalTakenFromPayments(resolvedPt, cleanCash, cleanCard);
        return hydrateAuditRowDetails(
          {
            ...r,
            date: formatSurveillanceDate(r.date || initialDate),
            marketName: r.marketName?.trim() || reqItem.marketName || "",
            storeName: r.storeName?.trim() || reqItem.storeName || "",
            clientType: normalizeClientType(r.clientType, r.b, r.nb),
            paymentType: resolvedPt,
            cash: cleanCash,
            card: cleanCard,
            totalTaken: computedTaken,
            difference: calculatePaymentDifferenceDisplay(
              r.invoiceAmount,
              resolvedPt,
              cleanCash,
              cleanCard,
            ),
            attachments: r.attachments ? [...r.attachments] : [],
          },
          idx === 0 ? existingReport : undefined,
        );
      });
      const initialFraudOpen: Record<string, boolean> = {};
      for (const r of cloned) {
        if (hasAnyActiveFraudItem(r)) {
          initialFraudOpen[r.id] = true;
        }
      }
      setFraudSectionEnabledByRow(initialFraudOpen);
      setEditableRows(cloned);
      setExpandedRowIds({ [cloned[0].id]: true });
    } else if (existingReport) {
      const fallbackRaw = buildFallbackRowFromReport(existingReport, reqItem.marketName);
      const resolvedPt = normalizePaymentTypeSelection(
        fallbackRaw.paymentType,
        fallbackRaw.cash,
        fallbackRaw.card,
      );
      const cleanCash = sanitizePaymentInputValue(
        fallbackRaw.cash,
        resolvedPt === "Cash" ? fallbackRaw.totalTaken : "",
      );
      const cleanCard = sanitizePaymentInputValue(
        fallbackRaw.card,
        resolvedPt === "Card" ? fallbackRaw.totalTaken : "",
      );
      const fallbackRow = hydrateAuditRowDetails(
        {
          ...fallbackRaw,
          paymentType: resolvedPt,
          cash: cleanCash,
          card: cleanCard,
          totalTaken: computeTotalTakenFromPayments(resolvedPt, cleanCash, cleanCard),
          difference: calculatePaymentDifferenceDisplay(
            fallbackRaw.invoiceAmount,
            resolvedPt,
            cleanCash,
            cleanCard,
          ),
        },
        existingReport,
      );
      if (hasAnyActiveFraudItem(fallbackRow)) {
        setFraudSectionEnabledByRow({ [fallbackRow.id]: true });
      }
      setEditableRows([fallbackRow]);
      setExpandedRowIds({ [fallbackRow.id]: true });
    } else {
      // By default start with 0 open rows
      setEditableRows([]);
      setExpandedRowIds({});
    }

    saveStaticActiveDraftSession(reqItem.id, true);
    setIsEditingReport(true);
  };

  const handleCloseEditableForm = () => {
    clearStaticActiveDraftSession();
    setIsEditingReport(false);
  };

  const handleSaveAuditRow = (requestId: string, row: SurveillanceAuditRow, rowIndex: number) => {
    const savedRecord = saveStaticDraftRow(requestId, row, rowIndex);
    setSavedRowTimestamps((prev) => ({
      ...prev,
      [row.id]: savedRecord.savedAt,
    }));
    setDirtyRowIds((prev) => ({
      ...prev,
      [row.id]: false,
    }));
    saveStaticActiveDraftSession(requestId, true);
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

        // Keep nb / b synchronized with Client Type dropdown
        if (field === "clientType") {
          const ct = String(value || "");
          updated.b = ct === "Buyer" || ct === "Billable" ? "B" : "";
          updated.nb = ct === "Non-Buyer" || ct === "Non Billable" ? "NB" : "";
        }

        // Keep card / cash / totalTaken / difference synchronized with Payment Type & payment inputs
        if (field === "paymentType") {
          const pt = normalizePaymentTypeSelection(String(value || "Cash"));
          updated.paymentType = pt;
          if (pt === "Card") {
            updated.cash = "";
          } else if (pt === "Cash") {
            updated.card = "";
          }
        }

        if (
          field === "invoiceAmount" ||
          field === "paymentType" ||
          field === "cash" ||
          field === "card"
        ) {
          const activePt = normalizePaymentTypeSelection(
            updated.paymentType,
            updated.cash,
            updated.card,
          );
          updated.paymentType = activePt;
          updated.totalTaken = computeTotalTakenFromPayments(
            activePt,
            updated.cash,
            updated.card,
          );
          updated.difference = calculatePaymentDifferenceDisplay(
            updated.invoiceAmount,
            activePt,
            updated.cash,
            updated.card,
          );
        }

        if (field === "pitchQuality") {
          const normalizedPq = normalizePitchQualitySelectValue(String(value || ""));
          updated.pitchQuality = normalizedPq;
          if (normalizedPq !== "Average" && normalizedPq !== "Poor") {
            updated.pitchNotes = "";
          }
        }

        return updated;
      }),
    );
  };

  const handleToggleFraudCheckbox = (
    rowId: string,
    fieldKey: FraudCheckboxFieldKey,
    detailKey: `${FraudCheckboxFieldKey}Details`,
    checked: boolean,
  ) => {
    setDirtyRowIds((prev) => ({ ...prev, [rowId]: true }));
    setEditableRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          [fieldKey]: checked ? "YES" : "",
          [detailKey]: checked ? row[detailKey] || "" : "",
        };
      }),
    );
  };

  // Adds a fresh audit row
  const handleAddAuditRow = (storeName: string, marketName: string, defaultDate?: string) => {
    const nextRow = createEmptyAuditRow(storeName, marketName, defaultDate);
    setEditableRows((prev) => [...prev, nextRow]);
    setExpandedRowIds((prev) => ({ ...prev, [nextRow.id]: true }));
    setFraudSectionEnabledByRow((prev) => ({ ...prev, [nextRow.id]: false }));
    setSalesPitchSectionEnabledByRow((prev) => ({ ...prev, [nextRow.id]: false }));
  };

  const handleAddAdditionalInvoice = (rowId: string) => {
    setDirtyRowIds((prev) => ({ ...prev, [rowId]: true }));
    setEditableRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              additionalInvoices: [
                ...(row.additionalInvoices || []),
                createEmptyAdditionalInvoice(),
              ],
            }
          : row,
      ),
    );
  };

  const handleRemoveAdditionalInvoice = (rowId: string, addInvId: string) => {
    setDirtyRowIds((prev) => ({ ...prev, [rowId]: true }));
    setEditableRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              additionalInvoices: (row.additionalInvoices || []).filter(
                (item) => item.id !== addInvId,
              ),
            }
          : row,
      ),
    );
  };

  const handleUpdateAdditionalInvoiceField = <K extends keyof SurveillanceAdditionalInvoice>(
    rowId: string,
    addInvId: string,
    field: K,
    value: SurveillanceAdditionalInvoice[K],
  ) => {
    setDirtyRowIds((prev) => ({ ...prev, [rowId]: true }));
    setEditableRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const nextList = (row.additionalInvoices || []).map((item) => {
          if (item.id !== addInvId) return item;
          const updated: SurveillanceAdditionalInvoice = { ...item, [field]: value };
          if (field === "paymentType") {
            const pt = normalizePaymentTypeSelection(String(value || "Cash"));
            updated.paymentType = pt;
            if (pt === "Card") {
              updated.cash = "";
            } else if (pt === "Cash") {
              updated.card = "";
            }
          }
          if (
            field === "invoiceAmount" ||
            field === "paymentType" ||
            field === "cash" ||
            field === "card"
          ) {
            const activePt = normalizePaymentTypeSelection(
              updated.paymentType,
              updated.cash,
              updated.card,
            );
            updated.paymentType = activePt;
            updated.totalTaken = computeTotalTakenFromPayments(
              activePt,
              updated.cash,
              updated.card,
            );
            updated.difference = calculatePaymentDifferenceDisplay(
              updated.invoiceAmount,
              activePt,
              updated.cash,
              updated.card,
            );
          }
          return updated;
        });
        return { ...row, additionalInvoices: nextList };
      }),
    );
  };

  const handleRemoveAuditRow = (requestId: string, rowId: string) => {
    removeStaticDraftRow(requestId, rowId);
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
    setFraudSectionEnabledByRow((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    setSalesPitchSectionEnabledByRow((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const handleAddRepTimingRow = () => {
    setIsTimingSectionDirty(true);
    setIsTimingSectionSaved(false);
    setRepTimingRows((prev) => [...prev, createEmptyRepTimingRow()]);
  };

  const handleRemoveRepTimingRow = (id: string) => {
    setIsTimingSectionDirty(true);
    setIsTimingSectionSaved(false);
    if (repTimingRows.length <= 1) {
      setRepTimingRows([createEmptyRepTimingRow()]);
      return;
    }
    setRepTimingRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRepTimingField = <K extends keyof RepTimingRow>(
    id: string,
    field: K,
    value: RepTimingRow[K],
  ) => {
    setIsTimingSectionDirty(true);
    setIsTimingSectionSaved(false);
    setRepTimingRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const handleSaveAllRepTimings = () => {
    for (let i = 0; i < repTimingRows.length; i++) {
      const row = repTimingRows[i];
      const rowNum = i + 1;
      const hasAnyTime = [
        row.timeLeft,
        row.timeReturned,
        row.backRoomTimeIn,
        row.backRoomTimeOut,
      ].some((t) => t && t.trim());

      const hasRepName = Boolean(row.repName && row.repName.trim());

      if (hasAnyTime && !hasRepName) {
        toast.error(`Please select "Name of Rep Leaving" for Timing Row #${rowNum}.`);
        return;
      }
      if (hasRepName && !hasAnyTime) {
        toast.error(`Please enter at least one time entry for Timing Row #${rowNum}.`);
        return;
      }
    }

    setIsTimingSectionDirty(false);
    setIsTimingSectionSaved(true);
    toast.success("Floor Presence & Rep Timings saved successfully.");
  };

  const handleAddCameraUptimeRow = () => {
    setIsCameraUptimeDirty(true);
    setIsCameraUptimeSaved(false);
    setCameraUptimeRows((prev) => [...prev, createEmptyCameraUptimeRow()]);
  };

  const handleRemoveCameraUptimeRow = (id: string) => {
    setIsCameraUptimeDirty(true);
    setIsCameraUptimeSaved(false);
    if (cameraUptimeRows.length <= 1) {
      setCameraUptimeRows([createEmptyCameraUptimeRow()]);
      return;
    }
    setCameraUptimeRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateCameraUptimeField = <K extends keyof CameraUptimeRow>(
    id: string,
    field: K,
    value: CameraUptimeRow[K],
  ) => {
    setIsCameraUptimeDirty(true);
    setIsCameraUptimeSaved(false);
    setCameraUptimeRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const handleSaveAllCameraUptimeLogs = () => {
    for (let i = 0; i < cameraUptimeRows.length; i++) {
      const row = cameraUptimeRows[i];
      const rowNum = i + 1;
      const hasCameraName = Boolean(row.cameraName && row.cameraName.trim());
      const hasAnyTime = [row.onlineTime, row.offlineTime].some((t) => t && t.trim());

      if (hasAnyTime && !hasCameraName) {
        toast.error(`Please enter a Camera Name for Camera Uptime Row #${rowNum}.`);
        return;
      }
      if (hasCameraName && !hasAnyTime) {
        toast.error(
          `Please select Online Time or Offline Time for Camera Uptime Row #${rowNum}.`,
        );
        return;
      }
    }

    setIsCameraUptimeDirty(false);
    setIsCameraUptimeSaved(true);
    toast.success("Camera Uptime Logs saved successfully.");
  };

  const toggleRowExpanded = (rowId: string) => {
    setExpandedRowIds((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const handleRowAttachmentUpload = (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
        row.id === rowId ? { ...row, attachments: [...(row.attachments || []), ...uploaded] } : row,
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

  const validateRequiredAuditRows = (): boolean => {
    if (editableRows.length === 0) {
      toast.error("Please add at least one audit row before submitting.");
      return false;
    }

    for (let i = 0; i < editableRows.length; i++) {
      const r = editableRows[i];
      const rowNum = i + 1;
      if (!r.date || !r.date.trim()) {
        setExpandedRowIds((prev) => ({ ...prev, [r.id]: true }));
        toast.error(`Surveillance Date is required for Row #${rowNum}.`);
        return false;
      }
      if (!r.marketName || !r.marketName.trim()) {
        setExpandedRowIds((prev) => ({ ...prev, [r.id]: true }));
        toast.error(`Market is required for Row #${rowNum}.`);
        return false;
      }
      if (!r.storeName || !r.storeName.trim()) {
        setExpandedRowIds((prev) => ({ ...prev, [r.id]: true }));
        toast.error(`Store Name is required for Row #${rowNum}.`);
        return false;
      }
      const effectiveSalesRep = (r.salesRep || "").trim();
      if (!effectiveSalesRep) {
        setExpandedRowIds((prev) => ({ ...prev, [r.id]: true }));
        toast.error(`Please select a Rep Name for Row #${rowNum} before submitting.`);
        return false;
      }
      if (!r.transType || !r.transType.trim()) {
        setExpandedRowIds((prev) => ({ ...prev, [r.id]: true }));
        toast.error(`Please select a Transaction Type for Row #${rowNum} before submitting.`);
        return false;
      }
      if (r.additionalInvoices && r.additionalInvoices.length > 0) {
        for (let j = 0; j < r.additionalInvoices.length; j++) {
          const addInv = r.additionalInvoices[j];
          if (!addInv.transType || !addInv.transType.trim()) {
            setExpandedRowIds((prev) => ({ ...prev, [r.id]: true }));
            toast.error(
              `Please select a Transaction Type for Additional Invoice #${j + 2} in Row #${rowNum}.`,
            );
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleRequestSubmitConfirmation = () => {
    if (!validateRequiredAuditRows()) return;
    setConfirmSubmitOpen(true);
  };

  const handleSubmitEditableReport = async (reqItem: SurveillanceRequest) => {
    if (!validateRequiredAuditRows()) return;

    setConfirmSubmitOpen(false);
    setIsSubmitting(true);

    const primaryRow = editableRows[0];

    const resolveYesNoValue = (val: string | undefined): string => {
      const trimmed = (val || "").trim();
      if (trimmed === "Custom" || trimmed === "Other") return "Custom";
      return trimmed.toUpperCase() === "YES" ? "Yes" : "No";
    };

    const resolveCustomDetailValue = (
      row: SurveillanceAuditRow,
      fieldKey: CustomDetailFieldKey,
      rawSelection: string | undefined,
    ): string => {
      const isCustom =
        fieldKey === "transType"
          ? hasCustomInTransType(rawSelection)
          : (rawSelection || "").trim() === "Custom" || (rawSelection || "").trim() === "Other";
      return isCustom ? getRowCustomDetail(row, fieldKey).trim() : "";
    };

    const normalizeTransTypeString = (raw: string | undefined): string => {
      return (raw || "")
        .split(/\s*\/\s*/)
        .map((s) => (s.trim() === "Other" ? "Custom" : s.trim()))
        .filter(Boolean)
        .join(" / ");
    };

    const serializeAuditRowWithGroup = (
      r: SurveillanceAuditRow,
      groupId?: string,
    ): SurveillanceAuditRow => {
      const normalizedClientType = normalizeClientType(r.clientType, r.b, r.nb);
      const normalizedPaymentType = normalizePaymentTypeSelection(r.paymentType, r.cash, r.card);
      const computedTaken = computeTotalTakenFromPayments(normalizedPaymentType, r.cash, r.card);
      const normOpt = (v?: string) => normalizeCustomOption(v);
      const fraudEnabled = Boolean(fraudSectionEnabledByRow[r.id]);
      const pitchEnabled = Boolean(salesPitchSectionEnabledByRow[r.id]);
      const resolvedSalesRep = (r.salesRep || "").trim();

      const resolveFraudFlag = (key: FraudCheckboxFieldKey): string =>
        fraudEnabled && (r[key] || "").trim().toUpperCase() === "YES" ? "YES" : "";

      const resolveFraudNotes = (
        key: FraudCheckboxFieldKey,
        detailKey: `${FraudCheckboxFieldKey}Details`,
      ): string =>
        fraudEnabled && (r[key] || "").trim().toUpperCase() === "YES"
          ? (r[detailKey] || "").trim()
          : "";

      const anyFraudChecked =
        fraudEnabled &&
        FRAUD_VERIFICATION_ITEMS.some(
          (item) => (r[item.key] || "").trim().toUpperCase() === "YES",
        );

      return {
        id: r.id,
        customerGroupId: groupId || r.customerGroupId,
        date: formatSurveillanceDate(r.date || reqItem.incidentDate),
        marketName: (r.marketName || reqItem.marketName || "").trim(),
        storeName: (r.storeName || reqItem.storeName || "").trim(),
        invoice: r.invoice,
        cashTime: r.cashTime,
        time: r.time,
        bdiTime: r.bdiTime,
        salesRep: resolvedSalesRep,
        transType: normalizeTransTypeString(r.transType),
        transTypeDetails: resolveCustomDetailValue(r, "transType", r.transType),
        clientType: normalizedClientType,
        clientTypeDetails: resolveCustomDetailValue(r, "clientType", normalizedClientType),
        nb: r.nb,
        b: r.b,
        invoiceAmount: r.invoiceAmount,
        totalTaken: computedTaken,
        paymentType: normalizedPaymentType,
        cash: normalizedPaymentType === "Card" ? "" : r.cash,
        card: normalizedPaymentType === "Cash" ? "" : r.card,
        difference: calculatePaymentDifferenceDisplay(
          r.invoiceAmount,
          normalizedPaymentType,
          r.cash,
          r.card,
        ),
        refundInvoice: r.refundInvoice,
        receipt: normOpt(r.receipt),
        receiptDetails: resolveCustomDetailValue(r, "receipt", r.receipt),
        splitPayments: normalizedPaymentType === "Mix Payment" ? "YES" : "NO",
        fraudTransactions: fraudEnabled ? (anyFraudChecked ? "YES" : "NO") : "",
        fraudTransactionsDetails: "",
        missOpportunity: resolveFraudFlag("missOpportunity"),
        missOpportunityDetails: resolveFraudNotes("missOpportunity", "missOpportunityDetails"),
        paymentFraud: resolveFraudFlag("paymentFraud"),
        paymentFraudDetails: resolveFraudNotes("paymentFraud", "paymentFraudDetails"),
        aalSwap: resolveFraudFlag("aalSwap"),
        aalSwapDetails: resolveFraudNotes("aalSwap", "aalSwapDetails"),
        mim: resolveFraudFlag("mim"),
        mimDetails: resolveFraudNotes("mim", "mimDetails"),
        onlineRejectedPayment: resolveFraudFlag("onlineRejectedPayment"),
        onlineRejectedPaymentDetails: resolveFraudNotes(
          "onlineRejectedPayment",
          "onlineRejectedPaymentDetails",
        ),
        notes: "",
        pitchNb:
          pitchEnabled && normalizePitchQualitySelectValue(r.pitchQuality) ? "YES" : "",
        pitchNbDetails: "",
        pitchNotes:
          pitchEnabled &&
          (normalizePitchQualitySelectValue(r.pitchQuality) === "Average" ||
            normalizePitchQualitySelectValue(r.pitchQuality) === "Poor")
            ? r.pitchNotes
            : "",
        pitchQuality: pitchEnabled ? normalizePitchQualitySelectValue(r.pitchQuality) : "",
        pitchQualityDetails: pitchEnabled
          ? resolveCustomDetailValue(r, "pitchQuality", r.pitchQuality)
          : "",
        showingPhone: pitchEnabled ? normOpt(r.showingPhone) : "",
        showingPhoneDetails: pitchEnabled
          ? resolveCustomDetailValue(r, "showingPhone", r.showingPhone)
          : "",
        accOffered: pitchEnabled ? normOpt(r.accOffered) : "",
        accOfferedDetails: pitchEnabled
          ? resolveCustomDetailValue(r, "accOffered", r.accOffered)
          : "",
        maximize: pitchEnabled ? normOpt(r.maximize) : "",
        maximizeDetails: pitchEnabled ? resolveCustomDetailValue(r, "maximize", r.maximize) : "",
        flipping: resolveFraudFlag("flipping"),
        flippingDetails: resolveFraudNotes("flipping", "flippingDetails"),
        bundleNb: pitchEnabled ? r.bundleNb : "",
        bundleStartB: pitchEnabled ? r.bundleStartB : "",
        bundleEndB: pitchEnabled ? r.bundleEndB : "",
        bundleAccGiven: pitchEnabled ? normOpt(r.bundleAccGiven) : "",
        bundleAccGivenDetails: pitchEnabled
          ? resolveCustomDetailValue(r, "bundleAccGiven", r.bundleAccGiven)
          : "",
        portIn: resolveFraudFlag("portIn"),
        portInDetails: resolveFraudNotes("portIn", "portInDetails"),
        nonUp: resolveFraudFlag("nonUp"),
        nonUpDetails: resolveFraudNotes("nonUp", "nonUpDetails"),
        smartPayMentioned: resolveFraudFlag("smartPayMentioned"),
        smartPayMentionedDetails: resolveFraudNotes(
          "smartPayMentioned",
          "smartPayMentionedDetails",
        ),
        aalBillSame: resolveFraudFlag("aalBillSame"),
        aalBillSameDetails: resolveFraudNotes("aalBillSame", "aalBillSameDetails"),
        nameOfRepLeaving: isFloorPresenceEnabled
          ? repTimingRows[0]?.repName || r.nameOfRepLeaving
          : "",
        timeLeft: isFloorPresenceEnabled ? repTimingRows[0]?.timeLeft || r.timeLeft : "",
        timeReturned: isFloorPresenceEnabled
          ? repTimingRows[0]?.timeReturned || r.timeReturned
          : "",
        backRoomTimeIn: isFloorPresenceEnabled
          ? repTimingRows[0]?.backRoomTimeIn || r.backRoomTimeIn
          : "",
        backRoomTimeOut: isFloorPresenceEnabled
          ? repTimingRows[0]?.backRoomTimeOut || r.backRoomTimeOut
          : "",
        offline:
          isCameraUptimeEnabled &&
          cameraUptimeRows.some(
            (c) => c.cameraName.trim() || c.onlineTime.trim() || c.offlineTime.trim(),
          )
            ? "Custom"
            : normOpt(r.offline),
        offlineDetails:
          isCameraUptimeEnabled &&
          cameraUptimeRows.some(
            (c) => c.cameraName.trim() || c.onlineTime.trim() || c.offlineTime.trim(),
          )
            ? cameraUptimeRows
                .filter(
                  (c) => c.cameraName.trim() || c.onlineTime.trim() || c.offlineTime.trim(),
                )
                .map(
                  (c) =>
                    `${c.cameraName.trim() || "Camera"} (Online: ${c.onlineTime || "-"}, Offline: ${c.offlineTime || "-"})`,
                )
                .join("; ")
            : resolveCustomDetailValue(r, "offline", r.offline),
        attachments: r.attachments && r.attachments.length > 0 ? r.attachments : undefined,
      };
    };

    const flattenedAuditRows: SurveillanceAuditRow[] = editableRows.flatMap((r) => {
      const addList = r.additionalInvoices || [];
      const groupId =
        addList.length > 0
          ? r.customerGroupId || `cust-grp-${r.id}`
          : r.customerGroupId;
      const baseSerialized = serializeAuditRowWithGroup(r, groupId);
      if (addList.length === 0) {
        return [baseSerialized];
      }
      const extraSerialized: SurveillanceAuditRow[] = addList.map((inv, idx) => {
        const normalizedPt = normalizePaymentTypeSelection(inv.paymentType, inv.cash, inv.card);
        const invTaken = computeTotalTakenFromPayments(normalizedPt, inv.cash, inv.card);
        return {
          ...baseSerialized,
          id: `${r.id}-inv-${idx + 2}`,
          customerGroupId: groupId,
          invoice: inv.invoice,
          bdiTime: inv.bdiTime,
          transType: normalizeTransTypeString(inv.transType),
          transTypeDetails: "",
          invoiceAmount: inv.invoiceAmount,
          totalTaken: invTaken,
          difference: calculatePaymentDifferenceDisplay(
            inv.invoiceAmount,
            normalizedPt,
            inv.cash,
            inv.card,
          ),
          paymentType: normalizedPt,
          cash: normalizedPt === "Card" ? "" : inv.cash || "",
          card: normalizedPt === "Cash" ? "" : inv.card || "",
          splitPayments: normalizedPt === "Mix Payment" ? "YES" : "NO",
          receipt: normalizeCustomOption(inv.receipt),
          receiptDetails: "",
        };
      });
      return [baseSerialized, ...extraSerialized];
    });

    const combinedAttachments = editableRows.flatMap((r) => r.attachments || []);
    const primarySerialized = flattenedAuditRows[0] || serializeAuditRowWithGroup(primaryRow);
    const primaryClientType = normalizeClientType(
      primaryRow.clientType,
      primaryRow.b,
      primaryRow.nb,
    );

    const payload = {
      requestId: reqItem.id,
      rows: flattenedAuditRows,
      date: formatSurveillanceDate(primaryRow.date || reqItem.incidentDate),
      marketName: (primaryRow.marketName || reqItem.marketName || "").trim(),
      storeName: (primaryRow.storeName || reqItem.storeName || "").trim(),
      invoiceNo:
        flattenedAuditRows.length > 1
          ? `${primaryRow.invoice || "Audit"} (${flattenedAuditRows.length} Rows)`
          : primaryRow.invoice || "-",
      cashTime: headerStoreOpenTime || primaryRow.cashTime,
      time: primaryRow.time,
      bdiTime: primaryRow.bdiTime,
      salesRep: (primaryRow.salesRep || "").trim(),
      transType:
        editableRows.length > 1
          ? `Shift Audit (${editableRows.length} Entries)`
          : normalizeTransTypeString(primaryRow.transType) || "Audit Entry",
      transTypeDetails: resolveCustomDetailValue(primaryRow, "transType", primaryRow.transType),
      clientType:
        primaryClientType === "Custom"
          ? "Custom"
          : primaryClientType === "Non-Buyer"
            ? "Non-Buyer"
            : "Buyer",
      clientTypeDetails: resolveCustomDetailValue(primaryRow, "clientType", primaryClientType),
      invoiceAmount: primarySerialized.invoiceAmount || "$0.00",
      totalTaken: primarySerialized.totalTaken || "$0.00",
      paymentMode:
        primarySerialized.paymentType === "Mix Payment"
          ? "Split"
          : primarySerialized.paymentType === "Card"
            ? "Card"
            : "Cash",
      difference: primarySerialized.difference,
      refundInvoice: primaryRow.refundInvoice?.trim() || "No",
      receipt: resolveYesNoValue(primaryRow.receipt),
      receiptDetails: resolveCustomDetailValue(primaryRow, "receipt", primaryRow.receipt),
      splitPayments: primarySerialized.paymentType === "Mix Payment" ? "Yes" : "No",
      fraudTransactions: resolveYesNoValue(primarySerialized.fraudTransactions),
      fraudTransactionsDetails: "",
      missOpportunity: resolveYesNoValue(primarySerialized.missOpportunity),
      missOpportunityDetails: primarySerialized.missOpportunityDetails || "",
      paymentFraud: resolveYesNoValue(primarySerialized.paymentFraud),
      paymentFraudDetails: primarySerialized.paymentFraudDetails || "",
      aalSwap: resolveYesNoValue(primarySerialized.aalSwap),
      aalSwapDetails: primarySerialized.aalSwapDetails || "",
      mim: resolveYesNoValue(primarySerialized.mim),
      mimDetails: primarySerialized.mimDetails || "",
      onlineRejectedPayment: resolveYesNoValue(primarySerialized.onlineRejectedPayment),
      onlineRejectedPaymentDetails: primarySerialized.onlineRejectedPaymentDetails || "",
      notes: headerGeneralNotes.trim(),
      pitchNb: resolveYesNoValue(primarySerialized.pitchNb),
      pitchNbDetails: primarySerialized.pitchNbDetails || "",
      pitchNotes: primarySerialized.pitchNotes,
      pitchQuality:
        primarySerialized.pitchQuality === "Custom" || primarySerialized.pitchQuality === "Other"
          ? "Custom"
          : primarySerialized.pitchQuality?.trim() || "Not Observed",
      pitchQualityDetails: primarySerialized.pitchQualityDetails || "",
      showingPhone: resolveYesNoValue(primarySerialized.showingPhone),
      showingPhoneDetails: primarySerialized.showingPhoneDetails || "",
      accOffered: resolveYesNoValue(primarySerialized.accOffered),
      accOfferedDetails: primarySerialized.accOfferedDetails || "",
      maximize: resolveYesNoValue(primarySerialized.maximize),
      maximizeDetails: primarySerialized.maximizeDetails || "",
      flipping: resolveYesNoValue(primarySerialized.flipping),
      flippingDetails: primarySerialized.flippingDetails || "",
      bundleNb: primarySerialized.bundleNb,
      bundleStartB: primarySerialized.bundleStartB,
      bundleEndB: primarySerialized.bundleEndB,
      bundleAccGiven: resolveYesNoValue(primarySerialized.bundleAccGiven),
      bundleAccGivenDetails: primarySerialized.bundleAccGivenDetails || "",
      portIn: resolveYesNoValue(primarySerialized.portIn),
      portInDetails: primarySerialized.portInDetails || "",
      nonUp: resolveYesNoValue(primarySerialized.nonUp),
      nonUpDetails: primarySerialized.nonUpDetails || "",
      smartPayMentioned: resolveYesNoValue(primarySerialized.smartPayMentioned),
      smartPayMentionedDetails: primarySerialized.smartPayMentionedDetails || "",
      aalBillSame: resolveYesNoValue(primarySerialized.aalBillSame),
      aalBillSameDetails: primarySerialized.aalBillSameDetails || "",
      nameOfRepLeaving: primarySerialized.nameOfRepLeaving,
      timeLeft: primarySerialized.timeLeft,
      timeReturned: headerStoreCloseTime || primarySerialized.timeReturned,
      backRoomTimeIn: primarySerialized.backRoomTimeIn,
      backRoomTimeOut: primarySerialized.backRoomTimeOut,
      offline: resolveYesNoValue(primarySerialized.offline),
      offlineDetails: primarySerialized.offlineDetails || "",
      attachments: combinedAttachments.length > 0 ? combinedAttachments : undefined,
    };

    let savedReport: SurveillanceReport;
    try {
      savedReport = submitStaticAuditReport(payload, {
        name: user?.fullName || "Michael Sterling",
        email: user?.email || "m.sterling@techno-communications.com",
        role: user?.roleName || "Asset Protection Auditor",
      });
    } catch (error) {
      toast.error(`Failed to submit report: ${(error as Error).message}`);
      setIsSubmitting(false);
      return;
    }

    setReports(getStaticReports());

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
    clearStaticRequestDraft(reqItem.id);
    setSavedRowTimestamps({});
    setDirtyRowIds({});

    setRequests(getStaticAgentRequests());
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

  // Restrict Surveillance Reports page to "admin" and "user" roles
  const userRole = getSurveillanceRole(user);
  if (!canAccessSurveillanceReports(userRole)) {
    return <Navigate to={getSurveillanceDefaultRoute(user)} replace />;
  }

  // VIEW 3: EDITABLE SURVEILLANCE AUDIT REPORT FORM (Opened when clicking "Submit Report" inside Report Details)
  if (selectedDetail && isEditingReport) {
    const activeItem = requests.find((r) => r.id === selectedDetail.id) || selectedDetail;

    const defaultDate = formatSurveillanceDate(activeItem.incidentDate);

    return (
      <div className="space-y-5 pb-12 animate-fade-in">
        {/* Top Bar */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseEditableForm}
              className="h-8 gap-1.5 px-2.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Surveillance Report Detail
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Submit Surveillance Audit Report
              </h1>
            </div>
          </div>
        </div>

        {/* 1. Top Badges for Auto-populated Metadata */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Badge
            variant="secondary"
            className="px-4 py-2 text-xs sm:text-sm font-semibold gap-2 bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900 shadow-2xs"
          >
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            Requested Surveillance Date: {defaultDate}
          </Badge>
          <Badge
            variant="secondary"
            className="px-4 py-2 text-xs sm:text-sm font-semibold gap-2 bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900 shadow-2xs"
          >
            <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
            Market: {activeItem.marketName || "—"}
          </Badge>
          <Badge
            variant="secondary"
            className="px-4 py-2 text-xs sm:text-sm font-semibold gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 shadow-2xs"
          >
            <StoreIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Store: {activeItem.storeName || "—"}
          </Badge>
        </div>

        {/* 2. Store Open Time (Compact borderless inline row) */}
        <div className="flex flex-wrap items-center gap-3 py-1">
          <span className="text-xs font-bold text-foreground whitespace-nowrap">
            Store Open Time:
          </span>
          <div className="w-44">
            <AmPmTimePicker
              value={headerStoreOpenTime}
              onChange={(val) => setHeaderStoreOpenTime(val)}
            />
          </div>
        </div>

        {/* 3. Add Audit Row Section & Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-muted/20 border p-3 rounded-xl">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Audit Rows ({editableRows.length})
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Record transaction and sales pitch audit observations below.
              </p>
            </div>
            <Button
              type="button"
              onClick={() =>
                handleAddAuditRow(activeItem.storeName, activeItem.marketName, defaultDate)
              }
              className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              Add Audit Row
            </Button>
          </div>

          {editableRows.length === 0 ? (
            <Card className="p-8 border-dashed border-border text-center space-y-2 bg-muted/10 rounded-2xl">
              <p className="text-xs font-semibold text-foreground">
                No audit rows added yet.
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Click the <span className="font-semibold text-foreground">"Add Audit Row"</span> button above to create a new surveillance audit entry.
              </p>
            </Card>
          ) : (
            editableRows.map((row, index) => {
              const isExpanded = expandedRowIds[row.id] ?? true;
              const rowSavedAt = savedRowTimestamps[row.id];
              const isRowDirty = Boolean(dirtyRowIds[row.id]);
              const isRowSavedClean = Boolean(rowSavedAt && !isRowDirty);
              const activePaymentType = normalizePaymentTypeSelection(
                row.paymentType,
                row.cash,
                row.card,
              );
              const computedDifference = calculatePaymentDifferenceDisplay(
                row.invoiceAmount,
                activePaymentType,
                row.cash,
                row.card,
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
                        {row.salesRep.trim() || "Audit Entry"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.invoice.trim() ? `• Invoice No: ${row.invoice}` : ""}
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
                  </div>

                  {isExpanded && (
                    <div className="p-4 space-y-5 text-xs">
                      {/* 1. Transaction & Billing Details */}
                      <div className="space-y-3 rounded-lg border p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                          <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wide">
                            <ShoppingBag className="h-4 w-4 text-primary" />
                            1. Transaction & Billing Details
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddAdditionalInvoice(row.id)}
                            className="h-7 gap-1.5 px-2.5 text-xs font-semibold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Invoice
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Invoice No</Label>
                            <Input
                              value={row.invoice}
                              onChange={(e) =>
                                handleUpdateRowField(row.id, "invoice", e.target.value)
                              }
                              placeholder="e.g. INV-12345"
                            />
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

                          <StandardSelect
                            label="Rep Name"
                            required
                            options={REP_NAME_OPTIONS}
                            value={row.salesRep}
                            onValueChange={(val) => handleUpdateRowField(row.id, "salesRep", val)}
                          />

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">
                              Transaction Type <span className="text-destructive">*</span>
                            </Label>
                            <TransactionTypeMultiSelect
                              value={row.transType}
                              options={TRANSACTION_TYPE_OPTIONS}
                              onChange={(nextVal) =>
                                handleUpdateRowField(row.id, "transType", nextVal)
                              }
                            />
                          </div>

                          <StandardSelect
                            label="Client Type"
                            options={CLIENT_TYPE_OPTIONS}
                            value={normalizeClientType(row.clientType, row.b, row.nb)}
                            onValueChange={(val) => handleUpdateRowField(row.id, "clientType", val)}
                          />

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
                            <Label className="text-[11px] font-semibold">Payment Type</Label>
                            <Select
                              value={activePaymentType}
                              onValueChange={(v) =>
                                handleUpdateRowField(row.id, "paymentType", v)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PAYMENT_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {(activePaymentType === "Cash" ||
                            activePaymentType === "Mix Payment") && (
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
                          )}

                          {(activePaymentType === "Card" ||
                            activePaymentType === "Mix Payment") && (
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
                          )}

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Difference</Label>
                            <Input
                              value={computedDifference}
                              readOnly
                              tabIndex={-1}
                              className="bg-muted/30 font-semibold text-foreground cursor-default select-none focus-visible:ring-0"
                              placeholder="$0.00"
                            />
                          </div>

                          <StandardSelect
                            label="Receipt"
                            options={YES_NO_OPTIONS}
                            value={row.receipt}
                            onValueChange={(val) => handleUpdateRowField(row.id, "receipt", val)}
                          />
                        </div>

                        {/* Additional Invoices for Same Customer */}
                        {row.additionalInvoices && row.additionalInvoices.length > 0 && (
                          <div className="space-y-3 pt-2 border-t border-dashed border-border/80">
                            {row.additionalInvoices.map((addInv, invIdx) => {
                              const addInvPt = normalizePaymentTypeSelection(
                                addInv.paymentType,
                                addInv.cash,
                                addInv.card,
                              );
                              const addInvDiff = calculatePaymentDifferenceDisplay(
                                addInv.invoiceAmount,
                                addInvPt,
                                addInv.cash,
                                addInv.card,
                              );
                              return (
                                <div
                                  key={addInv.id}
                                  className="rounded-lg border border-blue-200/70 bg-blue-50/35 dark:border-blue-900/50 dark:bg-blue-950/20 p-3 space-y-2.5"
                                >
                                  <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/40 pb-1.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                                      Additional Invoice #{invIdx + 2} (Same Customer)
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveAdditionalInvoice(row.id, addInv.id)
                                      }
                                      className="h-7 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                                      title="Remove Invoice"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold">
                                        Invoice No
                                      </Label>
                                      <Input
                                        value={addInv.invoice}
                                        onChange={(e) =>
                                          handleUpdateAdditionalInvoiceField(
                                            row.id,
                                            addInv.id,
                                            "invoice",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="e.g. INV-12346"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold">BDI Time</Label>
                                      <AmPmTimePicker
                                        value={addInv.bdiTime}
                                        onChange={(val) =>
                                          handleUpdateAdditionalInvoiceField(
                                            row.id,
                                            addInv.id,
                                            "bdiTime",
                                            val,
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold">
                                        Transaction Type <span className="text-destructive">*</span>
                                      </Label>
                                      <TransactionTypeMultiSelect
                                        value={addInv.transType}
                                        options={TRANSACTION_TYPE_OPTIONS}
                                        onChange={(nextVal) =>
                                          handleUpdateAdditionalInvoiceField(
                                            row.id,
                                            addInv.id,
                                            "transType",
                                            nextVal,
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold">
                                        Invoice Amount
                                      </Label>
                                      <Input
                                        value={addInv.invoiceAmount}
                                        onChange={(e) =>
                                          handleUpdateAdditionalInvoiceField(
                                            row.id,
                                            addInv.id,
                                            "invoiceAmount",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="$0.00"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold">
                                        Payment Type
                                      </Label>
                                      <Select
                                        value={addInvPt}
                                        onValueChange={(v) =>
                                          handleUpdateAdditionalInvoiceField(
                                            row.id,
                                            addInv.id,
                                            "paymentType",
                                            v,
                                          )
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {PAYMENT_TYPE_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {(addInvPt === "Cash" || addInvPt === "Mix Payment") && (
                                      <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold">
                                          Cash Payment
                                        </Label>
                                        <Input
                                          value={addInv.cash || ""}
                                          onChange={(e) =>
                                            handleUpdateAdditionalInvoiceField(
                                              row.id,
                                              addInv.id,
                                              "cash",
                                              e.target.value,
                                            )
                                          }
                                          placeholder="$0.00"
                                        />
                                      </div>
                                    )}

                                    {(addInvPt === "Card" || addInvPt === "Mix Payment") && (
                                      <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold">
                                          Card Payment
                                        </Label>
                                        <Input
                                          value={addInv.card || ""}
                                          onChange={(e) =>
                                            handleUpdateAdditionalInvoiceField(
                                              row.id,
                                              addInv.id,
                                              "card",
                                              e.target.value,
                                            )
                                          }
                                          placeholder="$0.00"
                                        />
                                      </div>
                                    )}

                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold">
                                        Difference
                                      </Label>
                                      <Input
                                        value={addInvDiff}
                                        readOnly
                                        tabIndex={-1}
                                        className="bg-muted/30 font-semibold text-foreground cursor-default select-none focus-visible:ring-0"
                                        placeholder="$0.00"
                                      />
                                    </div>

                                    <StandardSelect
                                      label="Receipt"
                                      options={YES_NO_OPTIONS}
                                      value={addInv.receipt}
                                      onValueChange={(val) =>
                                        handleUpdateAdditionalInvoiceField(
                                          row.id,
                                          addInv.id,
                                          "receipt",
                                          val,
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 2. Fraud & Compliance Verification */}
                      <div className="space-y-3 rounded-lg border p-3.5">
                        <div
                          className={`flex flex-wrap items-center justify-between gap-2 ${
                            fraudSectionEnabledByRow[row.id] ? "border-b pb-2" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wide">
                            <ShieldAlert className="h-4 w-4 text-rose-600" />
                            <span>2. Fraud & Compliance Verification</span>
                          </div>

                          {!fraudSectionEnabledByRow[row.id] ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setFraudSectionEnabledByRow((prev) => ({
                                  ...prev,
                                  [row.id]: true,
                                }))
                              }
                              className="h-7 gap-1.5 px-2.5 text-xs font-semibold"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Fraud
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setFraudSectionEnabledByRow((prev) => ({
                                  ...prev,
                                  [row.id]: false,
                                }))
                              }
                              className="h-7 gap-1 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                            >
                              <X className="h-3.5 w-3.5" />
                              Remove
                            </Button>
                          )}
                        </div>

                        {Boolean(fraudSectionEnabledByRow[row.id]) && (
                          <div className="space-y-2.5 pt-0.5">
                            {FRAUD_VERIFICATION_ITEMS.map((item) => {
                              const isChecked =
                                (row[item.key] || "").trim().toUpperCase() === "YES";
                              const checkboxId = `${row.id}-fraud-${item.key}`;
                              return (
                                <div
                                  key={item.key}
                                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                                >
                                  <div className="flex items-center gap-2.5 sm:w-56 shrink-0">
                                    <Checkbox
                                      id={checkboxId}
                                      checked={isChecked}
                                      onCheckedChange={(checked) =>
                                        handleToggleFraudCheckbox(
                                          row.id,
                                          item.key,
                                          item.detailKey,
                                          Boolean(checked),
                                        )
                                      }
                                    />
                                    <Label
                                      htmlFor={checkboxId}
                                      className="text-xs font-semibold text-foreground cursor-pointer select-none"
                                    >
                                      {item.label}
                                    </Label>
                                  </div>

                                  <div className="flex-1">
                                    <Input
                                      value={row[item.detailKey] || ""}
                                      disabled={!isChecked}
                                      onChange={(e) =>
                                        handleUpdateRowField(
                                          row.id,
                                          item.detailKey,
                                          e.target.value,
                                        )
                                      }
                                      placeholder={item.notesPlaceholder}
                                      className={
                                        !isChecked ? "bg-muted/40 opacity-60 cursor-not-allowed" : ""
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 3. Sales Pitch & Bundle Verification */}
                      <div className="space-y-3 rounded-lg border p-3.5">
                        <div
                          className={`flex items-center gap-2.5 font-semibold text-foreground text-xs uppercase tracking-wide ${
                            salesPitchSectionEnabledByRow[row.id] ? "border-b pb-2" : ""
                          }`}
                        >
                          <Switch
                            checked={Boolean(salesPitchSectionEnabledByRow[row.id])}
                            onCheckedChange={(checked) =>
                              setSalesPitchSectionEnabledByRow((prev) => ({
                                ...prev,
                                [row.id]: checked,
                              }))
                            }
                            aria-label="Toggle Sales Pitch & Bundle Verification"
                          />
                          <UserCheck className="h-4 w-4 text-emerald-600" />
                          <span>3. Sales Pitch & Bundle Verification</span>
                        </div>

                        {Boolean(salesPitchSectionEnabledByRow[row.id]) && (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <StandardSelect
                                label="Pitch Quality"
                                options={PITCH_QUALITY_OPTIONS}
                                value={normalizePitchQualitySelectValue(row.pitchQuality)}
                                onValueChange={(val) =>
                                  handleUpdateRowField(row.id, "pitchQuality", val)
                                }
                              />

                              {(
                                [
                                  { key: "showingPhone", label: "Showing Phone?" },
                                  { key: "accOffered", label: "Acc Offered" },
                                  { key: "maximize", label: "Maximize" },
                                ] as const
                              ).map((field) => (
                                <StandardSelect
                                  key={field.key}
                                  label={field.label}
                                  options={YES_NO_OPTIONS}
                                  value={row[field.key]}
                                  onValueChange={(val) =>
                                    handleUpdateRowField(row.id, field.key, val)
                                  }
                                />
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

                              <StandardSelect
                                label="Bundle Acc Given"
                                options={YES_NO_OPTIONS}
                                value={row.bundleAccGiven}
                                onValueChange={(val) =>
                                  handleUpdateRowField(row.id, "bundleAccGiven", val)
                                }
                              />
                            </div>

                            {(normalizePitchQualitySelectValue(row.pitchQuality) === "Average" ||
                              normalizePitchQualitySelectValue(row.pitchQuality) === "Poor") && (
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
                            )}
                          </>
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
                              Click Save to preserve this row locally against accidental navigation or
                              power loss.
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
            })
          )}
        </div>

        {/* 4. Floor Presence & Rep Timings Section */}
        <Card className="p-4 border-border/80 shadow-2xs bg-card space-y-3">
          <div
            className={`flex flex-wrap items-center justify-between gap-2 ${
              isFloorPresenceEnabled ? "border-b pb-2.5" : ""
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2.5">
              <Switch
                checked={isFloorPresenceEnabled}
                onCheckedChange={setIsFloorPresenceEnabled}
                aria-label="Toggle Floor Presence & Rep Timings"
              />
              <Clock className="h-4 w-4 text-primary" />
              <span>Floor Presence & Rep Timings</span>
            </div>
            {isFloorPresenceEnabled && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveAllRepTimings}
                  className={
                    isTimingSectionDirty
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold h-8 px-3 text-xs gap-1.5"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold h-8 px-3 text-xs gap-1.5"
                  }
                >
                  {isTimingSectionDirty ? (
                    <Save className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {isTimingSectionDirty ? "Save" : "Saved"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRepTimingRow}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Row
                </Button>
              </div>
            )}
          </div>

          {isFloorPresenceEnabled && (
            <div className="divide-y divide-border/60">
              {repTimingRows.map((timingRow) => (
                <div
                  key={timingRow.id}
                  className="py-2.5 first:pt-1 last:pb-1 flex items-end gap-2.5"
                >
                  <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 min-w-0">
                    {/* Name of Rep Leaving Dropdown */}
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[11px] font-semibold text-foreground">
                        Name of Rep Leaving
                      </Label>
                      <Select
                        value={toSelectVal(timingRow.repName)}
                        onValueChange={(v) =>
                          handleUpdateRepTimingField(
                            timingRow.id,
                            "repName",
                            fromSelectVal(v),
                          )
                        }
                      >
                        <SelectTrigger className="h-9 text-xs w-full">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__" className="text-xs">
                            -
                          </SelectItem>
                          {SALES_REP_NAMES.map((rep) => (
                            <SelectItem key={rep} value={rep} className="text-xs">
                              {rep}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Time Left */}
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[11px] font-semibold text-foreground">Time Left</Label>
                      <AmPmTimePicker
                        value={timingRow.timeLeft}
                        onChange={(val) =>
                          handleUpdateRepTimingField(timingRow.id, "timeLeft", val)
                        }
                      />
                    </div>

                    {/* Time Returned */}
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[11px] font-semibold text-foreground">
                        Time Returned
                      </Label>
                      <AmPmTimePicker
                        value={timingRow.timeReturned}
                        onChange={(val) =>
                          handleUpdateRepTimingField(timingRow.id, "timeReturned", val)
                        }
                      />
                    </div>

                    {/* Back Room Time - In */}
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[11px] font-semibold text-foreground">
                        Back Room - In
                      </Label>
                      <AmPmTimePicker
                        value={timingRow.backRoomTimeIn}
                        onChange={(val) =>
                          handleUpdateRepTimingField(timingRow.id, "backRoomTimeIn", val)
                        }
                      />
                    </div>

                    {/* Back Room Time - Out */}
                    <div className="min-w-0 space-y-1">
                      <Label className="text-[11px] font-semibold text-foreground">
                        Back Room - Out
                      </Label>
                      <AmPmTimePicker
                        value={timingRow.backRoomTimeOut}
                        onChange={(val) =>
                          handleUpdateRepTimingField(timingRow.id, "backRoomTimeOut", val)
                        }
                      />
                    </div>
                  </div>

                  {/* Delete Button at end */}
                  <div className="flex items-center pb-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRepTimingRow(timingRow.id)}
                      className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                      title="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 5. Camera Uptime Logs Section */}
        <Card className="p-4 border-border/80 shadow-2xs bg-card space-y-3">
          <div
            className={`flex flex-wrap items-center justify-between gap-2 ${
              isCameraUptimeEnabled ? "border-b pb-2.5" : ""
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2.5">
              <Switch
                checked={isCameraUptimeEnabled}
                onCheckedChange={setIsCameraUptimeEnabled}
                aria-label="Toggle Camera Uptime Logs"
              />
              <Video className="h-4 w-4 text-primary" />
              <span>Camera Uptime Logs</span>
            </div>
            {isCameraUptimeEnabled && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveAllCameraUptimeLogs}
                  className={
                    isCameraUptimeDirty
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold h-8 px-3 text-xs gap-1.5"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold h-8 px-3 text-xs gap-1.5"
                  }
                >
                  {isCameraUptimeDirty ? (
                    <Save className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {isCameraUptimeDirty ? "Save" : "Saved"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCameraUptimeRow}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Row
                </Button>
              </div>
            )}
          </div>

          {isCameraUptimeEnabled && (
            <div className="divide-y divide-border/60">
              {cameraUptimeRows.map((camRow) => (
                <div
                  key={camRow.id}
                  className="py-2.5 first:pt-1 last:pb-1 flex flex-wrap lg:flex-nowrap items-end gap-2.5"
                >
                  {/* Camera Name Textbox */}
                  <div className="flex-1 min-w-[180px] space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">
                      Camera Name
                    </Label>
                    <Input
                      value={camRow.cameraName}
                      onChange={(e) =>
                        handleUpdateCameraUptimeField(
                          camRow.id,
                          "cameraName",
                          e.target.value,
                        )
                      }
                      placeholder="Enter camera name (e.g. Sales Floor Cam #1)"
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Online Time */}
                  <div className="flex-1 min-w-[140px] space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">
                      Online Time
                    </Label>
                    <AmPmTimePicker
                      value={camRow.onlineTime}
                      onChange={(val) =>
                        handleUpdateCameraUptimeField(camRow.id, "onlineTime", val)
                      }
                    />
                  </div>

                  {/* Offline Time */}
                  <div className="flex-1 min-w-[140px] space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">
                      Offline Time
                    </Label>
                    <AmPmTimePicker
                      value={camRow.offlineTime}
                      onChange={(val) =>
                        handleUpdateCameraUptimeField(camRow.id, "offlineTime", val)
                      }
                    />
                  </div>

                  {/* Delete Button at end */}
                  <div className="flex items-center pb-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCameraUptimeRow(camRow.id)}
                      className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                      title="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 5. Store Close Time (Compact borderless inline row) */}
        <div className="flex flex-wrap items-center gap-3 py-1">
          <span className="text-xs font-bold text-foreground whitespace-nowrap">
            Store Close Time:
          </span>
          <div className="w-44">
            <AmPmTimePicker
              value={headerStoreCloseTime}
              onChange={(val) => setHeaderStoreCloseTime(val)}
            />
          </div>
        </div>

        {/* 6. General Notes Section */}
        <Card className="p-4 border-border/80 shadow-2xs bg-card space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2 border-b pb-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            General Notes <span className="text-[10px] font-normal text-muted-foreground lowercase">(optional)</span>
          </div>
          <Textarea
            value={headerGeneralNotes}
            onChange={(e) => setHeaderGeneralNotes(e.target.value)}
            placeholder="Enter any additional general notes, overall store observations, or audit summary..."
            rows={3}
            className="text-xs"
          />
        </Card>

        {/* Bottom Action Footer */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
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

        {/* Submit Report Confirmation Modal */}
        <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Report Submission</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to submit this surveillance audit report? Once submitted, this
                report will be finalized for management review and cannot be modified later.
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

  // VIEW 2: REPORT DETAILS PAGE (Consistent UI format matching Request Details)
  if (selectedDetail) {
    const item = requests.find((r) => r.id === selectedDetail.id) || selectedDetail;
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG["Report Requested"];

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
              onClick={() => setSelectedDetail(null)}
              className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium bg-background shadow-xs whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Submit Report
            </Button>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                Submit Report
              </p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground leading-tight">
                Surveillance Report Detail
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {item.status === "Report Requested" ? (
              <Button
                onClick={() => handleOpenEditableForm(item)}
                className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs whitespace-nowrap shrink-0"
              >
                <FileText className="h-4 w-4" />
                Proceed to Submit
              </Button>
            ) : item.status === "Rejected" || linkedReport?.status === "Rejected" ? (
              <Button
                onClick={() => handleOpenEditableForm(item)}
                className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs whitespace-nowrap shrink-0"
              >
                <FileText className="h-4 w-4" />
                Resubmit
              </Button>
            ) : (
              Boolean(targetReportId) && (
                <Button
                  onClick={() => navigate(`/surveillance/reports/submitted/${targetReportId}`)}
                  className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs whitespace-nowrap shrink-0"
                >
                  <Eye className="h-4 w-4" />
                  View Report
                </Button>
              )
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
            <div className="text-base font-bold text-foreground">{item.title}</div>
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

        {/* Read-Only Report Rating Card (Displayed when a rating has been given) */}
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
                    <strong className="font-semibold text-foreground">{ratingReviewer}</strong>
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
          <Card className="p-5 rounded-2xl border-rose-200/90 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/60 space-y-3 shadow-xs">
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
              <div className="p-3.5 rounded-xl border border-rose-200/90 bg-white/90 dark:bg-card text-foreground leading-relaxed whitespace-pre-wrap text-xs shadow-xs font-medium">
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
                      Date: {formatDateTimeDisplay(item.reportApprovedAt || item.approvedAt || "")}
                    </span>
                  )}
                </div>
              )}
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
                      {item.requesterEmail || "david.kim@techno-communications.com"}
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
                      {item.requesterPhone || "+1 (214) 555-0192"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900 shrink-0">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">Department</div>
                    <div className="font-medium text-foreground">
                      {item.requesterDepartment || "Regional Operations"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900 shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">Request received at</div>
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
                      Awaiting submission
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
                    <div className="text-[11px] text-muted-foreground">Department</div>
                    <div className="font-medium text-foreground">
                      {item.preparedByDepartment ||
                        (item.preparedBy ? "Surveillance & Loss Prevention" : "—")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">Submitted at</div>
                    <div className="font-medium text-foreground tabular-nums">
                      {item.preparedAt ? formatDateTimeDisplay(item.preparedAt) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!item.preparedBy && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-900 leading-relaxed dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  No surveillance audit report submitted yet. Click &quot;Proceed to Submit&quot;
                  above to prepare and submit the report.
                </span>
              </div>
            )}

            {item.preparedBy && item.status === "Approved" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-3.5 text-xs text-emerald-900 leading-relaxed dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Surveillance audit report has been reviewed and approved by management.</span>
              </div>
            )}
          </Card>
        </div>
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
            Submit Report
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Click any row to view report details or submit a surveillance audit report.
        </p>
      </div>

      {/* Top Dashboard Summary Cards (5 Distinct Colors) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Requests Received (Blue tone) */}
        <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50">
          <div className="text-xs text-blue-800 dark:text-blue-300 font-medium uppercase tracking-wider">
            Total Requests Received
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

        {/* Card 4: Rejected (Rose tone) */}
        <Card className="p-4 border-rose-300/80 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/50">
          <div className="text-xs text-rose-800 dark:text-rose-300 font-medium uppercase tracking-wider">
            Rejected
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-rose-950 dark:text-rose-100">
            {metrics.rejected}
          </div>
        </Card>

        {/* Card 5: Approved (Emerald tone) */}
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
