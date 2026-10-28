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
  "Store Closed",
  "Store Opened",
  "2 Magenta in Metro",
];

const YES_NO_OPTIONS = [
  { value: "__empty__", label: "-" },
  { value: "YES", label: "YES" },
  { value: "NO", label: "NO" },
  { value: "Custom", label: "Custom" },
];

const CLIENT_TYPE_OPTIONS = [
  { value: "__empty__", label: "-" },
  { value: "Buyer", label: "Buyer" },
  { value: "Non-Buyer", label: "Non-Buyer" },
  { value: "Custom", label: "Custom" },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: "__empty__", label: "-" },
  { value: "Card", label: "Card" },
  { value: "Cash", label: "Cash" },
  { value: "Mix Payment", label: "Mix Payment" },
];

const PITCH_QUALITY_OPTIONS = [
  { value: "__empty__", label: "-" },
  { value: "GOOD", label: "GOOD" },
  { value: "AVG", label: "AVG" },
  { value: "FAIR", label: "FAIR" },
  { value: "POOR", label: "POOR" },
  { value: "Custom", label: "Custom" },
];

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

function hasCustomInTransType(raw?: string): boolean {
  return (raw || "")
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .some((s) => s === "Custom" || s === "Other");
}

function getRowCustomDetail(row: SurveillanceAuditRow, fieldKey: CustomDetailFieldKey): string {
  const detailProp = CUSTOM_DETAIL_PROP_MAP[fieldKey];
  const directVal = row[detailProp];
  if (typeof directVal === "string") return directVal;
  return row.otherDetails?.[fieldKey] || "";
}

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

function normalizeCustomOption(raw: string | undefined): string {
  const trimmed = (raw || "").trim();
  if (trimmed === "Other") return "Custom";
  return trimmed;
}

