import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  UserCheck,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  canApproveSurveillance,
  getSurveillanceRole,
  type SurveillanceAuditRow,
  type SurveillanceBadPitchItem,
  type SurveillanceRepIntervalLog,
  type SurveillanceReport,
  type SurveillanceRequest,
} from "@/services/portals/surveillance";
import { surveillanceService } from "@/services/portals/surveillance/surveillance.service";
import { SurveillanceSummaryPageSkeleton } from "./SurveillanceSkeletons";

function renderTextWithLinks(text: string) {
  if (!text) return null;
  const parts = text.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (/^(https?:\/\/|www\.)/i.test(part)) {
          const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium break-all"
            >
              <span>{part}</span>
              <ExternalLink className="h-3 w-3 inline shrink-0" />
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function padTwo(num: number): string {
  if (num < 0) return String(num);
  return String(num).padStart(2, "0");
}

function isAffirmative(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim().toLowerCase();
  return s === "yes" || s === "true" || s === "y" || s === "1";
}

// For the Compliance/Payment Policy grid: collects the written note for every
// audit row where the given flag is affirmative, dropping rows that have
// nothing written. A flag with zero notes across every row is omitted from
// the grid entirely instead of showing a bare "Yes".
function collectFlagNotes(
  rows: SurveillanceAuditRow[],
  flagKey: keyof SurveillanceAuditRow,
  detailsKey: keyof SurveillanceAuditRow,
): string[] {
  return rows
    .filter((r) => isAffirmative(r[flagKey]))
    .map((r) => String(r[detailsKey] ?? "").trim())
    .filter((note) => note.length > 0);
}

function isMeaningfulText(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  return (
    lower !== "-" &&
    lower !== "—" &&
    lower !== "none" &&
    lower !== "no" &&
    lower !== "n/a" &&
    lower !== "false"
  );
}

function formatSummaryDateSlash(raw?: string): string {
  const clean = (raw || "").split(" - ")[0]?.trim() || "";
  if (!clean) return "—";
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [m, d, y] = clean.split("/");
    return `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${y}`;
  }
  const ymd = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    return `${ymd[2].padStart(2, "0")}/${ymd[3].padStart(2, "0")}/${ymd[1]}`;
  }
  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${parsed.getFullYear()}`;
  }
  return clean;
}

function parseCurrencyDifference(raw?: string): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "—") return 0;
  const isParenNegative = trimmed.startsWith("(") && trimmed.endsWith(")");
  const isMinusNegative = trimmed.includes("-");
  const numericPart = trimmed.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(numericPart);
  if (Number.isNaN(parsed)) return 0;
  return isParenNegative || isMinusNegative ? -Math.abs(parsed) : parsed;
}

function formatCurrencySigned(amount: number): string {
  if (Math.abs(amount) < 0.005) return "$0.00";
  const absFormatted = Math.abs(amount).toFixed(2);
  return amount < 0 ? `-$${absFormatted}` : `$${absFormatted}`;
}

function parseTimeToMinutes(timeStr: string | undefined): number | null {
  if (!timeStr || !timeStr.trim()) return null;
  const s = timeStr.trim();
  const match = s.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return null;
}

function calculateElapsedMinutes(start: string | undefined, end: string | undefined): number {
  const startMins = parseTimeToMinutes(start);
  const endMins = parseTimeToMinutes(end);
  if (startMins === null || endMins === null) return 0;
  let diff = endMins - startMins;
  if (diff < 0) {
    diff += 24 * 60;
  }
  return diff;
}

function calculateCameraIntervalMinutes(t1?: string, t2?: string): number {
  const m1 = parseTimeToMinutes(t1);
  const m2 = parseTimeToMinutes(t2);
  if (m1 === null || m2 === null) return 0;
  let diff = Math.abs(m2 - m1);
  if (diff > 12 * 60) {
    diff = 24 * 60 - diff;
  }
  return diff;
}

function formatMinutesToDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0 mins";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) {
    return `${mins} min${mins === 1 ? "" : "s"}`;
  }
  if (mins === 0) {
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }
  return `${hours} hr${hours === 1 ? "" : "s"} ${mins} min${mins === 1 ? "" : "s"}`;
}

function calculateElapsedTime(
  start: string | undefined,
  end: string | undefined,
  fallback?: string,
): string {
  if (fallback && fallback.trim() && fallback.trim() !== "—") return fallback.trim();
  const mins = calculateElapsedMinutes(start, end);
  if (mins <= 0 && (!start || !end || start === "—" || end === "—")) return "";
  return formatMinutesToDuration(mins);
}

function isRowBuying(row: SurveillanceAuditRow): boolean {
  const ct = (row.clientType || "").trim().toLowerCase();
  if (ct === "buyer" || ct === "billable") return true;
  if (ct === "non-buyer" || ct === "non billable") return false;
  if ((row.b || "").trim().toUpperCase() === "B") return true;
  if ((row.nb || "").trim().toUpperCase() === "NB") return false;
  return false;
}

function isStoreMarkerRow(row: SurveillanceAuditRow): boolean {
  const tt = (row.transType || "").trim().toLowerCase();
  return tt === "store opened" || tt === "store closed";
}

function isUnservedWalkoutRow(row: SurveillanceAuditRow): boolean {
  const rep = (row.salesRep || "").trim();
  const inv = (row.invoice || "").trim();
  const noRep = !rep || rep === "-" || rep === "—" || rep.toLowerCase() === "none";
  const noInv = !inv || inv === "-" || inv === "—";
  return noRep && noInv && isAffirmative(row.missOpportunity);
}

function normalizePitchQualityBucket(raw?: string): "Bad" | "Average" | "Good" | null {
  const s = (raw || "").trim().toLowerCase();
  if (!s || s === "-" || s === "—" || s === "not observed" || s === "none") return null;
  if (s === "bad" || s === "poor") return "Bad";
  if (s === "avg" || s === "average" || s === "fair") return "Average";
  if (s === "good" || s === "excellent") return "Good";
  return null;
}

interface RepSummaryStats {
  repName: string;
  totalCustomers: number;
  nonBuying: number;
  buying: number;
  closedTotal: number;
  closedNonBuying: number;
  closedBuying: number;
  pitchNonBuying: number;
  showedPhone: number;
  didntShowPhone: number;
  qualityBad: number;
  qualityAverage: number;
  qualityGood: number;
  accessoriesOffered: number;
  pitchNotes: string[];
}

interface BundleEntry {
  invoice: string;
  itemSummary: string;
  startingAmount: string;
  endingAmount: string;
  accGiven?: string;
  accGivenDetails?: string;
}

interface MissOpportunityItem {
  time: string;
  description: string;
}

interface ProcessedRepTimingInterval {
  start: string;
  end: string;
  duration: string;
  durationMinutes: number;
}

interface ProcessedRepTimingLog {
  repName: string;
  intervals: ProcessedRepTimingInterval[];
  totalMinutes: number;
  totalTimeFormatted: string;
}

interface ProcessedCameraLog {
  id: string;
  cameraName: string;
  onlineTime: string;
  offlineTime: string;
  duration: string;
  durationMinutes: number;
}

interface ComputedSurveillanceSummary {
  dateDisplay: string;
  storeName: string;
  repNamesJoined: string;
  repStats: RepSummaryStats[];
  totalCustomers: number;
  totalNonBuying: number;
  totalBuying: number;
  totalClosed: number;
  totalClosedNonBuying: number;
  totalClosedBuying: number;
  totalPitchNonBuying: number;
  totalShowedPhone: number;
  totalDidntShowPhone: number;
  badPitchItems: SurveillanceBadPitchItem[];
  bundleBuying: BundleEntry[];
  bundleNonBuying: BundleEntry[];
  totalAccessoriesOffered: number;
  maximizing: "Yes" | "No";
  complianceFlags: Array<{ label: string; notes: string[] }>;
  transactionNotes: string[];
  missOpportunities: MissOpportunityItem[];
  repLeavingLogs: ProcessedRepTimingLog[];
  overallStoreLeftMinutes: number;
  overallStoreLeftFormatted: string;
  backroomLogs: ProcessedRepTimingLog[];
  overallBackroomMinutes: number;
  overallBackroomFormatted: string;
  cameraLogs: ProcessedCameraLog[];
  totalCameraDurationMinutes: number;
  totalCameraDurationFormatted: string;
  refundInvoices: string[];
  receiptBuyingCustomers: Array<{ invoice: string; status: string }>;
  accessoriesGivenBundles: string[];
  loomisVisible: string;
  loomisLink: string;
  safeLockerVisible: string;
  safeLockerLink: string;
  generalOtherNotes: string;
  amountDifference: string;
  numericDifference: number;
  showReasonForDifference: boolean;
  reasonForDifference: string;
  qaName: string;
}

function buildFallbackRowFromReport(report: SurveillanceReport): SurveillanceAuditRow {
  const ctTrimmed = (report.clientType || "").trim();
  const isBuyer = ctTrimmed === "Buyer" || ctTrimmed === "Billable";
  return {
    id: `${report.id}-primary`,
    date: report.date || "",
    marketName: report.marketName || "",
    storeName: report.storeName || "",
    invoice: report.invoiceNo || "",
    cashTime: report.cashTime || "",
    time: report.time || "",
    bdiTime: report.bdiTime || "",
    salesRep: report.salesRep || "",
    transType: report.transType || "",
    clientType: report.clientType || "",
    nb: isBuyer ? "" : "NB",
    b: isBuyer ? "B" : "",
    invoiceAmount: report.invoiceAmount || "",
    totalTaken: report.totalTaken || "",
    paymentType: report.paymentMode === "Split" ? "Mix Payment" : report.paymentMode || "",
    cash: report.paymentMode === "Cash" ? report.totalTaken : "",
    card: report.paymentMode === "Card" ? report.totalTaken : "",
    difference: report.difference || "$0.00",
    receipt: report.receipt ? report.receipt.toUpperCase() : "",
    splitPayments: report.splitPayments ? report.splitPayments.toUpperCase() : "NO",
    fraudTransactions: report.fraudTransactions || "No",
    fraudTransactionsDetails: report.fraudTransactionsDetails,
    refundInvoice: report.refundInvoice || "No",
    missOpportunity: report.missOpportunity || "No",
    missOpportunityDetails: report.missOpportunityDetails,
    paymentFraud: report.paymentFraud || "No",
    paymentFraudDetails: report.paymentFraudDetails,
    aalSwap: report.aalSwap || "No",
    aalSwapDetails: report.aalSwapDetails,
    mim: report.mim || "No",
    mimDetails: report.mimDetails,
    notes: report.notes || "",
    pitchNb: report.pitchNb || "No",
    pitchNotes: report.pitchNotes || "",
    pitchQuality: report.pitchQuality || "",
    showingPhone: report.showingPhone || "No",
    accOffered: report.accOffered || "No",
    maximize: report.maximize || "No",
    flipping: report.flipping || "No",
    bundleNb: report.bundleNb || "",
    bundleStartB: report.bundleStartB || "",
    bundleEndB: report.bundleEndB || "",
    bundleAccGiven: report.bundleAccGiven || "No",
    portIn: report.portIn || "No",
    nonUp: report.nonUp || "No",
    smartPayMentioned: report.smartPayMentioned || "No",
    aalBillSame: report.aalBillSame || "No",
    onlineRejectedPayment: report.onlineRejectedPayment || "No",
    onlineRejectedPaymentDetails: report.onlineRejectedPaymentDetails,
    nameOfRepLeaving: report.nameOfRepLeaving || "",
    timeLeft: report.timeLeft || "",
    timeReturned: report.timeReturned || "",
    backRoomTimeIn: report.backRoomTimeIn || "",
    backRoomTimeOut: report.backRoomTimeOut || "",
    offline: report.offline || "No",
  };
}

function computeSummaryFromReport(
  report: SurveillanceReport,
  linkedRequest: SurveillanceRequest | null,
): ComputedSurveillanceSummary {
  const rawRows =
    report.rows && report.rows.length > 0 ? report.rows : [buildFallbackRowFromReport(report)];
  const meta = report.summaryMeta || {};

  // Separate logical customers (grouping rows that share customerGroupId)
  const servedRows = rawRows.filter((r) => !isStoreMarkerRow(r) && !isUnservedWalkoutRow(r));

  interface LogicalCustomer {
    key: string;
    repName: string;
    rows: SurveillanceAuditRow[];
    isBuying: boolean;
    isClosedNonBuying: boolean;
    pitchedNb: boolean;
    showedPhone: boolean;
    qualityBucket: "Bad" | "Average" | "Good" | null;
    accOffered: boolean;
    pitchNotes: string[];
  }

  const customerMap = new Map<string, SurveillanceAuditRow[]>();
  servedRows.forEach((row, idx) => {
    const grp = (row.customerGroupId || "").trim();
    const key = grp ? `grp:${grp}` : `row:${row.id || idx}`;
    const bucket = customerMap.get(key) || [];
    bucket.push(row);
    customerMap.set(key, bucket);
  });

  const repOrder: string[] = [];
  const registerRep = (name: string) => {
    const clean = name.trim();
    if (!clean || clean === "-" || clean === "—" || clean.toLowerCase() === "none") return;
    if (!repOrder.includes(clean)) repOrder.push(clean);
  };

  const logicalCustomers: LogicalCustomer[] = [];
  customerMap.forEach((groupRows, key) => {
    const primary = groupRows[0];
    const rawRep =
      groupRows
        .map((r) => (r.salesRep || "").trim())
        .find((s) => s && s !== "-" && s !== "—" && s.toLowerCase() !== "none") || "Unassigned Rep";
    registerRep(rawRep);

    const buying = groupRows.some((r) => isRowBuying(r));
    const closedNb =
      !buying &&
      groupRows.some((r) => isMeaningfulText(r.bundleNb) || isAffirmative(r.bundleAccGiven));
    const pitchedNb =
      !buying &&
      groupRows.some(
        (r) => isAffirmative(r.pitchNb) || normalizePitchQualityBucket(r.pitchQuality) !== null,
      );
    const showedPhone = pitchedNb && groupRows.some((r) => isAffirmative(r.showingPhone));
    const qualityBucket =
      groupRows.map((r) => normalizePitchQualityBucket(r.pitchQuality)).find((q) => q !== null) ||
      null;
    const accOffered = groupRows.some((r) => isAffirmative(r.accOffered));
    const notesList = groupRows
      .map((r) => (r.pitchNotes || "").trim())
      .filter((n) => isMeaningfulText(n));

    logicalCustomers.push({
      key,
      repName: rawRep,
      rows: groupRows,
      isBuying: buying,
      isClosedNonBuying: closedNb,
      pitchedNb,
      showedPhone,
      qualityBucket,
      accOffered,
      pitchNotes: Array.from(new Set(notesList)),
    });
  });

  // Fallback if report.salesRep lists reps not yet registered
  if (repOrder.length === 0 && isMeaningfulText(report.salesRep)) {
    report.salesRep
      .split(/[,&]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(registerRep);
  }

  const repStats: RepSummaryStats[] = repOrder.map((repName) => {
    const custs = logicalCustomers.filter((c) => c.repName === repName);
    const buying = custs.filter((c) => c.isBuying).length;
    const nonBuying = custs.length - buying;
    const closedBuying = buying;
    const closedNonBuying = custs.filter((c) => c.isClosedNonBuying).length;
    const pitched = custs.filter((c) => c.pitchedNb);
    const showed = pitched.filter((c) => c.showedPhone).length;
    const didntShow = pitched.length - showed;
    const qualityBad = custs.filter((c) => c.qualityBucket === "Bad").length;
    const qualityAverage = custs.filter((c) => c.qualityBucket === "Average").length;
    const qualityGood = custs.filter((c) => c.qualityBucket === "Good").length;
    const accessoriesOffered = custs.filter((c) => c.accOffered).length;
    const pitchNotes = custs.flatMap((c) => c.pitchNotes);

    return {
      repName,
      totalCustomers: custs.length,
      nonBuying,
      buying,
      closedTotal: closedBuying + closedNonBuying,
      closedNonBuying,
      closedBuying,
      pitchNonBuying: pitched.length,
      showedPhone: showed,
      didntShowPhone: didntShow,
      qualityBad,
      qualityAverage,
      qualityGood,
      accessoriesOffered,
      pitchNotes,
    };
  });

  const totalCustomers = logicalCustomers.length;
  const totalBuying = logicalCustomers.filter((c) => c.isBuying).length;
  const totalNonBuying = totalCustomers - totalBuying;

  const totalClosedBuying = totalBuying;
  const totalClosedNonBuying = logicalCustomers.filter((c) => c.isClosedNonBuying).length;
  const totalClosed = totalClosedBuying + totalClosedNonBuying;

  const totalPitchNonBuying = logicalCustomers.filter((c) => c.pitchedNb).length;
  const totalShowedPhone = logicalCustomers.filter((c) => c.pitchedNb && c.showedPhone).length;
  const totalDidntShowPhone = totalPitchNonBuying - totalShowedPhone;
  const totalAccessoriesOffered = logicalCustomers.filter((c) => c.accOffered).length;

  // Bad Pitch Items
  const badPitchItems: SurveillanceBadPitchItem[] =
    meta.badPitchItems && meta.badPitchItems.length > 0
      ? meta.badPitchItems
      : servedRows
          .filter((r) => normalizePitchQualityBucket(r.pitchQuality) === "Bad")
          .map((r) => ({
            repName: r.salesRep,
            description:
              (r.pitchNotes || "").trim() ||
              (r.notes || "").trim() ||
              `${r.salesRep || "Representative"} delivered a poor pitch on Invoice #${r.invoice || "N/A"}.`,
            link: "",
          }));

  // Bundle Buying & Bundle Non-Buying
  const bundleBuying: BundleEntry[] = [];
  const seenBuyingInvoices = new Set<string>();
  servedRows.forEach((r) => {
    if (!isRowBuying(r)) return;
    const inv = (r.invoice || "").trim();
    if (!inv || inv === "-" || inv === "—" || seenBuyingInvoices.has(inv)) return;
    if (
      isMeaningfulText(r.bundleNb) ||
      isMeaningfulText(r.bundleStartB) ||
      isMeaningfulText(r.bundleEndB)
    ) {
      seenBuyingInvoices.add(inv);
      const itemLabel = isMeaningfulText(r.bundleNb) ? r.bundleNb.trim() : "#of phone sold (1)";
      bundleBuying.push({
        invoice: inv,
        itemSummary: itemLabel,
        startingAmount: isMeaningfulText(r.bundleStartB)
          ? r.bundleStartB.trim()
          : r.invoiceAmount || "$0.00",
        endingAmount: isMeaningfulText(r.bundleEndB)
          ? r.bundleEndB.trim()
          : r.totalTaken || r.invoiceAmount || "$0.00",
        accGiven: isAffirmative(r.bundleAccGiven) ? "Yes" : "No",
        accGivenDetails: (r.bundleAccGivenDetails || "").trim(),
      });
    }
  });

  const bundleNonBuying: BundleEntry[] = [];
  const seenNbInvoices = new Set<string>();
  servedRows.forEach((r) => {
    if (isRowBuying(r)) return;
    if (!isMeaningfulText(r.bundleNb)) return;
    const inv = (r.invoice || "").trim() || "N/A";
    if (seenNbInvoices.has(inv)) return;
    seenNbInvoices.add(inv);
    bundleNonBuying.push({
      invoice: inv,
      itemSummary: r.bundleNb.trim(),
      startingAmount: isMeaningfulText(r.bundleStartB) ? r.bundleStartB.trim() : "$00",
      endingAmount: isMeaningfulText(r.bundleEndB) ? r.bundleEndB.trim() : "$00",
      accGiven: isAffirmative(r.bundleAccGiven) ? "Yes" : "No",
      accGivenDetails: (r.bundleAccGivenDetails || "").trim(),
    });
  });

  // Policy & Compliance flags
  const maximizing: "Yes" | "No" = rawRows.some((r) => isAffirmative(r.maximize)) ? "Yes" : "No";

  // Each flag only appears in the grid if at least one row was flagged Yes
  // AND has a written note - no bare Yes/No pills, just the notes for
  // whichever rows triggered the flag. A flag with no written notes anywhere
  // (even if marked Yes somewhere) is simply omitted.
  const complianceFlags: Array<{ label: string; notes: string[] }> = [
    { label: "Flipping", notes: collectFlagNotes(rawRows, "flipping", "flippingDetails") },
    {
      label: "SmartPay",
      notes: collectFlagNotes(rawRows, "smartPayMentioned", "smartPayMentionedDetails"),
    },
    {
      label: "Payments Rejected",
      notes: collectFlagNotes(rawRows, "onlineRejectedPayment", "onlineRejectedPaymentDetails"),
    },
    { label: "AAL Swap", notes: collectFlagNotes(rawRows, "aalSwap", "aalSwapDetails") },
    {
      label: "AAL Bill Same",
      notes: collectFlagNotes(rawRows, "aalBillSame", "aalBillSameDetails"),
    },
    { label: "Port IN", notes: collectFlagNotes(rawRows, "portIn", "portInDetails") },
    { label: "Magenta In Metro", notes: collectFlagNotes(rawRows, "mim", "mimDetails") },
    {
      label: "Fraud Transaction",
      notes: collectFlagNotes(rawRows, "fraudTransactions", "fraudTransactionsDetails"),
    },
    {
      label: "Payment Fraud",
      notes: collectFlagNotes(rawRows, "paymentFraud", "paymentFraudDetails"),
    },
    { label: "Non-Up", notes: collectFlagNotes(rawRows, "nonUp", "nonUpDetails") },
  ].filter((flag) => flag.notes.length > 0);

  // Transaction Notes - the audit row field is always editable now, but the
  // Summary only surfaces it for a buying customer whose transaction type
  // wasn't a Phone/Tablet/HINT device sale, collected here under one heading
  // the same way the compliance flags above are.
  const transactionNotes: string[] = rawRows
    .filter((r) => {
      const transTypeParts = (r.transType || "")
        .split("/")
        .map((p) => p.trim())
        .filter(Boolean);
      const hasDeviceType = transTypeParts.some((p) => ["Phone", "Tablet", "HINT"].includes(p));
      return isRowBuying(r) && transTypeParts.length > 0 && !hasDeviceType;
    })
    .map((r) => (r.notes || "").trim())
    .filter((note) => note.length > 0);

  // Miss Opportunities - only rows flagged Yes AND with an actual written
  // reason, same "no notes, no entry" rule as the compliance flags above. No
  // generic placeholder text when the reason field was left blank.
  const missOpportunities: MissOpportunityItem[] = rawRows
    .filter((r) => isAffirmative(r.missOpportunity) && (r.missOpportunityDetails || "").trim())
    .map((r) => ({
      time: (r.time || r.cashTime || r.bdiTime || "—").trim(),
      description: (r.missOpportunityDetails || "").trim(),
    }));

  // Floor Presence: Reps Leaving Store & Backroom In & Out
  const processRepTimingLogs = (
    rawIntervalLogs: Array<{
      repName: string;
      intervals: Array<{ start: string; end: string; duration?: string }>;
    }>,
  ): {
    logs: ProcessedRepTimingLog[];
    overallMinutes: number;
    overallFormatted: string;
  } => {
    let overallMinutes = 0;
    const logs: ProcessedRepTimingLog[] = rawIntervalLogs.map((log) => {
      let repMinutes = 0;
      const intervals: ProcessedRepTimingInterval[] = log.intervals.map((iv) => {
        const mins = calculateElapsedMinutes(iv.start, iv.end);
        const duration = calculateElapsedTime(iv.start, iv.end, iv.duration);
        repMinutes += mins;
        return {
          start: iv.start,
          end: iv.end,
          duration,
          durationMinutes: mins,
        };
      });
      overallMinutes += repMinutes;
      return {
        repName: log.repName,
        intervals,
        totalMinutes: repMinutes,
        totalTimeFormatted: formatMinutesToDuration(repMinutes),
      };
    });

    return {
      logs,
      overallMinutes,
      overallFormatted: formatMinutesToDuration(overallMinutes),
    };
  };

  const rawRepLeavingLogs: Array<{
    repName: string;
    intervals: Array<{ start: string; end: string; duration?: string }>;
  }> = (() => {
    if (meta.repLeavingLogs && meta.repLeavingLogs.length > 0) {
      return meta.repLeavingLogs;
    }
    if (report.repTimings && report.repTimings.length > 0) {
      const map = new Map<string, Array<{ start: string; end: string; duration?: string }>>();
      report.repTimings
        .filter((t) => t.timingType !== "Back Room")
        .forEach((t) => {
          const left = (t.timeIn || "").trim();
          const ret = (t.timeOut || "").trim();
          if (!isMeaningfulText(left) && !isMeaningfulText(ret)) return;
          const rep = (isMeaningfulText(t.repName) ? t.repName! : "Representative").trim();
          const list = map.get(rep) || [];
          list.push({ start: left || "—", end: ret || "—", duration: t.totalTime });
          map.set(rep, list);
        });
      if (map.size > 0) {
        return Array.from(map.entries()).map(([repName, intervals]) => ({ repName, intervals }));
      }
    }
    const map = new Map<string, Array<{ start: string; end: string; duration?: string }>>();
    rawRows.forEach((r) => {
      const left = (r.timeLeft || "").trim();
      const ret = (r.timeReturned || "").trim();
      if (!isMeaningfulText(left) && !isMeaningfulText(ret)) return;
      const rep =
        (isMeaningfulText(r.nameOfRepLeaving) ? r.nameOfRepLeaving : r.salesRep || "").trim() ||
        "Representative";
      const list = map.get(rep) || [];
      list.push({ start: left || "—", end: ret || "—" });
      map.set(rep, list);
    });
    return Array.from(map.entries()).map(([repName, intervals]) => ({ repName, intervals }));
  })();

  const {
    logs: repLeavingLogs,
    overallMinutes: overallStoreLeftMinutes,
    overallFormatted: overallStoreLeftFormatted,
  } = processRepTimingLogs(rawRepLeavingLogs);

  const rawBackroomLogs: Array<{
    repName: string;
    intervals: Array<{ start: string; end: string; duration?: string }>;
  }> = (() => {
    if (meta.backroomLogs && meta.backroomLogs.length > 0) {
      return meta.backroomLogs;
    }
    if (report.repTimings && report.repTimings.length > 0) {
      const map = new Map<string, Array<{ start: string; end: string; duration?: string }>>();
      report.repTimings
        .filter((t) => t.timingType === "Back Room")
        .forEach((t) => {
          const timeIn = (t.timeIn || "").trim();
          const timeOut = (t.timeOut || "").trim();
          if (!isMeaningfulText(timeIn) && !isMeaningfulText(timeOut)) return;
          const rep = (isMeaningfulText(t.repName) ? t.repName! : "Representative").trim();
          const list = map.get(rep) || [];
          list.push({ start: timeIn || "—", end: timeOut || "—", duration: t.totalTime });
          map.set(rep, list);
        });
      if (map.size > 0) {
        return Array.from(map.entries()).map(([repName, intervals]) => ({ repName, intervals }));
      }
    }
    const map = new Map<string, Array<{ start: string; end: string; duration?: string }>>();
    rawRows.forEach((r) => {
      const timeIn = (r.backRoomTimeIn || "").trim();
      const timeOut = (r.backRoomTimeOut || "").trim();
      if (!isMeaningfulText(timeIn) && !isMeaningfulText(timeOut)) return;
      const rep =
        (isMeaningfulText(r.salesRep) ? r.salesRep : r.nameOfRepLeaving || "").trim() ||
        "Representative";
      const list = map.get(rep) || [];
      list.push({ start: timeIn || "—", end: timeOut || "—" });
      map.set(rep, list);
    });
    return Array.from(map.entries()).map(([repName, intervals]) => ({ repName, intervals }));
  })();

  const {
    logs: backroomLogs,
    overallMinutes: overallBackroomMinutes,
    overallFormatted: overallBackroomFormatted,
  } = processRepTimingLogs(rawBackroomLogs);

  // Camera Activity (On / Offline)
  const rawCameraLogs = (() => {
    if (report.cameraLogs && report.cameraLogs.length > 0) {
      return report.cameraLogs;
    }
    const metaCameras = (meta as any).cameraLogs || (meta as any).cameraUptimeRows;
    if (Array.isArray(metaCameras) && metaCameras.length > 0) {
      return metaCameras;
    }
    return [];
  })();

  let totalCameraMinutes = 0;
  const cameraLogs: ProcessedCameraLog[] = [];
  rawCameraLogs.forEach((c: any, index: number) => {
    const name = (c.cameraName || "").trim();
    const online = (c.onlineTime || "").trim();
    const offline = (c.offlineTime || "").trim();
    if (!name && !online && !offline) return;

    let mins = 0;
    if (online && offline && online !== "—" && offline !== "—") {
      mins = calculateCameraIntervalMinutes(online, offline);
    }
    totalCameraMinutes += mins;
    cameraLogs.push({
      id: c.id || `cam-${index}`,
      cameraName: name || `Camera #${index + 1}`,
      onlineTime: online || "—",
      offlineTime: offline || "—",
      duration: mins > 0 ? formatMinutesToDuration(mins) : "",
      durationMinutes: mins,
    });
  });
  const totalCameraDurationFormatted = formatMinutesToDuration(totalCameraMinutes);

  // Refund Invoices, Receipt Buying Customers, Accessories Given Bundle Customer
  const refundInvoices = Array.from(
    new Set(
      rawRows
        .map((r) => (r.refundInvoice || "").trim())
        .filter((val) => isMeaningfulText(val))
        .map((val, idx) => {
          if (val.toLowerCase() === "yes") {
            const rowInv = rawRows[idx]?.invoice || "";
            return rowInv ? `Invoice#${rowInv}` : "Yes";
          }
          return val.startsWith("Invoice#") ? val : `Invoice#${val.replace(/^INV-/i, "")}`;
        }),
    ),
  );

  const receiptBuyingCustomers: Array<{ invoice: string; status: string }> = [];
  const seenReceiptInvs = new Set<string>();
  servedRows.forEach((r) => {
    if (!isRowBuying(r)) return;
    const inv = (r.invoice || "").trim();
    if (!inv || inv === "-" || inv === "—" || seenReceiptInvs.has(inv)) return;
    seenReceiptInvs.add(inv);
    const status = isAffirmative(r.receipt) ? "YES" : "NO";
    receiptBuyingCustomers.push({ invoice: inv, status });
  });

  const accessoriesGivenBundles = Array.from(
    new Set(
      servedRows
        .filter((r) => isAffirmative(r.bundleAccGiven) && isMeaningfulText(r.invoice))
        .map((r) => `Invoice#${r.invoice.trim()}`),
    ),
  );

  // Net Amount Difference
  const netDiffNumeric = rawRows.reduce((sum, r) => sum + parseCurrencyDifference(r.difference), 0);
  const amountDifference = meta.amountDifferenceOverride || formatCurrencySigned(netDiffNumeric);

  const numericDifference = Math.abs(parseCurrencyDifference(amountDifference) || netDiffNumeric);
  // Show Reason for Difference ONLY when the difference is strictly greater than $5
  const showReasonForDifference = numericDifference > 5;

  const reasonForDifference =
    meta.reasonForDifference ||
    (Math.abs(netDiffNumeric) >= 0.005
      ? "Variance observed across audited register invoices."
      : "No");

  return {
    dateDisplay: formatSummaryDateSlash(report.date || linkedRequest?.incidentDate),
    storeName: report.storeName || linkedRequest?.storeName || "—",
    repNamesJoined: repOrder.length > 0 ? repOrder.join(" & ") : report.salesRep || "—",
    repStats,
    totalCustomers,
    totalNonBuying,
    totalBuying,
    totalClosed,
    totalClosedNonBuying,
    totalClosedBuying,
    totalPitchNonBuying,
    totalShowedPhone,
    totalDidntShowPhone,
    badPitchItems,
    bundleBuying,
    bundleNonBuying,
    totalAccessoriesOffered,
    maximizing,
    complianceFlags,
    transactionNotes,
    missOpportunities,
    repLeavingLogs,
    overallStoreLeftMinutes,
    overallStoreLeftFormatted,
    backroomLogs,
    overallBackroomMinutes,
    overallBackroomFormatted,
    cameraLogs,
    totalCameraDurationMinutes: totalCameraMinutes,
    totalCameraDurationFormatted,
    refundInvoices,
    receiptBuyingCustomers,
    accessoriesGivenBundles,
    loomisVisible: meta.loomisMachineVisible || "Yes",
    loomisLink: meta.loomisLink || "",
    safeLockerVisible: meta.safeLockerVisible || "Yes",
    safeLockerLink: meta.safeLockerLink || "",
    generalOtherNotes:
      meta.generalOtherNotes || (isMeaningfulText(report.notes) ? report.notes!.trim() : "No"),
    amountDifference,
    numericDifference,
    showReasonForDifference,
    reasonForDifference,
    qaName: meta.qaName || report.investigatorName || linkedRequest?.preparedBy || "—",
  };
}

function FlagStatusPill({ value }: { value: "Yes" | "No" }) {
  const isYes = value === "Yes";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
        isYes
          ? "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60"
          : "bg-muted/70 text-foreground border border-border/70"
      }`}
    >
      {value}
    </span>
  );
}

export default function RequestedSurveillanceSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isFromValidateAndAssign = location.pathname.includes("/validate-and-assign/");
  const { user } = useAuth();
  const role = getSurveillanceRole(user);

  const [report, setReport] = useState<SurveillanceReport | null>(null);
  const [linkedRequest, setLinkedRequest] = useState<SurveillanceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = getSurveillanceRole(user);
  const canReviewReport = canApproveSurveillance(userRole);
  const isReportFinalized = report?.status === "Approved" || report?.status === "Rejected";
  const canTakeReviewAction = Boolean(report) && canReviewReport && !isReportFinalized;

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState<string>("");
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleConfirmMarkAsCompleted = async () => {
    if (!report) return;

    setSubmittingReview(true);
    try {
      const updated = await surveillanceService.reviewReport(report.id, {
        action: "approve",
      });
      setReport(updated);
      try {
        setLinkedRequest(await surveillanceService.getRequest(updated.requestId));
      } catch {
        setLinkedRequest(null);
      }
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

  const handleConfirmDeclineReport = async () => {
    if (!report) return;
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining this report.");
      return;
    }

    setSubmittingReview(true);
    try {
      const updated = await surveillanceService.reviewReport(report.id, {
        action: "reject",
        comments: declineReason.trim(),
      });
      setReport(updated);
      try {
        setLinkedRequest(await surveillanceService.getRequest(updated.requestId));
      } catch {
        setLinkedRequest(null);
      }
      setDeclineModalOpen(false);
      toast.success("Surveillance audit report has been rejected with reason.");
    } catch (error) {
      toast.error(`Failed to decline report: ${(error as Error).message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    surveillanceService
      .getReport(id)
      .then(async (foundReport) => {
        setReport(foundReport);
        if (foundReport?.requestId) {
          try {
            setLinkedRequest(await surveillanceService.getRequest(foundReport.requestId));
          } catch {
            setLinkedRequest(null);
          }
        }
      })
      .catch(() => {
        setReport(null);
        setLinkedRequest(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const summary = useMemo(() => {
    if (!report) return null;
    return computeSummaryFromReport(report, linkedRequest);
  }, [report, linkedRequest]);

  if (loading) {
    return <SurveillanceSummaryPageSkeleton />;
  }

  if (!report || !summary) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold">Summary Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested surveillance audit summary could not be located.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  if (
    !isFromValidateAndAssign &&
    (role === "market_manager" || role === "district_manager" || role === "state_manager") &&
    report.status !== "Approved"
  ) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold">Summary Pending Completion</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This surveillance audit summary will become available once the audit report is verified
          and marked as completed.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground leading-tight">
              {isFromValidateAndAssign ? "Validate and Assign" : "Requested Report Summary"}
            </p>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Surveillance Audit Summary
              </h1>
              {report.status === "Draft" && (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold gap-1"
                >
                  <Clock className="h-3.5 w-3.5" />
                  In Progress
                </Badge>
              )}
              {report.status === "Approved" && (
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Completed
                </Badge>
              )}
              {report.status === "Report Received" && (
                <Badge
                  variant="outline"
                  className="border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 text-xs font-semibold gap-1"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Pending Verification
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
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canTakeReviewAction && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenDeclineModal}
                disabled={submittingReview}
                className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/60 dark:text-rose-400"
              >
                <X className="h-3.5 w-3.5" />
                Decline Report
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setCompleteModalOpen(true)}
                disabled={submittingReview}
                className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                Mark as Completed
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
          <Button
            size="sm"
            onClick={() =>
              navigate(
                isFromValidateAndAssign
                  ? `/surveillance/validate-and-assign/review/${report.id}`
                  : `/surveillance/requests/report/${report.id}`,
              )
            }
            className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Eye className="h-3.5 w-3.5" />
            {isFromValidateAndAssign && report.status === "Report Received"
              ? "Review Report"
              : "View Report"}
          </Button>
        </div>
      </div>

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
                {report.reviewedAt ? ` on ${report.reviewedAt}` : ""}
              </span>
            )}
          </div>
          <div className="p-3.5 rounded-xl border border-rose-200/80 bg-background text-foreground text-xs leading-relaxed whitespace-pre-wrap">
            {report.managerComments || "Report was declined during review."}
          </div>
        </Card>
      )}

      {/* 1. Executive Header Overview Card */}
      <Card className="p-6 rounded-2xl border-border/70 shadow-xs">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50 shrink-0">
              <StoreIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground">Store Name</div>
              <div className="text-base font-bold text-foreground tracking-tight mt-0.5 break-words">
                {summary.storeName}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3.5 md:border-l md:border-border/60 md:pl-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900/50 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground">Date</div>
              <div className="text-base font-bold text-foreground tabular-nums mt-0.5">
                {summary.dateDisplay}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3.5 md:border-l md:border-border/60 md:pl-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground">Rep Name</div>
              <div className="text-base font-bold text-foreground mt-0.5 break-words">
                {summary.repNamesJoined}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Customer Traffic & Customers Closed Breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Total Customers Card */}
        <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-display text-base font-bold text-foreground">Total Customers</h2>
            </div>
            <span className="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 tabular-nums">
              {padTwo(summary.totalCustomers)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
              <div className="text-[11px] font-medium text-muted-foreground">Total Customers</div>
              <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
                {padTwo(summary.totalCustomers)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40 p-3">
              <div className="text-[11px] font-medium text-muted-foreground">Non-Buying</div>
              <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
                {padTwo(summary.totalNonBuying)}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3">
              <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                Buying
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-200 tabular-nums">
                {padTwo(summary.totalBuying)}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {summary.repStats.map((rep) => (
              <div
                key={`cust-${rep.repName}`}
                className="rounded-xl border border-border/60 bg-background p-3.5 space-y-2"
              >
                <div className="text-xs font-semibold text-foreground">
                  Rep Name: <span className="text-blue-600 dark:text-blue-400">{rep.repName}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Customer: </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {padTwo(rep.totalCustomers)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Non-Buying: </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {padTwo(rep.nonBuying)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Buying: </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {padTwo(rep.buying)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Total Customers Closed Card */}
        <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-display text-base font-bold text-foreground">
                Total Customers Closed
              </h2>
            </div>
            <span className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 tabular-nums">
              {padTwo(summary.totalClosed)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
              <div className="text-[11px] font-medium text-muted-foreground">
                Total Customers Closed
              </div>
              <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
                {padTwo(summary.totalClosed)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40 p-3">
              <div className="text-[11px] font-medium text-muted-foreground">Non-Buying</div>
              <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
                {padTwo(summary.totalClosedNonBuying)}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3">
              <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                Buying
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-200 tabular-nums">
                {padTwo(summary.totalClosedBuying)}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {summary.repStats.map((rep) => (
              <div
                key={`closed-${rep.repName}`}
                className="rounded-xl border border-border/60 bg-background p-3.5 space-y-2"
              >
                <div className="text-xs font-semibold text-foreground">
                  Rep Name:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">{rep.repName}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Customers Closed: </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {padTwo(rep.closedTotal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Non-Buying: </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {padTwo(rep.closedNonBuying)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Buying: </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {padTwo(rep.closedBuying)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5 text-xs">
            <span className="font-medium text-muted-foreground">Maximizing</span>
            <FlagStatusPill value={summary.maximizing} />
          </div>
        </Card>
      </div>

      {/* Reason - buyer, no Phone/Tablet/HINT device shown */}
      {summary.transactionNotes.length > 0 && (
        <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-5">
          <div className="border-b border-border/60 pb-3">
            <h2 className="font-display text-base font-bold text-foreground">Reason</h2>
          </div>
          <ul className="space-y-1 text-xs">
            {summary.transactionNotes.map((note, idx) => (
              <li key={idx} className="text-muted-foreground">
                • {renderTextWithLinks(note)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 3. Pitch Amount Non-Buying, Quality & Accessories Offered */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Pitch Amount Non-Buying */}
        <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h2 className="font-display text-base font-bold text-foreground">Pitch Non-Buying</h2>
            </div>
            <span className="text-2xl font-bold font-display text-violet-600 dark:text-violet-400 tabular-nums">
              {padTwo(summary.totalPitchNonBuying)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
              <div className="text-[11px] font-medium text-muted-foreground">
                Pitch Amount Non-Buying
              </div>
              <div className="mt-1 text-lg font-bold text-foreground tabular-nums">
                {padTwo(summary.totalPitchNonBuying)}
              </div>
            </div>
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/30 p-3">
              <div className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
                Showed Phone
              </div>
              <div className="mt-1 text-lg font-bold text-blue-900 dark:text-blue-200 tabular-nums">
                {padTwo(summary.totalShowedPhone)}
              </div>
            </div>
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/30 p-3">
              <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                Didn’t Show Phone
              </div>
              <div className="mt-1 text-lg font-bold text-amber-900 dark:text-amber-200 tabular-nums">
                {padTwo(summary.totalDidntShowPhone)}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {summary.repStats.map((rep) => (
              <div
                key={`pitch-${rep.repName}`}
                className="rounded-xl border border-border/60 bg-background p-3.5 space-y-2"
              >
                <div className="text-xs font-semibold text-foreground">
                  Rep Name:{" "}
                  <span className="text-violet-600 dark:text-violet-400">{rep.repName}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Pitch amount non-buying: </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {padTwo(rep.pitchNonBuying)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Showed phone: </span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                      {padTwo(rep.showedPhone)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Didn’t show phone: </span>
                    <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                      {padTwo(rep.didntShowPhone)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quality & Accessories Offered */}
        <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-6">
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-display text-base font-bold text-foreground">Quality</h2>
            </div>

            <div className="space-y-2.5">
              {summary.repStats.map((rep) => (
                <div
                  key={`qual-${rep.repName}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs"
                >
                  <span className="font-semibold text-foreground">{rep.repName}</span>
                  <div className="flex items-center gap-2.5 tabular-nums font-semibold">
                    <span className="text-rose-600 dark:text-rose-400">
                      {padTwo(rep.qualityBad)} Bad
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-amber-600 dark:text-amber-400">
                      {padTwo(rep.qualityAverage)} Average
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {padTwo(rep.qualityGood)} Good
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <h2 className="font-display text-base font-bold text-foreground">
                  Accessories Offered
                </h2>
              </div>
              <span className="text-base font-bold font-display text-teal-700 dark:text-teal-300 tabular-nums">
                {summary.totalAccessoriesOffered}/{summary.totalCustomers}
              </span>
            </div>

            <div className="space-y-2">
              {summary.repStats.map((rep) => (
                <div
                  key={`acc-${rep.repName}`}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-2.5 text-xs"
                >
                  <span className="font-medium text-foreground">{rep.repName}</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {rep.accessoriesOffered}/{rep.totalCustomers}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Pitch Notes & Bad Pitch Link */}
      <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3">
          <h2 className="font-display text-base font-bold text-foreground">
            Pitch Notes &amp; Bad Pitch Link
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {summary.repStats.map((rep) => (
            <div
              key={`pnotes-${rep.repName}`}
              className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2.5"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pitch Notes — <span className="text-foreground">{rep.repName}</span>
              </div>
              {rep.pitchNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No pitch notes recorded.</p>
              ) : (
                <ul className="space-y-2 text-xs text-foreground leading-relaxed">
                  {rep.pitchNotes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Bad Pitch Link */}
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/25 p-4 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
            Bad Pitch Link
          </div>
          {summary.badPitchItems.length === 0 ? (
            <div className="text-xs text-muted-foreground">No bad pitch incidents recorded.</div>
          ) : (
            <div className="space-y-3">
              {summary.badPitchItems.map((item, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-start gap-2 text-foreground font-medium">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">•</span>
                    <span>{item.description}</span>
                  </div>
                  <div className="pl-3.5 text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground">Link:</span>
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400 break-all"
                      >
                        {item.link}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 5. Bundle Buying & Non-Buying Customers + Invoice Verification */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-4">
          <div className="border-b border-border/60 pb-3">
            <h2 className="font-display text-base font-bold text-foreground">
              Bundle Buying Customer
            </h2>
          </div>

          {summary.bundleBuying.length === 0 ? (
            <p className="text-xs text-muted-foreground">No</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summary.bundleBuying.map((b) => (
                <div
                  key={b.invoice}
                  className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-3.5 space-y-1.5 text-xs"
                >
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                    Invoice#{b.invoice}
                  </div>
                  <div className="font-medium text-foreground">{b.itemSummary}</div>
                  <div className="text-muted-foreground tabular-nums">
                    Starting amount:{" "}
                    <span className="font-semibold text-foreground">{b.startingAmount}</span>
                  </div>
                  <div className="text-muted-foreground tabular-nums">
                    Ending amount:{" "}
                    <span className="font-semibold text-foreground">{b.endingAmount}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Accessory Given:{" "}
                    <span className="font-semibold text-foreground">{b.accGiven}</span>
                    {b.accGivenDetails ? ` - ${b.accGivenDetails}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-4">
          <div className="border-b border-border/60 pb-3">
            <h2 className="font-display text-base font-bold text-foreground">
              Bundle Non-Buying Customer
            </h2>
          </div>

          {summary.bundleNonBuying.length === 0 ? (
            <p className="text-xs text-muted-foreground">No</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summary.bundleNonBuying.map((b) => (
                <div
                  key={b.invoice}
                  className="rounded-xl border border-blue-200/80 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20 p-3.5 space-y-1.5 text-xs"
                >
                  <div className="font-bold text-blue-800 dark:text-blue-300 tabular-nums">
                    Invoice#{b.invoice}
                  </div>
                  <div className="font-medium text-foreground">{b.itemSummary}</div>
                  <div className="text-muted-foreground tabular-nums">
                    Starting amount:{" "}
                    <span className="font-semibold text-foreground">{b.startingAmount}</span>
                  </div>
                  <div className="text-muted-foreground tabular-nums">
                    Ending amount:{" "}
                    <span className="font-semibold text-foreground">{b.endingAmount}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Accessory Given:{" "}
                    <span className="font-semibold text-foreground">{b.accGiven}</span>
                    {b.accGivenDetails ? ` - ${b.accGivenDetails}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 6. Compliance & Policy Verification + Miss Opportunity */}
      <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3">
          <h2 className="font-display text-base font-bold text-foreground">
            Fraud &amp; Compliance Verification
          </h2>
        </div>

        {summary.complianceFlags.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No compliance or payment policy issues noted on any audit row.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {summary.complianceFlags.map((flag) => (
              <div
                key={flag.label}
                className="rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 space-y-1.5"
              >
                <span className="font-semibold text-foreground">{flag.label}</span>
                <ul className="space-y-1">
                  {flag.notes.map((note, idx) => (
                    <li key={idx} className="text-muted-foreground">
                      • {renderTextWithLinks(note)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Miss Opportunity - same "no notes, no entry" rule as the flags
            above, hidden entirely rather than showing an empty placeholder. */}
        {summary.missOpportunities.length > 0 && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/25 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Miss Opportunity
              </span>
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-100/80 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 text-xs font-bold tabular-nums"
              >
                {padTwo(summary.missOpportunities.length)}
              </Badge>
            </div>
            <div className="space-y-2.5">
              {summary.missOpportunities.map((mo, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-amber-200/60 bg-background/80 p-3 text-xs space-y-1"
                >
                  <div className="tabular-nums">
                    <span className="font-semibold text-muted-foreground">Time: </span>
                    <span className="font-bold text-foreground">{mo.time}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Description: </span>
                    <span className="text-foreground">{renderTextWithLinks(mo.description)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 7. Floor Presence: Reps Leaving Store & Backroom In & Out */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-display text-base font-bold text-foreground">
                Reps Leaving Store
              </h2>
            </div>
            {summary.repLeavingLogs.length > 0 && summary.overallStoreLeftMinutes > 0 && (
              <Badge
                variant="secondary"
                className="font-semibold text-xs tabular-nums bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60"
              >
                Total Time: {summary.overallStoreLeftFormatted}
              </Badge>
            )}
          </div>

          {summary.repLeavingLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No store departures recorded.</p>
          ) : (
            <div className="space-y-3.5">
              {summary.repLeavingLogs.map((log) => (
                <div
                  key={`leave-${log.repName}`}
                  className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-foreground">
                      Rep Name:{" "}
                      <span className="text-blue-600 dark:text-blue-400">{log.repName}</span>
                    </div>
                    {log.totalMinutes > 0 && (
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                        Total: <span className="text-foreground">{log.totalTimeFormatted}</span>
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs tabular-nums">
                    {log.intervals.map((iv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5 border border-border/50 text-xs tabular-nums"
                      >
                        <span className="font-medium text-foreground">* {iv.start}</span>
                        <span className="text-muted-foreground text-[11px]">to</span>
                        <span className="font-medium text-foreground">{iv.end}</span>
                        {iv.duration && iv.durationMinutes > 0 && (
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-900/50">
                            {iv.duration}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-display text-base font-bold text-foreground">
                Backroom In &amp; Out
              </h2>
            </div>
            {summary.backroomLogs.length > 0 && summary.overallBackroomMinutes > 0 && (
              <Badge
                variant="secondary"
                className="font-semibold text-xs tabular-nums bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60"
              >
                Total Time: {summary.overallBackroomFormatted}
              </Badge>
            )}
          </div>

          {summary.backroomLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No backroom entries recorded.</p>
          ) : (
            <div className="space-y-3.5">
              {summary.backroomLogs.map((log) => (
                <div
                  key={`back-${log.repName}`}
                  className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-foreground">
                      Rep Name:{" "}
                      <span className="text-indigo-600 dark:text-indigo-400">{log.repName}</span>
                    </div>
                    {log.totalMinutes > 0 && (
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                        Total: <span className="text-foreground">{log.totalTimeFormatted}</span>
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs tabular-nums">
                    {log.intervals.map((iv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5 border border-border/50 text-xs tabular-nums"
                      >
                        <span className="font-medium text-foreground">* {iv.start}</span>
                        <span className="text-muted-foreground text-[11px]">to</span>
                        <span className="font-medium text-foreground">{iv.end}</span>
                        {iv.duration && iv.durationMinutes > 0 && (
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-900/50">
                            {iv.duration}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 8. Camera Activity (On / Offline) - rendered when available */}
      {summary.cameraLogs.length > 0 && (
        <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <h2 className="font-display text-base font-bold text-foreground">
                Camera Activity (On / Offline)
              </h2>
            </div>
            {summary.totalCameraDurationMinutes > 0 && (
              <Badge
                variant="secondary"
                className="font-semibold text-xs tabular-nums bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60"
              >
                Total Duration: {summary.totalCameraDurationFormatted}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {summary.cameraLogs.map((cam) => (
              <div
                key={cam.id}
                className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs font-semibold text-foreground truncate"
                    title={cam.cameraName}
                  >
                    {cam.cameraName}
                  </span>
                  {cam.duration && cam.durationMinutes > 0 && (
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200/50 dark:border-purple-900/50 tabular-nums shrink-0">
                      {cam.duration}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
                  <div className="rounded-lg bg-background p-2 border border-border/50 space-y-0.5">
                    <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">
                      Online Time
                    </div>
                    <div className="font-medium text-foreground">{cam.onlineTime}</div>
                  </div>
                  <div className="rounded-lg bg-background p-2 border border-border/50 space-y-0.5">
                    <div className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">
                      Offline Time
                    </div>
                    <div className="font-medium text-foreground">{cam.offlineTime}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 9. Receipts, Refunds, Security Visibility, Variance & QA Sign-Off */}
      <Card className="p-6 rounded-2xl border-border/70 shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3">
          <h2 className="font-display text-base font-bold text-foreground">
            Receipts, Store Security &amp; Audit Reconciliation
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Refund Invoice
            </div>
            <div className="font-semibold text-foreground tabular-nums">
              {summary.refundInvoices.length > 0 ? summary.refundInvoices.join(", ") : "No"}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Receipt Buying Customers
            </div>
            <div className="font-semibold text-foreground tabular-nums flex flex-wrap gap-1.5">
              {summary.receiptBuyingCustomers.length > 0
                ? summary.receiptBuyingCustomers.map((rc) => (
                    <span
                      key={rc.invoice}
                      className="inline-flex items-center rounded-md bg-background border border-border px-2 py-0.5"
                    >
                      Invoice#{rc.invoice}-{rc.status}
                    </span>
                  ))
                : "No"}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Accessories Given Bundle Customer
            </div>
            <div className="font-semibold text-foreground tabular-nums flex flex-wrap gap-1.5">
              {summary.accessoriesGivenBundles.length > 0
                ? summary.accessoriesGivenBundles.map((inv) => (
                    <span
                      key={inv}
                      className="inline-flex items-center rounded-md bg-background border border-border px-2 py-0.5"
                    >
                      {inv}
                    </span>
                  ))
                : "No"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
          <div className="rounded-xl border border-border/60 bg-background p-4 space-y-1.5">
            <div className="font-semibold text-foreground">
              Loomis Machine Visible:{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                ({summary.loomisVisible})
              </span>
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-foreground">Link:</span>
              {summary.loomisLink ? (
                <a
                  href={summary.loomisLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400 break-all"
                >
                  {summary.loomisLink}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span>—</span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background p-4 space-y-1.5">
            <div className="font-semibold text-foreground">
              Safe Locker Visible:{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                ({summary.safeLockerVisible})
              </span>
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-foreground">Link:</span>
              {summary.safeLockerLink ? (
                <a
                  href={summary.safeLockerLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400 break-all"
                >
                  {summary.safeLockerLink}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
            summary.showReasonForDifference ? "lg:grid-cols-4" : "lg:grid-cols-3"
          } text-xs pt-1`}
        >
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">General Other Notes</div>
            <div className="font-semibold text-foreground">{summary.generalOtherNotes}</div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">Amount Difference</div>
            <div
              className={`text-sm font-bold tabular-nums ${
                summary.amountDifference.startsWith("-")
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground"
              }`}
            >
              {summary.amountDifference}
            </div>
          </div>

          {summary.showReasonForDifference && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">
                Reason for Difference
              </div>
              <div className="font-semibold text-foreground">{summary.reasonForDifference}</div>
            </div>
          )}

          <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/25 p-4 space-y-1">
            <div className="text-[11px] font-medium text-blue-700 dark:text-blue-300">QA</div>
            <div className="text-sm font-bold text-blue-950 dark:text-blue-100">
              {summary.qaName}
            </div>
          </div>
        </div>
      </Card>

      {/* Bottom Action Bar for Decline / Complete */}
      {canTakeReviewAction && (
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t pt-4 print:hidden">
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
            <Label htmlFor="decline-report-reason-summary" className="text-xs font-semibold">
              Reason for Declining <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="decline-report-reason-summary"
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

      {/* Mark as Completed Confirmation Modal */}
      <AlertDialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Report Completion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this surveillance audit report as Completed? Once
              completed, this report will be finalized and made visible on the requester dashboard.
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