function normalizeClientType(raw: string | undefined, b?: string, nb?: string): string {
  const trimmed = (raw || "").trim();
  if (trimmed === "Custom" || trimmed === "Other") return "Custom";
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
        .map((s) => (s.trim() === "Other" ? "Custom" : s.trim()))
        .filter(Boolean),
    [value],
  );

  const baseOptionsWithCustom = useMemo(
    () => (options.includes("Custom") ? options : [...options, "Custom"]),
    [options],
  );

  const allChoices = useMemo(() => {
    const extras = selectedList.filter((item) => !baseOptionsWithCustom.includes(item));
    return [...extras, ...baseOptionsWithCustom];
  }, [baseOptionsWithCustom, selectedList]);

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
        className="w-[--radix-popover-trigger-width] min-w-[220px] p-1.5"
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
          {allChoices.map((opt) => {
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

function SelectWithCustomField({
  label,
  required = false,
  options,
  value,
  detailValue,
  onValueChange,
  onDetailChange,
  detailSpanClass = "col-span-2",
}: {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
  value: string | undefined;
  detailValue: string | undefined;
  onValueChange: (val: string) => void;
  onDetailChange: (detail: string) => void;
  detailSpanClass?: string;
}) {
  const cleanLabel = label.replace(/\?+$/, "").trim();
  const detailLabel = `${cleanLabel} Details`;
  const normalizedVal = normalizeCustomOption(value);
  const selectVal = !normalizedVal ? "__empty__" : normalizedVal;
  const isCustom = normalizedVal === "Custom";

  const effectiveOptions = useMemo(() => {
    if (!normalizedVal || options.some((o) => o.value === normalizedVal)) {
      return options;
    }
    return [
      options[0] || { value: "__empty__", label: "-" },
      { value: normalizedVal, label: normalizedVal },
      ...options.slice(1),
    ];
  }, [options, normalizedVal]);

  return (
    <>
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
            {effectiveOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isCustom && (
        <div className={`space-y-1 ${detailSpanClass}`}>
          <Label className="text-[11px] font-semibold">{detailLabel}</Label>
          <Input
            value={detailValue || ""}
            onChange={(e) => onDetailChange(e.target.value)}
            placeholder={`Enter ${detailLabel.toLowerCase()}...`}
          />
        </div>
      )}
    </>
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

// All dropdowns (Yes/No/-, Sales Rep, Client Type, Payment Type, Pitch Quality) default to "" ("-")
function createEmptyAuditRow(
  storeName: string,
  marketName: string,
  defaultDate?: string,
): SurveillanceAuditRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
    paymentType: "",
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
        (r) => r.status === "Report Received" || r.status === "Approved" || r.status === "Rejected",
      ).length,
      pending: requests.filter((r) => r.status === "Report Requested").length,
      approved: requests.filter((r) => r.status === "Approved").length,
    };
  }, [requests]);

  // Load sample static requests + reports on mount (backend API disabled during UI iteration)
  useEffect(() => {
    setRequests(getStaticAgentRequests());
    setReports(getStaticReports());
    setDataLoaded(true);
  }, []);

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

    const restoredRows = savedRecords.map((rec) =>
      hydrateAuditRowDetails({
        ...rec.row,
        date: formatSurveillanceDate(rec.row.date || targetReq.incidentDate),
        marketName: rec.row.marketName?.trim() || targetReq.marketName || "",
        storeName: rec.row.storeName?.trim() || targetReq.storeName || "",
        clientType: normalizeClientType(rec.row.clientType, rec.row.b, rec.row.nb),
        paymentType:
          rec.row.paymentType === "Custom" || rec.row.paymentType === "Other"
            ? ""
            : rec.row.paymentType,
        attachments: rec.row.attachments ? [...rec.row.attachments] : [],
      }),
    );
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

  const handleOpenEditableForm = (reqItem: SurveillanceRequest) => {
    // 1. Check MMKV storage first for previously saved row-by-row draft entries
    const savedRecords = getStaticDraftRows(reqItem.id);
    if (savedRecords.length > 0) {
      const restoredRows = savedRecords.map((rec) =>
        hydrateAuditRowDetails({
          ...rec.row,
          date: formatSurveillanceDate(rec.row.date || reqItem.incidentDate),
          marketName: rec.row.marketName?.trim() || reqItem.marketName || "",
          storeName: rec.row.storeName?.trim() || reqItem.storeName || "",
          clientType: normalizeClientType(rec.row.clientType, rec.row.b, rec.row.nb),
          paymentType:
            rec.row.paymentType === "Custom" || rec.row.paymentType === "Other"
              ? ""
              : rec.row.paymentType,
          attachments: rec.row.attachments ? [...rec.row.attachments] : [],
        }),
      );
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

    if (existingReport && existingReport.rows && existingReport.rows.length > 0) {
      const cloned = existingReport.rows.map((r, idx) =>
        hydrateAuditRowDetails(
          {
            ...r,
            date: formatSurveillanceDate(r.date || initialDate),
            marketName: r.marketName?.trim() || reqItem.marketName || "",
            storeName: r.storeName?.trim() || reqItem.storeName || "",
            clientType: normalizeClientType(r.clientType, r.b, r.nb),
            paymentType:
              r.paymentType && r.paymentType !== "Custom" && r.paymentType !== "Other"
                ? r.paymentType
                : r.card?.trim() && r.cash?.trim()
                  ? "Mix Payment"
                  : r.card?.trim()
                    ? "Card"
                    : r.cash?.trim()
                      ? "Cash"
                      : "",
            difference: calculateDifferenceDisplay(r.invoiceAmount, r.totalTaken),
            attachments: r.attachments ? [...r.attachments] : [],
          },
          idx === 0 ? existingReport : undefined,
        ),
      );
      setEditableRows(cloned);
      setExpandedRowIds({ [cloned[0].id]: true });
    } else {
      const firstRow = createEmptyAuditRow(reqItem.storeName, reqItem.marketName, initialDate);
      setEditableRows([firstRow]);
      setExpandedRowIds({ [firstRow.id]: true });
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

        // Clear custom detail text if a dropdown is changed away from "Custom"
        if (typeof field === "string" && field in CUSTOM_DETAIL_PROP_MAP) {
          const customKey = field as CustomDetailFieldKey;
          const isStillCustom =
            customKey === "transType"
              ? hasCustomInTransType(String(value || ""))
              : value === "Custom" || value === "Other";

          if (!isStillCustom) {
            const detailProp = CUSTOM_DETAIL_PROP_MAP[customKey];
            updated[detailProp] = "";
            if (updated.otherDetails && customKey in updated.otherDetails) {
              const nextDetails = { ...updated.otherDetails };
              delete nextDetails[customKey];
              updated.otherDetails = nextDetails;
            }
          }
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

  const handleUpdateOtherDetail = (
    rowId: string,
    fieldKey: CustomDetailFieldKey,
    detailText: string,
  ) => {
    const detailProp = CUSTOM_DETAIL_PROP_MAP[fieldKey];
    setDirtyRowIds((prev) => ({ ...prev, [rowId]: true }));
    setEditableRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          [detailProp]: detailText,
          otherDetails: {
            ...(row.otherDetails || {}),
            [fieldKey]: detailText,
          },
        };
      }),
    );
  };

  // Adds a fresh audit row with all time fields reset to default ('-')
  const handleAddAuditRow = (storeName: string, marketName: string, defaultDate?: string) => {
    const nextRow = createEmptyAuditRow(storeName, marketName, defaultDate);
    setEditableRows((prev) => [...prev, nextRow]);
    setExpandedRowIds((prev) => ({ ...prev, [nextRow.id]: true }));
  };

  const handleRemoveAuditRow = (requestId: string, rowId: string) => {
    if (editableRows.length <= 1) {
      toast.error("At least one audit entry row is required to submit a report.");
      return;
    }
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
      if (!r.salesRep || !r.salesRep.trim()) {
        setExpandedRowIds((prev) => ({ ...prev, [r.id]: true }));
        toast.error(`Please select a Sales Rep for Row #${rowNum} before submitting.`);
        return false;
      }
      if (!r.transType || !r.transType.trim()) {
        setExpandedRowIds((prev) => ({ ...prev, [r.id]: true }));
        toast.error(`Please select a Transaction Type for Row #${rowNum} before submitting.`);
        return false;
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

    const serializeAuditRow = (r: SurveillanceAuditRow): SurveillanceAuditRow => {
      const normalizedClientType = normalizeClientType(r.clientType, r.b, r.nb);
      const normalizedPaymentType =
        r.paymentType === "Custom" || r.paymentType === "Other" ? "" : r.paymentType || "";
      const normOpt = (v?: string) => normalizeCustomOption(v);

      return {
        id: r.id,
        date: formatSurveillanceDate(r.date || reqItem.incidentDate),
        marketName: (r.marketName || reqItem.marketName || "").trim(),
        storeName: (r.storeName || reqItem.storeName || "").trim(),
        invoice: r.invoice,
        cashTime: r.cashTime,
        time: r.time,
        bdiTime: r.bdiTime,
        salesRep: r.salesRep.trim(),
        transType: normalizeTransTypeString(r.transType),
        transTypeDetails: resolveCustomDetailValue(r, "transType", r.transType),
        clientType: normalizedClientType,
        clientTypeDetails: resolveCustomDetailValue(r, "clientType", normalizedClientType),
        nb: r.nb,
        b: r.b,
        invoiceAmount: r.invoiceAmount,
        totalTaken: r.totalTaken,
        paymentType: normalizedPaymentType,
        cash: r.cash,
        card: r.card,
        difference: calculateDifferenceDisplay(r.invoiceAmount, r.totalTaken),
        refundInvoice: r.refundInvoice,
        receipt: normOpt(r.receipt),
        receiptDetails: resolveCustomDetailValue(r, "receipt", r.receipt),
        splitPayments: normalizedPaymentType === "Mix Payment" ? "YES" : "NO",
        fraudTransactions: normOpt(r.fraudTransactions),
        fraudTransactionsDetails: resolveCustomDetailValue(
          r,
          "fraudTransactions",
          r.fraudTransactions,
        ),
        missOpportunity: normOpt(r.missOpportunity),
        missOpportunityDetails: resolveCustomDetailValue(r, "missOpportunity", r.missOpportunity),
        paymentFraud: normOpt(r.paymentFraud),
        paymentFraudDetails: resolveCustomDetailValue(r, "paymentFraud", r.paymentFraud),
        aalSwap: normOpt(r.aalSwap),
        aalSwapDetails: resolveCustomDetailValue(r, "aalSwap", r.aalSwap),
        mim: normOpt(r.mim),
        mimDetails: resolveCustomDetailValue(r, "mim", r.mim),
        onlineRejectedPayment: normOpt(r.onlineRejectedPayment),
        onlineRejectedPaymentDetails: resolveCustomDetailValue(
          r,
          "onlineRejectedPayment",
          r.onlineRejectedPayment,
        ),
        notes: r.notes,
        pitchNb: normOpt(r.pitchNb),
        pitchNbDetails: resolveCustomDetailValue(r, "pitchNb", r.pitchNb),
        pitchNotes: r.pitchNotes,
        pitchQuality: normOpt(r.pitchQuality),
        pitchQualityDetails: resolveCustomDetailValue(r, "pitchQuality", r.pitchQuality),
        showingPhone: normOpt(r.showingPhone),
        showingPhoneDetails: resolveCustomDetailValue(r, "showingPhone", r.showingPhone),
        accOffered: normOpt(r.accOffered),
        accOfferedDetails: resolveCustomDetailValue(r, "accOffered", r.accOffered),
        maximize: normOpt(r.maximize),
        maximizeDetails: resolveCustomDetailValue(r, "maximize", r.maximize),
        flipping: normOpt(r.flipping),
        flippingDetails: resolveCustomDetailValue(r, "flipping", r.flipping),
        bundleNb: r.bundleNb,
        bundleStartB: r.bundleStartB,
        bundleEndB: r.bundleEndB,
        bundleAccGiven: normOpt(r.bundleAccGiven),
        bundleAccGivenDetails: resolveCustomDetailValue(r, "bundleAccGiven", r.bundleAccGiven),
        portIn: normOpt(r.portIn),
        portInDetails: resolveCustomDetailValue(r, "portIn", r.portIn),
        nonUp: normOpt(r.nonUp),
        nonUpDetails: resolveCustomDetailValue(r, "nonUp", r.nonUp),
        smartPayMentioned: normOpt(r.smartPayMentioned),
        smartPayMentionedDetails: resolveCustomDetailValue(
          r,
          "smartPayMentioned",
          r.smartPayMentioned,
        ),
        aalBillSame: normOpt(r.aalBillSame),
        aalBillSameDetails: resolveCustomDetailValue(r, "aalBillSame", r.aalBillSame),
        nameOfRepLeaving: r.nameOfRepLeaving,
        timeLeft: r.timeLeft,
        timeReturned: r.timeReturned,
        backRoomTimeIn: r.backRoomTimeIn,
        backRoomTimeOut: r.backRoomTimeOut,
        offline: normOpt(r.offline),
        offlineDetails: resolveCustomDetailValue(r, "offline", r.offline),
        attachments: r.attachments && r.attachments.length > 0 ? r.attachments : undefined,
      };
    };

    const combinedAttachments = editableRows.flatMap((r) => r.attachments || []);
    const primaryClientType = normalizeClientType(
      primaryRow.clientType,
      primaryRow.b,
      primaryRow.nb,
    );

    const payload = {
      requestId: reqItem.id,
      rows: editableRows.map(serializeAuditRow),
      date: formatSurveillanceDate(primaryRow.date || reqItem.incidentDate),
      marketName: (primaryRow.marketName || reqItem.marketName || "").trim(),
      storeName: (primaryRow.storeName || reqItem.storeName || "").trim(),
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
          : normalizeTransTypeString(primaryRow.transType) || "Audit Entry",
      transTypeDetails: resolveCustomDetailValue(primaryRow, "transType", primaryRow.transType),
      clientType:
        primaryClientType === "Custom"
          ? "Custom"
          : primaryClientType === "Non-Buyer"
            ? "Non-Buyer"
            : "Buyer",
      clientTypeDetails: resolveCustomDetailValue(primaryRow, "clientType", primaryClientType),
      invoiceAmount: primaryRow.invoiceAmount || "$0.00",
      totalTaken: primaryRow.totalTaken || "$0.00",
      paymentMode:
        primaryRow.paymentType === "Mix Payment"
          ? "Split"
          : primaryRow.paymentType === "Cash"
            ? "Cash"
            : "Card",
      difference: calculateDifferenceDisplay(primaryRow.invoiceAmount, primaryRow.totalTaken),
      refundInvoice: primaryRow.refundInvoice?.trim() || "No",
      receipt: resolveYesNoValue(primaryRow.receipt),
      receiptDetails: resolveCustomDetailValue(primaryRow, "receipt", primaryRow.receipt),
      splitPayments: primaryRow.paymentType === "Mix Payment" ? "Yes" : "No",
      fraudTransactions: resolveYesNoValue(primaryRow.fraudTransactions),
      fraudTransactionsDetails: resolveCustomDetailValue(
        primaryRow,
        "fraudTransactions",
        primaryRow.fraudTransactions,
      ),
      missOpportunity: resolveYesNoValue(primaryRow.missOpportunity),
      missOpportunityDetails: resolveCustomDetailValue(
        primaryRow,
        "missOpportunity",
        primaryRow.missOpportunity,
      ),
      paymentFraud: resolveYesNoValue(primaryRow.paymentFraud),
      paymentFraudDetails: resolveCustomDetailValue(
        primaryRow,
        "paymentFraud",
        primaryRow.paymentFraud,
      ),
      aalSwap: resolveYesNoValue(primaryRow.aalSwap),
      aalSwapDetails: resolveCustomDetailValue(primaryRow, "aalSwap", primaryRow.aalSwap),
      mim: resolveYesNoValue(primaryRow.mim),
      mimDetails: resolveCustomDetailValue(primaryRow, "mim", primaryRow.mim),
      onlineRejectedPayment: resolveYesNoValue(primaryRow.onlineRejectedPayment),
      onlineRejectedPaymentDetails: resolveCustomDetailValue(
        primaryRow,
        "onlineRejectedPayment",
        primaryRow.onlineRejectedPayment,
      ),
      notes: primaryRow.notes,
      pitchNb: resolveYesNoValue(primaryRow.pitchNb),
      pitchNbDetails: resolveCustomDetailValue(primaryRow, "pitchNb", primaryRow.pitchNb),
      pitchNotes: primaryRow.pitchNotes,
      pitchQuality:
        primaryRow.pitchQuality === "Custom" || primaryRow.pitchQuality === "Other"
          ? "Custom"
          : primaryRow.pitchQuality?.trim() || "Not Observed",
      pitchQualityDetails: resolveCustomDetailValue(
        primaryRow,
        "pitchQuality",
        primaryRow.pitchQuality,
      ),
      showingPhone: resolveYesNoValue(primaryRow.showingPhone),
      showingPhoneDetails: resolveCustomDetailValue(
        primaryRow,
        "showingPhone",
        primaryRow.showingPhone,
      ),
      accOffered: resolveYesNoValue(primaryRow.accOffered),
      accOfferedDetails: resolveCustomDetailValue(primaryRow, "accOffered", primaryRow.accOffered),
      maximize: resolveYesNoValue(primaryRow.maximize),
      maximizeDetails: resolveCustomDetailValue(primaryRow, "maximize", primaryRow.maximize),
      flipping: resolveYesNoValue(primaryRow.flipping),
      flippingDetails: resolveCustomDetailValue(primaryRow, "flipping", primaryRow.flipping),
      bundleNb: primaryRow.bundleNb,
      bundleStartB: primaryRow.bundleStartB,
      bundleEndB: primaryRow.bundleEndB,
      bundleAccGiven: resolveYesNoValue(primaryRow.bundleAccGiven),
      bundleAccGivenDetails: resolveCustomDetailValue(
        primaryRow,
        "bundleAccGiven",
        primaryRow.bundleAccGiven,
      ),
      portIn: resolveYesNoValue(primaryRow.portIn),
      portInDetails: resolveCustomDetailValue(primaryRow, "portIn", primaryRow.portIn),
      nonUp: resolveYesNoValue(primaryRow.nonUp),
      nonUpDetails: resolveCustomDetailValue(primaryRow, "nonUp", primaryRow.nonUp),
      smartPayMentioned: resolveYesNoValue(primaryRow.smartPayMentioned),
      smartPayMentionedDetails: resolveCustomDetailValue(
        primaryRow,
        "smartPayMentioned",
        primaryRow.smartPayMentioned,
      ),
      aalBillSame: resolveYesNoValue(primaryRow.aalBillSame),
      aalBillSameDetails: resolveCustomDetailValue(
        primaryRow,
        "aalBillSame",
        primaryRow.aalBillSame,
      ),
      nameOfRepLeaving: primaryRow.nameOfRepLeaving,
      timeLeft: primaryRow.timeLeft,
      timeReturned: primaryRow.timeReturned,
      backRoomTimeIn: primaryRow.backRoomTimeIn,
      backRoomTimeOut: primaryRow.backRoomTimeOut,
      offline: resolveYesNoValue(primaryRow.offline),
      offlineDetails: resolveCustomDetailValue(primaryRow, "offline", primaryRow.offline),
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
              Back to Surveillance Report Detail
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
              onClick={() =>
                handleAddAuditRow(activeItem.storeName, activeItem.marketName, defaultDate)
              }
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
                          <Label className="text-[11px] font-semibold">
                            Surveillance Date <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="text"
                            required
                            readOnly
                            tabIndex={-1}
                            value={formatSurveillanceDate(row.date || defaultDate)}
                            className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                            placeholder="e.g. 10 Oct, 2026"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">
                            Market <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="text"
                            required
                            readOnly
                            tabIndex={-1}
                            value={row.marketName || activeItem.marketName || ""}
                            className="bg-muted/30 text-foreground cursor-default focus-visible:ring-0"
                            placeholder="Market"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2 md:col-span-2">
                          <Label className="text-[11px] font-semibold">
                            Store Name <span className="text-destructive">*</span>
                          </Label>
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Input
                                  type="text"
                                  required
                                  readOnly
                                  tabIndex={-1}
                                  value={row.storeName || activeItem.storeName || ""}
                                  className="bg-muted/30 text-foreground truncate cursor-default focus-visible:ring-0 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                                  placeholder="Store Name"
                                />
                              </TooltipTrigger>
                              {(row.storeName || activeItem.storeName) && (
                                <TooltipContent
                                  side="top"
                                  align="start"
                                  className="max-w-md break-words text-xs font-medium"
                                >
                                  {row.storeName || activeItem.storeName}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </div>
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

                        {hasCustomInTransType(row.transType) && (
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-[11px] font-semibold">
                              Transaction Type Details
                            </Label>
                            <Input
                              value={getRowCustomDetail(row, "transType")}
                              onChange={(e) =>
                                handleUpdateOtherDetail(row.id, "transType", e.target.value)
                              }
                              placeholder="Enter transaction type details..."
                            />
                          </div>
                        )}

                        <SelectWithCustomField
                          label="Client Type"
                          options={CLIENT_TYPE_OPTIONS}
                          value={normalizeClientType(row.clientType, row.b, row.nb)}
                          detailValue={getRowCustomDetail(row, "clientType")}
                          onValueChange={(val) => handleUpdateRowField(row.id, "clientType", val)}
                          onDetailChange={(det) =>
                            handleUpdateOtherDetail(row.id, "clientType", det)
                          }
                          detailSpanClass="sm:col-span-2"
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
                            tabIndex={-1}
                            className="bg-muted/30 font-semibold text-foreground cursor-default select-none focus-visible:ring-0"
                            placeholder="$0.00"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Payment Type</Label>
                          <Select
                            value={toSelectVal(
                              row.paymentType === "Custom" || row.paymentType === "Other"
                                ? ""
                                : row.paymentType,
                            )}
                            onValueChange={(v) =>
                              handleUpdateRowField(row.id, "paymentType", fromSelectVal(v))
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

                        <SelectWithCustomField
                          label="Receipt"
                          options={YES_NO_OPTIONS}
                          value={row.receipt}
                          detailValue={getRowCustomDetail(row, "receipt")}
                          onValueChange={(val) => handleUpdateRowField(row.id, "receipt", val)}
                          onDetailChange={(det) => handleUpdateOtherDetail(row.id, "receipt", det)}
                          detailSpanClass="sm:col-span-2"
                        />
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
                          <SelectWithCustomField
                            key={field.key}
                            label={field.label}
                            options={YES_NO_OPTIONS}
                            value={row[field.key]}
                            detailValue={getRowCustomDetail(row, field.key)}
                            onValueChange={(val) => handleUpdateRowField(row.id, field.key, val)}
                            onDetailChange={(det) =>
                              handleUpdateOtherDetail(row.id, field.key, det)
                            }
                            detailSpanClass="col-span-2"
                          />
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
                        <SelectWithCustomField
                          label="Pitch NB"
                          options={YES_NO_OPTIONS}
                          value={row.pitchNb}
                          detailValue={getRowCustomDetail(row, "pitchNb")}
                          onValueChange={(val) => handleUpdateRowField(row.id, "pitchNb", val)}
                          onDetailChange={(det) => handleUpdateOtherDetail(row.id, "pitchNb", det)}
                          detailSpanClass="col-span-2"
                        />
                        <SelectWithCustomField
                          label="Pitch Quality"
                          options={PITCH_QUALITY_OPTIONS}
                          value={row.pitchQuality}
                          detailValue={getRowCustomDetail(row, "pitchQuality")}
                          onValueChange={(val) => handleUpdateRowField(row.id, "pitchQuality", val)}
                          onDetailChange={(det) =>
                            handleUpdateOtherDetail(row.id, "pitchQuality", det)
                          }
                          detailSpanClass="col-span-2"
                        />

                        {(
                          [
                            { key: "showingPhone", label: "Showing Phone?" },
                            { key: "accOffered", label: "Acc Offered" },
                            { key: "maximize", label: "Maximize" },
                            { key: "flipping", label: "Flipping" },
                          ] as const
                        ).map((field) => (
                          <SelectWithCustomField
                            key={field.key}
                            label={field.label}
                            options={YES_NO_OPTIONS}
                            value={row[field.key]}
                            detailValue={getRowCustomDetail(row, field.key)}
                            onValueChange={(val) => handleUpdateRowField(row.id, field.key, val)}
                            onDetailChange={(det) =>
                              handleUpdateOtherDetail(row.id, field.key, det)
                            }
                            detailSpanClass="col-span-2"
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

                        {(
                          [
                            { key: "bundleAccGiven", label: "Bundle Acc Given" },
                            { key: "portIn", label: "Port In" },
                            { key: "nonUp", label: "Non-Up" },
                            { key: "smartPayMentioned", label: "SmartPay Mentioned" },
                            { key: "aalBillSame", label: "AAL Bill Same" },
                          ] as const
                        ).map((field) => (
                          <SelectWithCustomField
                            key={field.key}
                            label={field.label}
                            options={YES_NO_OPTIONS}
                            value={row[field.key]}
                            detailValue={getRowCustomDetail(row, field.key)}
                            onValueChange={(val) => handleUpdateRowField(row.id, field.key, val)}
                            onDetailChange={(det) =>
                              handleUpdateOtherDetail(row.id, field.key, det)
                            }
                            detailSpanClass="col-span-2"
                          />
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
                            onChange={(val) => handleUpdateRowField(row.id, "backRoomTimeIn", val)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Back Room Time - Out</Label>
                          <AmPmTimePicker
                            value={row.backRoomTimeOut}
                            onChange={(val) => handleUpdateRowField(row.id, "backRoomTimeOut", val)}
                          />
                        </div>
                        <SelectWithCustomField
                          label="Offline"
                          options={YES_NO_OPTIONS}
                          value={row.offline}
                          detailValue={getRowCustomDetail(row, "offline")}
                          onValueChange={(val) => handleUpdateRowField(row.id, "offline", val)}
                          onDetailChange={(det) => handleUpdateOtherDetail(row.id, "offline", det)}
                          detailSpanClass="col-span-2 sm:col-span-3"
                        />
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
          })}
        </div>

        {/* Bottom Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              handleAddAuditRow(activeItem.storeName, activeItem.marketName, defaultDate)
            }
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
              Back to Surveillance Reports
            </Button>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                Surveillance Reports
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
            ) : (
              Boolean(targetReportId) && (
                <Button
                  onClick={() => navigate(`/surveillance/reports/${targetReportId}`)}
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
